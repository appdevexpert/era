import { FONTS } from "@/app/constants/fonts";
import { useAnimatedCounter } from "@/app/hooks/useAnimatedCounter";
import { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type SvgProps } from "react-native-svg";
import MacroGauge from "./MacroGauge";
import { GOLD, MACRO_GAUGE_HEIGHT, MACRO_GAUGE_WIDTH } from "./tokens";

interface MacroSlotProps {
  label: string;
  Icon: ComponentType<SvgProps>;
  iconSize?: number;
  value: number;
  left: number;
  total: number;
}

const MacroSlot = ({ label, Icon, iconSize = 16, value, left, total }: MacroSlotProps) => {
  const displayValue = useAnimatedCounter(value);
  const displayLeft = useAnimatedCounter(left);
  return (
    <View style={styles.slot}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.gaugeWrap}>
        <MacroGauge value={value} total={total} />
        <View style={styles.iconTop} pointerEvents="none">
          <Icon width={iconSize} height={iconSize} />
        </View>
        <View style={styles.valueCenter} pointerEvents="none">
          <Text style={styles.value}>{`${displayValue}g`}</Text>
        </View>
      </View>
      <Text style={styles.leftText}>{`${displayLeft}g left`}</Text>
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
    fontSize: 14,
    fontWeight: "700",
    color: "#C9A84C",
  },
  leftText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
  },
});
