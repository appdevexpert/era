import ScreenFades from "@/app/components/common/ScreenFades";
import ExerciseSummaryCard from "@/app/components/workout/ExerciseSummaryCard";
import { FONTS } from "@/app/constants/fonts";
import { type HomeStackParamList } from "@/app/navigation/types";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PrRow {
  id: string;
  category: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  delta?: { kg: number; positive: boolean };
}

const PR_ROWS: PrRow[] = [
  { id: "1", category: "Back • Compound",  name: "Deadlift",    sets: 3, reps: 10, weightKg: 145, delta: { kg: 5,  positive: true } },
  { id: "2", category: "Chest • Compound", name: "Bench Press", sets: 3, reps: 18, weightKg: 120, delta: { kg: 15, positive: true } },
  { id: "3", category: "Legs • Compound",  name: "Squats",      sets: 3, reps: 18, weightKg: 120, delta: { kg: 10, positive: true } },
];

const PrHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();

  const openExercisePrHistory = (row: PrRow) =>
    navigation.navigate("ExercisePrHistory", {
      title: row.name,
      subtitle: row.category,
    });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <Text style={styles.sectionTitle}>{t("progress.prHistory.exercises")}</Text>

        <View style={styles.list}>
          {PR_ROWS.map((row) => (
            <ExerciseSummaryCard
              key={row.id}
              category={row.category}
              name={row.name}
              meta={`${row.sets} Sets • ${row.reps} Reps`}
              weightKg={row.weightKg}
              delta={row.delta}
              onPress={() => openExercisePrHistory(row)}
            />
          ))}
        </View>
      </ScrollView>

      <ScreenFades hideTop />
    </View>
  );
};

export default PrHistoryScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  list: { gap: 12 },
});
