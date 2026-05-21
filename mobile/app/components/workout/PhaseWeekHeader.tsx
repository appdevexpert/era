import IconButton from "@/app/components/common/IconButton";
import WeekDaySelector, { type DayItem } from "@/app/components/workout/WeekDaySelector";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ChevronBack, ChevronRight } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

interface PhaseWeekHeaderProps {
  title: string;
  currentWeek: number;
  totalWeeks: number;
  days: DayItem[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onDayPress?: (day: DayItem) => void;
}

const ChevButton = ({ direction, onPress }: { direction: "left" | "right"; onPress?: () => void }) => (
  <IconButton onPress={onPress} size={32} tint="subtle">
    {direction === "left" ? (
      <ChevronBack width={20} height={20} color={COLORS.primary.dark} />
    ) : (
      <ChevronRight width={20} height={20} color={COLORS.primary.dark} />
    )}
  </IconButton>
);

const PhaseWeekHeader = ({
  title,
  currentWeek,
  totalWeeks,
  days,
  onPrevWeek,
  onNextWeek,
  onDayPress,
}: PhaseWeekHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.weekNav}>
          <ChevButton direction="left" onPress={onPrevWeek} />
          <View style={styles.weekCounter}>
            <Text style={styles.weekCounterValue}>
              {t("nutrition.weekProgress", { current: currentWeek, total: totalWeeks })}
            </Text>
            <Text style={styles.weekCounterLabel}>{t("nutrition.weekLabel")}</Text>
          </View>
          <ChevButton direction="right" onPress={onNextWeek} />
        </View>
      </View>
      <WeekDaySelector days={days} onDayPress={onDayPress} />
    </View>
  );
};

export default PhaseWeekHeader;

const styles = StyleSheet.create({
  wrap: {
    gap: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  weekCounter: {
    alignItems: "center",
    gap: 2,
  },
  weekCounterValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary.dark,
  },
  weekCounterLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(240,240,240,0.7)",
    textTransform: "uppercase",
  },
});
