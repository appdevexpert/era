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
 * Build the WeightsScreen card list from today's planned exercises + a
 * batched map of last-logged stats. Planned exercises drive the order and
 * naming; stats are looked up by exercise_library id.
 *
 * Only `main_exercises` sections appear on WeightsScreen — treadmill walks,
 * core finishers, warmups and cooldowns are excluded because they don't
 * carry a weight progression worth tracking on this tab.
 */
export function mapExerciseSummaries(
  detail: ProgramDayDetailData,
  summaries: Map<string, ExerciseSummaryRaw>,
  language: string,
): ExerciseSummaryView[] {
  const libraryById = new Map(detail.libraryExercises.map((l) => [l.id, l]));
  const mainSectionIds = new Set(
    detail.sections
      .filter((section) => section.section_kind === "main_exercises")
      .map((section) => section.id),
  );
  const setsByExercise = new Map<string, typeof detail.sets>();
  for (const set of detail.sets) {
    const arr = setsByExercise.get(set.program_day_exercise_id) ?? [];
    arr.push(set);
    setsByExercise.set(set.program_day_exercise_id, arr);
  }

  const ordered = [...detail.exercises]
    .filter((ex) => mainSectionIds.has(ex.section_id))
    .sort((a, b) => a.sort_order - b.sort_order);

  return ordered.map<ExerciseSummaryView>((exercise) => {
    const lib = libraryById.get(exercise.exercise_id);
    const exerciseSets = setsByExercise.get(exercise.id) ?? [];
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

    const muscles: MuscleGroup[] = mapMusclesToIcons(lib?.primary_muscles ?? []);

    return {
      id: exercise.id,
      programDayExerciseId: exercise.id,
      exerciseLibraryId: exercise.exercise_id,
      name,
      category,
      meta: `${setCount} Sets • ${reps} Reps`,
      sets: setCount,
      reps,
      weightKg: round(weightKg),
      delta: computeDelta(summary?.lastKg ?? null, summary?.previousKg ?? null),
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

const buildChart = (sets: SessionSetHistoryRow[], t: Translator): ExerciseHistoryChart => {
  const heaviestByWeek = new Map<number, number>();
  for (const s of sets) {
    if (s.logged_weight_value == null) continue;
    const prev = heaviestByWeek.get(s.week_number);
    if (prev == null || s.logged_weight_value > prev) {
      heaviestByWeek.set(s.week_number, s.logged_weight_value);
    }
  }

  if (heaviestByWeek.size === 0) {
    return { points: [], xTickLabels: [] };
  }

  const realWeeks = [...heaviestByWeek.keys()].sort((a, b) => a - b);
  const maxRealWeek = realWeeks[realWeeks.length - 1];
  const lastTick = Math.max(maxRealWeek, MIN_CHART_WEEKS);

  // X-axis ALWAYS spans at least MIN_CHART_WEEKS — matches the Figma shell.
  const xTickLabels = Array.from({ length: lastTick }, (_, i) =>
    t("history.chartWeekTick", { number: i + 1 }),
  );

  // Line points: only the real-data weeks.
  let points: ExerciseHistoryChartPoint[] = realWeeks.map((w) => ({
    weekNumber: w,
    label: t("history.chartWeekTick", { number: w }),
    weightKg: round(heaviestByWeek.get(w) as number),
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
        weightKg: only.weightKg,
        isReal: false,
      },
    ];
  }

  return { points, xTickLabels };
};

const buildSections = (
  sets: SessionSetHistoryRow[],
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
        if (
          prev?.logged_weight_value != null &&
          s.logged_weight_value != null
        ) {
          const diff = round(s.logged_weight_value - prev.logged_weight_value);
          if (diff !== 0) {
            delta = { kg: Math.abs(diff), positive: diff > 0 };
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
  };
  return {
    exerciseName,
    stats,
    chart: buildChart(raw.sets, t),
    sections: buildSections(raw.sets, t),
    totalSessions: new Set(raw.sets.map((s) => s.session_id)).size,
  };
}
