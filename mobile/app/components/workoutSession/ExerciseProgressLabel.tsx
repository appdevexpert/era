import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export type ExerciseProgressLabelProps = {
  current: number;
  total: number;
  /** Override the trailing label (defaults to localized "EXERCISES") */
  label?: string;
  testID?: string;
};

const ExerciseProgressLabel = ({
  current,
  total,
  label,
  testID,
}: ExerciseProgressLabelProps) => {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("workout.restTimer.exercisesLabel");

  return (
    <View style={styles.row} testID={testID}>
      <Text
        accessibilityRole="text"
        accessibilityLabel={t("workout.restTimer.progressAccessibility", {
          current,
          total,
          label: resolvedLabel,
        })}
        style={styles.text}
      >
        <Text style={styles.count}>{`${current}/${total}`}</Text>
        <Text style={styles.label}>{`  ${resolvedLabel}`}</Text>
      </Text>
    </View>
  );
};

export default ExerciseProgressLabel;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
  },
  count: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary.dark,
    letterSpacing: 1.2,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.alpha.white72,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
