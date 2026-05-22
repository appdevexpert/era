import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

interface DayHeaderProps {
  title: string;
  subtitle: string;
  exerciseCount: number;
}

const DayHeader = ({ title, subtitle, exerciseCount }: DayHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  subtitle: {
    marginTop: 6,
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
