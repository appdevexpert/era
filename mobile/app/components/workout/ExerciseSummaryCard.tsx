import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { ChevronRight } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";

export interface ExerciseSummaryDelta {
  kg: number;
  positive: boolean;
}

interface ExerciseSummaryCardProps {
  /** Eyebrow line — e.g. "Chest • Compound" / "Back • Compound". */
  category: string;
  /** Exercise name — e.g. "Deadlift". */
  name: string;
  /** Sub-meta line — e.g. "3 Sets • 10 Reps". */
  meta?: string;
  /** Big weight value — e.g. 60 kg, 145 kg. Ignored when `displayValue` is set. */
  weightKg: number;
  /**
   * When provided, replaces the default "${weightKg} kg" rendering. Used for
   * non-weight exercises (treadmill walk, plank) where the primary value is
   * a duration like "20 min" or "1 min 30 sec".
   */
  displayValue?: string;
  /** Optional weight-change indicator shown under the weight. */
  delta?: ExerciseSummaryDelta;
  /** Tap handler — when provided, the card becomes a Pressable with press feedback. */
  onPress?: () => void;
}

const DELTA_POSITIVE = "#3DCA7A";
const DELTA_NEGATIVE = "#E67777";

/**
 * Reusable exercise summary row used on the Weights tab and PR History screen.
 * Matches Figma node 4769:71366 (and the Weights variants): eyebrow + name + meta
 * on the left, chevron + weight + colored delta stacked on the right.
 */
const ExerciseSummaryCard = ({
  category,
  name,
  meta,
  weightKg,
  displayValue,
  delta,
  onPress,
}: ExerciseSummaryCardProps) => {
  const { format, toDisplay, label } = useWeightUnit();
  const inner = (
    <>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{category}</Text>
        <Text style={styles.name}>{name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <View style={styles.right}>
        <ChevronRight width={16} height={16} color="rgba(240,240,240,0.5)" />
        <Text style={styles.weight}>{displayValue ?? format(weightKg)}</Text>
        {delta ? (
          <Text
            style={[
              styles.delta,
              { color: delta.positive ? DELTA_POSITIVE : DELTA_NEGATIVE },
            ]}
          >
            {`${delta.positive ? "+" : "-"}${toDisplay(delta.kg)} ${label}`}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        style={styles.card}
      >
        {inner}
      </PressableScale>
    );
  }
  return <View style={styles.card}>{inner}</View>;
};

export default ExerciseSummaryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    gap: 8,
    alignItems: "flex-start",
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240, 240, 240, 0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  meta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
    gap: 10,
  },
  weight: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  delta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
