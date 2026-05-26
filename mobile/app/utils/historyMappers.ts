import type { MuscleGroup } from "@/app/navigation/types";
import type {
  ExerciseHistoryChart,
  ExerciseHistoryChartPoint,
  ExerciseHistoryEntry,
  ExerciseHistoryRaw,
  ExerciseHistoryStats,
  ExerciseHistoryView,
  ExerciseHistoryWeekSection,
  ExerciseSummaryRaw,
  ExerciseSummaryView,
  ProgramDayDetailData,
  SessionSetHistoryRow,
} from "@/app/types/workout";
import { getLocalizedText } from "@/app/utils/localization";
import { formatDuration, formatSetSummary } from "@/app/utils/workoutFormatters";
import { mapMusclesToIcons } from "@/app/utils/workoutMappers";

// =====================================================================
// Pure mappers — no Redux, no Supabase. Hooks/screens call these.
// =====================================================================

type Translator = (key: string, opts?: Record<string, unknown>) => string;

const round = (n: number): number => Math.round(n * 10) / 10;

const computeDelta = (
  lastKg: number | null,
  previousKg: number | null,
): ExerciseSummaryView["delta"] => {
  if (lastKg == null || previousKg == null) return undefined;
  const diff = round(lastKg - previousKg);
  if (diff === 0) return undefined;
  return { kg: Math.abs(diff), positive: diff > 0 };
};

/**
 * Build the WeightsScreen card list from the planned exercises of the given
 * day detail + a batched map of last-logged stats. Planned exercises drive
 * order and naming; stats are looked up by exercise_library id.
 *
 * Every section kind is included (main_exercises, core_finisher,
 * treadmill_walk, warmup, cooldown, custom). For exercises that don't carry
 * a weight progression we render the planned duration ("20 min", "1 min 30
 * sec") instead of a kg value. The delta indicator only shows for weighted
 * exercises since it's computed from logged weight history.
 */
export function mapExerciseSummaries(
  detail: ProgramDayDetailData,
  summaries: Map<string, ExerciseSummaryRaw>,
  language: string,
): ExerciseSummaryView[] {
  const libraryById = new Map(detail.libraryExercises.map((l) => [l.id, l]));
  const sectionOrderById = new Map(detail.sections.map((s) => [s.id, s.sort_order]));
  const setsByExercise = new Map<string, typeof detail.sets>();
  for (const set of detail.sets) {
    const arr = setsByExercise.get(set.program_day_exercise_id) ?? [];
    arr.push(set);
    setsByExercise.set(set.program_day_exercise_id, arr);
  }

  // Sort by section first (warmup → main → core → treadmill → cooldown),
  // then by exercise sort_order within each section.
  const ordered = [...detail.exercises].sort((a, b) => {
    const sa = sectionOrderById.get(a.section_id) ?? 0;
    const sb = sectionOrderById.get(b.section_id) ?? 0;
    if (sa !== sb) return sa - sb;
    return a.sort_order - b.sort_order;
  });

  return ordered.map<ExerciseSummaryView>((exercise) => {
    const lib = libraryById.get(exercise.exercise_id);
    const exerciseSets = (setsByExercise.get(exercise.id) ?? []).slice().sort(
      (a, b) => a.set_number - b.set_number,
    );
    const workingSets = exerciseSets.filter((s) => s.set_kind === "working" || s.set_kind === "top_set");
    const setCount = workingSets.length || exerciseSets.length;
    const firstSet = workingSets[0] ?? exerciseSets[0];

    const reps =
      firstSet?.target_reps_exact ??
      firstSet?.target_reps_max ??
      firstSet?.target_reps_min ??
      0;

    const name = getLocalizedText(
      exercise.display_name_translations,
      language,
      exercise.display_name ??
        getLocalizedText(lib?.name_translations ?? null, language, lib?.name ?? ""),
    );

    const primaryMuscle = lib?.primary_muscles?.[0] ?? "";
    const categoryLabel = lib?.category ?? "";
    const category = primaryMuscle
      ? `${primaryMuscle} • ${categoryLabel}`
      : categoryLabel;

    const summary = summaries.get(exercise.exercise_id);
    const fallbackWeight =
      exercise.initial_weight_value != null
        ? Number(exercise.initial_weight_value)
        : firstSet?.target_weight_value != null
          ? Number(firstSet.target_weight_value)
          : 0;
    const weightKg = summary?.lastKg ?? fallbackWeight;

    // Duration-based (treadmill, plank, warmup hold, etc.) when the planned
    // first set has a duration AND there's no weight to display.
    const firstSetDuration = firstSet?.target_duration_seconds ?? null;
    const hasWeight = weightKg > 0;
    const isDurationOnly = !hasWeight && firstSetDuration != null && firstSetDuration > 0;

    // Prefer last *logged* duration over planned, so the card mirrors the
    // weight card behavior (which shows last logged kg, not planned kg).
    const durationToShow = summary?.lastDurationSec ?? firstSetDuration ?? null;

    const displayValue = isDurationOnly
      ? formatDuration(durationToShow, language)
      : hasWeight
        ? undefined // card falls back to "${weightKg} kg"
        : "—";

    const muscles: MuscleGroup[] = mapMusclesToIcons(lib?.primary_muscles ?? []);

    return {
      id: exercise.id,
      programDayExerciseId: exercise.id,
      exerciseLibraryId: exercise.exercise_id,
      name,
      category,
      meta: formatSetSummary(exerciseSets, language) || `${setCount} Sets • ${reps} Reps`,
      sets: setCount,
      reps,
      weightKg: round(weightKg),
      displayValue,
      // Delta only makes sense for weighted exercises.
      delta: hasWeight
        ? computeDelta(summary?.lastKg ?? null, summary?.previousKg ?? null)
        : undefined,
      muscles,
    };
  });
}

