import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import LogMealBadge from "@/app/components/nutrition/LogMealBadge";
import MealsTimeline from "@/app/components/nutrition/MealsTimeline";
import {
  type MealCategory,
  type MealRow,
} from "@/app/components/nutrition/types";
import AddLogMealBottomSheet, {
  type AddLogMealBottomSheetRef,
  type MealTag,
  type SaveMealPayload,
} from "@/app/components/nutrition/AddLogMealBottomSheet";
import DailyTargetsCard from "@/app/components/nutrition/DailyTargetsCard";
import PhaseWeekHeader from "@/app/components/workout/PhaseWeekHeader";
import { type DayItem } from "@/app/components/workout/WeekDaySelector";
import { FONTS } from "@/app/constants/fonts";
import { MealBreakfast } from "@/assets/icons";
import {
  selectActivePhase,
  selectCanGoNextWeek,
  selectCanGoPrevWeek,
  selectDailyTargets,
  selectDailyTotals,
  selectIsMutatingWaterForSelectedDate,
  selectMergedMealRows,
  selectNutritionStatus,
  selectSelectedDate,
  selectWaterConsumedMlForSelectedDate,
  selectWaterRowForSelectedDate,
  selectWaterTargetMl,
  selectWeekDays,
} from "@/app/stores/selectors/nutritionSelectors";
import {
  adjustWaterAmount,
  loadNutritionBootstrap,
  selectNutritionDate,
  toggleMealLog,
} from "@/app/stores/slice/nutritionSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { analyzeMealText } from "@/app/services/aiNutritionService";
import type { MealCategoryEnum } from "@/app/types/nutrition";
import { addDays, diffDays, todayIso } from "@/app/utils/nutritionDates";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Map server-side category enum → mobile MealRow.category. Drives the
// translated eyebrow text ("Breakfast • As per plan" etc.).
const CATEGORY_MAP: Record<MealCategoryEnum, MealCategory> = {
  breakfast: "breakfast",
  lunch: "lunch",
  snack: "snack",
  evening_snack: "eveningSnack",
  dinner: "dinner",
  pre_workout: "preWorkout",
  post_workout: "postWorkout",
  cheat_meal: "cheatMeal",
};

const mapCategory = (category: MealCategoryEnum): MealCategory =>
  CATEGORY_MAP[category] ?? "breakfast";

// Bottom-sheet tag → DB category enum. The sheet only exposes 4 tags;
// the broader enum (pre_workout, post_workout, cheat_meal) stays for
// plan-driven rows.
const TAG_TO_CATEGORY: Record<MealTag, MealCategoryEnum> = {
  breakfast: "breakfast",
  lunch: "lunch",
  eveningSnack: "evening_snack",
  dinner: "dinner",
};

const NutritionScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const logMealSheetRef = useRef<AddLogMealBottomSheetRef>(null);

  const status = useSelector(selectNutritionStatus);
  const selectedDate = useSelector(selectSelectedDate);
  const activePhase = useSelector(selectActivePhase);
  const targets = useSelector(selectDailyTargets);
  const totals = useSelector(selectDailyTotals);
  const weekDays = useSelector(selectWeekDays);
  const canGoPrev = useSelector(selectCanGoPrevWeek);
  const canGoNext = useSelector(selectCanGoNextWeek);
  const mergedMeals = useSelector(selectMergedMealRows);
  const waterConsumedMl = useSelector(selectWaterConsumedMlForSelectedDate);
  const waterGoalMl = useSelector(selectWaterTargetMl);
  const waterRow = useSelector(selectWaterRowForSelectedDate);
  const isMutatingWater = useSelector(selectIsMutatingWaterForSelectedDate);
  const programStartDate = useSelector(
    (state: RootState) => state.auth.programStartDate,
  );
  const todaysLogs = useSelector(
    (state: RootState) =>
      state.nutrition.logsByDate[state.nutrition.selectedDate] ?? [],
  );

  // Bootstrap once. Cached bootstrap stays valid across navigations; the
  // bottom of the screen lifecycle does not need to refetch.
  useEffect(() => {
    if (status === "idle") {
      dispatch(loadNutritionBootstrap());
    }
  }, [dispatch, status]);

  // -------- View-model mapping --------------------------------------

  const days: DayItem[] = useMemo(
    () =>
      weekDays.map((d) => {
        const isToday = d.status === "today";
        return {
          key: d.date,
          label: d.weekdayShort,
          date: String(d.dayOfMonth).padStart(2, "0"),
          title: "",
          subtitle: "",
          muscles: [],
          active: isToday,
          // Today + logs triggers WeekDaySelector's State 3:
          // gold-to-green gradient with the ✓ check badge.
          completed: d.status === "completed" || (isToday && d.hasLogs),
          missed: d.status === "missed",
        };
      }),
    [weekDays],
  );

  const meals: MealRow[] = useMemo(
    () =>
      mergedMeals.map((m) => ({
        id: m.key,
        category: mapCategory(m.category),
        name: m.name,
        kcal: m.kcal,
        protein: m.protein_g,
        carbs: m.carbs_g,
        fats: m.fats_g,
        added: m.added,
        source: m.source,
        Icon: MealBreakfast,
      })),
    [mergedMeals],
  );

  // -------- Header data ---------------------------------------------

  const phaseTitle = useMemo(() => {
    if (!activePhase) return t("nutrition.phaseHypertrophy");
    if (activePhase.phase_key === "hypertrophy")
      return t("nutrition.phaseHypertrophy");
    if (activePhase.phase_key === "strength")
      return t("nutrition.phaseStrength");
    return t("nutrition.phasePeak");
  }, [activePhase, t]);

  const { currentWeek, totalWeeks } = useMemo(() => {
    if (!programStartDate) return { currentWeek: 1, totalWeeks: 12 };
    const offsetDays = diffDays(selectedDate, programStartDate);
    const weekNumber = Math.max(1, Math.floor(offsetDays / 7) + 1);
    return { currentWeek: weekNumber, totalWeeks: 12 };
  }, [programStartDate, selectedDate]);

  // -------- Handlers -------------------------------------------------

  const handlePrevWeek = useCallback(() => {
    if (!canGoPrev) return;
    dispatch(selectNutritionDate(addDays(selectedDate, -7)));
  }, [canGoPrev, dispatch, selectedDate]);

  const handleNextWeek = useCallback(() => {
    if (!canGoNext) return;
    dispatch(selectNutritionDate(addDays(selectedDate, 7)));
  }, [canGoNext, dispatch, selectedDate]);

  const handleDayPress = useCallback(
    (day: DayItem) => {
      // Future days are navigable so users can preview tomorrow's planned
      // meals (e.g. grocery prep). Before-program days have no schedule and
      // remain inert.
      const matched = weekDays.find((d) => d.date === day.key);
      if (!matched || matched.status === "before_program") {
        return;
      }
      dispatch(selectNutritionDate(day.key));
    },
    [dispatch, weekDays],
  );

  // Single delta-driven helper for both +/− on the water card.
  // 250 ml per tap matches WaterCard's default incrementMl.
  const WATER_INCREMENT_ML = 250;
  const handleAdjustWater = useCallback(
    (deltaMl: number) => {
      if (selectedDate !== todayIso()) return; // today-only edit, same rule as meals
      if (isMutatingWater) return;             // serialise rapid taps
      dispatch(
        adjustWaterAmount({
          date: selectedDate,
          deltaMl,
          tempId: `tmp-water-${Date.now()}`,
          previousRow: waterRow,
        }),
      );
    },
    [dispatch, isMutatingWater, selectedDate, waterRow],
  );

  const handleWaterIncrement = useCallback(
    () => handleAdjustWater(WATER_INCREMENT_ML),
    [handleAdjustWater],
  );

  const handleWaterDecrement = useCallback(
    () => handleAdjustWater(-WATER_INCREMENT_ML),
    [handleAdjustWater],
  );

  // Manual meal log via AI: parse the form via OpenAI, then go through
  // the same optimistic insert pathway plan-driven meals use.
  const handleSaveLoggedMeal = useCallback(
    async (payload: SaveMealPayload) => {
      if (selectedDate !== todayIso()) {
        throw new Error("You can only log meals for today.");
      }
      const category = TAG_TO_CATEGORY[payload.tag];
      const analyzed = await analyzeMealText({
        items: payload.items,
        comments: payload.comments,
        category,
      });
      dispatch(
        toggleMealLog({
          date: selectedDate,
          action: "insert",
          insert: {
            tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            category,
            source: "user_custom",
            planItemId: null,
            libraryId: null,
            name: analyzed.name,
            kcal: analyzed.kcal,
            protein_g: analyzed.protein_g,
            carbs_g: analyzed.carbs_g,
            fats_g: analyzed.fats_g,
          },
        }),
      );
    },
    [dispatch, selectedDate],
  );

  const handleToggleMeal = useCallback(
    (meal: MealRow) => {
      // Only "today" is editable. Past days are historical, future days
      // are unreachable. The pill-press handler already blocks those, but
      // keep a guard here so direct row taps obey the same rule.
      if (selectedDate !== todayIso()) return;

      const merged = mergedMeals.find((m) => m.key === meal.id);
      if (!merged) return;

      if (merged.added && merged.logId) {
        const snapshot = todaysLogs.find((log) => log.id === merged.logId);
        if (!snapshot) return;
        dispatch(
          toggleMealLog({
            date: selectedDate,
            action: "delete",
            delete: { logId: merged.logId, snapshot },
          }),
        );
        return;
      }

      // Insert — server enum (e.g. "evening_snack"), not the mobile alias.
      dispatch(
        toggleMealLog({
          date: selectedDate,
          action: "insert",
          insert: {
            tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            category: merged.category,
            source: merged.source === "plan" ? "plan" : "library_custom",
            planItemId: merged.planItemId ?? null,
            libraryId: merged.libraryId ?? null,
            name: merged.name,
            kcal: merged.kcal,
            protein_g: merged.protein_g,
            carbs_g: merged.carbs_g,
            fats_g: merged.fats_g,
          },
        }),
      );
    },
    [dispatch, mergedMeals, selectedDate, todaysLogs],
  );

  // True whenever the user is browsing a past or future date — disables
  // all write controls (Log Meal CTA, MealCard +/−, Water +/−). Today is
  // the only day where the user can mutate state.
  const isReadOnlyDate = selectedDate !== todayIso();

  // -------- Render ---------------------------------------------------

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ScreenHeader
          title={t("nutrition.title")}
          eyebrow={t("nutrition.eyebrow")}
        />

        <PhaseWeekHeader
          title={phaseTitle}
          currentWeek={currentWeek}
          totalWeeks={totalWeeks}
          days={days}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onDayPress={handleDayPress}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          enableInactivePress
        />

        <DailyTargetsCard
          kcalEaten={totals.kcal}
          kcalTotal={targets.kcal}
          protein={{ eaten: totals.protein_g, total: targets.protein_g }}
          carbs={{ eaten: totals.carbs_g, total: targets.carbs_g }}
          fats={{ eaten: totals.fats_g, total: targets.fats_g }}
          waterConsumedMl={waterConsumedMl}
          waterGoalMl={waterGoalMl}
          onWaterIncrement={handleWaterIncrement}
          onWaterDecrement={handleWaterDecrement}
          waterDisabled={isReadOnlyDate}
        />

        <View style={styles.mealsHeader}>
          <Text style={styles.sectionTitle}>{t("nutrition.mealsTitle")}</Text>
          <LogMealBadge
            onPress={() => logMealSheetRef.current?.show()}
            disabled={isReadOnlyDate}
          />
        </View>

        <MealsTimeline
          meals={meals}
          onToggleMeal={handleToggleMeal}
          disabled={isReadOnlyDate}
        />
      </ScrollView>

      <ScreenFades />

      <AddLogMealBottomSheet ref={logMealSheetRef} onSave={handleSaveLoggedMeal} />
    </View>
  );
};

export default NutritionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  mealsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
