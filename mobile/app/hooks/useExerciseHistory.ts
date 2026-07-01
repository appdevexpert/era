import { useEntitlement } from "@/app/hooks/useEntitlement";
import { fetchExerciseHistoryDetail } from "@/app/services/sessionService";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { selectWorkoutOverview } from "@/app/stores/selectors/workoutSelectors";
import type { RootState } from "@/app/stores/store";
import type {
  ExerciseHistoryRaw,
  ExerciseHistoryView,
  SessionSetHistoryRow,
} from "@/app/types/workout";
import { mapExerciseHistoryView } from "@/app/utils/historyMappers";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface UseExerciseHistoryParams {
  exerciseId: string | undefined;
  exerciseName: string;
}

interface UseExerciseHistoryResult {
  data: ExerciseHistoryView | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads every logged set for a single exercise and shapes it into the
 * stats / chart / week-section view-model the screen renders.
 *
 * Two data layers, following the app's local-first pattern:
 *   1. Supabase fetch (bootstrap): full historical sets across every session.
 *   2. Redux `state.session.completedSets[exerciseId]`: sets logged during
 *      the current session — subscribed via useSelector, so every set the
 *      user logs triggers this hook to recompute.
 *
 * The merge appends live-session sets to the fetched rows and recomputes
 * stats from the union. Net effect: any set the user logs in the current
 * session shows up in the history list + stats headline in the same frame,
 * without a network round-trip or focus-based refetch.
 */
export function useExerciseHistory({
  exerciseId,
  exerciseName,
}: UseExerciseHistoryParams): UseExerciseHistoryResult {
  const user = useSelector(selectUser);
  const { t } = useTranslation();
  const { hasStandard } = useEntitlement();

  // Live session data. Subscribing here means any logSetResult dispatch
  // will re-run the merge below.
  const sessionId = useSelector((s: RootState) => s.session.sessionId);
  const programDayId = useSelector((s: RootState) => s.session.programDayId);
  const liveSetsForExercise = useSelector((s: RootState) =>
    exerciseId ? s.session.completedSets[exerciseId] ?? null : null,
  );
  const overview = useSelector(selectWorkoutOverview);

  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchExerciseHistoryDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !exerciseId) {
      setRaw(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExerciseHistoryDetail({ userId: user.id, exerciseId })
      .then((res) => {
        if (!cancelled) setRaw(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, exerciseId]);

  // Merge live session sets into the fetched rows and recompute stats.
  const mergedRaw = useMemo<ExerciseHistoryRaw | null>(() => {
    if (!raw) return null;
    if (!liveSetsForExercise || !sessionId) return raw;

    // Resolve week/day for the active session so live rows land in the right
    // section of the chart. Falls back to (0, 0) if we can't resolve — the
    // set still appears in the "current session" row.
    let liveWeek = 0;
    let liveDay = 0;
    if (overview && programDayId) {
      const day = overview.days.find((d) => d.id === programDayId);
      if (day) {
        liveDay = day.day_number;
        const week = overview.weeks.find((w) => w.id === day.week_id);
        if (week) liveWeek = week.week_number;
      }
    }

    // Any set from the current session that's already in `raw.sets` (because
    // syncWrite landed and the previous fetch caught it) is filtered out by
    // session_id — we only add rows that aren't already represented.
    const knownSetIdsBySession = new Set(
      raw.sets.filter((s) => s.session_id === sessionId).map((s) => `${s.session_id}:${s.id}`),
    );

    const liveRows: SessionSetHistoryRow[] = [];
    for (const [setNumStr, s] of Object.entries(liveSetsForExercise)) {
      // Synthetic id keyed by (session, exercise, setNumber). If a real row
      // with the same session already exists, we assume the server row wins
      // and skip. Otherwise append.
      const syntheticId = `live-${sessionId}-${exerciseId}-${setNumStr}`;
      if (knownSetIdsBySession.has(`${sessionId}:${syntheticId}`)) continue;
      liveRows.push({
        id: syntheticId,
        logged_weight_value: s.weight,
        logged_reps: s.reps,
        logged_duration_seconds: s.duration,
        is_personal_record: false,
        is_best_set: false,
        completed_at: new Date().toISOString(),
        week_number: liveWeek,
        day_number: liveDay,
        session_id: sessionId,
      });
    }

    if (liveRows.length === 0) return raw;

    const mergedSets = [...raw.sets, ...liveRows];

    // Recompute stats from the union so the "Current / Heaviest / Lightest"
    // headline reflects any live set the user just logged.
    const hasWeight = mergedSets.some((s) => s.logged_weight_value != null);
    const hasDuration = mergedSets.some((s) => s.logged_duration_seconds != null);
    const metricKind = hasWeight || !hasDuration ? "weight" : "duration";

    const weights = mergedSets
      .map((s) => s.logged_weight_value)
      .filter((w): w is number => w != null);
    const heaviestKg = weights.length ? Math.max(...weights) : null;
    const lightestKg = weights.length ? Math.min(...weights) : null;

    const durations = mergedSets
      .map((s) => s.logged_duration_seconds)
      .filter((d): d is number => d != null);
    const longestSec = durations.length ? Math.max(...durations) : null;
    const shortestSec = durations.length ? Math.min(...durations) : null;

    // "Current" = heaviest set of the most recent session — after the merge,
    // the current live session is always the most recent.
    let currentKg: number | null = null;
    let currentReps: number | null = null;
    let currentSec: number | null = null;
    const sortedByRecency = [...mergedSets].sort((a, b) => {
      const aT = a.completed_at ?? "";
      const bT = b.completed_at ?? "";
      return aT < bT ? 1 : aT > bT ? -1 : 0;
    });
    if (sortedByRecency.length > 0) {
      const recentSessionId = sortedByRecency[0].session_id;
      const recentSets = sortedByRecency.filter((s) => s.session_id === recentSessionId);
      if (metricKind === "weight") {
        const top = recentSets.reduce((best, s) =>
          s.logged_weight_value != null && s.logged_weight_value > (best?.logged_weight_value ?? -Infinity)
            ? s
            : best,
        recentSets[0]);
        currentKg = top.logged_weight_value;
        currentReps = top.logged_reps;
      } else {
        const top = recentSets.reduce((best, s) =>
          s.logged_duration_seconds != null &&
          s.logged_duration_seconds > (best?.logged_duration_seconds ?? -Infinity)
            ? s
            : best,
        recentSets[0]);
        currentSec = top.logged_duration_seconds;
      }
    }

    return {
      metricKind,
      stats: {
        currentKg,
        currentReps,
        heaviestKg,
        lightestKg,
        currentSec,
        longestSec: metricKind === "duration" ? longestSec : null,
        shortestSec: metricKind === "duration" ? shortestSec : null,
      },
      sets: mergedSets,
    };
  }, [raw, liveSetsForExercise, sessionId, programDayId, overview, exerciseId]);

  const data = useMemo(() => {
    if (!mergedRaw) return null;
    if (hasStandard) return mapExerciseHistoryView(mergedRaw, exerciseName, t);
    // Free tier — trim sets to the last 7 days before mapping.
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const trimmedSets = mergedRaw.sets.filter((s) => {
      if (!s.completed_at) return false;
      return new Date(s.completed_at).getTime() >= cutoff;
    });
    return mapExerciseHistoryView({ ...mergedRaw, sets: trimmedSets }, exerciseName, t);
  }, [mergedRaw, exerciseName, t, hasStandard]);

  return { data, loading, error };
}
