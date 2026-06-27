import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import { useRequireEntitlement } from "@/app/hooks/useRequireEntitlement";
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
import NutritionWeekHeader from "@/app/components/nutrition/NutritionWeekHeader";
import {
  type NutritionDayItem,
  type NutritionDayStatus,
} from "@/app/components/nutrition/NutritionWeekDays";
import MealsTimelineSkeleton from "@/app/components/skeleton/MealsTimelineSkeleton";
import { FONTS } from "@/app/constants/fonts";
import { MealBreakfast } from "@/assets/icons";
import {
  selectActivePhaseKey,
  selectCanGoNextWeek,
  selectCanGoPrevWeek,
  selectDailyTargets,
  selectDailyTotals,
  selectIsGeneratingSelectedWeek,
  selectIsMutatingWaterForSelectedDate,
  selectLogsForSelectedDate,
  selectMergedMealRows,
  selectNutritionStatus,
  selectSelectedDate,
  selectSelectedWeekNumber,
  selectWaterConsumedMlForSelectedDate,
  selectWaterRowForSelectedDate,
  selectWaterTargetMl,
  selectWeekDays,
} from "@/app/stores/selectors/nutritionSelectors";
import {
  adjustWaterAmount,
  ensureWeekPlan,
  loadNutritionBootstrap,
  selectNutritionDate,
  toggleMealLog,
} from "@/app/stores/slice/nutritionSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { analyzeMealText } from "@/app/services/aiNutritionService";
import type { MealCategoryEnum } from "@/app/types/nutrition";
import { getLocalizedText } from "@/app/utils/localization";
import {
  TOTAL_PROGRAM_WEEKS,
  weekNumberForDate,
} from "@/app/utils/nutritionMappers";
import { addDays, todayIso } from "@/app/utils/nutritionDates";
import { getWeekdayFromDate } from "@/app/utils/programSchedule";
import { uuidv4 } from "@/app/utils/uuid";
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

// Bottom-sheet tag → DB category enum. The sheet only exposes 4 tags.
const TAG_TO_CATEGORY: Record<MealTag, MealCategoryEnum> = {
  breakfast: "breakfast",
  lunch: "lunch",
  eveningSnack: "evening_snack",
  dinner: "dinner",
};

