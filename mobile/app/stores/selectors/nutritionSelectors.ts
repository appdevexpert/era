import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/app/stores/store";
import {
  buildWeekDays,
  canNavigateWeek,
  planItemsForDate,
  resolvePhaseDay,
  sumMacros,
  type WeekDayStatus,
} from "@/app/utils/nutritionMappers";
import { calculateDailyTargets, type GoalInputs } from "@/app/utils/nutritionTargets";
import type {
  DailyMacroTargets,
  DailyMacroTotals,
  MealLibraryRow,
  MealLogRow,
  MealPhaseKey,
  MealProgramPhaseRow,
} from "@/app/types/nutrition";

// =====================================================================
// All selectors are memoized via createSelector. Inputs deliberately
// kept narrow so the screen only re-renders when its slice changes.
// =====================================================================

const selectNutrition = (state: RootState) => state.nutrition;
const selectAuth = (state: RootState) => state.auth;
const selectOnboarding = (state: RootState) => state.onboarding;

export const selectNutritionStatus = (state: RootState) =>
  state.nutrition.status;
export const selectNutritionError = (state: RootState) =>
  state.nutrition.error;
export const selectSelectedDate = (state: RootState) =>
  state.nutrition.selectedDate;
export const selectBootstrap = (state: RootState) =>
  state.nutrition.bootstrap;

/** Read the user's body data from onboarding.goalData (Redux source of truth). */
export const selectGoalInputs = createSelector(
  [selectOnboarding],
  (onboarding): GoalInputs => {
    const g = onboarding.goalData;
    return {
      birth_year: typeof g.birthYear === "number" ? g.birthYear : null,
      gender: g.gender ?? null,
      weight: typeof g.weight === "number" ? g.weight : 70,
      weight_unit: g.weightUnit === "lb" ? "lb" : "kg",
      height: typeof g.height === "number" ? g.height : 175,
      height_unit: g.heightUnit === "ft" ? "ft" : "cm",
      level: g.level ?? null,
      goal: g.goal ?? null,
    };
  },
);

/** The phase active on the SELECTED date (used for the daily ring + tags). */
export const selectActivePhase = createSelector(
  [selectBootstrap, selectAuth, selectSelectedDate],
  (bootstrap, auth, selectedDate): MealProgramPhaseRow | null => {
    if (!bootstrap) return null;
    const resolved = resolvePhaseDay(
      selectedDate,
      auth.programStartDate ?? null,
      bootstrap.phases,
    );
    return resolved?.phase ?? null;
  },
);

export const selectActivePhaseKey = createSelector(
  [selectActivePhase],
  (phase): MealPhaseKey | undefined => phase?.phase_key,
);

/** Daily macro targets — derived from goals + active phase. */
export const selectDailyTargets = createSelector(
  [selectGoalInputs, selectActivePhaseKey],
  (goals, phaseKey): DailyMacroTargets =>
    calculateDailyTargets(goals, phaseKey),
);

/** Personalised daily water goal in ml (already inside selectDailyTargets, exposed for convenience). */
export const selectWaterTargetMl = createSelector(
  [selectDailyTargets],
  (targets) => targets.water_ml,
);

/** Water row for the currently selected date — null when nothing is logged. */
export const selectWaterRowForSelectedDate = (state: RootState) =>
  state.nutrition.waterByDate[state.nutrition.selectedDate] ?? null;

/** Consumed millilitres on the selected date (0 when no row exists). */
export const selectWaterConsumedMlForSelectedDate = createSelector(
  [selectWaterRowForSelectedDate],
  (row) => row?.amount_ml ?? 0,
);

/** True while a +/− is in flight for the selected date — UI disables the buttons. */
export const selectIsMutatingWaterForSelectedDate = (state: RootState) =>
  Boolean(state.nutrition.mutatingWaterByDate[state.nutrition.selectedDate]);

/** Logs the user has on the currently selected date. */
export const selectLogsForSelectedDate = createSelector(
  [selectNutrition],
  (nutrition): MealLogRow[] =>
    nutrition.logsByDate[nutrition.selectedDate] ?? [],
);

