import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { setProgramStartDate, signOutThunk } from "./authSlice";
import { loadRewardBootstrap } from "./rewardSlice";
import { loadWeightBootstrap } from "./weightSlice";
import {
  getCompletedSessionDayIds,
  getProgramDayDetail,
  getProgramDayDetailFast,
  getProgramVersion,
  getWorkoutOverview,
  resolveUserProgramId,
} from "@/app/services/workoutService";
import {
  fetchProgramStartDate,
  saveProgramStartDate,
} from "@/app/services/profileService";
import {
  getActiveAssignment,
  type AssignmentRow,
} from "@/app/services/assignmentService";
import { computeCurrentPosition } from "@/app/utils/programSchedule";
import type { ProgramDayDetailData, WorkoutOverviewData } from "@/app/types/workout";
import type { LoadingState } from "@/app/types";
import type { RootState } from "@/app/stores/store";

export type WorkoutBootstrapData = {
  userId: string | null;
  programId: string;
  overview: WorkoutOverviewData;
  currentDayDetail: ProgramDayDetailData;
  completedDayIds: string[];
  loadedAt: string;
  versionSignature: string | null;
  assignment: AssignmentRow | null;
};

interface WorkoutState {
  status: LoadingState;
  error: string | null;
  userId: string | null;
  programId: string | null;
  overview: WorkoutOverviewData | null;
  currentDayDetail: ProgramDayDetailData | null;
  /**
   * Per-day cache of fully-hydrated day details (sections + exercises + sets
   * + library exercises). Populated lazily on day open via loadProgramDayDetail
   * and proactively in the background via prefetchAllDays. A cache hit lets
   * ExerciseListScreen render synchronously with zero network roundtrips.
   * Keyed by program_days.id.
   */
  dayDetailsById: Record<string, ProgramDayDetailData>;
  /** program_day_ids of days with completed workout sessions */
  completedDayIds: string[];
  loadedAt: string | null;
  /**
   * "<MAX(updated_at)>:<total row count>" snapshot of the server at the time
   * the bootstrap was fetched. Compared on app foreground to detect any
   * admin-side change (insert / update / delete) without refetching the
   * whole plan.
   */
  versionSignature: string | null;
  /** Active user_program_assignments row — drives cycle 2 + deload UI. */
  assignment: AssignmentRow | null;
}

const initialState: WorkoutState = {
  status: "idle",
  error: null,
  userId: null,
  programId: null,
  overview: null,
  currentDayDetail: null,
  dayDetailsById: {},
  completedDayIds: [],
  loadedAt: null,
  versionSignature: null,
  assignment: null,
};

type LoadWorkoutBootstrapArgs = {
  programId?: string;
  programDayId?: string;
} | undefined;

export const loadWorkoutBootstrap = createAsyncThunk<
  WorkoutBootstrapData,
  LoadWorkoutBootstrapArgs,
  { rejectValue: string; state: RootState }