/* ─── ExerciseHistoryScreen ─── */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const formatMonthDay = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = MONTH_LABELS[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} ${day}`;
};

/** Minimum number of x-axis ticks shown so the chart shell matches the Figma. */
const MIN_CHART_WEEKS = 5;

const buildChart = (
  sets: SessionSetHistoryRow[],
  metricKind: "weight" | "duration",
  t: Translator,
): ExerciseHistoryChart => {
  // "Best" per week is heaviest weight or longest hold depending on metric.
  const bestByWeek = new Map<number, number>();
  for (const s of sets) {
    const v = metricKind === "weight" ? s.logged_weight_value : s.logged_duration_seconds;
    if (v == null) continue;
    const prev = bestByWeek.get(s.week_number);
    if (prev == null || v > prev) {
      bestByWeek.set(s.week_number, v);
    }
  }

  if (bestByWeek.size === 0) {
    return { points: [], xTickLabels: [] };
  }

  const realWeeks = [...bestByWeek.keys()].sort((a, b) => a - b);
  const maxRealWeek = realWeeks[realWeeks.length - 1];
  const lastTick = Math.max(maxRealWeek, MIN_CHART_WEEKS);

  // X-axis ALWAYS spans at least MIN_CHART_WEEKS — matches the Figma shell.
  const xTickLabels = Array.from({ length: lastTick }, (_, i) =>
    t("history.chartWeekTick", { number: i + 1 }),
  );

  // Line points: only the real-data weeks. `value` is kg or seconds.
  let points: ExerciseHistoryChartPoint[] = realWeeks.map((w) => ({
    weekNumber: w,
    label: t("history.chartWeekTick", { number: w }),
    value: round(bestByWeek.get(w) as number),
    isReal: w === maxRealWeek,
  }));

  // gifted-charts can't render a line from a single point. When the user has
  // only one week of data, add a phantom point at the next week with the same
  // value so a short flat stub renders next to the marker (Figma node 5894:3110).
  if (points.length === 1) {
    const only = points[0];
    points = [
      { ...only, isReal: true },
      {
        weekNumber: only.weekNumber + 1,
        label: t("history.chartWeekTick", { number: only.weekNumber + 1 }),
        value: only.value,
        isReal: false,
      },
    ];
  }

  return { points, xTickLabels };
};

const buildSections = (
  sets: SessionSetHistoryRow[],
  metricKind: "weight" | "duration",
  t: Translator,
): ExerciseHistoryWeekSection[] => {
  // Sort newest first; we'll group by week and within each section by date desc.
  const ordered = [...sets].sort((a, b) => {
    if (a.week_number !== b.week_number) return b.week_number - a.week_number;
    const aTime = a.completed_at ?? "";
    const bTime = b.completed_at ?? "";
    if (aTime !== bTime) return aTime < bTime ? 1 : -1;
    return 0;
  });

  const byWeek = new Map<number, SessionSetHistoryRow[]>();
  for (const s of ordered) {
    const arr = byWeek.get(s.week_number) ?? [];
    arr.push(s);
    byWeek.set(s.week_number, arr);
  }

  return [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map<ExerciseHistoryWeekSection>(([weekNumber, weekSets]) => {
      // Entries: oldest-to-newest delta is shown against the *previous* entry
      // in chronological order. Display order is newest-first.
      const chronological = [...weekSets].sort((a, b) => {
        const aTime = a.completed_at ?? "";
        const bTime = b.completed_at ?? "";
        if (aTime !== bTime) return aTime < bTime ? -1 : 1;
        return 0;
      });

      const entries: ExerciseHistoryEntry[] = chronological.map((s, idx) => {
        const prev = idx > 0 ? chronological[idx - 1] : undefined;
        let delta: ExerciseHistoryEntry["delta"];
        if (metricKind === "weight") {
          if (prev?.logged_weight_value != null && s.logged_weight_value != null) {
            const diff = round(s.logged_weight_value - prev.logged_weight_value);
            if (diff !== 0) delta = { kg: Math.abs(diff), positive: diff > 0 };
          }
        } else {
          if (
            prev?.logged_duration_seconds != null &&
            s.logged_duration_seconds != null
          ) {
            const diff = s.logged_duration_seconds - prev.logged_duration_seconds;
            // Per type comment: `delta.kg` is reused for seconds in duration mode.
            if (diff !== 0) delta = { kg: Math.abs(diff), positive: diff > 0 };
          }
        }

        return {
          id: s.id,
          dateLabel: t("history.entryDateLabel", {
            week: weekNumber,
            date: formatMonthDay(s.completed_at),
          }),
          weekNumber,
          weightKg: round(s.logged_weight_value ?? 0),
          reps: s.logged_reps ?? 0,
          durationSec: s.logged_duration_seconds ?? undefined,
          delta,
          isPR: s.is_personal_record,
        };
      });

      // Reverse so the most recent set appears first within the week section.
      entries.reverse();

      const firstDate = chronological[0]?.completed_at ?? null;

      return {
        id: `w${weekNumber}`,
        weekNumber,
        weekLabel: t("history.weekLabel", { number: weekNumber }),
        monthLabel: formatMonthDay(firstDate),
        entries,
      };
    });
};

export function mapExerciseHistoryView(
  raw: ExerciseHistoryRaw,
  exerciseName: string,
  t: Translator,
): ExerciseHistoryView {
  const stats: ExerciseHistoryStats = {
    currentKg: raw.stats.currentKg != null ? round(raw.stats.currentKg) : null,
    currentReps: raw.stats.currentReps,
    heaviestKg: raw.stats.heaviestKg != null ? round(raw.stats.heaviestKg) : null,
    lightestKg: raw.stats.lightestKg != null ? round(raw.stats.lightestKg) : null,
    currentSec: raw.stats.currentSec,
    longestSec: raw.stats.longestSec,
    shortestSec: raw.stats.shortestSec,
  };
  return {
    exerciseName,
    metricKind: raw.metricKind,
    stats,
    chart: buildChart(raw.sets, raw.metricKind, t),
    sections: buildSections(raw.sets, raw.metricKind, t),
    totalSessions: new Set(raw.sets.map((s) => s.session_id)).size,
  };
}
