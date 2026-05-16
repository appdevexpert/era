import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { signOutThunk } from "./authSlice";
import {
  getCompletedSessionDayIds,
  getProgramDayDetail,
  getWorkoutOverview,
} from "@/app/services/workoutService";
import { computeCurrentPosition } from "@/app/utils/programSchedule";
import type { ProgramDayDetailData, WorkoutOverviewData } from "@/app/types/workout";
import type { LoadingState } from "@/app/types";
import type { RootState } from "@/app/stores/store";

export type WorkoutBootstrapData = {
  programId: string;
  overview: WorkoutOverviewData;
  currentDayDetail: ProgramDayDetailData;
  completedDayIds: string[];
  loadedAt: string;
};

interface WorkoutState {
  status: LoadingState;
  error: string | null;
  programId: string | null;
  overview: WorkoutOverviewData | null;
  currentDayDetail: ProgramDayDetailData | null;
  /** program_day_ids of days with completed workout sessions */
  completedDayIds: string[];
  loadedAt: string | null;
}

const initialState: WorkoutState = {
  status: "idle",
  error: null,
  programId: null,
  overview: null,
  currentDayDetail: null,
  completedDayIds: [],
  loadedAt: null,
};

type LoadWorkoutBootstrapArgs = {
  programId?: string;
  programDayId?: string;
} | undefined;

export const loadWorkoutBootstrap = createAsyncThunk<
  WorkoutBootstrapData,
  LoadWorkoutBootstrapArgs,
  { rejectValue: string; state: RootState }
>("workout/loadBootstrap", async (args, { rejectWithValue, getState }) => {
  try {
    const userId = getState().auth.user?.id;

    const overview = await getWorkoutOverview(args?.programId);

    // Fetch completed day IDs from workout_sessions
    const completedDayIds = userId
      ? await getCompletedSessionDayIds(userId)
      : [];

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

    return {
      programId: overview.program.id,
      overview,
      currentDayDetail,
      completedDayIds,
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load workout.",
    );
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
      state.programId = action.payload.programId;
      state.overview = action.payload.overview;
      state.currentDayDetail = action.payload.currentDayDetail;
      state.completedDayIds = action.payload.completedDayIds;
      state.loadedAt = action.payload.loadedAt;
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
