import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { setProgramStartDate, signOutThunk } from "./authSlice";
import { loadRewardBootstrap } from "./rewardSlice";
import { loadWeightBootstrap } from "./weightSlice";
import {
  getCompletedSessionDayIds,
  getProgramDayDetail,
  getProgramVersion,
  getWorkoutOverview,
  resolveUserProgramId,
} from "@/app/services/workoutService";
import {
  fetchProgramStartDate,
  saveProgramStartDate,
} from "@/app/services/profileService";
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
};

interface WorkoutState {
  status: LoadingState;
  error: string | null;
  userId: string | null;
  programId: string | null;
  overview: WorkoutOverviewData | null;
  currentDayDetail: ProgramDayDetailData | null;
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
}

const initialState: WorkoutState = {
  status: "idle",
  error: null,
  userId: null,
  programId: null,
  overview: null,
  currentDayDetail: null,
  completedDayIds: [],
  loadedAt: null,
  versionSignature: null,
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

    return {
      userId,
      programId: overview.program.id,
      overview,
      currentDayDetail,
      completedDayIds,
      loadedAt: new Date().toISOString(),
      versionSignature,
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load workout.",
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
