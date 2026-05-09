import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getProgramDayDetail,
  getWorkoutOverview,
} from "@/app/services/workoutService";
import type { ProgramDayDetailData, WorkoutOverviewData } from "@/app/types/workout";
import type { LoadingState } from "@/app/types";

export type WorkoutBootstrapData = {
  programId: string;
  overview: WorkoutOverviewData;
  currentDayDetail: ProgramDayDetailData;
  loadedAt: string;
};

interface WorkoutState {
  status: LoadingState;
  error: string | null;
  programId: string | null;
  overview: WorkoutOverviewData | null;
  currentDayDetail: ProgramDayDetailData | null;
  loadedAt: string | null;
}

const initialState: WorkoutState = {
  status: "idle",
  error: null,
  programId: null,
  overview: null,
  currentDayDetail: null,
  loadedAt: null,
};

type LoadWorkoutBootstrapArgs = {
  programId?: string;
  programDayId?: string;
} | undefined;

export const loadWorkoutBootstrap = createAsyncThunk<
  WorkoutBootstrapData,
  LoadWorkoutBootstrapArgs,
  { rejectValue: string }
>("workout/loadBootstrap", async (args, { rejectWithValue }) => {
  try {
    const overview = await getWorkoutOverview(args?.programId);
    const currentDayDetail = await getProgramDayDetail(
      args?.programDayId ?? overview.currentDay.id,
    );

    return {
      programId: overview.program.id,
      overview,
      currentDayDetail,
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
      state.loadedAt = action.payload.loadedAt;
    });
    builder.addCase(loadWorkoutBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load workout.";
    });
  },
});

export const { clearWorkoutCache } = workoutSlice.actions;

export default workoutSlice.reducer;
