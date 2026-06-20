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
  feedback: "light_weight" | "correct_weight" | "felt_heavy" | null;
  comment: string | null;
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

/** One row of inter-session seed data: per (exercise, setNumber) the most recent log. */
export interface LastLoggedSetSnapshot {
  weight: number;
  weightUnit: string;
  feedback: "light_weight" | "correct_weight" | "felt_heavy" | null;
  setKind: string;
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
  /**
   * Inter-session smart-weight seed: exerciseLibraryId → setNumber (1-based) →
   * most recent logged set. Fetched at session start, used to prefill the ruler
   * via computeInterSessionSeed in WorkoutLogScreen.
   */
  lastLoggedSetsByExercise: Record<string, Record<number, LastLoggedSetSnapshot>>;
  /** exerciseLibraryId → { setNumber: LoggedSetResult } — keyed by set index, no duplicates */
  completedSets: Record<string, Record<number, LoggedSetResult>>;
  /** sessionSetId → suggested kg for that upcoming set (smart weight adjustment). */
  suggestedWeightBySetId: Record<string, number>;
  /** sessionExerciseId set — exercises already marked complete in DB (or this session) */
  completedExerciseIds: string[];
  /** exerciseLibraryId → session_exercises.comment (per-exercise note) */
  exerciseComments: Record<string, string>;
  /**
   * True when the user re-opens an already-completed session via "Start Again".
   * In edit mode: set/PR/workout points are NOT re-awarded, exercise counters
   * don't re-increment, and finishing doesn't navigate to SessionComplete.
   */
  isEditMode: boolean;
}

const initialState: SessionState = {
  sessionId: null,
  exerciseMap: {},
  setMap: {},
  setsLogged: 0,
  exercisesCompleted: 0,
  sessionStartedAt: null,
  exerciseStats: {},
  lastLoggedSetsByExercise: {},
  completedSets: {},
  suggestedWeightBySetId: {},
  completedExerciseIds: [],
  exerciseComments: {},
  isEditMode: false,
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
      state.completedSets = {};
      state.completedExerciseIds = [];
      state.exerciseComments = {};
      state.isEditMode = false;
    },
    /**
     * Bulk-restore logged set values when resuming an existing session.
     * Keyed by exerciseLibraryId → setIndex (0-based).
     */
    hydrateCompletedSets(
      state,
      action: PayloadAction<Record<string, Record<number, LoggedSetResult>>>,
    ) {
      state.completedSets = action.payload;
    },
    /**
     * Restore the list of session_exercise ids that are already marked complete
     * in the database. Used so we don't double-count or re-award points on
     * re-visit / Start Again.
     */
    hydrateCompletedExerciseIds(
      state,
      action: PayloadAction<string[]>,
    ) {
      state.completedExerciseIds = action.payload;
      state.exercisesCompleted = action.payload.length;
    },
    markExerciseCompleted(state, action: PayloadAction<string>) {
      if (!state.completedExerciseIds.includes(action.payload)) {
        state.completedExerciseIds.push(action.payload);
      }
    },
    hydrateExerciseComments(
      state,
      action: PayloadAction<Record<string, string>>,
    ) {
      state.exerciseComments = action.payload;
    },
    setExerciseComment(
      state,
      action: PayloadAction<{ exerciseLibraryId: string; comment: string }>,
    ) {
      state.exerciseComments[action.payload.exerciseLibraryId] = action.payload.comment;
    },
    setEditMode(state, action: PayloadAction<boolean>) {
      state.isEditMode = action.payload;
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
    setLastLoggedSetsByExercise(
      state,
      action: PayloadAction<Record<string, Record<number, LastLoggedSetSnapshot>>>,
    ) {
      state.lastLoggedSetsByExercise = action.payload;
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
    /**
     * Stamp suggested weights for upcoming sets after a set is logged
     * with feedback. Replaces any previous suggestion for the same ids
     * so later sets stay in sync with the most recent feedback.
     */
    setSuggestedWeights(
      state,
      action: PayloadAction<Record<string, number>>,
    ) {
      Object.assign(state.suggestedWeightBySetId, action.payload);
    },
    clearSuggestedWeights(state, action: PayloadAction<string[]>) {
      for (const setId of action.payload) {
        delete state.suggestedWeightBySetId[setId];
      }
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
  setLastLoggedSetsByExercise,
  logCompletedSet,
  startSessionTimer,
  setSuggestedWeights,
  clearSuggestedWeights,
  clearSession,
  hydrateCompletedSets,
  hydrateCompletedExerciseIds,
  markExerciseCompleted,
  hydrateExerciseComments,
  setExerciseComment,
  setEditMode,
} = sessionSlice.actions;

export default sessionSlice.reducer;
