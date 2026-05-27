import Skeleton from "@/app/components/skeleton/Skeleton";
import { StyleSheet, View } from "react-native";

const PAST_COUNT = 4;

/**
 * Skeleton for ExercisePrHistoryScreen. Mirrors the live composition:
 *   Section title
 *   Highlighted "latest PR" card (gold gradient + badge)
 *   Divider
 *   Dimmed past PR cards
 */
const ExercisePrHistoryScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <Skeleton width={140} height={24} radius={6} />

      <View style={styles.highlightCard}>
        <View style={styles.cardLeft}>
          <Skeleton width={120} height={12} radius={6} />
          <Skeleton width={180} height={24} radius={6} />
        </View>
        <Skeleton width={56} height={40} radius={8} />
      </View>

      <View style={styles.divider} />

      <View style={styles.pastList}>
        {Array.from({ length: PAST_COUNT }).map((_, i) => (
          <View key={i} style={styles.pastCard}>
            <View style={styles.cardLeft}>
              <Skeleton width={110} height={12} radius={6} />
              <Skeleton width={160} height={20} radius={6} />
            </View>
            <Skeleton width={50} height={14} radius={6} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default ExercisePrHistoryScreenSkeleton;

const styles = StyleSheet.create({
  container: { gap: 16 },
  highlightCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  cardLeft: { flex: 1, gap: 8 },
  divider: { height: 1, backgroundColor: "rgba(240,240,240,0.1)" },
  pastList: { gap: 16, opacity: 0.6 },
  pastCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
});
