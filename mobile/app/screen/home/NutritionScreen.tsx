import IconButton from "@/app/components/common/IconButton";
import DailyTargetsCard from "@/app/components/workout/DailyTargetsCard";
import PhaseWeekHeader from "@/app/components/workout/PhaseWeekHeader";
import { type DayItem } from "@/app/components/workout/WeekDaySelector";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import {
  MealBreakfast,
  MealChipBeans,
  MealChipCheese,
  MealChipFire,
  MealChipWheat,
  TablerPlus,
} from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentType, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type SvgProps } from "react-native-svg";

interface MealRow {
  id: string;
  category: "breakfast" | "lunch" | "eveningSnack" | "dinner";
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

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

const PlusButton = () => (
  <IconButton size={40} tint="emphasized">
    <TablerPlus width={20} height={20} color="#F0F0F0" />
  </IconButton>
);

const CHIP_ICON_COLOR = "#868592";

const MealMetaChip = ({
  Icon,
  value,
  suffix = "g",
}: {
  Icon: ComponentType<SvgProps>;
  value: number | string;
  suffix?: string;
}) => (
  <View style={styles.metaChip}>
    <Icon width={16} height={16} color={CHIP_ICON_COLOR} />
    <Text style={styles.metaText}>{typeof value === "number" ? `${value}${suffix}` : value}</Text>
  </View>
);

const MealCard = ({ meal, t }: { meal: MealRow; t: (key: string, opts?: Record<string, unknown>) => string }) => (
  <View style={styles.mealRow}>
    <View style={styles.mealIconBox}>
      <MealBreakfast width={28} height={28} />
    </View>
    <View style={styles.mealBody}>
      <View style={styles.mealHeader}>
        <View style={styles.mealHeaderText}>
          <Text style={styles.mealEyebrow}>
            {t("nutrition.suggestedTag", { meal: t(`nutrition.${meal.category}`) })}
          </Text>
          <Text style={styles.mealName}>{meal.name}</Text>
        </View>
        <PlusButton />
      </View>
      <View style={styles.mealMetaRow}>
        <MealMetaChip Icon={MealChipFire} value={`${meal.kcal} kcal`} suffix="" />
        <MealMetaChip Icon={MealChipBeans} value={meal.protein} />
        <MealMetaChip Icon={MealChipWheat} value={meal.carbs} />
        <MealMetaChip Icon={MealChipCheese} value={meal.fats} />
      </View>
    </View>
  </View>
);

const NutritionScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("nutrition.title")}</Text>
            <Text style={styles.eyebrow}>{t("nutrition.eyebrow")}</Text>
          </View>
          <View style={styles.avatar} />
        </View>

        {/* Phase + week navigation + day pills */}
        <PhaseWeekHeader
          title={t("nutrition.phase")}
          currentWeek={4}
          totalWeeks={12}
          days={days}
        />

        {/* Daily Targets */}
        <DailyTargetsCard
          kcalEaten={TARGETS.kcalEaten}
          kcalTotal={TARGETS.kcalTotal}
          protein={TARGETS.protein}
          carbs={TARGETS.carbs}
          fats={TARGETS.fats}
        />

        {/* Meals */}
        <View style={styles.mealsHeader}>
          <Text style={styles.sectionTitle}>{t("nutrition.mealsTitle")}</Text>
          <View style={styles.logMealBadge}>
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.logMealText}>{t("nutrition.logMeal")}</Text>
          </View>
        </View>

        <View style={styles.mealsList}>
          {MOCK_MEALS.map((meal, idx) => (
            <View key={meal.id} style={styles.mealRowWrap}>
              {idx < MOCK_MEALS.length - 1 ? <View style={styles.timelineConnector} /> : null}
              <MealCard meal={meal} t={t} />
            </View>
          ))}
        </View>
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,1)", "rgba(10,10,10,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.topFade, { height: insets.top + 24 }]}
      />

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,1)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.bottomFade, { height: insets.bottom + 100 }]}
      />
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
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 48,
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.alpha.surface08,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  // Section titles
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  // Meals
  mealsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logMealBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  logMealText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  mealsList: {
    gap: 54,
  },
  mealRowWrap: {
    position: "relative",
  },
  timelineConnector: {
    position: "absolute",
    left: 20,
    top: 44,
    bottom: -54,
    width: 1,
    backgroundColor: "rgba(240, 240, 240, 0.15)",
  },
  mealRow: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  mealIconBox: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#111111",
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  mealBody: {
    flex: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  mealHeaderText: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  mealEyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "#868592",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  mealName: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  mealMetaRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
