import { FONTS } from "@/app/constants/fonts";
import { useAnimatedCounter } from "@/app/hooks/useAnimatedCounter";
import { FireGold, FireOver } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { groupThousands } from "./format";
import { GOLD, isOverTarget, OVER } from "./tokens";

interface KcalHeroProps {
  eaten: number;
  total: number;
}

/**
 * Centered text + flame icon shown inside the semicircle gauge. Three states
 * (Figma 7535:4316 / 7536:4296 / 7535:4634):
 *
 *   under target → gold, "1,361kCal remaining"
 *   exactly on target → gold, "Target reached", value carries the unit
 *   over target → salmon, "42kCal over target"
 */
const KcalHero = ({ eaten, total }: KcalHeroProps) => {
  const { t, i18n } = useTranslation();
  const over = isOverTarget(eaten, total);
  const reached = !over && total > 0 && eaten === total;

  const displayEaten = useAnimatedCounter(eaten);
  const displayDelta = useAnimatedCounter(
    over ? eaten - total : Math.max(total - eaten, 0),
  );

  const eatenText = groupThousands(displayEaten, i18n.language);
  const deltaText = groupThousands(displayDelta, i18n.language);

  const caption = over
    ? t("nutrition.kcalOverTarget", { value: deltaText })
    : reached
      ? t("nutrition.targetReached")
      : t("nutrition.kcalRemaining", { value: deltaText });

  return (
    <View style={styles.wrap}>
      {over ? <FireOver width={36} height={36} /> : <FireGold width={36} height={36} />}
      <Text style={[styles.value, over && styles.valueOver]}>
        {reached ? t("nutrition.kcalValue", { value: eatenText }) : eatenText}
      </Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
};

export default KcalHero;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontFamily: FONTS.semiBold,
    includeFontPadding: false,
    fontSize: 24,
    fontWeight: "700",
    color: GOLD,
    lineHeight: 28,
  },
  valueOver: {
    color: OVER,
  },
  caption: {
    fontFamily: FONTS.medium,
    includeFontPadding: false,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.75)",
  },
});
