import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ChevronRight } from "@/assets/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  /** Big weight value — e.g. 60 kg, 145 kg. */
  weightKg: number;
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
  delta,
  onPress,
}: ExerciseSummaryCardProps) => {
  const inner = (
    <>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{category}</Text>
        <Text style={styles.name}>{name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <View style={styles.right}>
        <ChevronRight width={16} height={16} color="rgba(240,240,240,0.5)" />
        <Text style={styles.weight}>{`${weightKg} kg`}</Text>
        {delta ? (
          <Text
            style={[
              styles.delta,
              { color: delta.positive ? DELTA_POSITIVE : DELTA_NEGATIVE },
            ]}
          >
            {delta.positive ? `+${delta.kg} Kg` : `-${delta.kg} Kg`}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        {inner}
      </Pressable>
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
