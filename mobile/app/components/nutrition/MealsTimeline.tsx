import MealCard from "@/app/components/nutrition/MealCard";
import { type MealRow } from "@/app/components/nutrition/types";
import { StyleSheet, View } from "react-native";

interface MealsTimelineProps {
  meals: MealRow[];
  onToggleMeal?: (meal: MealRow) => void;
}

const MealsTimeline = ({ meals, onToggleMeal }: MealsTimelineProps) => (
  <View style={styles.list}>
    {meals.map((meal, idx) => (
      <View key={meal.id} style={styles.rowWrap}>
        {idx < meals.length - 1 ? <View style={styles.connector} /> : null}
        <MealCard meal={meal} onToggle={onToggleMeal} />
      </View>
    ))}
  </View>
);

export default MealsTimeline;

const styles = StyleSheet.create({
  list: {
    gap: 54,
  },
  rowWrap: {
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 20,
    top: 44,
    bottom: -54,
    width: 1,
    backgroundColor: "rgba(240, 240, 240, 0.15)",
  },
});
