import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

interface DayHeaderProps {
  /** Full weekday name — e.g. "Monday" / "Mandag". Rendered as the display title. */
  dayName: string;
  /** Section / day-type label — e.g. "Push - Heavy". Rendered uppercase in gold. */
  subtitle: string;
  exerciseCount: number;
}

const DayHeader = ({ dayName, subtitle, exerciseCount }: DayHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{dayName}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.count}>
        {t("weights.exerciseCount", { count: exerciseCount })}
      </Text>
    </View>
  );
};

export default DayHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  count: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240, 240, 240, 0.8)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
