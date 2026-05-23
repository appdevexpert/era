import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import DayHeader from "@/app/components/weight/DayHeader";
import ExerciseSummaryCard from "@/app/components/workout/ExerciseSummaryCard";
import PhaseWeekHeader from "@/app/components/workout/PhaseWeekHeader";
import { type DayItem } from "@/app/components/workout/WeekDaySelector";
import { type HomeStackParamList, type MuscleGroup } from "@/app/navigation/types";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ExerciseRow {
  id: string;
  category: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  delta?: { kg: number; positive: boolean };
  muscles?: MuscleGroup[];
}

const MOCK_EXERCISES: ExerciseRow[] = [
  { id: "1", category: "Back • Compound", name: "Deadlift", sets: 3, reps: 10, weightKg: 60, delta: { kg: 5, positive: true }, muscles: ["leg", "abs"] },
  { id: "2", category: "Chest • Compound", name: "Bench Press", sets: 3, reps: 18, weightKg: 60, delta: { kg: 5, positive: false }, muscles: ["chest", "arm"] },
  { id: "3", category: "Legs • Compound", name: "Squats", sets: 3, reps: 18, weightKg: 60, muscles: ["leg", "abs"] },
  { id: "4", category: "Legs • Compound", name: "Romanian Deadlift", sets: 3, reps: 18, weightKg: 60, muscles: ["leg"] },
  { id: "5", category: "Shoulders • Compound", name: "Overhead Press", sets: 3, reps: 18, weightKg: 60, muscles: ["shoulders", "arm"] },
];

const WEEK_MOCK: { label: string; date: string; active: boolean }[] = [
  { label: "Mon", date: "04", active: true },
  { label: "Tue", date: "05", active: false },
  { label: "Wed", date: "06", active: false },
  { label: "Thu", date: "07", active: false },
  { label: "Fri", date: "08", active: false },
  { label: "Sat", date: "09", active: false },
  { label: "Sun", date: "10", active: false },
];

const WeightsScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();

  const openExerciseHistory = (ex: ExerciseRow) => {
    navigation.navigate("ExerciseHistory", {
      title: ex.name,
      subtitle: ex.category,
      muscles: ex.muscles,
    });
  };

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
        <ScreenHeader title={t("weights.title")} eyebrow={t("weights.eyebrow")} />

        <PhaseWeekHeader
          title={t("weights.phase")}
          currentWeek={4}
          totalWeeks={12}
          days={days}
        />

        <DayHeader
          title={t("weights.dayMonday")}
          subtitle={t("weights.dayPushHeavy")}
          exerciseCount={MOCK_EXERCISES.length}
        />

        <View style={styles.cardList}>
          {MOCK_EXERCISES.map((ex) => (
            <ExerciseSummaryCard
              key={ex.id}
              category={ex.category}
              name={ex.name}
              meta={`${ex.sets} Sets • ${ex.reps} Reps`}
              weightKg={ex.weightKg}
              delta={ex.delta}
              onPress={() => openExerciseHistory(ex)}
            />
          ))}
        </View>
      </ScrollView>

      <ScreenFades />
    </View>
  );
};

export default WeightsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  cardList: {
    gap: 12,
  },
});