const NutritionScreen = () => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const logMealSheetRef = useRef<AddLogMealBottomSheetRef>(null);
  // Meal logging is Standard+ — free users get bounced to the paywall.
  const requireEntitlement = useRequireEntitlement();

  const handleLogMeal = () => {
    if (!requireEntitlement("standard")) return;
    logMealSheetRef.current?.show();
  };

  const status = useSelector(selectNutritionStatus);
  const selectedDate = useSelector(selectSelectedDate);
  const phaseKey = useSelector(selectActivePhaseKey);
  const currentWeek = useSelector(selectSelectedWeekNumber);
  const targets = useSelector(selectDailyTargets);
  const totals = useSelector(selectDailyTotals);
  const weekDays = useSelector(selectWeekDays);
  const canGoPrev = useSelector(selectCanGoPrevWeek);
  const canGoNext = useSelector(selectCanGoNextWeek);
  const mergedMeals = useSelector(selectMergedMealRows);
  const isGeneratingPlan = useSelector(selectIsGeneratingSelectedWeek);
  const waterConsumedMl = useSelector(selectWaterConsumedMlForSelectedDate);
  const waterGoalMl = useSelector(selectWaterTargetMl);
  const waterRow = useSelector(selectWaterRowForSelectedDate);
  const isMutatingWater = useSelector(selectIsMutatingWaterForSelectedDate);
  const programStartDate = useSelector(
    (state: RootState) => state.auth.programStartDate,
  );
  const todaysLogs = useSelector(selectLogsForSelectedDate);

  // Today's program week — the only week we auto-generate a plan for.
  const todaysWeek = useMemo(
    () => weekNumberForDate(todayIso(), programStartDate ?? null),
    [programStartDate],
  );

  // Load this week's logs once; ensure the current week's plan exists
  // (loaded from DB or generated by AI). Both are idempotent.
  useEffect(() => {
    if (status === "idle") {
      dispatch(loadNutritionBootstrap());
    }
  }, [dispatch, status]);

  useEffect(() => {
    dispatch(ensureWeekPlan(todaysWeek));
    // On the last day of the week (Sunday), pre-generate next week's plan in
    // the background so the rollover to a new week is instant.
    const isLastDayOfWeek = getWeekdayFromDate(todayIso()) === 7;
    if (isLastDayOfWeek && todaysWeek < TOTAL_PROGRAM_WEEKS) {
      dispatch(ensureWeekPlan(todaysWeek + 1));
    }
  }, [dispatch, todaysWeek]);

  // -------- View-model mapping --------------------------------------

  const days: NutritionDayItem[] = useMemo(
    () =>
      weekDays.map((d) => {
        const status: NutritionDayStatus =
          d.status === "before_program"
            ? "before_program"
            : d.status === "today"
              ? "today"
              : d.status === "future"
                ? "future"
                : d.hasLogs
                  ? "past_completed"
                  : "past_missed";
        return {
          key: d.date,
          label: d.weekdayShort,
          date: String(d.dayOfMonth).padStart(2, "0"),
          status,
          selected: d.date === selectedDate,
        };
      }),
    [selectedDate, weekDays],
  );

  // Localize plan names at render time so a language switch updates instantly.
  const meals: MealRow[] = useMemo(
    () =>
      mergedMeals.map((m) => ({
        id: m.key,
        category: mapCategory(m.category),
        name: m.nameTranslations
          ? getLocalizedText(m.nameTranslations, i18n.language, m.name)
          : m.name,
        note: m.note,
        kcal: m.kcal,
        protein: m.protein_g,
        carbs: m.carbs_g,
        fats: m.fats_g,
        added: m.added,
        source: m.source,
        Icon: MealBreakfast,
      })),
    [mergedMeals, i18n.language],
  );

  // -------- Header data ---------------------------------------------

  const phaseTitle = useMemo(() => {
    if (phaseKey === "strength") return t("nutrition.phaseStrength");
    if (phaseKey === "peak") return t("nutrition.phasePeak");
    return t("nutrition.phaseHypertrophy");
  }, [phaseKey, t]);

  // Figma node 6671:7147 — gold uppercase weekday under the phase title,
  // localized via the device weekday name (Thursday / torsdag) and force-
  // uppercased at render time so the styling stays consistent across locales.
  const selectedWeekdayName = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString(i18n.language, { weekday: "long" });
  }, [i18n.language, selectedDate]);

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
    (day: NutritionDayItem) => {
      // Nutrition is locked to the generated plan's timeframe — there is no
      // meal plan for dates before programStartDate, so those pills stay
      // visually dashed AND inert. Future dates remain tappable for preview
      // but are write-blocked by `isFutureDate` further down.
      if (day.status === "before_program") return;
      dispatch(selectNutritionDate(day.key));
    },
    [dispatch],
  );

  // Future-date logging is blocked; past + today both allowed. ISO strings
  // (YYYY-MM-DD) compare lexicographically, so a string `>` is a real date `>`.
  const isFutureDate = selectedDate > todayIso();

  const WATER_INCREMENT_ML = 250;
  const handleAdjustWater = useCallback(
    (deltaMl: number) => {
      if (isFutureDate) return;
      if (isMutatingWater) return;
      dispatch(
        adjustWaterAmount({
          date: selectedDate,
          deltaMl,
          tempId: `tmp-water-${Date.now()}`,
          previousRow: waterRow,
        }),
      );
    },
    [dispatch, isFutureDate, isMutatingWater, selectedDate, waterRow],
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
      if (isFutureDate) {
        throw new Error("You can't log meals for a future date.");
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
            id: uuidv4(),
            category,
            source: "user_custom",
            planItemId: null,
            name: analyzed.name,
            notes: payload.comments.trim() || null,
            kcal: analyzed.kcal,
            protein_g: analyzed.protein_g,
            carbs_g: analyzed.carbs_g,
            fats_g: analyzed.fats_g,
          },
        }),
      );
    },
    [dispatch, isFutureDate, selectedDate],
  );

  const handleToggleMeal = useCallback(
    (meal: MealRow) => {
      if (isFutureDate) return;

      const merged = mergedMeals.find((m) => m.key === meal.id);
      if (!merged) return;

      if (merged.added && merged.logId) {
        // When the meal is plan-linked, sync-queue retries may have created
        // duplicate rows for the same plan_item_id. The merged view dedupes
        // them for display, so a single tap on `-` must clear ALL of them
        // — otherwise the user would have to tap multiple times to fully
        // remove a meal whose duplicates they never knew existed.
        const idsToDelete = merged.planItemId
          ? todaysLogs
              .filter((log) => log.user_meal_plan_item_id === merged.planItemId)
              .map((log) => log.id)
          : [merged.logId];

        for (const logId of idsToDelete) {
          const snapshot = todaysLogs.find((log) => log.id === logId);
          if (!snapshot) continue;
          dispatch(
            toggleMealLog({
              date: selectedDate,
              action: "delete",
              delete: { logId, snapshot },
            }),
          );
        }
        return;
      }

      // Insert — use the rendered (localized) name as the snapshot.
      dispatch(
        toggleMealLog({
          date: selectedDate,
          action: "insert",
          insert: {
            id: uuidv4(),
            category: merged.category,
            source: merged.source === "plan" ? "plan" : "library_custom",
            planItemId: merged.planItemId ?? null,
            name: meal.name,
            kcal: merged.kcal,
            protein_g: merged.protein_g,
            carbs_g: merged.carbs_g,
            fats_g: merged.fats_g,
          },
        }),
      );
    },
    [dispatch, isFutureDate, mergedMeals, selectedDate, todaysLogs],
  );

  const isReadOnlyDate = isFutureDate;
  // Skeleton only while generating and we have nothing to show yet.
  const showMealsSkeleton = isGeneratingPlan && meals.length === 0;

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

        <NutritionWeekHeader
          title={phaseTitle}
          subtitle={selectedWeekdayName}
          currentWeek={currentWeek}
          totalWeeks={12}
          days={days}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onDayPress={handleDayPress}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
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
            onPress={handleLogMeal}
            disabled={isReadOnlyDate}
          />
        </View>

        {showMealsSkeleton ? (
          <MealsTimelineSkeleton />
        ) : (
          <MealsTimeline
            meals={meals}
            onToggleMeal={handleToggleMeal}
            disabled={isReadOnlyDate}
          />
        )}
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
