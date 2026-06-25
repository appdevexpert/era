import type {
  DailyMacroTotals,
  DayStatus,
  MealCategoryEnum,
  MealLogRow,
  MealPhaseKey,
  UserMealPlanItemRow,
  WeeklyMealPlan,
} from "@/app/types/nutrition";
import {
  diffDays,
  isoDatesForWeek,
  parseIsoDate,
  startOfWeek,
  todayIso,
} from "@/app/utils/nutritionDates";
import {
  computeCurrentPosition,
  getWeekdayFromDate,
} from "@/app/utils/programSchedule";

// =====================================================================
// Pure mappers — no Redux, no Supabase. Selectors call these.
//
// Anything that needs to be re-computed often (per render) should call
// the smallest possible helper here, never the bulk view-model.
// =====================================================================

export const TOTAL_PROGRAM_WEEKS = 12;

/**
 * Training phase for a program week. Fixed mapping (no admin/DB) — kept
 * in sync with the workout program's 3-block, 12-week structure.
 */
export function phaseForWeek(weekNumber: number): MealPhaseKey {
  if (weekNumber <= 4) return "hypertrophy";
  if (weekNumber <= 8) return "strength";
  return "peak";
}

/**
 * Program week number a calendar date falls in — uses the same
 * calendar-driven scheduling as workouts (signup-week aware), so meal
 * weeks stay in sync with the workout week.
 */
export function weekNumberForDate(
  date: string,
  programStartDate: string | null,
): number {
  if (!programStartDate) return 1;
  return computeCurrentPosition(
    { programStartDate, totalWeeks: TOTAL_PROGRAM_WEEKS },
    date,
  ).weekNumber;
}

/**
 * The planned meal items for a given date: looks up the cached week plan
 * for that date's program week and returns the items for that weekday.
 * Returns [] when the week hasn't been generated (e.g. a past week the
 * user skipped) so the screen renders an empty plan rather than crashing.
 */
export function planItemsForDate(
  date: string,
  programStartDate: string | null,
  planByWeek: Record<number, WeeklyMealPlan>,
): UserMealPlanItemRow[] {
  const week = weekNumberForDate(date, programStartDate);
  const plan = planByWeek[week];
  if (!plan) return [];

  const dow = getWeekdayFromDate(date); // 1=Mon..7=Sun
  return plan.items
    .filter((it) => it.day_of_week === dow)
    .sort((a, b) => a.sort_order - b.sort_order);
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

export interface DedupePlanLogsResult {
  unique: MealLogRow[];
  duplicateIds: string[];
}

/**
 * Group plan-linked meal logs by (log_date, user_meal_plan_item_id) — keeps
 * the first row in each group, surfaces the rest as duplicates so the caller
 * can delete them server-side. Custom logs (no plan item link) are never
 * deduplicated; a user may legitimately log the same dish twice.
 *
 * Why: a flaky network can cause insertMealLog to succeed on Supabase but
 * "fail" client-side, which then enqueues a retry that creates a second row.
 * Up to MAX_RETRIES extra rows can accumulate per real tap.
 */
export function dedupePlanMealLogs(rows: MealLogRow[]): DedupePlanLogsResult {
  const seen = new Set<string>();
  const unique: MealLogRow[] = [];
  const duplicateIds: string[] = [];
  for (const row of rows) {
    if (!row.user_meal_plan_item_id) {
      unique.push(row);
      continue;
    }
    const key = `${row.log_date}|${row.user_meal_plan_item_id}`;
    if (seen.has(key)) {
      duplicateIds.push(row.id);
    } else {
      seen.add(key);
      unique.push(row);
    }
  }
  return { unique, duplicateIds };
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

/** True when the user is allowed to navigate the week-selector arrow.
 *  Nutrition is locked to the program timeframe — the plan only exists from
 *  programStartDate forward, so we never let the user step into a week
 *  before that. */
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
