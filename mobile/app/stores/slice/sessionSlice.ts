/**
 * Active workout session state. Persisted to AsyncStorage (see sessionPersistConfig
 * in store.ts) so a mid-session app kill, force-quit, or OS-memory eviction
 * doesn't lose the user's progress — they can resume exactly where they were.
 *
 * Lifecycle:
 *   - startSession → initSession() repopulates everything for the new day
 *   - finishSession → resetSession() clears it back to initial
 *   - sign-out also clears via the signOutThunk extraReducer
 *
 * Pairs with the local-first sync queue: IDs in here are client-generated UUIDs,
 * so all writes (set log, complete exercise, etc.) can run offline using these
 * IDs directly, while the row inserts queue up for the next online flush.
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
  /**
   * Which program day this active session belongs to. Used at WorkoutScreen
   * mount to decide whether the persisted Redux session can be resumed for
   * the day the user is opening, or whether a fresh session has to be created.
   */
  programDayId: string | null;
  /** programDayExerciseId → sessionExerciseId */
  exerciseMap: Record<string, string>;
  /** sessionExerciseId → sessionSetId[] */
  setMap: Record<string, string[]>;
  setsLogged: number;
  exercisesCompleted: number;
  sessionStartedAt: string | null;
  /**
   * Duration (seconds) already committed to workout_sessions.duration_seconds
   * from PRIOR sittings of this same session. `sessionStartedAt` clocks only
   * the CURRENT sitting; on finish we write `accumulatedSeconds + (now -
   * sessionStartedAt)` so End Workout → Resume → End sums instead of
   * overwriting. Hydrated from the DB row's duration on resume, 0 for a fresh
   * session. Persisted so it survives an app kill between sittings.
   */
  accumulatedSeconds: number;
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
  /**
   * True while the session is paused (user tapped "Pause Workout" and left).
   * On pause, the current sitting's seconds are banked into accumulatedSeconds
   * and sessionStartedAt is cleared so the session clock freezes. Resume
   * (startSessionTimer) sets a fresh sessionStartedAt and clears this.
   */
  isPaused: boolean;
}

const initialState: SessionState = {
  sessionId: null,
  programDayId: null,
  exerciseMap: {},
  setMap: {},
  setsLogged: 0,
  exercisesCompleted: 0,
  sessionStartedAt: null,
  accumulatedSeconds: 0,
  exerciseStats: {},
  lastLoggedSetsByExercise: {},
  completedSets: {},
  suggestedWeightBySetId: {},
  completedExerciseIds: [],
  exerciseComments: {},
  isEditMode: false,
  isPaused: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    initSession(
      state,
      action: PayloadAction<{
        sessionId: string;
        programDayId: string;
        exerciseMap: Record<string, string>;
        setMap: Record<string, string[]>;
        /**
         * Seconds already committed from prior sittings. Passed on resume of a
         * partially-completed session (from the DB row's duration_seconds).
         * Omitted for a fresh session → resets to 0.
         */
        accumulatedSeconds?: number;
      }>,
    ) {
      state.sessionId = action.payload.sessionId;
      state.programDayId = action.payload.programDayId;
      state.exerciseMap = action.payload.exerciseMap;
      state.setMap = action.payload.setMap;
      state.setsLogged = 0;
      state.exercisesCompleted = 0;
      state.completedSets = {};
      state.completedExerciseIds = [];
      state.exerciseComments = {};
      state.suggestedWeightBySetId = {};
      state.sessionStartedAt = null;
      state.accumulatedSeconds = action.payload.accumulatedSeconds ?? 0;
      state.isEditMode = false;
      state.isPaused = false;
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
      state.isPaused = false;
    },
    /**
     * Pause Workout: bank the current sitting's seconds into accumulatedSeconds
     * and stop the clock. The session stays alive (sessionId + pending
     * exercises intact) so it can be resumed to the exact set later. Persisted,
     * so a pause survives an app kill.
     */
    pauseSessionTimer(state) {
      if (state.sessionStartedAt) {
        const segment = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(state.sessionStartedAt).getTime()) / 1000,
          ),
        );
        state.accumulatedSeconds += segment;
      }
      state.sessionStartedAt = null;
      state.isPaused = true;
    },
    /**
     * Heartbeat: fold the live segment so far into accumulatedSeconds and
     * restart the segment from now — WITHOUT pausing. Called every few seconds
     * by useSessionTimer while the clock runs, so the persisted total stays
     * current. That's what lets a cold start (below) freeze at the right time
     * even when the app was hard-killed without a clean "background" event.
     * Display stays continuous: accumulatedSeconds jumps up, the live segment
     * resets to ~0.
     */
    bankElapsed(state) {
      if (!state.sessionStartedAt) return;
      const segment = Math.floor(
        (Date.now() - new Date(state.sessionStartedAt).getTime()) / 1000,
      );
      if (segment <= 0) return;
      state.accumulatedSeconds += segment;
      state.sessionStartedAt = new Date().toISOString();
    },
    /**
     * Run ONCE on app launch (PersistGate onBeforeLift). If a running session
     * was rehydrated (sessionStartedAt still set), the app was killed while the
     * timer ran — the stale start would otherwise count all the time the app
     * was closed. Freeze it: drop the stale segment (already banked to within a
     * heartbeat) so the timer shows the saved total, then resume restarts the
     * clock. No-op if there's no running session (already paused / finished).
     */
    freezeSessionOnColdStart(state) {
      if (state.sessionStartedAt) {
        state.sessionStartedAt = null;
        state.isPaused = true;
      }
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
    /**
     * Wipes the active session. Called from finishSession after the workout
     * is complete so the next day starts clean. Keep this in sync with
     * `initialState` — adding a new field above requires resetting it here.
     */
    resetSession: () => initialState,
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
  pauseSessionTimer,
  bankElapsed,
  freezeSessionOnColdStart,
  setSuggestedWeights,
  clearSuggestedWeights,
  clearSession,
  resetSession,
  hydrateCompletedSets,
  hydrateCompletedExerciseIds,
  markExerciseCompleted,
  hydrateExerciseComments,
  setExerciseComment,
  setEditMode,
} = sessionSlice.actions;

export default sessionSlice.reducer;
