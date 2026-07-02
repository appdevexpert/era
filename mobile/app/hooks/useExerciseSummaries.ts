import { fetchCurrentDayExerciseSummaries } from "@/app/services/sessionService";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import type { RootState } from "@/app/stores/store";
import type {
  ExerciseSummaryRaw,
  ExerciseSummaryView,
  ProgramDayDetailData,
} from "@/app/types/workout";
import { mapExerciseSummaries } from "@/app/utils/historyMappers";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

interface UseExerciseSummariesResult {
  data: ExerciseSummaryView[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads each card on WeightsScreen for the given day detail.
 *
 * Two data layers, following the app's local-first pattern:
 *   1. Supabase fetch (bootstrap): fetched per exerciseId set, and re-fetched
 *      whenever a session finishes (workout.summariesRevision bump). Provides
 *      cross-session `lastKg` / `previousKg` (i.e. "history"). The refetch is
 *      what lets a just-finished workout's weights persist after layer 2's
 *      live overlay is cleared — instead of reverting to the pre-session fetch
 *      until the next cold app start.
 *   2. Redux `state.session.completedSets`: the sets logged during the current
 *      workout session. Subscribed via useSelector — every set the user logs
 *      dispatches `logCompletedSet` which re-runs this hook automatically.
 *
 * The merge overlays the live Redux data on top of the fetched history:
 *   - If any of THIS session's logged sets for an exercise is heavier than the
 *     fetched `lastKg`, we treat that live set as the new `lastKg` and demote
 *     the old `lastKg` to `previousKg` so the delta reflects the improvement.
 *   - Otherwise we keep the fetched values.
 *
 * Net effect: the user completes a set → Redux updates → this hook's memo
 * recomputes → WeightsScreen re-renders with the fresh number in the same
 * frame. No refetch, no useFocusEffect, no navigation coupling.
 */
export function useExerciseSummaries(
  detail: ProgramDayDetailData | null,
): UseExerciseSummariesResult {
  const user = useSelector(selectUser);
  const { i18n } = useTranslation();
  const completedSets = useSelector(
    (state: RootState) => state.session.completedSets,
  );
  // Bumped once per finishSession. Refetches the fetched-history layer the
  // moment a session's writes land, so the fresh weights survive after the
  // live completedSets overlay is cleared (no wait for a cold app start).
  const summariesRevision = useSelector(
    (state: RootState) => state.workout.summariesRevision,
  );

  const exerciseIds = useMemo(
    () => (detail ? detail.exercises.map((ex) => ex.exercise_id) : []),
    [detail],
  );
  const exerciseIdsKey = useMemo(() => exerciseIds.slice().sort().join(","), [exerciseIds]);

  const [summaries, setSummaries] = useState<Map<string, ExerciseSummaryRaw> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || exerciseIds.length === 0) {
      setSummaries(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCurrentDayExerciseSummaries({ userId: user.id, exerciseIds })
      .then((res) => {
        if (!cancelled) setSummaries(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load summaries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, exerciseIdsKey, summariesRevision]);

  // Overlay this session's live sets on top of the fetched history.
  const mergedSummaries = useMemo(() => {
    if (!summaries) return null;
    const merged = new Map(summaries);
    for (const libraryId of Object.keys(completedSets)) {
      const setsForExercise = completedSets[libraryId];
      if (!setsForExercise) continue;
      // Find the heaviest weight + longest duration this session.
      let heaviestKg: { weight: number; reps: number | null } | null = null;
      let longestSec: number | null = null;
      for (const s of Object.values(setsForExercise)) {
        if (s.weight != null && (heaviestKg == null || s.weight > heaviestKg.weight)) {
          heaviestKg = { weight: s.weight, reps: s.reps };
        }
        if (s.duration != null && (longestSec == null || s.duration > longestSec)) {
          longestSec = s.duration;
        }
      }
      const prior = merged.get(libraryId) ?? {
        lastKg: null,
        lastReps: null,
        previousKg: null,
        lastDurationSec: null,
        previousDurationSec: null,
      };
      // Weight overlay: if this session beat the prior lastKg, promote it and
      // demote the prior lastKg to previousKg (drives the "+X kg" delta).
      if (heaviestKg && (prior.lastKg == null || heaviestKg.weight > prior.lastKg)) {
        merged.set(libraryId, {
          ...prior,
          lastKg: heaviestKg.weight,
          lastReps: heaviestKg.reps,
          previousKg: prior.lastKg,
        });
      }
      // Duration overlay: same shape for timed exercises.
      const current = merged.get(libraryId) ?? prior;
      if (longestSec != null && (current.lastDurationSec == null || longestSec > current.lastDurationSec)) {
        merged.set(libraryId, {
          ...current,
          lastDurationSec: longestSec,
          previousDurationSec: current.lastDurationSec,
        });
      }
    }
    return merged;
  }, [summaries, completedSets]);

  const data = useMemo(() => {
    if (!detail || !mergedSummaries) return [];
    return mapExerciseSummaries(detail, mergedSummaries, i18n.language);
  }, [detail, mergedSummaries, i18n.language]);

  return { data, loading, error };
}
