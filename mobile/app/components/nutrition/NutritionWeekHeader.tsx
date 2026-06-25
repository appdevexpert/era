import IconButton from "@/app/components/common/IconButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ChevronBack, ChevronRight } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import NutritionWeekDays, { type NutritionDayItem } from "./NutritionWeekDays";

interface NutritionWeekHeaderProps {
  title: string;
  /** Gold uppercase weekday name shown under the phase title (Figma 6671:7147). */
  subtitle?: string;
  currentWeek: number;
  totalWeeks: number;
  days: NutritionDayItem[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onDayPress?: (day: NutritionDayItem) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

const ChevButton = ({
  direction,
  onPress,
  disabled,
}: {
  direction: "left" | "right";
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <IconButton
    onPress={disabled ? undefined : onPress}
    size={32}
    tint="subtle"
    style={disabled ? { opacity: 0.35 } : undefined}
  >
    {direction === "left" ? (
      <ChevronBack width={20} height={20} color={COLORS.primary.dark} />
    ) : (
      <ChevronRight width={20} height={20} color={COLORS.primary.dark} />
    )}
  </IconButton>
);

const NutritionWeekHeader = ({
  title,
  subtitle,
  currentWeek,
  totalWeeks,
  days,
  onPrevWeek,
  onNextWeek,
  onDayPress,
  canGoPrev = true,
  canGoNext = true,
}: NutritionWeekHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.weekNav}>
          <ChevButton direction="left" onPress={onPrevWeek} disabled={!canGoPrev} />
          <View style={styles.weekCounter}>
            <Text style={styles.weekCounterValue}>
              {t("nutrition.weekProgress", { current: currentWeek, total: totalWeeks })}
            </Text>
            <Text style={styles.weekCounterLabel}>{t("nutrition.weekLabel")}</Text>
          </View>
          <ChevButton direction="right" onPress={onNextWeek} disabled={!canGoNext} />
        </View>
      </View>
      <NutritionWeekDays days={days} onDayPress={onDayPress} />
    </View>
  );
};

export default NutritionWeekHeader;

const styles = StyleSheet.create({
  wrap: {
    gap: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: "400",
    color: "#C9A84C",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    lineHeight: 12,
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
