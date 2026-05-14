import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";

export type BestSetCardProps = {
  label: string;
  weight: number;
  weightUnit?: string;
  reps: number;
  repsLabel: string;
  accessibilityLabel?: string;
};

const DEFAULT_UNIT = "kg";

const BestSetCard = ({
  label,
  weight,
  weightUnit = DEFAULT_UNIT,
  reps,
  repsLabel,
  accessibilityLabel,
}: BestSetCardProps) => {
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        accessibilityLabel ?? `${label}: ${weight}${weightUnit} x ${reps} ${repsLabel}`
      }
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.weight}>
          {weight}
          <Text style={styles.unit}>{weightUnit}</Text>
        </Text>
        <Text style={styles.separator}>×</Text>
        <Text style={styles.reps}>
          {reps} <Text style={styles.repsLabel}>{repsLabel}</Text>
        </Text>
      </View>
    </View>
  );
};

export default BestSetCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
    backgroundColor: COLORS.alpha.primary16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 1.32,
    textTransform: "uppercase",
    lineHeight: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  weight: {
    fontFamily: FONTS.display,
    fontSize: 30,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 36,
  },
  unit: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  separator: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: COLORS.alpha.white72,
    lineHeight: 28,
  },
  reps: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 30,
  },
  repsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.alpha.white72,
    letterSpacing: 0.28,
  },
});
