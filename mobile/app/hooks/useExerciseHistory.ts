import { fetchExerciseHistoryDetail } from "@/app/services/sessionService";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import type { ExerciseHistoryView } from "@/app/types/workout";
import { mapExerciseHistoryView } from "@/app/utils/historyMappers";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

interface UseExerciseHistoryParams {
  exerciseId: string | undefined;
  exerciseName: string;
}

interface UseExerciseHistoryResult {
  data: ExerciseHistoryView | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Loads every logged set for a single exercise and shapes it into the
 * stats / chart / week-section view-model the screen renders.
 */
export function useExerciseHistory({
  exerciseId,
  exerciseName,
}: UseExerciseHistoryParams): UseExerciseHistoryResult {
  const user = useSelector(selectUser);
  const { t } = useTranslation();

  const [raw, setRaw] = useState<Awaited<ReturnType<typeof fetchExerciseHistoryDetail>> | null>(null);
  // Start as `true` so the skeleton shows on first paint instead of the brief
  // empty-state flash before the fetch effect runs.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
  }, [user?.id, exerciseId, tick]);

  const data = useMemo(() => {
    if (!raw) return null;
    return mapExerciseHistoryView(raw, exerciseName, t);
  }, [raw, exerciseName, t]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((n) => n + 1),
  };
}
