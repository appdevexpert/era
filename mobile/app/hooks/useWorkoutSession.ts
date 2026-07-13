/**
 * Hook that manages the workout session flow.
 * Reads from Redux (real Supabase data), calls sessionService for logging.
 * Session state lives in Redux sessionSlice so it survives screen navigation.
 */

import { useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { formatWeightFromKg } from "@/app/utils/workoutFormatters";
import type { SessionExercise, SessionWorkout } from "@/app/types/workout";
import { selectDayKindByProgramDayId } from "@/app/stores/selectors/workoutSelectors";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import {
  selectSessionId,
  selectSessionProgramDayId,
  selectExerciseMap,
  selectSetMap,
  selectSetsLogged,
  selectExercisesCompleted,
  selectSessionStartedAt,
  selectAccumulatedSeconds,
  selectExerciseStats,
  selectCompletedSets,
} from "@/app/stores/selectors/sessionSelectors";
import {
  initSession,
  addSessionSet,
  incrementSetsLogged,
  incrementExercisesCompleted,
  setExerciseStats,
  setLastLoggedSetsByExercise,
  logCompletedSet,
  startSessionTimer,
  pauseSessionTimer,
  setSuggestedWeights,
  hydrateCompletedSets,
  hydrateCompletedExerciseIds,
  markExerciseCompleted,
  hydrateExerciseComments,
  setExerciseComment,
  setEditMode,
  resetSession,
} from "@/app/stores/slice/sessionSlice";
import { uuidv4 } from "@/app/utils/uuid";
import {
  bumpSummariesRevision,
  markDayCompleted,
  setCompletedDayDuration,
} from "@/app/stores/slice/workoutSlice";
import {
  appendPointEvent,
  loadRewardBootstrap,
  setStreak,
} from "@/app/stores/slice/rewardSlice";
import type { ExerciseStatSnapshot, LastLoggedSetSnapshot } from "@/app/stores/slice/sessionSlice";
import { mapSessionWorkout, getScreenForExercise } from "@/app/utils/workoutMappers";
import { useEntitlement } from "@/app/hooks/useEntitlement";
import { useSyncQueue } from "@/app/hooks/useSyncQueue";
import { useAutoPauseOnBackground } from "@/app/hooks/useAutoPauseOnBackground";
import * as sessionService from "@/app/services/sessionService";
import { firePRAlert } from "@/app/utils/notifications";
import { suggestFutureSetWeights } from "@/app/utils/setSuggestion";

/** PR detail shaped for PRScreen route params — returned by completeExerciseResult. */
export interface CompletedExercisePRDetail {
  exerciseName: string;
  exerciseCategory: string;
  weightLabel: string;
  reps: number;
  previousBestLabel: string;
  points: number;
}

export const useWorkoutSession = (programDayId?: string) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { syncWrite, enqueueWrite, flushQueue } = useSyncQueue();
  const { i18n, t } = useTranslation();
  // Freeze the session clock if the app is backgrounded/killed mid-workout so
  // closed time is never counted (user resumes with ▶). Lives here because this
  // hook is only used by the active-workout screens. See PAUSE_WORKOUT.md.
  useAutoPauseOnBackground();
  // Smart Weight Engine is a Standard+ feature — free users keep the raw
  // planned weight without auto-adjustment from feedback (PAYMENT_FEATURE.md).
  const { hasStandard } = useEntitlement();
  // Architectural rule: the session's day MUST be addressed by an explicit
  // program_day_id. Reading workout.currentDayDetail directly is forbidden
  // here because that field is bootstrap-time "today" and drifts across
  // calendar rollover + day-strip taps (root cause of Rami 2026-06-21..27).
  //
  // Priority:
  //   1. explicit `programDayId` arg — passed by WorkoutCountdownScreen
  //      with the day the user just selected.
  //   2. session.programDayId — once startSession runs, this is the source
  //      of truth for the active session (covers WorkoutLog / RestTimer /
  //      etc. which mount without an explicit arg).
  //   3. nothing — return null and let the caller render a loading state.
  //      We deliberately do NOT fall back to currentDayDetail; silent
  //      fallback is the regression we're guarding against.
  const targetDayId = useSelector((state: RootState) => {
    return programDayId ?? state.session.programDayId ?? null;
  });
  const currentDayDetail = useSelector((state: RootState) => {
    if (!targetDayId) return null;
    const cached = state.workout.dayDetailsById[targetDayId];
    if (cached) return cached;
    // Bootstrap seeds currentDayDetail before it lands in dayDetailsById on
    // the very first render after a cold load — accept it only when the day
    // ids match. Any mismatch means stale data; refuse and wait.
    if (state.workout.currentDayDetail?.day.id === targetDayId) {
      return state.workout.currentDayDetail;
    }
    return null;
  });
  // Tripwire — surfaces the "no day in scope" case (means a caller forgot to
  // pass programDayId AND there's no active session). Without this we'd
  // silently render an empty session and the bug would be hard to spot.
  if (__DEV__ && targetDayId == null) {
    console.warn(
      "[useWorkoutSession] No programDayId resolved (explicit arg + session.programDayId both empty). Returning empty session.",
    );
  }
  const user = useSelector(selectUser);
  const userId = user?.id ?? "";

  // Session state from Redux (survives navigation AND app kill — persisted)
  const sessionId = useSelector(selectSessionId);
  const sessionProgramDayId = useSelector(selectSessionProgramDayId);
  // workout_kind for THIS session's day. Sourced from session.programDayId,
  // not currentDayDetail — the latter tracks the home screen's "today" and
  // can drift away from the active session after a calendar rollover or
  // app rebuild.
  const sessionDayKind = useSelector(
    selectDayKindByProgramDayId(sessionProgramDayId),
  );
  const exerciseMap = useSelector(selectExerciseMap);
  const setMap = useSelector(selectSetMap);
  const setsLogged = useSelector(selectSetsLogged);
  const exercisesCompleted = useSelector(selectExercisesCompleted);
  const sessionStartedAt = useSelector(selectSessionStartedAt);
  const accumulatedSeconds = useSelector(selectAccumulatedSeconds);
  const exerciseStatsMap = useSelector(selectExerciseStats);
  const completedSetsMap = useSelector(selectCompletedSets);
  const completedExerciseIds = useSelector(
    (state: RootState) => state.session.completedExerciseIds,
  );
  const isEditMode = useSelector((state: RootState) => state.session.isEditMode);
  const weightUnitPref = useSelector(
    (state: RootState) => state.preferences.weightUnit,
  );
  const prAlertsEnabled = useSelector(
    (state: RootState) => state.preferences.notifications.prAlerts,
  );
  const isDeloadWeek = useSelector(
    (state: RootState) => state.workout.assignment?.is_deload_week === true,
  );
  const usesTopSetBackoff = useSelector((state: RootState) => {
    const program = state.workout.overview?.program;
    return program?.gender === "male" && program?.level === "advanced";
  });
  // User's saved exercise ordering for THIS session's day. Keyed by targetDayId
  // (the resolved programDayId), NOT state.workout.currentDayDetail — same
  // locked rule as the day resolution above, so the session runs the exercises
  // in the order the user set for the day they actually selected.
  const orderOverride = useSelector((state: RootState) =>
    targetDayId ? state.workout.userExerciseOrderByDay[targetDayId] : undefined,
  );

  const sessionWorkout: SessionWorkout | null = useMemo(
    () =>
      currentDayDetail
        ? mapSessionWorkout(currentDayDetail, i18n.language, {
            isDeloadWeek,
            usesTopSetBackoff,
            orderOverride,
          })
        : null,
    [currentDayDetail, i18n.language, isDeloadWeek, usesTopSetBackoff, orderOverride],
  );

  const totalExercises = sessionWorkout?.exercises.length ?? 0;

  /**
   * Start (or resume) the session.
   * - If an in_progress row exists for (user, program_day) → resume it (load DB state into Redux).
   * - If a completed row exists → hydrate it; `editMode` controls only whether isEditMode
   *   is set (Start Again = true, Resume on End-Workout-early = false). Hydration always
   *   happens because the caller (countdown screen) navigates into WorkoutLog regardless,
   *   and writes would silently bail on empty maps.
   * - Otherwise → insert fresh session + exercises + sets.
   * On race conditions, the unique index throws; we catch and re-query, then resume.
   */
  const startSession = useCallback(async (
    options?: { editMode?: boolean },
  ): Promise<"started" | "resumed" | "edit_mode" | "already_completed" | "failed"> => {
    if (!sessionWorkout || !userId) return "failed";

    const editMode = options?.editMode === true;
    const programDayId = sessionWorkout.programDayId;

    // Hard-reset any stale session left over from a different day. Hits the
    // calendar-rollover / timezone-change case where Tuesday's session_id +
    // completedSets + exerciseMap survive in persisted Redux while the user
    // is opening Wednesday's workout. Without this wipe, an in_progress / completed
    // row hit on `findExistingSession` below would hydrateFromState() with the
    // wrong day's session_exercises and the WorkoutLog screen would render
    // yesterday's exercises with yesterday's prefilled set values.
    if (
      sessionProgramDayId &&
      sessionProgramDayId !== programDayId
    ) {
      dispatch(resetSession());
    }

    const hydrateExerciseData = async () => {
      const exerciseLibraryIds = sessionWorkout.exercises.map((ex) => ex.exerciseLibraryId);
      // Run both lookups in parallel — single bootstrap round-trip cost.
      const [statsMap, lastLoggedMap] = await Promise.all([
        sessionService.fetchUserExerciseStats(userId, exerciseLibraryIds),
        sessionService.fetchLastLoggedSetsByIndex(userId, exerciseLibraryIds),
      ]);
      const statsObj: Record<string, ExerciseStatSnapshot> = {};
      for (const [exId, stat] of statsMap.entries()) {
        statsObj[exId] = {
          lastWeight: stat.last_weight_value,
          lastWeightUnit: stat.last_weight_unit,
          lastReps: stat.last_reps,
          bestWeight: stat.best_weight_value,
          bestWeightUnit: stat.best_weight_unit,
          bestReps: stat.best_reps,
        };
      }
      const lastLoggedObj: Record<string, Record<number, LastLoggedSetSnapshot>> = {};
      for (const [exId, perIndex] of lastLoggedMap.entries()) {
        lastLoggedObj[exId] = perIndex;
      }
      return { statsObj, lastLoggedObj };
    };

    const dispatchHydratedExerciseData = async () => {
      const { statsObj, lastLoggedObj } = await hydrateExerciseData();
      dispatch(setExerciseStats(statsObj));
      dispatch(setLastLoggedSetsByExercise(lastLoggedObj));
    };

    /**
     * Local-first session creation. All IDs are generated client-side, Redux
     * is updated synchronously, then the row inserts are queued for the next
     * online flush. If the user is offline the function still returns a
     * fully-usable session — every subsequent write (set log, complete
     * exercise, finish session) references these IDs and runs through the
     * same sync queue.
     */
    const insertFresh = () => {
      const localSessionId = uuidv4();
      const exerciseMapObj: Record<string, string> = {};
      for (const ex of sessionWorkout.exercises) {
        exerciseMapObj[ex.id] = uuidv4();
      }
      const setMapObj: Record<string, string[]> = {};
      const setIdsByExercise: Record<string, Record<number, string>> = {};
      for (const ex of sessionWorkout.exercises) {
        const seId = exerciseMapObj[ex.id];
        const setIds: string[] = [];
        const idsBySetNumber: Record<number, string> = {};
        for (const s of ex.sets) {
          const id = uuidv4();
          setIds.push(id);
          idsBySetNumber[s.setNumber] = id;
        }
        setMapObj[seId] = setIds;
        setIdsByExercise[seId] = idsBySetNumber;
      }

      // 1. Insert workout_sessions row.
      enqueueWrite("createWorkoutSession", {
        id: localSessionId,
        userId,
        programDayId,
        totalExercises,
        startedAt: new Date().toISOString(),
      });

      // 2. Insert session_exercises rows. Depends on (1) via FK — sync queue
      //    processes FIFO so the order is preserved.
      enqueueWrite("createSessionExercises", {
        sessionId: localSessionId,
        // Serialize the SessionExercise[] shape we need to reconstruct the rows.
        // Storing primitives only so AsyncStorage/redux-persist can round-trip cleanly.
        exercises: sessionWorkout.exercises.map((ex) => ({
          id: ex.id,
          exerciseLibraryId: ex.exerciseLibraryId,
          sectionKind: ex.sectionKind,
          name: ex.name,
          exerciseCategory: ex.exerciseCategory,
        })),
        prebuiltIds: exerciseMapObj,
      });

      // 3. Insert session_sets rows per exercise. Depends on (2) via FK.
      for (const ex of sessionWorkout.exercises) {
        if (ex.sets.length === 0) continue;
        const seId = exerciseMapObj[ex.id];
        enqueueWrite("createSessionSets", {
          sessionExerciseId: seId,
          sets: ex.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            setKind: s.setKind,
            targetWeight: s.targetWeight,
            targetWeightUnit: s.targetWeightUnit,
            targetReps: s.targetReps,
            targetRepsMin: s.targetRepsMin,
            targetRepsMax: s.targetRepsMax,
            targetDuration: s.targetDuration,
            restSeconds: s.restSeconds,
            displayLabel: s.displayLabel,
          })),
          prebuiltIds: setIdsByExercise[seId],
        });
      }

      return { sessionId: localSessionId, exerciseMap: exerciseMapObj, setMap: setMapObj };
    };

    const hydrateFromState = (
      id: string,
      state: NonNullable<Awaited<ReturnType<typeof sessionService.loadSessionState>>>,
      edit: boolean,
      priorSeconds: number,
    ) => {
      dispatch(initSession({
        sessionId: id,
        programDayId,
        exerciseMap: state.exerciseMap,
        setMap: state.setMap,
        // Seed the base with the time already saved on this session so the
        // next End Workout sums onto it instead of overwriting it.
        accumulatedSeconds: priorSeconds,
      }));
      dispatch(hydrateCompletedSets(state.completedSets));
      dispatch(hydrateCompletedExerciseIds(state.completedExerciseIds));
      dispatch(hydrateExerciseComments(state.exerciseComments));
      dispatch(setEditMode(edit));
    };

    // 0. If Redux already has a persisted session for this exact program day,
    //    resume from local state without touching the network. Survives app
    //    kill and works fully offline. This is the local-first happy path.
    if (sessionId && sessionProgramDayId === programDayId && !editMode) {
      // Re-fetch exercise stats (historical bests + last-logged sets) so the
      // ruler / chip values reflect the latest data — these slices are not
      // persisted on purpose. Best-effort; UI still works if the network fails.
      try {
        await dispatchHydratedExerciseData();
      } catch (err) {
        console.warn("[session] re-hydrate stats failed (offline?)", err);
      }
      // Make sure any queued session-create / log writes get retried.
      flushQueue();
      if (!sessionStartedAt) dispatch(startSessionTimer());
      return "resumed";
    }

    try {
      const existing = await sessionService.findExistingSession({ userId, programDayId });

      if (existing?.status === "completed") {
        // Always hydrate — covers both Start Again (editMode=true, full redo)
        // and Resume Workout on a session that was ended early via "End Workout"
        // (status='completed' but exercises_completed < totalPlanned, editMode=false).
        // Without hydration the caller would land on WorkoutLog with empty
        // exerciseMap/setMap and every logSetResult would silently bail.
        const state = await sessionService.loadSessionState(existing.id);
        if (!state) return "already_completed";
        hydrateFromState(existing.id, state, editMode, existing.durationSeconds);
        await dispatchHydratedExerciseData();
        dispatch(startSessionTimer());
        return editMode ? "edit_mode" : "resumed";
      }

      if (existing?.status === "in_progress") {
        const state = await sessionService.loadSessionState(existing.id);
        if (!state) {
          // Corrupt row (no children) — self-heal: delete it and start fresh.
          console.warn("[session] corrupt in_progress row, recreating", existing.id);
          try {
            await sessionService.deleteWorkoutSession(existing.id);
          } catch (err) {
            console.warn("[session] delete corrupt session failed", err);
          }
          const fresh = insertFresh();
          dispatch(initSession({ ...fresh, programDayId }));
          await dispatchHydratedExerciseData();
          dispatch(startSessionTimer());
          flushQueue();
          return "started";
        }
        hydrateFromState(existing.id, state, false, existing.durationSeconds);
        await dispatchHydratedExerciseData();
        dispatch(startSessionTimer());
        return "resumed";
      }

      // Nothing exists on the server — insert fresh locally + queue the inserts.
      const fresh = insertFresh();
      dispatch(initSession({ ...fresh, programDayId }));
      await dispatchHydratedExerciseData();
      dispatch(startSessionTimer());
      flushQueue();
      return "started";
    } catch (err) {
      // Network failure on findExistingSession or loadSessionState (the only
      // calls still made online) — fall back to a fresh local session. The
      // unique constraint on (user_id, program_day_id) is handled by 23505 =
      // success in the queue, so a parallel-device race is idempotent.
      console.warn("[session] online lookup failed, starting locally", err);
      const fresh = insertFresh();
      dispatch(initSession({ ...fresh, programDayId }));
      try {
        await dispatchHydratedExerciseData();
      } catch (statErr) {
        console.warn("[session] hydrate stats failed (offline?)", statErr);
      }
      dispatch(startSessionTimer());
      flushQueue();
      return "started";
    }
  }, [
    sessionWorkout,
    userId,
    totalExercises,
    dispatch,
    sessionId,
    sessionProgramDayId,
    sessionStartedAt,
    enqueueWrite,
    flushQueue,
  ]);

  /**
   * Self-heal — guarantees the session maps (exerciseMap / setMap) are populated
   * before any log/complete write. Required because both Redux-persist rehydration
   * and a partially-completed startSession() can leave us with currentSessionId
   * set but maps empty, which makes every logSetResult silently bail.
   *
   * Returns the FRESH maps (not the stale closure values) so callers can retry
   * lookups immediately without waiting for React to re-render the hook.
   */
  const ensureSessionHydrated = useCallback(async (): Promise<{
    exerciseMap: Record<string, string>;
    setMap: Record<string, string[]>;
  } | null> => {
    if (!sessionId) return null;
    if (Object.keys(exerciseMap).length > 0) {
      return { exerciseMap, setMap };
    }
    try {
      const state = await sessionService.loadSessionState(sessionId);
      if (!state) {
        console.warn("[session] ensureSessionHydrated: loadSessionState empty", sessionId);
        return null;
      }
      dispatch(initSession({
        sessionId,
        // Keep whatever programDayId Redux already had — this rehydration
        // path only runs for an existing session, so the day association
        // doesn't change.
        programDayId: sessionProgramDayId ?? "",
        exerciseMap: state.exerciseMap,
        setMap: state.setMap,
        // Preserve the committed-time base — this is a map self-heal, not a
        // new session, so we must not reset the accumulated duration to 0.
        accumulatedSeconds,
      }));
      dispatch(hydrateCompletedSets(state.completedSets));
      dispatch(hydrateCompletedExerciseIds(state.completedExerciseIds));
      dispatch(hydrateExerciseComments(state.exerciseComments));
      return { exerciseMap: state.exerciseMap, setMap: state.setMap };
    } catch (err) {
      console.error("[session] ensureSessionHydrated failed", err);
      return null;
    }
  }, [sessionId, sessionProgramDayId, exerciseMap, setMap, accumulatedSeconds, dispatch]);

  /** Navigate to the correct screen for an exercise. startSet is 0-based. */
  const navigateToExercise = useCallback(
    (exerciseIndex: number, startSet = 0, direction: "forward" | "back" = "forward") => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      const slideFrom = direction === "back" ? "left" as const : "right" as const;
      const screen = getScreenForExercise(ex);

      switch (screen) {
        case "WorkoutLog":
          navigation.replace("WorkoutLog", {
            exerciseName: ex.name,
            exerciseCategory: ex.category,
            exerciseIndex: exerciseIndex + 1,
            totalExercises,
            setCount: ex.setCount,
            showWeight: ex.showWeight,
            currentSet: startSet,
            slideFrom,
          });
          break;
        case "TimerLog":
          navigation.replace("TimerLog", {
            exerciseName: ex.name,
            exerciseCategory: ex.category,
            exerciseIndex: exerciseIndex + 1,
            totalExercises,
            setCount: ex.setCount,
            currentSet: startSet,
            idealTime: ex.idealTime,
            topTime: ex.topTime,
            slideFrom,
          });
          break;
        case "CardioTimer":
          navigation.replace("CardioTimer", {
            exerciseName: ex.name,
            exerciseCategory: ex.category,
            exerciseIndex: exerciseIndex + 1,
            totalExercises,
            duration: ex.targetDuration ?? 1200,
            idealTime: ex.idealTime,
            topTime: ex.topTime,
            slideFrom,
          });
          break;
      }
    },
    [navigation, sessionWorkout, totalExercises],
  );

  /** Log a completed set to Supabase */
  const logSetResult = useCallback(
    async (
      exerciseIndex: number,
      setNumber: number,
      weight: number | null,
      reps: number | null,
      feedback: "light_weight" | "correct_weight" | "felt_heavy" | null,
      duration: number | null = null,
      comment: string | null = null,
    ) => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      // Self-heal: if maps are missing, try rehydrating from DB before bailing.
      let seId = exerciseMap[ex.id];
      let setIds = seId ? setMap[seId] : undefined;
      let ssId = setIds?.[setNumber];
      if ((!seId || !ssId) && sessionId) {
        const hydrated = await ensureSessionHydrated();
        if (hydrated) {
          seId = hydrated.exerciseMap[ex.id];
          setIds = seId ? hydrated.setMap[seId] : undefined;
          ssId = setIds?.[setNumber];
        }
      }
      if (!seId || !ssId) {
        Toast.show({
          type: "error",
          text2: t("workout.ui.sessionSyncError"),
          visibilityTime: 3000,
        });
        return;
      }

      const alreadyLogged = (completedSetsMap[ex.exerciseLibraryId] ?? {})[setNumber] != null;
      if (!alreadyLogged) dispatch(incrementSetsLogged());
      dispatch(logCompletedSet({
        exerciseLibraryId: ex.exerciseLibraryId,
        setNumber,
        set: {
          weight,
          weightUnit: ex.weightUnit,
          reps,
          duration,
          feedback,
          comment,
        },
      }));

      const logParams = {
        sessionSetId: ssId,
        loggedWeight: weight,
        loggedWeightUnit: ex.weightUnit,
        loggedReps: reps,
        loggedDuration: duration,
        feedback,
        comment,
        isBestSet: false,
        isPersonalRecord: false,
        previousBestWeight: null,
        previousBestReps: null,
        restSecondsTaken: null,
      };
      await syncWrite("logSet", logParams as Record<string, unknown>, () =>
        sessionService.logSet(logParams),
      );

      // Smart weight adjustment — suggest weights for the upcoming sets
      // of this same exercise based on the user's feedback. Standard+ only.
      //
      // Work off the LIVE set array (setIds), NOT ex.sets: the latter is the
      // static planned-set list from bootstrap and never includes sets the user
      // adds mid-exercise via the "+" button. Resolving each kind by index
      // (planned → ex.sets[i]; added → the last planned set's kind, which is
      // exactly the template addSet() clones) lets the feedback delta carry into
      // manually-added sets too — and into the set after a just-logged added one.
      const liveSetIds = setIds ?? [];
      const lastPlannedKind = ex.sets[ex.sets.length - 1]?.setKind ?? "working";
      const kindForIndex = (i: number) => ex.sets[i]?.setKind ?? lastPlannedKind;
      if (hasStandard && feedback && weight != null && setNumber < liveSetIds.length) {
        const futureSets = liveSetIds
          .slice(setNumber + 1)
          .map((id, offset) => ({ id, setKind: kindForIndex(setNumber + 1 + offset) }))
          .filter((s) => s.id);
        const suggestions = suggestFutureSetWeights({
          loggedWeight: weight,
          feedback,
          exerciseCategory: ex.exerciseCategory,
          currentSetKind: kindForIndex(setNumber),
          futureSets,
        });
        if (Object.keys(suggestions).length > 0) {
          dispatch(setSuggestedWeights(suggestions));
        }
      }

      // +15 ERA points per logged STRENGTH set (weight or reps).
      // Duration-only sets (incline walk, treadmill, etc.) are NOT covered
      // by this rule — per the spec image, walking gets `+1 / 100 steps`
      // and running gets `+4 / minute`, both deferred until those data
      // sources exist. Until then, those exercises only earn the +50 for
      // completing the session (and +150 if it's the Cardio 4×4 day).
      //
      // Award once per set, on its FIRST real log. `alreadyLogged` (from the
      // hydrated completedSetsMap) is the dedup — it's true for any set already
      // saved in the DB, so re-editing a completed set never re-pays. A set
      // that was NEVER logged (e.g. a previously-skipped exercise now completed
      // via Start Again) has alreadyLogged=false, so it correctly earns +15 the
      // first time. This is why we key on !alreadyLogged, not !isEditMode.
      if (!alreadyLogged && userId && (weight != null || reps != null)) {
        const awardParams = {
          userId,
          sessionId: sessionId ?? null,
          eventType: "set_logged" as const,
          points: 15,
          title: `Set Logged · ${ex.name}`,
        };
        // Optimistic local update so the chip + Points history reflect the
        // new event immediately, without waiting for the next bootstrap.
        dispatch(appendPointEvent({
          id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          event_type: "set_logged",
          title: awardParams.title,
          points: awardParams.points,
          occurred_at: new Date().toISOString(),
          session_id: sessionId ?? null,
        }));
        await syncWrite("awardSetPoints", awardParams as Record<string, unknown>, () =>
          sessionService.awardPoints(awardParams),
        );
      }
    },
    [sessionWorkout, exerciseMap, setMap, completedSetsMap, dispatch, syncWrite, userId, sessionId, ensureSessionHydrated, t, hasStandard],
  );

  /** Complete an exercise. Returns PR detail when this exercise broke a max_weight PR. */
  const completeExerciseResult = useCallback(
    async (
      exerciseIndex: number,
      comment?: string,
    ): Promise<{ prDetail: CompletedExercisePRDetail | null }> => {
      if (!sessionWorkout) return { prDetail: null };
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return { prDetail: null };

      // Self-heal: rehydrate maps if missing before any session writes.
      let seId = exerciseMap[ex.id];
      let activeSetMap = setMap;
      if (!seId && sessionId) {
        const hydrated = await ensureSessionHydrated();
        if (hydrated) {
          seId = hydrated.exerciseMap[ex.id];
          activeSetMap = hydrated.setMap;
        }
      }
      if (!seId) {
        Toast.show({
          type: "error",
          text2: t("workout.ui.sessionSyncError"),
          visibilityTime: 3000,
        });
        return { prDetail: null };
      }

      const alreadyCompleted = completedExerciseIds.includes(seId);

      // Mirror whatever comment we're about to persist so a return-visit reads
      // the latest text from Redux without a DB round-trip.
      if (comment !== undefined) {
        dispatch(setExerciseComment({
          exerciseLibraryId: ex.exerciseLibraryId,
          comment: comment ?? "",
        }));
      }

      if (!alreadyCompleted) {
        dispatch(incrementExercisesCompleted());
        dispatch(markExerciseCompleted(seId));
        await syncWrite(
          "completeExercise",
          { id: seId, comment: comment ?? null },
          () => sessionService.completeExercise(seId, comment),
        );
      } else if (comment) {
        // Re-edit: still persist a refreshed comment so user's latest note wins.
        await syncWrite(
          "completeExercise",
          { id: seId, comment },
          () => sessionService.completeExercise(seId, comment),
        );
      }

      if (!userId || !sessionId) return { prDetail: null };

      const setIds = activeSetMap[seId] ?? [];
      const lastSetId = setIds.length > 0 ? setIds[setIds.length - 1] : null;

      // Use actual logged values from this session, not planned values
      const loggedMap = completedSetsMap[ex.exerciseLibraryId] ?? {};
      const logged = Object.values(loggedMap);
      const lastLogged = logged.length > 0 ? logged[logged.length - 1] : null;

      // Find the best set (highest weight, then highest reps as tiebreaker).
      // Track setNumber too so we can attribute the PR row + is_personal_record
      // flag to the actual heaviest set, not just the last one.
      const historical = exerciseStatsMap[ex.exerciseLibraryId];
      let bestSetNumber = -1;
      let bestLogged: { weight: number; reps: number } | null = null;
      for (const [setNumStr, s] of Object.entries(loggedMap)) {
        if (s.weight == null) continue;
        const reps = s.reps ?? 0;
        if (
          !bestLogged ||
          s.weight > bestLogged.weight ||
          (s.weight === bestLogged.weight && reps > bestLogged.reps)
        ) {
          bestLogged = { weight: s.weight, reps };
          bestSetNumber = Number(setNumStr);
        }
      }
      const bestSetId = bestSetNumber >= 0 ? (setIds[bestSetNumber] ?? null) : null;

      const isBest = bestLogged != null && (
        !historical?.bestWeight ||
        bestLogged.weight > historical.bestWeight ||
        (bestLogged.weight === historical.bestWeight && bestLogged.reps > (historical.bestReps ?? 0))
      );

      const statParams = {
        userId,
        exerciseId: ex.exerciseLibraryId,
        lastWeight: lastLogged?.weight ?? null,
        lastWeightUnit: lastLogged?.weightUnit ?? ex.weightUnit,
        lastReps: lastLogged?.reps ?? null,
        lastDuration: lastLogged?.duration ?? null,
        lastFeedback: null,
        sessionSetId: lastSetId,
        isBest,
        bestWeight: isBest ? bestLogged!.weight : undefined,
        bestReps: isBest ? bestLogged!.reps : undefined,
      };
      await syncWrite("upsertUserExerciseStat", statParams as Record<string, unknown>, () =>
        sessionService.upsertUserExerciseStat(statParams),
      );

      // PR detection — locked to max_weight only (see doc/PR_FEATURE.md).
      // Attribute to the actual best set, not lastSetId — otherwise the
      // Exercise History badge lands on the wrong row.
      let prDetail: CompletedExercisePRDetail | null = null;
      if (bestLogged && bestSetId) {
        try {
          if (alreadyCompleted) {
            // Edit / re-visit path: upgrade the existing session PR in place,
            // never insert a new row and never award points again.
            const upd = await sessionService.updateSessionPRIfHigher({
              userId,
              exerciseId: ex.exerciseLibraryId,
              sessionId,
              newBestWeight: bestLogged.weight,
              newBestReps: bestLogged.reps,
              newBestSessionSetId: bestSetId,
              weightUnit: ex.weightUnit,
            });
            if (upd.updated) {
              if (upd.previousSessionSetId && upd.previousSessionSetId !== bestSetId) {
                try {
                  await sessionService.clearSetPersonalRecordFlag(upd.previousSessionSetId);
                } catch (err) {
                  console.warn("[useWorkoutSession] clearSetPersonalRecordFlag failed", err);
                }
              }
              try {
                await sessionService.markSetAsPersonalRecord(bestSetId);
              } catch (err) {
                console.warn("[useWorkoutSession] markSetAsPersonalRecord (edit) failed", err);
              }
            }
            // Edit-mode never returns prDetail — no PR celebration screen
            // for an exercise that was already completed once.
          } else {
            const result = await sessionService.checkAndCreateSetPRs({
              userId,
              exerciseId: ex.exerciseLibraryId,
              exerciseName: ex.name,
              sessionId,
              sessionExerciseId: seId,
              sessionSetId: bestSetId,
              loggedWeight: bestLogged.weight,
              loggedReps: bestLogged.reps,
              weightUnit: ex.weightUnit,
            });

            if (result.prDetail) {
              // Flip is_personal_record so the History card renders the gold badge.
              try {
                await sessionService.markSetAsPersonalRecord(bestSetId);
              } catch (err) {
                console.warn("[useWorkoutSession] markSetAsPersonalRecord failed", err);
              }

              const { weightKg, reps, previousBestKg, weightUnit, points } = result.prDetail;
              prDetail = {
                exerciseName: ex.name,
                exerciseCategory: ex.exerciseCategory || ex.category || "compound",
                weightLabel: `${weightKg} ${weightUnit}`,
                reps,
                previousBestLabel:
                  previousBestKg > 0 ? `${previousBestKg} ${weightUnit}` : "—",
                points,
              };

              // Local push for the PR. Gated on the user's Profile toggle —
              // the in-app celebration screen still fires regardless.
              if (prAlertsEnabled) {
                firePRAlert(ex.name, `${weightKg} ${weightUnit}`).catch((err) =>
                  console.warn("[useWorkoutSession] firePRAlert failed", err),
                );
              }
            }
          }
        } catch (err) {
          console.warn("[useWorkoutSession] PR check failed", err);
        }
      }

      return { prDetail };
    },
    [sessionWorkout, exerciseMap, setMap, completedSetsMap, exerciseStatsMap, userId, sessionId, dispatch, syncWrite, completedExerciseIds, ensureSessionHydrated, t, prAlertsEnabled],
  );

  /**
   * Finish the entire session. Writes:
   *   - workout_sessions.status = "completed"
   *   - user_streak_days + user_reward_state via record_workout_completion RPC
   *   - +50 ERA "workout_completed" event
   *   - +150 ERA "cardio_completed" event if today's day is a cardio day
   *   - (the +200 seven-day bonus is added inside the RPC, no JS call needed)
   *
   * Returns a summary the caller can hand to the SessionComplete screen.
   */
  const finishSession = useCallback(async (): Promise<{
    newStreak: number;
    wasStreakExtended: boolean;
    sevenDayBonusPoints: number;
    workoutPoints: number;
    cardioBonusPoints: number;
    newPRs: number;
    /** Absolute total saved to the DB (all sittings) — drives the exercise-list "MINUTES" stat. */
    durationSeconds: number;
    /** This sitting only — drives the SessionComplete "SESSION DURATION" tile. */
    segmentSeconds: number;
  } | null> => {
    if (!sessionId) return null;

    // Time spent in THIS sitting only (sessionStartedAt is reset on each
    // resume). Add it to whatever prior sittings already committed so an
    // End Workout → Resume → End sums to the whole workout's time instead
    // of overwriting it. We write the ABSOLUTE total (not a DB-side +=), so
    // a sync-queue retry of completeSession stays idempotent.
    const segmentSeconds = sessionStartedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
      : 0;
    const durationSeconds = accumulatedSeconds + segmentSeconds;

    const sessionParams = { sessionId, durationSeconds, exercisesCompleted, setsLogged };
    await syncWrite("completeSession", sessionParams, () =>
      sessionService.completeSession(sessionParams),
    );

    // End Workout with exercises still unfinished → mark every not-completed
    // exercise as "skipped" so the day is fully accounted for (completed OR
    // skipped, nothing pending). That's what makes the day show "Start Again"
    // (done) instead of "Resume", and lets Start Again detect a skip→complete
    // to award points the first time. Local-first: fire now, retry via queue.
    // (No-op on a full completion — nothing is left un-completed.)
    const skippedSessionExerciseIds = Object.values(exerciseMap).filter(
      (seId) => !completedExerciseIds.includes(seId),
    );
    for (const seId of skippedSessionExerciseIds) {
      void syncWrite("skipExercise", { sessionExerciseId: seId }, () =>
        sessionService.skipExercise(seId),
      );
    }

    // Optimistically mark the day completed in Redux as soon as the server
    // write is enqueued — not at the navigation step. Any exit path after
    // finishSession (End Workout sheet, swipe-back, OS kill, mid-finish
    // navigation) leaves the day correctly marked, surviving until the
    // sync queue confirms the underlying UPDATE.
    //
    // Source is the session slice's own programDayId (set once at session
    // start, persisted across app kills). Do NOT derive this from
    // sessionWorkout / currentDayDetail — those track the home screen's
    // "today" and can point at a different day after an app rebuild or a
    // calendar rollover, which would leave the actual session's day
    // unmarked locally until the user logs out and back in.
    if (sessionProgramDayId) {
      dispatch(markDayCompleted(sessionProgramDayId));
      // Cache the actual minute count alongside the completion flag so the
      // Today's Workout card + ExerciseList stats render real duration
      // instantly on the next render, instead of falling back to the plan's
      // estimated_minutes until a Supabase refetch resolves.
      dispatch(
        setCompletedDayDuration({
          programDayId: sessionProgramDayId,
          durationMinutes: Math.round(durationSeconds / 60),
        }),
      );
    } else {
      console.warn(
        "[useWorkoutSession] finishSession ran with no sessionProgramDayId",
        { sessionId },
      );
    }

    // Tell WeightsScreen's exercise-summary fetch to refresh now that this
    // session's set writes are committed. Its live overlay (session.completedSets)
    // is about to be cleared on the SessionComplete screen; without this the
    // one-time fetch would show stale weights until the next cold app start.
    dispatch(bumpSummariesRevision());

    if (!userId) return null;

    // Idempotency guard: if the user ended this session earlier (partial
    // completion → status='completed'), then resumed and hit End Workout
    // again, we must NOT re-award the session-level bonuses. The DB has
    // a partial unique index on (session_id, event_type) for these two
    // types as the durable backstop; this client check avoids the
    // optimistic Redux bump and the wasted RPC round-trip.
    // Set-log points (+15) are already dedup'd via completedSetsMap.
    // Streak (+200) is dedup'd server-side per (user, date).
    let alreadyAwardedTypes = new Set<sessionService.PointEventType>();
    try {
      alreadyAwardedTypes = await sessionService.getAwardedSessionEventTypes(sessionId);
    } catch (err) {
      console.warn("[useWorkoutSession] getAwardedSessionEventTypes failed", err);
    }
    const workoutAlreadyAwarded = alreadyAwardedTypes.has("workout_completed");
    const cardioAlreadyAwarded = alreadyAwardedTypes.has("cardio_completed");

    // Streak + reward update first so the +50 event sees the correct
    // total_points and the 7-day bonus is folded in atomically.
    // Wrapped in try/catch so a missing/broken RPC can never block
    // navigation to the SessionComplete screen — the UI degrades to
    // "no streak update" instead of the button doing nothing.
    let streakResult: {
      newStreak: number;
      longestStreak: number;
      wasExtended: boolean;
      sevenDayBonusPoints: number;
      bonusEventId: string | null;
    } = { newStreak: 0, longestStreak: 0, wasExtended: false, sevenDayBonusPoints: 0, bonusEventId: null };
    // Use the device's *local* calendar date, not UTC. Otherwise a session
    // finished just past midnight local time gets bucketed under yesterday's
    // UTC date, silently breaking the streak across the day boundary.
    const now = new Date();
    const streakDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    try {
      streakResult = await sessionService.recordWorkoutCompletion({
        userId,
        sessionId,
        streakDate,
      });
    } catch (err) {
      console.warn("[useWorkoutSession] recordWorkoutCompletion failed, queuing for retry", err);
      enqueueWrite("recordWorkoutCompletion", { userId, sessionId, streakDate });
    }

    // Optimistic streak update for the chip + StreakBottomSheet.
    if (streakResult.newStreak > 0) {
      dispatch(setStreak({
        currentStreak: streakResult.newStreak,
        longestStreak: streakResult.longestStreak,
        lastStreakDate: streakDate,
      }));
    }
    if (streakResult.sevenDayBonusPoints > 0) {
      dispatch(appendPointEvent({
        id: streakResult.bonusEventId ?? `tmp-bonus-${Date.now()}`,
        event_type: "streak_added",
        title: `${streakResult.newStreak}-Day Streak Bonus`,
        points: streakResult.sevenDayBonusPoints,
        occurred_at: new Date().toISOString(),
        session_id: sessionId,
      }));
    }

    // +50 for finishing the session — only if this session hasn't already
    // been awarded workout_completed (see idempotency guard above).
    if (!workoutAlreadyAwarded) {
      const workoutAwardParams = {
        userId,
        sessionId,
        eventType: "workout_completed" as const,
        points: 50,
        title: "Workout Completed",
      };
      dispatch(appendPointEvent({
        id: `tmp-workout-${Date.now()}`,
        event_type: "workout_completed",
        title: workoutAwardParams.title,
        points: workoutAwardParams.points,
        occurred_at: new Date().toISOString(),
        session_id: sessionId,
      }));
      await syncWrite("awardWorkoutPoints", workoutAwardParams as Record<string, unknown>, () =>
        sessionService.awardPoints(workoutAwardParams),
      );
    }

    // +150 if THIS session's day is a cardio day. Look up by the session's
    // own programDayId — currentDayDetail can have moved to a different day
    // by the time finishSession runs (e.g., after a calendar rollover).
    const cardioBonusPoints = sessionDayKind === "cardio" ? 150 : 0;
    if (cardioBonusPoints > 0 && !cardioAlreadyAwarded) {
      const cardioAwardParams = {
        userId,
        sessionId,
        eventType: "cardio_completed" as const,
        points: cardioBonusPoints,
        title: "Cardio 4×4 Complete",
      };
      dispatch(appendPointEvent({
        id: `tmp-cardio-${Date.now()}`,
        event_type: "cardio_completed",
        title: cardioAwardParams.title,
        points: cardioAwardParams.points,
        occurred_at: new Date().toISOString(),
        session_id: sessionId,
      }));
      await syncWrite("awardCardioPoints", cardioAwardParams as Record<string, unknown>, () =>
        sessionService.awardPoints(cardioAwardParams),
      );
    }

    // Safety: refetch authoritative reward state so any optimistic drift
    // (duplicate event ids, missing fields) reconciles on the next render.
    dispatch(loadRewardBootstrap(userId)).catch(() => {});

    // Count the PR rows inserted for this session so SessionComplete can
    // show "X new PRs". Falls back to 0 if the read fails.
    let newPRs = 0;
    try {
      newPRs = await sessionService.countSessionPRs(sessionId);
    } catch (err) {
      console.warn("[useWorkoutSession] PR count failed", err);
    }

    return {
      newStreak: streakResult.newStreak,
      wasStreakExtended: streakResult.wasExtended,
      sevenDayBonusPoints: streakResult.sevenDayBonusPoints,
      workoutPoints: 50,
      cardioBonusPoints,
      newPRs,
      durationSeconds,
      segmentSeconds,
    };
  }, [
    sessionId,
    sessionStartedAt,
    accumulatedSeconds,
    exercisesCompleted,
    setsLogged,
    userId,
    sessionProgramDayId,
    sessionDayKind,
    exerciseMap,
    completedExerciseIds,
    syncWrite,
    enqueueWrite,
    dispatch,
  ]);

  /** Navigate to rest timer between sets or exercises */
  const navigateToRest = useCallback(
    (exerciseIndex: number, nextSet: number) => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      // Use the live set count from Redux (reflects + button additions),
      // not the planned setCount snapshot from session bootstrap.
      const seId = exerciseMap[ex.id];
      const liveSetCount = seId ? setMap[seId]?.length ?? ex.setCount : ex.setCount;

      navigation.replace("RestTimer", {
        exerciseIndex: exerciseIndex + 1,
        totalExercises,
        currentSet: nextSet,
        totalSets: liveSetCount,
        nextExerciseName: ex.name,
        restDuration: ex.restSeconds || 60,
      });
    },
    [navigation, sessionWorkout, totalExercises, exerciseMap, setMap],
  );

  /** Navigate to session complete — marks session done in Supabase first */
  const navigateToSessionComplete = useCallback(async () => {
    if (!sessionWorkout) return;

    // Edit mode (Start Again on an already-completed session): nothing new is
    // awarded — but the user expects the celebration screen they saw the first
    // time. Re-read the original totals from DB and push SessionComplete with
    // those values. No award_points / streak / PR-insert calls run.
    if (isEditMode) {
      dispatch(setEditMode(false));
      if (!sessionId) {
        navigation.popToTop();
        return;
      }
      let stats: Awaited<ReturnType<typeof sessionService.getSessionFinishedStats>> = null;
      try {
        stats = await sessionService.getSessionFinishedStats(sessionId);
      } catch (err) {
        console.warn("[useWorkoutSession] getSessionFinishedStats failed", err);
      }
      // SESSION DURATION shows THIS Start-Again sitting only (timer was stamped
      // when the user re-entered the workout), NOT the DB total from the
      // original completion — matches the Resume flow's "what I did this
      // session" semantics. Points / sets / PRs stay the historical DB values.
      const editElapsed = sessionStartedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
        : 0;
      const mins = Math.floor(editElapsed / 60);
      const secs = editElapsed % 60;
      navigation.replace("SessionComplete", {
        sessionId,
        programTitle: sessionWorkout.title,
        weekNumber: sessionWorkout.weekNumber,
        dayNumber: sessionWorkout.dayNumber,
        sessionDuration: `${mins}:${String(secs).padStart(2, "0")}`,
        setsLogged: stats?.setsLogged ?? 0,
        eraPoints: stats?.eraPoints ?? 0,
        newPRs: stats?.newPRs ?? 0,
        bonusPoints: stats?.bonusPoints ?? 0,
      });
      return;
    }

    // Defensive: any backend failure inside finishSession must NOT block the
    // navigation. We always continue to SessionComplete; failed writes will
    // be retried via the sync queue.
    // (markDayCompleted is dispatched inside finishSession itself, so it fires
    // regardless of which exit path the user takes after finishing.)
    let result: Awaited<ReturnType<typeof finishSession>> = null;
    try {
      result = await finishSession();
    } catch (err) {
      console.warn("[useWorkoutSession] finishSession threw", err);
    }

    // SessionComplete shows THIS sitting's duration only ("what I did in this
    // session"), not the accumulated total. The full total is what we saved to
    // the DB (result.durationSeconds) and is what the exercise-list "MINUTES"
    // stat reads back. Fall back to raw elapsed if finishSession bailed early.
    const elapsed =
      result?.segmentSeconds ??
      (sessionStartedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
        : 0);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    // ERA points earned in this session:
    //   sets × 15  +  workout (50)  +  cardio (150 if cardio day)  +  PRs × 100
    // Bonus points are tracked separately for the headline "+200 streak bonus"
    // line on the SessionComplete screen.
    const setPoints = setsLogged * 15;
    const eraPoints =
      setPoints +
      (result?.workoutPoints ?? 50) +
      (result?.cardioBonusPoints ?? 0) +
      (result?.newPRs ?? 0) * 100;
    const bonusPoints = result?.sevenDayBonusPoints ?? 0;

    navigation.replace("SessionComplete", {
      sessionId,
      programTitle: sessionWorkout.title,
      weekNumber: sessionWorkout.weekNumber,
      dayNumber: sessionWorkout.dayNumber,
      sessionDuration: `${mins}:${String(secs).padStart(2, "0")}`,
      setsLogged,
      eraPoints,
      newPRs: result?.newPRs ?? 0,
      bonusPoints,
    });

    // Clear the active session slice now that we've navigated away. The
    // SessionComplete screen reads its data from route params, so wiping
    // Redux can't blank it; this keeps tomorrow's session start clean.
    dispatch(resetSession());
  }, [navigation, sessionWorkout, sessionStartedAt, setsLogged, finishSession, dispatch, sessionId, isEditMode]);

  /**
   * Pause Workout: freeze the session clock (banks this sitting into
   * accumulatedSeconds) and leave the workout, landing back on the day's
   * ExerciseList where "Resume Workout" shows. The session stays alive
   * (sessionId + pending exercises intact, persisted), so resume re-enters
   * via the local-first branch in startSession — which keeps accumulatedSeconds
   * and restarts the timer, so the clock continues from where it froze.
   * No DB write: the persisted Redux session is the source of truth here.
   */
  const pauseSession = useCallback(() => {
    dispatch(pauseSessionTimer());
    navigation.goBack();
  }, [dispatch, navigation]);

  /**
   * Add a dynamic set for an exercise. Local-first: generate the UUID,
   * stash it in Redux immediately, and queue the row insert. Subsequent
   * set-logging on this new id works offline against the same UUID.
   */
  const addSet = useCallback(
    async (exerciseIndex: number) => {
      if (!sessionWorkout) return null;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return null;

      const seId = exerciseMap[ex.id];
      if (!seId) return null;

      const existingSetIds = setMap[seId] ?? [];
      const newSetNumber = existingSetIds.length + 1;
      const templateSet = ex.sets[ex.sets.length - 1] ?? ex.sets[0];
      const newSetId = uuidv4();
      const template = {
        setKind: templateSet?.setKind ?? "working",
        targetWeight: templateSet?.targetWeight ?? null,
        targetWeightUnit: templateSet?.targetWeightUnit ?? ex.weightUnit,
        targetReps: templateSet?.targetReps ?? null,
        targetRepsMin: templateSet?.targetRepsMin ?? null,
        targetRepsMax: templateSet?.targetRepsMax ?? null,
        targetDuration: templateSet?.targetDuration ?? null,
        restSeconds: templateSet?.restSeconds ?? null,
      };

      // Optimistic Redux update — UI sees the new set right away.
      dispatch(addSessionSet({ sessionExerciseId: seId, sessionSetId: newSetId }));

      // Fire-and-forget — syncWrite swallows errors and enqueues for retry,
      // so awaiting the Supabase round-trip just delays the caller's
      // resolved promise without affecting UI correctness. Returning right
      // after the local dispatch keeps tap → render path tight.
      void syncWrite(
        "createSingleSessionSet",
        { sessionExerciseId: seId, setNumber: newSetNumber, template, id: newSetId },
        () => sessionService.createSingleSessionSet(seId, newSetNumber, template, newSetId),
      );
      return newSetId;
    },
    [sessionWorkout, exerciseMap, setMap, dispatch, syncWrite],
  );

  /** Get current set count for an exercise from Redux */
  const getSetCount = useCallback(
    (exerciseIndex: number): number => {
      if (!sessionWorkout) return 0;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return 0;
      const seId = exerciseMap[ex.id];
      if (!seId) return ex.setCount;
      return setMap[seId]?.length ?? ex.setCount;
    },
    [sessionWorkout, exerciseMap, setMap],
  );

  /** Get best set and last set stats for an exercise (for SetStatCards) */
  const getExerciseSetStats = useCallback(
    (exerciseIndex: number): {
      bestSet: { weight: string; reps: number } | null;
      lastSet: { weight: string; reps: number } | null;
    } => {
      if (!sessionWorkout) return { bestSet: null, lastSet: null };
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return { bestSet: null, lastSet: null };

      const historical = exerciseStatsMap[ex.exerciseLibraryId];
      const logged = Object.values(completedSetsMap[ex.exerciseLibraryId] ?? {});

      // Last Set: last completed set in this session, or from previous session
      let lastSet: { weight: string; reps: number } | null = null;
      if (logged.length > 0) {
        const last = logged[logged.length - 1];
        if (last.weight != null) {
          lastSet = {
            weight: formatWeightFromKg(last.weight, weightUnitPref),
            reps: last.reps ?? 0,
          };
        }
      } else if (historical?.lastWeight != null) {
        lastSet = {
          weight: formatWeightFromKg(historical.lastWeight, weightUnitPref),
          reps: historical.lastReps ?? 0,
        };
      }

      // Best Set: best across (historical best + all logged sets this session)
      let bestWeight = historical?.bestWeight ?? null;
      let bestReps = historical?.bestReps ?? 0;

      for (const s of logged) {
        if (s.weight == null) continue;
        if (bestWeight == null || s.weight > bestWeight || (s.weight === bestWeight && (s.reps ?? 0) > bestReps)) {
          bestWeight = s.weight;
          bestReps = s.reps ?? 0;
        }
      }

      const bestSet = bestWeight != null
        ? { weight: formatWeightFromKg(bestWeight, weightUnitPref), reps: bestReps }
        : null;

      return { bestSet, lastSet };
    },
    [sessionWorkout, exerciseStatsMap, completedSetsMap, weightUnitPref],
  );

  /** Per-exercise comment cache (session_exercises.comment) for sheet prefill. */
  const exerciseCommentsMap = useSelector(
    (state: RootState) => state.session.exerciseComments,
  );
  const getExerciseComment = useCallback(
    (exerciseIndex: number): string => {
      if (!sessionWorkout) return "";
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return "";
      return exerciseCommentsMap[ex.exerciseLibraryId] ?? "";
    },
    [sessionWorkout, exerciseCommentsMap],
  );

  /** Log a cardio exercise (session_sets + session_cardio_logs) */
  const logCardioResult = useCallback(
    async (exerciseIndex: number, durationSeconds: number) => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      // Log to session_sets (standard tracking)
      await logSetResult(exerciseIndex, 0, null, null, null, durationSeconds);

      // Log to session_cardio_logs (cardio-specific)
      const seId = exerciseMap[ex.id];
      if (!seId) return;

      const cardioParams = { sessionExerciseId: seId, durationSeconds };
      await syncWrite("logCardio", cardioParams, () =>
        sessionService.logCardio(cardioParams),
      );
    },
    [sessionWorkout, exerciseMap, logSetResult, syncWrite],
  );

  /** Get exercise by 0-based index */
  const getExercise = useCallback(
    (index: number): SessionExercise | undefined =>
      sessionWorkout?.exercises[index],
    [sessionWorkout],
  );

  return {
    ready: sessionWorkout != null,
    sessionWorkout,
    totalExercises,
    sessionId,
    startSession,
    ensureSessionHydrated,
    navigateToExercise,
    navigateToRest,
    navigateToSessionComplete,
    pauseSession,
    logSetResult,
    logCardioResult,
    completeExerciseResult,
    finishSession,
    getExercise,
    setsLogged,
    exercisesCompleted,
    addSet,
    getSetCount,
    getExerciseSetStats,
    getExerciseComment,
  };
};
