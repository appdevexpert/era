import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getActiveWorkoutSessionSnapshot,
  getProgramDayDetail,
  getWorkoutSessionSnapshot,
  getWorkoutOverview,
  startOrResumeWorkoutSession,
} from "@/app/services/workoutService";
import type {
  ActiveWorkoutSessionSnapshot,
  ProgramDayDetailData,
  WorkoutOverviewData,
} from "@/app/types/workout";
import type { LoadingState } from "@/app/types";

export type WorkoutBootstrapData = {
  programId: string;
  overview: WorkoutOverviewData;
  currentDayDetail: ProgramDayDetailData;
  activeSession: ActiveWorkoutSessionSnapshot | null;
  loadedAt: string;
};

interface WorkoutState {
  status: LoadingState;
  error: string | null;
  activeSessionStatus: LoadingState;
  activeSessionError: string | null;
  programId: string | null;
  overview: WorkoutOverviewData | null;
  currentDayDetail: ProgramDayDetailData | null;
  activeSession: ActiveWorkoutSessionSnapshot | null;
  loadedAt: string | null;
}

const initialState: WorkoutState = {
  status: "idle",
  error: null,
  activeSessionStatus: "idle",
  activeSessionError: null,
  programId: null,
  overview: null,
  currentDayDetail: null,
  activeSession: null,
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
    const activeSession = await getActiveWorkoutSessionSnapshot(currentDayDetail.day.id);

    return {
      programId: overview.program.id,
      overview,
      currentDayDetail,
      activeSession,
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load workout.",
    );
  }
});

export const startOrResumeActiveWorkoutSession = createAsyncThunk<
  ActiveWorkoutSessionSnapshot,
  { programDayId: string },
  { rejectValue: string }
>("workout/startOrResumeSession", async ({ programDayId }, { rejectWithValue }) => {
  try {
    return await startOrResumeWorkoutSession(programDayId);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to start workout.",
    );
  }
});

export const loadWorkoutSession = createAsyncThunk<
  ActiveWorkoutSessionSnapshot,
  { sessionId: string },
  { rejectValue: string }
>("workout/loadSession", async ({ sessionId }, { rejectWithValue }) => {
  try {
    return await getWorkoutSessionSnapshot(sessionId);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load workout session.",
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
      state.activeSession = action.payload.activeSession;
      state.activeSessionStatus = "succeeded";
      state.activeSessionError = null;
      state.loadedAt = action.payload.loadedAt;
    });
    builder.addCase(loadWorkoutBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load workout.";
    });
    builder.addCase(startOrResumeActiveWorkoutSession.pending, (state) => {
      state.activeSessionStatus = "loading";
      state.activeSessionError = null;
    });
    builder.addCase(startOrResumeActiveWorkoutSession.fulfilled, (state, action) => {
      state.activeSessionStatus = "succeeded";
      state.activeSessionError = null;
      state.activeSession = action.payload;
    });
    builder.addCase(startOrResumeActiveWorkoutSession.rejected, (state, action) => {
      state.activeSessionStatus = "failed";
      state.activeSessionError = action.payload ?? "Unable to start workout.";
    });
    builder.addCase(loadWorkoutSession.pending, (state) => {
      state.activeSessionStatus = "loading";
      state.activeSessionError = null;
    });
    builder.addCase(loadWorkoutSession.fulfilled, (state, action) => {
      state.activeSessionStatus = "succeeded";
      state.activeSessionError = null;
      state.activeSession = action.payload;
    });
    builder.addCase(loadWorkoutSession.rejected, (state, action) => {
      state.activeSessionStatus = "failed";
      state.activeSessionError = action.payload ?? "Unable to load workout session.";
    });
  },
});

export const { clearWorkoutCache } = workoutSlice.actions;

export default workoutSlice.reducer;