>("workout/loadBootstrap", async (args, { rejectWithValue, getState, dispatch }) => {
  try {
    const userId = getState().auth.user?.id ?? null;

    // Sync programStartDate with Supabase before any date math runs.
    // Supabase is the source of truth across devices; Redux is the local cache.
    if (userId) {
      try {
        const remoteStart = await fetchProgramStartDate(userId);
        const localStart = getState().auth.programStartDate;
        if (remoteStart && remoteStart !== localStart) {
          dispatch(setProgramStartDate(remoteStart));
        } else if (!remoteStart && localStart) {
          // Existing user with a Redux-only value — migrate it to Supabase.
          try {
            await saveProgramStartDate(userId, localStart);
          } catch (error) {
            console.warn("[workout] failed to migrate programStartDate", error);
          }
        }
      } catch (error) {
        console.warn("[workout] failed to fetch programStartDate", error);
      }
    }

    // Pick the program tailored to this user (gender + level). Admin override
    // via args.programId still wins for ad-hoc testing.
    const targetProgramId =
      args?.programId ?? (userId ? await resolveUserProgramId() : null);

    if (!targetProgramId) {
      return rejectWithValue(
        "No workout program assigned. Complete onboarding (gender + level) or contact support.",
      );
    }

    const overview = await getWorkoutOverview(targetProgramId);

    if (userId && !getState().auth.programStartDate) {
      const startDate = new Date().toISOString().split("T")[0];
      dispatch(setProgramStartDate(startDate));
      try {
        await saveProgramStartDate(userId, startDate);
      } catch (error) {
        console.warn("[workout] failed to save initial programStartDate", error);
      }
    }

    // Fetch completed day IDs from workout_sessions
    const completedDayIds = userId
      ? await getCompletedSessionDayIds(userId)
      : [];

    // Hydrate reward + weight slices in the background (fire-and-forget —
    // failure here shouldn't block the workout screen from rendering).
    if (userId) {
      dispatch(loadRewardBootstrap(userId)).catch(() => {});
      dispatch(loadWeightBootstrap(userId)).catch(() => {});
    }

    // Determine the correct day to load detail for
    let targetDayId = args?.programDayId ?? overview.currentDay.id;

    // If no specific day requested, use schedule to find today's actual day
    if (!args?.programDayId) {
      const programStartDate = getState().auth.programStartDate;
      if (programStartDate) {
        const config = { programStartDate, totalWeeks: overview.program.duration_weeks };
        const pos = computeCurrentPosition(config);
        const found = overview.days.find((d) => {
          if (pos.isAdjustedDay) {
            const week1 = overview.weeks.find((w) => w.week_number === 1);
            return week1 && d.week_id === week1.id && d.day_number === pos.dayNumber;
          }
          const w = overview.weeks.find((wk) => wk.id === d.week_id);
          return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
        });
        if (found) targetDayId = found.id;
      }
    }

    const currentDayDetail = await getProgramDayDetail(targetDayId);

    // Capture the server's change-signature AFTER all data is fetched. Any
    // subsequent admin edit will move the signature forward; the next
    // checkAndRefreshIfStale will see the mismatch and trigger a refetch.
    const versionSignature = await getProgramVersion();

    // Fetch active assignment (cycle_number, is_deload_week, etc.) so
    // downstream UI (mappers, completion detection) can read it.
    const assignment = userId ? await getActiveAssignment(userId) : null;

    return {
      userId,
      programId: overview.program.id,
      overview,
      currentDayDetail,
      completedDayIds,
      loadedAt: new Date().toISOString(),
      versionSignature,
      assignment,
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load workout.",
    );
  }
});

/**
 * Lean per-day loader used when navigating from the 12-week plan into any
 * day that isn't today. Replaces the previous "dispatch loadWorkoutBootstrap
 * again" pattern (~7 serial roundtrips of mostly-redundant data) with a
 * single targeted fetch:
 *
 *   - Pull day + week from state.workout.overview (already in Redux).
 *   - Call getProgramDayDetailFast (2 parallel batches).
 *   - Stash the result in state.workout.dayDetailsById so revisits are free.
 *
 * Returns the existing cache entry synchronously when present (callers can
 * still await — the thunk resolves immediately in that case).
 *
 * Falls back to the slow getProgramDayDetail path only if the overview slice
 * doesn't contain the requested day (edge case: deep link before bootstrap).
 */
export const loadProgramDayDetail = createAsyncThunk<
  ProgramDayDetailData,
  string,
  { rejectValue: string; state: RootState }
>(
  "workout/loadDayDetail",
  async (programDayId, { getState, rejectWithValue }) => {
    try {
      const state = getState().workout;
      const cached = state.dayDetailsById[programDayId];
      if (cached) return cached;

      const overview = state.overview;
      const day = overview?.days.find((d) => d.id === programDayId);
      const week = day
        ? overview?.weeks.find((w) => w.id === day.week_id)
        : undefined;

      if (day && week) {
        return await getProgramDayDetailFast(day, week);
      }
      // Fallback path — overview not ready yet, do the full fetch.
      return await getProgramDayDetail(programDayId);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unable to load workout day.",
      );
    }
  },
  {
    condition: (programDayId, { getState }) => {
      const state = getState() as RootState;
      // Skip if already cached or already being fetched.
      if (state.workout.dayDetailsById[programDayId]) return false;
      return true;
    },
  },
);

