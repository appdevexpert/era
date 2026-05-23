import { fetchCurrentDayExerciseSummaries } from "@/app/services/sessionService";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import type { ExerciseSummaryView, ProgramDayDetailData } from "@/app/types/workout";
import { mapExerciseSummaries } from "@/app/utils/historyMappers";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

interface UseExerciseSummariesResult {
  data: ExerciseSummaryView[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Loads each card on WeightsScreen for the given day detail:
 *   1. The planned exercises come from the passed `detail` (today's or any other day).
 *   2. Last logged weight + delta come from Supabase in one batched query.
 *
 * The query is keyed on the set of exercise_library ids, so it re-runs
 * naturally when the user taps a different day pill.
 */
export function useExerciseSummaries(
  detail: ProgramDayDetailData | null,
): UseExerciseSummariesResult {
  const user = useSelector(selectUser);
  const { i18n } = useTranslation();

  const exerciseIds = useMemo(
    () => (detail ? detail.exercises.map((ex) => ex.exercise_id) : []),
    [detail],
  );
  const exerciseIdsKey = useMemo(() => exerciseIds.slice().sort().join(","), [exerciseIds]);

  const [summaries, setSummaries] = useState<
    Awaited<ReturnType<typeof fetchCurrentDayExerciseSummaries>> | null
  >(null);
  // Start as `true` so the skeleton shows on first paint instead of the brief
  // empty-state flash before the fetch effect runs.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
    // exerciseIdsKey serializes the list; tick forces refetch on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, exerciseIdsKey, tick]);

  const data = useMemo(() => {
    if (!detail || !summaries) return [];
    return mapExerciseSummaries(detail, summaries, i18n.language);
  }, [detail, summaries, i18n.language]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((n) => n + 1),
  };
}
