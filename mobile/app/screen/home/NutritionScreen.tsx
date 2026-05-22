import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import LogMealBadge from "@/app/components/nutrition/LogMealBadge";
import MealsTimeline from "@/app/components/nutrition/MealsTimeline";
import { type MealRow } from "@/app/components/nutrition/types";
import AddLogMealBottomSheet, {
  type AddLogMealBottomSheetRef,
} from "@/app/components/nutrition/AddLogMealBottomSheet";
import DailyTargetsCard from "@/app/components/nutrition/DailyTargetsCard";
import PhaseWeekHeader from "@/app/components/workout/PhaseWeekHeader";
import { type DayItem } from "@/app/components/workout/WeekDaySelector";
import { FONTS } from "@/app/constants/fonts";
import { useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MOCK_MEALS: MealRow[] = [
  { id: "1", category: "breakfast", name: "Veggie Wraps", kcal: 620, protein: 12, carbs: 55, fats: 5 },
  { id: "2", category: "lunch", name: "Chicken Salad", kcal: 450, protein: 30, carbs: 15, fats: 25 },
  { id: "3", category: "eveningSnack", name: "Quinoa Bowl", kcal: 700, protein: 20, carbs: 90, fats: 10 },
  { id: "4", category: "dinner", name: "Beef Tacos", kcal: 800, protein: 40, carbs: 60, fats: 35 },
];

const TARGETS = {
  kcalEaten: 439,
  kcalTotal: 1200,
  protein: { eaten: 38, total: 130 },
  carbs: { eaten: 128, total: 184 },
  fats: { eaten: 18, total: 30 },
};

const WEEK_MOCK: { label: string; date: string; active: boolean }[] = [
  { label: "Mon", date: "04", active: true },
  { label: "Tue", date: "05", active: false },
  { label: "Wed", date: "06", active: false },
  { label: "Thu", date: "07", active: false },
  { label: "Fri", date: "08", active: false },
  { label: "Sat", date: "09", active: false },
  { label: "Sun", date: "10", active: false },
];

const NutritionScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const logMealSheetRef = useRef<AddLogMealBottomSheetRef>(null);

  const days: DayItem[] = useMemo(
    () =>
      WEEK_MOCK.map((d, i) => ({
        key: `${i}-${d.label}`,
        label: d.label,
        date: d.date,
        title: "",
        subtitle: "",
        muscles: [],
        active: d.active,
      })),
    [],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ScreenHeader title={t("nutrition.title")} eyebrow={t("nutrition.eyebrow")}  />

        <PhaseWeekHeader
          title={t("nutrition.phase")}
          currentWeek={4}
          totalWeeks={12}
          days={days}
        />

        <DailyTargetsCard
          kcalEaten={TARGETS.kcalEaten}
          kcalTotal={TARGETS.kcalTotal}
          protein={TARGETS.protein}
          carbs={TARGETS.carbs}
          fats={TARGETS.fats}
        />

        <View style={styles.mealsHeader}>
          <Text style={styles.sectionTitle}>{t("nutrition.mealsTitle")}</Text>
          <LogMealBadge onPress={() => logMealSheetRef.current?.show()} />
        </View>

        <MealsTimeline meals={MOCK_MEALS} />
      </ScrollView>

      <ScreenFades />

      <AddLogMealBottomSheet ref={logMealSheetRef} />
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
    paddingHorizontal: 20,
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