/**
 * Background prefetch of all non-rest days into dayDetailsById. Fire-and-forget
 * after a successful bootstrap so the user's first tap on any day from the
 * 12-week overview is already a cache hit.
 *
 * Rules:
 *   - Never blocks the UI — caller does not await this.
 *   - Skips days already in the cache (today's day is seeded by bootstrap).
 *   - Skips rest days (nothing to render).
 *   - Runs in chunks of 5 concurrent fetches to avoid spiking Supabase or
 *     hammering the device's connection pool.
 *   - Swallows individual day errors; the on-demand path catches the miss.
 */
const PREFETCH_CONCURRENCY = 5;

export const prefetchAllDays = createAsyncThunk<
  void,
  void,
  { state: RootState }
>("workout/prefetchAllDays", async (_, { getState, dispatch }) => {
  const state = getState().workout;
  const overview = state.overview;
  if (!overview) return;

  const targets = overview.days.filter(
    (d) => !d.is_rest_day && !state.dayDetailsById[d.id],
  );
  if (targets.length === 0) return;

  for (let i = 0; i < targets.length; i += PREFETCH_CONCURRENCY) {
    const chunk = targets.slice(i, i + PREFETCH_CONCURRENCY);
    await Promise.all(
      chunk.map((day) =>
        dispatch(loadProgramDayDetail(day.id))
          .unwrap()
          .catch(() => {
            // Swallow — on-demand path will retry when the user opens it.
          }),
      ),
    );
  }
});

/**
 * Asks the server for the latest program change-signature and refetches the
 * full workout bootstrap only when the signature differs from the cached one.
 * The signature ("<MAX(updated_at)>:<row count>") moves on insert / update /
 * delete, so any admin-side change is detected. Runs silently — never blocks
 * UI, never surfaces errors. Skips when no cache exists yet (PlanGeneration
 * handles the cold-load case), when a load is already in flight, or when the
 * cached entry pre-dates the signature feature (no versionSignature stored).
 */
export const checkAndRefreshIfStale = createAsyncThunk<
  void,
  void,
  { state: RootState }
>("workout/checkAndRefreshIfStale", async (_, { dispatch, getState }) => {
  const workout = getState().workout;
  if (!workout.overview) return;
  if (workout.status === "loading") return;

  const serverSignature = await getProgramVersion();
  if (!serverSignature) return;

  if (serverSignature !== workout.versionSignature) {
    dispatch(loadWorkoutBootstrap());
  }
});

const workoutSlice = createSlice({
  name: "workout",
  initialState,
  reducers: {
    clearWorkoutCache: () => initialState,
    /** Optimistically mark a day as completed (after finishSession) */
    markDayCompleted: (state, action: PayloadAction<string>) => {
      if (!state.completedDayIds.includes(action.payload)) {
        state.completedDayIds.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkoutBootstrap.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(loadWorkoutBootstrap.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.error = null;
      state.userId = action.payload.userId;
      state.programId = action.payload.programId;
      state.overview = action.payload.overview;
      state.currentDayDetail = action.payload.currentDayDetail;
      state.completedDayIds = action.payload.completedDayIds;
      state.loadedAt = action.payload.loadedAt;
      state.versionSignature = action.payload.versionSignature;
      state.assignment = action.payload.assignment;
      // Reset the per-day cache (program may have changed) and seed it with
      // today's day so taps on today are also cache hits.
      const today = action.payload.currentDayDetail;
      state.dayDetailsById = { [today.day.id]: today };
    });
    builder.addCase(loadProgramDayDetail.fulfilled, (state, action) => {
      const detail = action.payload;
      // Drop late results from a prefetch that was kicked off before a
      // program switch (admin change, deload week, user re-onboarded).
      if (state.programId && detail.day.program_id !== state.programId) return;
      state.dayDetailsById[detail.day.id] = detail;
    });
    builder.addCase(loadWorkoutBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load workout.";
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearWorkoutCache, markDayCompleted } = workoutSlice.actions;

export default workoutSlice.reducer;
