/**
 * Ephemeral session state — lives only during an active workout.
 * NOT persisted to AsyncStorage. Resets on app restart.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { signOutThunk } from "./authSlice";

/** A logged set result within the current session */
export interface LoggedSetResult {
  weight: number | null;
  weightUnit: string;
  reps: number | null;
  duration: number | null;
}

/** Historical stats from user_exercise_stats table */
export interface ExerciseStatSnapshot {
  lastWeight: number | null;
  lastWeightUnit: string | null;
  lastReps: number | null;
  bestWeight: number | null;
  bestWeightUnit: string | null;
  bestReps: number | null;
}

interface SessionState {
  sessionId: string | null;
  /** programDayExerciseId → sessionExerciseId */
  exerciseMap: Record<string, string>;
  /** sessionExerciseId → sessionSetId[] */
  setMap: Record<string, string[]>;
  setsLogged: number;
  exercisesCompleted: number;
  sessionStartedAt: string | null;
  /** exerciseLibraryId → historical stats (fetched at session start) */
  exerciseStats: Record<string, ExerciseStatSnapshot>;
  /** exerciseLibraryId → { setNumber: LoggedSetResult } — keyed by set index, no duplicates */
  completedSets: Record<string, Record<number, LoggedSetResult>>;
}

const initialState: SessionState = {
  sessionId: null,
  exerciseMap: {},
  setMap: {},
  setsLogged: 0,
  exercisesCompleted: 0,
  sessionStartedAt: null,
  exerciseStats: {},
  completedSets: {},
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    initSession(
      state,
      action: PayloadAction<{
        sessionId: string;
        exerciseMap: Record<string, string>;
        setMap: Record<string, string[]>;
      }>,
    ) {
      state.sessionId = action.payload.sessionId;
      state.exerciseMap = action.payload.exerciseMap;
      state.setMap = action.payload.setMap;
      state.setsLogged = 0;
      state.exercisesCompleted = 0;
    },
    addSessionSet(
      state,
      action: PayloadAction<{
        sessionExerciseId: string;
        sessionSetId: string;
      }>,
    ) {
      const { sessionExerciseId, sessionSetId } = action.payload;
      const existing = state.setMap[sessionExerciseId] ?? [];
      state.setMap[sessionExerciseId] = [...existing, sessionSetId];
    },
    incrementSetsLogged(state) {
      state.setsLogged += 1;
    },
    incrementExercisesCompleted(state) {
      state.exercisesCompleted += 1;
    },
    setExerciseStats(
      state,
      action: PayloadAction<Record<string, ExerciseStatSnapshot>>,
    ) {
      state.exerciseStats = action.payload;
    },
    logCompletedSet(
      state,
      action: PayloadAction<{
        exerciseLibraryId: string;
        setNumber: number;
        set: LoggedSetResult;
      }>,
    ) {
      const { exerciseLibraryId, setNumber, set } = action.payload;
      const existing = state.completedSets[exerciseLibraryId] ?? {};
      state.completedSets[exerciseLibraryId] = { ...existing, [setNumber]: set };
    },
    startSessionTimer(state) {
      state.sessionStartedAt = new Date().toISOString();
    },
    clearSession: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const {
  initSession,
  addSessionSet,
  incrementSetsLogged,
  incrementExercisesCompleted,
  setExerciseStats,
  logCompletedSet,
  startSessionTimer,
  clearSession,
} = sessionSlice.actions;

export default sessionSlice.reducer;
