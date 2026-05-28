import Skeleton from "@/app/components/skeleton/Skeleton";
import { StyleSheet, View } from "react-native";

const ROWS = 4;
const MACRO_WIDTHS = [48, 40, 40, 36];

/**
 * Skeleton placeholder for MealsTimeline, shown while the week's plan is
 * being generated. Mirrors the MealCard layout so the swap to real data
 * doesn't shift: icon box, eyebrow + title, macro chip row, +/- button.
 */
const MealsTimelineSkeleton = () => (
  <View style={styles.group}>
    {Array.from({ length: ROWS }).map((_, i) => (
      <View key={i} style={styles.row}>
        <Skeleton width={44} height={44} radius={16} />
        <View style={styles.body}>
          <Skeleton width={90} height={10} radius={6} />
          <Skeleton width={150} height={18} radius={6} />
          <View style={styles.macroRow}>
            {MACRO_WIDTHS.map((w, idx) => (
              <Skeleton key={idx} width={w} height={14} radius={6} />
            ))}
          </View>
        </View>
        <Skeleton width={40} height={40} radius={20} />
      </View>
    ))}
  </View>
);

export default MealsTimelineSkeleton;

const styles = StyleSheet.create({
  group: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  body: {
    flex: 1,
    gap: 12,
    paddingVertical: 2,
  },
  macroRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
});