/** Daily totals (sum of selected date's logged kcal/macros). */
export const selectDailyTotals = createSelector(
  [selectLogsForSelectedDate],
  (logs): DailyMacroTotals => sumMacros(logs),
);

/** 7 day-pill view models for the week containing selectedDate. */
export const selectWeekDays = createSelector(
  [selectSelectedDate, selectAuth, selectNutrition],
  (selectedDate, auth, nutrition): WeekDayStatus[] =>
    buildWeekDays(
      selectedDate,
      auth.programStartDate ?? null,
      nutrition.logsByDate,
    ),
);

/** Can the user tap ‹ to step back a week? */
export const selectCanGoPrevWeek = createSelector(
  [selectSelectedDate, selectAuth],
  (selectedDate, auth) =>
    canNavigateWeek(selectedDate, "prev", auth.programStartDate ?? null),
);

/** Can the user tap › to step forward a week? */
export const selectCanGoNextWeek = createSelector(
  [selectSelectedDate, selectAuth],
  (selectedDate, auth) =>
    canNavigateWeek(selectedDate, "next", auth.programStartDate ?? null),
);

/** Plan items prescribed for the selected date (joined with library). */
export interface PlanRowView {
  itemId: string;
  library: MealLibraryRow;
}

export const selectPlanRowsForSelectedDate = createSelector(
  [selectBootstrap, selectAuth, selectSelectedDate],
  (bootstrap, auth, date): PlanRowView[] =>
    planItemsForDate(date, auth.programStartDate ?? null, bootstrap),
);

/**
 * Merged list of meal rows to render on the selected date:
 *   1. Plan items (in their prescribed order) — marked added when a
 *      matching log exists, otherwise "not added".
 *   2. Any custom user logs (not tied to a plan item) appended below.
 */
export interface MergedMealView {
  key: string;
  category: MealLibraryRow["category"];
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  added: boolean;
  source: "plan" | "custom";
  /** Hook for the writes slice — IDs the +/− handler needs. */
  planItemId?: string;
  libraryId?: string;
  logId?: string;
}

export const selectMergedMealRows = createSelector(
  [selectPlanRowsForSelectedDate, selectLogsForSelectedDate],
  (planRows, logs): MergedMealView[] => {
    const logByPlanItemId = new Map<string, MealLogRow>();
    const customLogs: MealLogRow[] = [];
    for (const log of logs) {
      if (log.meal_program_phase_day_item_id) {
        logByPlanItemId.set(log.meal_program_phase_day_item_id, log);
      } else {
        customLogs.push(log);
      }
    }

    const planView: MergedMealView[] = planRows.map((row) => {
      const matched = logByPlanItemId.get(row.itemId);
      return matched
        ? {
            key: `log-${matched.id}`,
            category: matched.category,
            name: matched.name_snapshot,
            kcal: matched.kcal,
            protein_g: matched.protein_g,
            carbs_g: matched.carbs_g,
            fats_g: matched.fats_g,
            added: true,
            source: "plan",
            planItemId: row.itemId,
            libraryId: matched.meal_library_id ?? row.library.id,
            logId: matched.id,
          }
        : {
            key: `plan-${row.itemId}`,
            category: row.library.category,
            name: row.library.name_translations.en ?? row.library.slug,
            kcal: row.library.kcal,
            protein_g: row.library.protein_g,
            carbs_g: row.library.carbs_g,
            fats_g: row.library.fats_g,
            added: false,
            source: "plan",
            planItemId: row.itemId,
            libraryId: row.library.id,
          };
    });

    const customView: MergedMealView[] = customLogs.map((log) => ({
      key: `log-${log.id}`,
      category: log.category,
      name: log.name_snapshot,
      kcal: log.kcal,
      protein_g: log.protein_g,
      carbs_g: log.carbs_g,
      fats_g: log.fats_g,
      added: true,
      source: "custom",
      libraryId: log.meal_library_id ?? undefined,
      logId: log.id,
    }));

    return [...planView, ...customView];
  },
);
