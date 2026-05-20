/**
 * Hook that manages the workout session flow.
 * Reads from Redux (real Supabase data), calls sessionService for logging.
 * Session state lives in Redux sessionSlice so it survives screen navigation.
 */

import { useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useAppDispatch } from "@/app/stores/store";
import type { SessionExercise, SessionWorkout } from "@/app/types/workout";
import { selectCurrentDayDetail } from "@/app/stores/selectors/workoutSelectors";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import {
  selectSessionId,
  selectExerciseMap,
  selectSetMap,
  selectSetsLogged,
  selectExercisesCompleted,
  selectSessionStartedAt,
  selectExerciseStats,
  selectCompletedSets,
} from "@/app/stores/selectors/sessionSelectors";
import {
  initSession,
  addSessionSet,
  incrementSetsLogged,
  incrementExercisesCompleted,
  setExerciseStats,
  logCompletedSet,
  startSessionTimer,
} from "@/app/stores/slice/sessionSlice";
import { markDayCompleted } from "@/app/stores/slice/workoutSlice";
import type { ExerciseStatSnapshot } from "@/app/stores/slice/sessionSlice";
import { mapSessionWorkout, getScreenForExercise } from "@/app/utils/workoutMappers";
import { useSyncQueue } from "@/app/hooks/useSyncQueue";
import * as sessionService from "@/app/services/sessionService";

