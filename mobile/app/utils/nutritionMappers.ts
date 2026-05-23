import type {
  DailyMacroTotals,
  DayStatus,
  MealCategoryEnum,
  MealLibraryRow,
  MealLogRow,
  MealProgramBootstrapData,
  MealProgramPhaseRow,
} from "@/app/types/nutrition";
import {
  dayOfWeek,
  diffDays,
  isoDatesForWeek,
  parseIsoDate,
  startOfWeek,
  todayIso,
} from "@/app/utils/nutritionDates";

// =====================================================================
// Pure mappers — no Redux, no Supabase. Selectors call these.
//
// Anything that needs to be re-computed often (per render) should call
// the smallest possible helper here, never the bulk view-model.
// =====================================================================

/**
 * Resolve the active phase + day_of_week for a given calendar date,
 * relative to when the user's program started.
 *
 * Returns `null` when the date falls outside the program window so the
 * caller can render an empty/missed state instead of crashing.
 */
export function resolvePhaseDay(
  date: string,
  programStartDate: string | null,
  phases: MealProgramPhaseRow[],
): { phase: MealProgramPhaseRow; weekInPhase: number; dayOfWeek: number } | null {
  if (!phases.length) return null;
  if (!programStartDate) return null;

  const offsetDays = diffDays(date, programStartDate);
  if (offsetDays < 0) return null;

  const weekFromStart = Math.floor(offsetDays / 7) + 1;
  const ordered = [...phases].sort((a, b) => a.sort_order - b.sort_order);

  let cumulativeWeeks = 0;
  for (const phase of ordered) {
    const endWeek = cumulativeWeeks + phase.week_count;
    if (weekFromStart <= endWeek) {
      return {
        phase,
        weekInPhase: weekFromStart - cumulativeWeeks,
        dayOfWeek: dayOfWeek(parseIsoDate(date)),
      };
    }
    cumulativeWeeks = endWeek;
  }
  // Past the program — clamp to the last phase to keep the screen useful.
  const last = ordered[ordered.length - 1];
  return {
    phase: last,
    weekInPhase: last.week_count,
    dayOfWeek: dayOfWeek(parseIsoDate(date)),
  };
}

/** Returns just the planned-meal items for a (date, programData) combo. */
export function planItemsForDate(
  date: string,
  programStartDate: string | null,
  bootstrap: MealProgramBootstrapData | null,
): { itemId: string; library: MealLibraryRow }[] {
  if (!bootstrap) return [];
  const resolved = resolvePhaseDay(date, programStartDate, bootstrap.phases);
  if (!resolved) return [];

  const phaseDay = bootstrap.phaseDays.find(
    (d) =>
      d.meal_program_phase_id === resolved.phase.id &&
      d.day_of_week === resolved.dayOfWeek,
  );
  if (!phaseDay) return [];

  const libraryById = new Map(bootstrap.library.map((m) => [m.id, m]));
  return bootstrap.phaseDayItems
    .filter((it) => it.meal_program_phase_day_id === phaseDay.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((it) => ({
      itemId: it.id,
      library: libraryById.get(it.meal_library_id)!,
    }))
    .filter((row) => !!row.library);
}

/** Sum macros across a list of meal_logs. */
export function sumMacros(logs: MealLogRow[]): DailyMacroTotals {
  return logs.reduce<DailyMacroTotals>(
    (acc, log) => {
      acc.kcal += log.kcal;
      acc.protein_g += log.protein_g;
      acc.carbs_g += log.carbs_g;
      acc.fats_g += log.fats_g;
      return acc;
    },
    { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
  );
}

// -------- Week selector status ---------------------------------------

export interface WeekDayStatus {
  date: string;
  dayOfMonth: number;
  weekdayShort: string;
  status: DayStatus;
  /** True when the user has at least one meal log for this date. */
  hasLogs: boolean;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Build the 7 day pills for the week containing `anchorDate`.
 *
 *   • future                    → date > today
 *   • before_program            → date < programStartDate
 *   • today                     → date === today
 *   • completed                 → past + at least one meal_log
 *   • missed                    → past + no logs
 */
export function buildWeekDays(
  anchorDate: string,
  programStartDate: string | null,
  logsByDate: Record<string, MealLogRow[]>,
): WeekDayStatus[] {
  const today = todayIso();
  const weekStart = startOfWeek(parseIsoDate(anchorDate));
  const dates = isoDatesForWeek(weekStart);

  return dates.map((iso, idx) => {
    const dayOfMonth = parseIsoDate(iso).getDate();
    const weekdayShort = WEEKDAY_LABELS[idx];
    const hasLogs = (logsByDate[iso] ?? []).length > 0;

    let status: DayStatus;
    if (programStartDate && iso < programStartDate) {
      status = "before_program";
    } else if (iso > today) {
      status = "future";
    } else if (iso === today) {
      status = "today";
    } else if (hasLogs) {
      status = "completed";
    } else {
      status = "missed";
    }

    return { date: iso, dayOfMonth, weekdayShort, status, hasLogs };
  });
}

/** True when the user is allowed to navigate the week-selector arrow. */
export function canNavigateWeek(
  anchorDate: string,
  direction: "prev" | "next",
  programStartDate: string | null,
): boolean {
  const weekStart = startOfWeek(parseIsoDate(anchorDate));
  if (direction === "prev") {
    if (!programStartDate) return false;
    const programWeekStart = startOfWeek(parseIsoDate(programStartDate));
    return weekStart.getTime() > programWeekStart.getTime();
  }
  // direction === "next" — only if the next week's Monday is <= today.
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return diffDays(toIsoDateLocal(nextMonday), todayIso()) <= 0;
}

// Avoid pulling toIsoDate from nutritionDates here to keep this module
// self-contained for tree-shaking; tiny duplication is fine.
function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Map a meal_logs.category enum to the eyebrow translation key. */
const CATEGORY_LABEL_KEY: Record<MealCategoryEnum, string> = {
  breakfast: "nutrition.breakfast",
  lunch: "nutrition.lunch",
  snack: "nutrition.snack",
  evening_snack: "nutrition.eveningSnack",
  dinner: "nutrition.dinner",
  pre_workout: "nutrition.preWorkout",
  post_workout: "nutrition.postWorkout",
  cheat_meal: "nutrition.cheatMeal",
};

export function categoryLabelKey(category: MealCategoryEnum): string {
  return CATEGORY_LABEL_KEY[category] ?? "nutrition.breakfast";
}
