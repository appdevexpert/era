import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/app/stores/store";
import {
  buildWeekDays,
  canNavigateWeek,
  dedupePlanMealLogs,
  phaseForWeek,
  planItemsForDate,
  sumMacros,
  weekNumberForDate,
  type WeekDayStatus,
} from "@/app/utils/nutritionMappers";
import { calculateDailyTargets, type GoalInputs } from "@/app/utils/nutritionTargets";
import type {
  DailyMacroTargets,
  DailyMacroTotals,
  MealCategoryEnum,
  MealLogRow,
  MealPhaseKey,
  TranslationMap,
  UserMealPlanItemRow,
} from "@/app/types/nutrition";

// =====================================================================
// All selectors are memoized via createSelector. Inputs deliberately
// kept narrow so the screen only re-renders when its slice changes.
//
// Plan rows carry raw translation maps, NOT localized strings — the
// screen localizes at render time so a language switch updates instantly.
// =====================================================================

const selectNutrition = (state: RootState) => state.nutrition;
const selectOnboarding = (state: RootState) => state.onboarding;
const selectProgramStartDate = (state: RootState) =>
  state.auth.programStartDate ?? null;

export const selectNutritionStatus = (state: RootState) =>
  state.nutrition.status;
export const selectNutritionError = (state: RootState) =>
  state.nutrition.error;
export const selectSelectedDate = (state: RootState) =>
  state.nutrition.selectedDate;
export const selectPlanByWeek = (state: RootState) =>
  state.nutrition.planByWeek;

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

/** Program week the selected date falls in (workout-synced). */
export const selectSelectedWeekNumber = createSelector(
  [selectSelectedDate, selectProgramStartDate],
  (date, programStartDate): number => weekNumberForDate(date, programStartDate),
);

/** Training phase for the selected date's week (fixed week→phase mapping). */
export const selectActivePhaseKey = createSelector(
  [selectSelectedWeekNumber],
  (week): MealPhaseKey => phaseForWeek(week),
);

/** Daily macro targets — derived from goals + active phase. */
export const selectDailyTargets = createSelector(
  [selectGoalInputs, selectActivePhaseKey],
  (goals, phaseKey): DailyMacroTargets =>
    calculateDailyTargets(goals, phaseKey),
);

export const selectWaterTargetMl = createSelector(
  [selectDailyTargets],
  (targets) => targets.water_ml,
);

/** True while the selected date's week plan is being generated. */
export const selectIsGeneratingSelectedWeek = createSelector(
  [selectNutrition, selectSelectedWeekNumber],
  (nutrition, week): boolean => Boolean(nutrition.generatingWeeks[week]),
);

export const selectWaterRowForSelectedDate = (state: RootState) =>
  state.nutrition.waterByDate[state.nutrition.selectedDate] ?? null;

export const selectWaterConsumedMlForSelectedDate = createSelector(
  [selectWaterRowForSelectedDate],
  (row) => row?.amount_ml ?? 0,
);

export const selectIsMutatingWaterForSelectedDate = (state: RootState) =>
  Boolean(state.nutrition.mutatingWaterByDate[state.nutrition.selectedDate]);

/** Logs the user has on the currently selected date. */
export const selectLogsForSelectedDate = createSelector(
  [selectNutrition],
  (nutrition): MealLogRow[] =>
    nutrition.logsByDate[nutrition.selectedDate] ?? [],
);

/**
 * Daily totals (sum of selected date's logged kcal/macros).
 * Plan-linked logs are deduped by user_meal_plan_item_id so totals match
 * what the UI renders (selectMergedMealRows also dedupes by plan_item_id).
 * Without this, retry-driven server duplicates inflate the macros card.
 */
export const selectDailyTotals = createSelector(
  [selectLogsForSelectedDate],
  (logs): DailyMacroTotals => sumMacros(dedupePlanMealLogs(logs).unique),
);

/** 7 day-pill view models for the week containing selectedDate. */
export const selectWeekDays = createSelector(
  [selectSelectedDate, selectProgramStartDate, selectNutrition],
  (selectedDate, programStartDate, nutrition): WeekDayStatus[] =>
    buildWeekDays(selectedDate, programStartDate, nutrition.logsByDate),
);

export const selectCanGoPrevWeek = createSelector(
  [selectSelectedDate, selectProgramStartDate],
  (selectedDate, programStartDate) =>
    canNavigateWeek(selectedDate, "prev", programStartDate),
);

export const selectCanGoNextWeek = createSelector(
  [selectSelectedDate, selectProgramStartDate],
  (selectedDate, programStartDate) =>
    canNavigateWeek(selectedDate, "next", programStartDate),
);

/** Plan items prescribed for the selected date. */
export const selectPlanItemsForSelectedDate = createSelector(
  [selectSelectedDate, selectProgramStartDate, selectPlanByWeek],
  (date, programStartDate, planByWeek): UserMealPlanItemRow[] =>
    planItemsForDate(date, programStartDate, planByWeek),
);

/**
 * Merged list of meal rows to render on the selected date:
 *   1. Plan items (in order) — marked added when a matching log exists.
 *   2. Custom user logs (not tied to a plan item) appended below.
 *
 * `nameTranslations` is set for un-logged plan rows so the screen can
 * localize; logged/custom rows expose the stored `name` snapshot.
 */
export interface MergedMealView {
  key: string;
  category: MealCategoryEnum;
  /** Snapshot name for logged/custom rows; empty for un-logged plan rows. */
  name: string;
  /** Translation map for un-logged plan rows; null otherwise. */
  nameTranslations: TranslationMap | null;
  /** Optional note/comment (e.g. on a custom-added meal). */
  note?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  added: boolean;
  source: "plan" | "custom";
  /** The plan item id (= user_meal_plan_item_id) the +/− handler needs. */
  planItemId?: string;
  logId?: string;
}

export const selectMergedMealRows = createSelector(
  [selectPlanItemsForSelectedDate, selectLogsForSelectedDate],
  (planItems, logs): MergedMealView[] => {
    const logByItemId = new Map<string, MealLogRow>();
    const customLogs: MealLogRow[] = [];
    for (const log of logs) {
      if (log.user_meal_plan_item_id) {
        logByItemId.set(log.user_meal_plan_item_id, log);
      } else {
        customLogs.push(log);
      }
    }

    const planView: MergedMealView[] = planItems.map((item) => {
      const matched = logByItemId.get(item.id);
      return matched
        ? {
            key: `log-${matched.id}`,
            category: matched.category,
            name: matched.name_snapshot,
            nameTranslations: null,
            note: matched.notes ?? undefined,
            kcal: matched.kcal,
            protein_g: matched.protein_g,
            carbs_g: matched.carbs_g,
            fats_g: matched.fats_g,
            added: true,
            source: "plan",
            planItemId: item.id,
            logId: matched.id,
          }
        : {
            key: `plan-${item.id}`,
            category: item.category,
            name: "",
            nameTranslations: item.name_translations,
            kcal: item.kcal,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fats_g: item.fats_g,
            added: false,
            source: "plan",
            planItemId: item.id,
          };
    });

    const customView: MergedMealView[] = customLogs.map((log) => ({
      key: `log-${log.id}`,
      category: log.category,
      name: log.name_snapshot,
      nameTranslations: null,
      note: log.notes ?? undefined,
      kcal: log.kcal,
      protein_g: log.protein_g,
      carbs_g: log.carbs_g,
      fats_g: log.fats_g,
      added: true,
      source: "custom",
      logId: log.id,
    }));

    return [...planView, ...customView];
  },
);
