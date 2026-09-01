import { FONTS } from "@/app/constants/fonts";
import { useAnimatedCounter } from "@/app/hooks/useAnimatedCounter";
import { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { type SvgProps } from "react-native-svg";
import MacroGauge from "./MacroGauge";
import {
  GOLD,
  isOverTarget,
  MACRO_GAUGE_HEIGHT,
  MACRO_GAUGE_WIDTH,
  OVER,
} from "./tokens";

interface MacroSlotProps {
  label: string;
  Icon: ComponentType<SvgProps>;
  iconSize?: number;
  /** Grams eaten so far. */
  value: number;
  /** Daily target in grams. */
  total: number;
}

const MacroSlot = ({ label, Icon, iconSize = 16, value, total }: MacroSlotProps) => {
  const { t } = useTranslation();
  const over = isOverTarget(value, total);
  const displayValue = useAnimatedCounter(value);
  // Under target we count down what's left, over target we count up the
  // excess — so the caption is never a negative number.
  const displayDelta = useAnimatedCounter(
    over ? value - total : Math.max(total - value, 0),
  );

  return (
    <View style={styles.slot}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.gaugeWrap}>
        <MacroGauge value={value} total={total} over={over} />
        <View style={styles.iconTop} pointerEvents="none">
          <Icon width={iconSize} height={iconSize} />
        </View>
        <View style={styles.valueCenter} pointerEvents="none">
          <Text style={[styles.value, over && styles.valueOver]}>{`${displayValue}g`}</Text>
        </View>
      </View>
      <Text style={styles.deltaText}>
        {t(over ? "nutrition.gramsOver" : "nutrition.gramsLeft", { value: displayDelta })}
      </Text>
    </View>
  );
};

export default MacroSlot;

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    gap: 9,
    minWidth: 80,
  },
  label: {
    fontFamily: FONTS.regular,
    includeFontPadding: false,
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  gaugeWrap: {
    width: MACRO_GAUGE_WIDTH,
    height: MACRO_GAUGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTop: {
    position: "absolute",
    top: -3,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  valueCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: FONTS.semiBold,
    includeFontPadding: false,
    fontSize: 14,
    fontWeight: "700",
    color: GOLD,
  },
  valueOver: {
    color: OVER,
  },
  deltaText: {
    fontFamily: FONTS.medium,
    includeFontPadding: false,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
  },
});