export const useWorkoutSession = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { syncWrite } = useSyncQueue();
  const { i18n } = useTranslation();
  const currentDayDetail = useSelector(selectCurrentDayDetail);
  const user = useSelector(selectUser);
  const userId = user?.id ?? "";

  // Session state from Redux (survives navigation)
  const sessionId = useSelector(selectSessionId);
  const exerciseMap = useSelector(selectExerciseMap);
  const setMap = useSelector(selectSetMap);
  const setsLogged = useSelector(selectSetsLogged);
  const exercisesCompleted = useSelector(selectExercisesCompleted);
  const sessionStartedAt = useSelector(selectSessionStartedAt);
  const exerciseStatsMap = useSelector(selectExerciseStats);
  const completedSetsMap = useSelector(selectCompletedSets);

  const sessionWorkout: SessionWorkout | null = useMemo(
    () => (currentDayDetail ? mapSessionWorkout(currentDayDetail, i18n.language) : null),
    [currentDayDetail, i18n.language],
  );

  const totalExercises = sessionWorkout?.exercises.length ?? 0;

  /**
   * Start (or resume) the session.
   * - If an in_progress row exists for (user, program_day) → resume it (load DB state into Redux).
   * - If a completed row exists → block (do nothing; caller should route to a "view completed" screen).
   * - Otherwise → insert fresh session + exercises + sets.
   * On race conditions, the unique index throws; we catch and re-query, then resume.
   */
  const startSession = useCallback(async (): Promise<"started" | "resumed" | "already_completed" | "failed"> => {
    if (!sessionWorkout || !userId) return "failed";

    const programDayId = sessionWorkout.programDayId;

    const hydrateStats = async () => {
      const exerciseLibraryIds = sessionWorkout.exercises.map((ex) => ex.exerciseLibraryId);
      const statsMap = await sessionService.fetchUserExerciseStats(userId, exerciseLibraryIds);
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
      return statsObj;
    };

    const insertFresh = async () => {
      const session = await sessionService.createWorkoutSession({
        userId,
        programDayId,
        totalExercises,
      });
      const seRows = await sessionService.createSessionExercises(
        session.id,
        sessionWorkout.exercises,
      );
      const exerciseMapObj: Record<string, string> = {};
      for (const row of seRows) {
        exerciseMapObj[row.program_day_exercise_id] = row.id;
      }
      const setMapObj: Record<string, string[]> = {};
      for (const ex of sessionWorkout.exercises) {
        const seId = exerciseMapObj[ex.id];
        if (!seId || ex.sets.length === 0) continue;
        const setRows = await sessionService.createSessionSets(seId, ex.sets);
        setMapObj[seId] = setRows
          .sort((a, b) => a.set_number - b.set_number)
          .map((r) => r.id);
      }
      return { sessionId: session.id, exerciseMap: exerciseMapObj, setMap: setMapObj };
    };

    try {
      const existing = await sessionService.findExistingSession({ userId, programDayId });

      if (existing?.status === "completed") {
        return "already_completed";
      }

      if (existing?.status === "in_progress") {
        const state = await sessionService.loadSessionState(existing.id);
        if (!state) {
          // Corrupt row (no children) — self-heal: delete it and start fresh.
          console.warn("[session] corrupt in_progress row, recreating", existing.id);
          await sessionService.deleteWorkoutSession(existing.id);
          const fresh = await insertFresh();
          dispatch(initSession(fresh));
          dispatch(setExerciseStats(await hydrateStats()));
          dispatch(startSessionTimer());
          return "started";
        }
        dispatch(initSession({
          sessionId: existing.id,
          exerciseMap: state.exerciseMap,
          setMap: state.setMap,
        }));
        dispatch(setExerciseStats(await hydrateStats()));
        dispatch(startSessionTimer());
        return "resumed";
      }

      // Nothing exists — insert fresh.
      let fresh;
      try {
        fresh = await insertFresh();
      } catch (err) {
        // Race condition: another device inserted between our findExisting and insert.
        // The unique index rejected us. Re-query and resume that row.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("workout_sessions_one_per_user_day") || msg.includes("duplicate key")) {
          const winner = await sessionService.findExistingSession({ userId, programDayId });
          if (winner?.status === "in_progress") {
            const state = await sessionService.loadSessionState(winner.id);
            if (state) {
              dispatch(initSession({
                sessionId: winner.id,
                exerciseMap: state.exerciseMap,
                setMap: state.setMap,
              }));
              dispatch(setExerciseStats(await hydrateStats()));
              dispatch(startSessionTimer());
              return "resumed";
            }
          }
          if (winner?.status === "completed") return "already_completed";
        }
        throw err;
      }
      dispatch(initSession(fresh));
      dispatch(setExerciseStats(await hydrateStats()));
      dispatch(startSessionTimer());
      return "started";
    } catch (err) {
      console.error("Failed to start session:", err);
      return "failed";
    }
  }, [sessionWorkout, userId, totalExercises, dispatch]);

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

      const seId = exerciseMap[ex.id];
      if (!seId) return;
      const setIds = setMap[seId];
      const ssId = setIds?.[setNumber];
      if (!ssId) return;

      const alreadyLogged = (completedSetsMap[ex.exerciseLibraryId] ?? {})[setNumber] != null;
      if (!alreadyLogged) dispatch(incrementSetsLogged());
      dispatch(logCompletedSet({
        exerciseLibraryId: ex.exerciseLibraryId,
        setNumber,
        set: { weight, weightUnit: ex.weightUnit, reps, duration },
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
    },
    [sessionWorkout, exerciseMap, setMap, completedSetsMap, dispatch, syncWrite],
  );

  /** Complete an exercise */
  const completeExerciseResult = useCallback(
    async (exerciseIndex: number, comment?: string) => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      const seId = exerciseMap[ex.id];
      if (!seId) return;

      dispatch(incrementExercisesCompleted());

      await syncWrite(
        "completeExercise",
        { id: seId, comment: comment ?? null },
        () => sessionService.completeExercise(seId, comment),
      );

      if (userId && sessionId) {
        const setIds = setMap[seId] ?? [];
        const lastSetId = setIds.length > 0 ? setIds[setIds.length - 1] : null;

        // Use actual logged values from this session, not planned values
        const loggedMap = completedSetsMap[ex.exerciseLibraryId] ?? {};
        const logged = Object.values(loggedMap);
        const lastLogged = logged.length > 0 ? logged[logged.length - 1] : null;

        // Find the best set (highest weight, then highest reps as tiebreaker)
        const historical = exerciseStatsMap[ex.exerciseLibraryId];
        const bestLogged = logged.reduce<{ weight: number; reps: number } | null>(
          (best, s) => {
            if (s.weight == null) return best;
            if (!best) return { weight: s.weight, reps: s.reps ?? 0 };
            if (s.weight > best.weight || (s.weight === best.weight && (s.reps ?? 0) > best.reps)) {
              return { weight: s.weight, reps: s.reps ?? 0 };
            }
            return best;
          },
          null,
        );

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
      }
    },
    [sessionWorkout, exerciseMap, setMap, completedSetsMap, exerciseStatsMap, userId, sessionId, dispatch, syncWrite],
  );

  /** Finish the entire session */
  const finishSession = useCallback(async () => {
    if (!sessionId) return;

    const durationSeconds = sessionStartedAt
      ? Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000)
      : 0;

    const sessionParams = { sessionId, durationSeconds, exercisesCompleted, setsLogged };
    await syncWrite("completeSession", sessionParams, () =>
      sessionService.completeSession(sessionParams),
    );

    if (userId) {
      const pointParams = {
        userId,
        sessionId,
        eventType: "workout_completed" as const,
        title: "Workout Completed",
        points: 25,
      };
      await syncWrite("createPointEvent", pointParams as Record<string, unknown>, () =>
        sessionService.createPointEvent(pointParams),
      );
    }
  }, [sessionId, sessionStartedAt, exercisesCompleted, setsLogged, userId, syncWrite]);

  /** Navigate to rest timer between sets or exercises */
  const navigateToRest = useCallback(
    (exerciseIndex: number, nextSet: number) => {
      if (!sessionWorkout) return;
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return;

      navigation.replace("RestTimer", {
        exerciseIndex: exerciseIndex + 1,
        totalExercises,
        currentSet: nextSet,
        totalSets: ex.setCount,
        nextExerciseName: ex.name,
        restDuration: ex.restSeconds || 60,
      });
    },
    [navigation, sessionWorkout, totalExercises],
  );

  /** Navigate to session complete — marks session done in Supabase first */
  const navigateToSessionComplete = useCallback(async () => {
    if (!sessionWorkout) return;

    await finishSession();

    // Optimistically mark this day as completed in Redux
    if (sessionWorkout.programDayId) {
      dispatch(markDayCompleted(sessionWorkout.programDayId));
    }

    const elapsed = sessionStartedAt
      ? Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000)
      : 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    navigation.replace("SessionComplete", {
      programTitle: sessionWorkout.title,
      weekNumber: sessionWorkout.weekNumber,
      dayNumber: sessionWorkout.dayNumber,
      sessionDuration: `${mins}:${String(secs).padStart(2, "0")}`,
      setsLogged,
      eraPoints: 320,
      newPRs: 0,
      bonusPoints: 100,
    });
  }, [navigation, sessionWorkout, sessionStartedAt, setsLogged, finishSession, dispatch]);

  /** Add a dynamic set for an exercise (creates DB row + updates Redux) */
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

      try {
        const row = await sessionService.createSingleSessionSet(seId, newSetNumber, {
          setKind: templateSet?.setKind ?? "working",
          targetWeight: templateSet?.targetWeight ?? null,
          targetWeightUnit: templateSet?.targetWeightUnit ?? ex.weightUnit,
          targetReps: templateSet?.targetReps ?? null,
          targetRepsMin: templateSet?.targetRepsMin ?? null,
          targetRepsMax: templateSet?.targetRepsMax ?? null,
          targetDuration: templateSet?.targetDuration ?? null,
          restSeconds: templateSet?.restSeconds ?? null,
        });
        dispatch(addSessionSet({ sessionExerciseId: seId, sessionSetId: row.id }));
        return row.id;
      } catch (err) {
        console.error("Failed to add set:", err);
        return null;
      }
    },
    [sessionWorkout, exerciseMap, setMap, dispatch],
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
          lastSet = { weight: `${last.weight}${last.weightUnit}`, reps: last.reps ?? 0 };
        }
      } else if (historical?.lastWeight != null) {
        lastSet = {
          weight: `${historical.lastWeight}${historical.lastWeightUnit ?? "kg"}`,
          reps: historical.lastReps ?? 0,
        };
      }

      // Best Set: best across (historical best + all logged sets this session)
      let bestWeight = historical?.bestWeight ?? null;
      let bestReps = historical?.bestReps ?? 0;
      let bestUnit = historical?.bestWeightUnit ?? ex.weightUnit;

      for (const s of logged) {
        if (s.weight == null) continue;
        if (bestWeight == null || s.weight > bestWeight || (s.weight === bestWeight && (s.reps ?? 0) > bestReps)) {
          bestWeight = s.weight;
          bestReps = s.reps ?? 0;
          bestUnit = s.weightUnit;
        }
      }

      const bestSet = bestWeight != null
        ? { weight: `${bestWeight}${bestUnit}`, reps: bestReps }
        : null;

      return { bestSet, lastSet };
    },
    [sessionWorkout, exerciseStatsMap, completedSetsMap],
  );

  /** Get completed sets for the exercise completed bottom sheet */
  const getCompletedSetsForSheet = useCallback(
    (exerciseIndex: number): { weight: string; reps: number; setNumber: number; duration?: number | null }[] => {
      if (!sessionWorkout) return [];
      const ex = sessionWorkout.exercises[exerciseIndex];
      if (!ex) return [];

      const loggedMap = completedSetsMap[ex.exerciseLibraryId] ?? {};
      return Object.entries(loggedMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, s]) => ({
          weight: s.weight != null ? `${s.weight}${s.weightUnit}` : "—",
          reps: s.reps ?? 0,
          setNumber: Number(key) + 1,
          duration: s.duration,
        }));
    },
    [sessionWorkout, completedSetsMap],
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
    navigateToExercise,
    navigateToRest,
    navigateToSessionComplete,
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
    getCompletedSetsForSheet,
  };
};
