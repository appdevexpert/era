import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";
import {
  GOLD,
  GOLD_DIM,
  MACRO_BRIGHT_STROKE,
  MACRO_DIM_STROKE,
  MACRO_GAUGE_HEIGHT,
  MACRO_GAUGE_VIEWBOX_H,
  MACRO_GAUGE_VIEWBOX_W,
  MACRO_GAUGE_WIDTH,
} from "./tokens";

// Exact gauge path from Figma — open rounded rectangle with a gap at the top.
const GAUGE_PATH =
  "M43 3 C50.1797 3 56 8.8203 56 16 V37 C56 45.8366 48.8366 53 40 53 H19 C10.1634 53 3 45.8366 3 37 V16.5 C3 9.04416 9.04416 3 16.5 3";

// Perimeter (viewBox units): clockwise from start point.
const GAUGE_PERIMETER =
  (Math.PI * 13) / 2 +
  21 +
  (Math.PI * 16) / 2 +
  21 +
  (Math.PI * 16) / 2 +
  20.5 +
  (Math.PI * 13.5) / 2;

const TWEEN_DURATION_MS = 900;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface MacroGaugeProps {
  value: number;
  total: number;
}

const MacroGauge = ({ value, total }: MacroGaugeProps) => {
  const target = total > 0 ? Math.min(value / total, 1) : 0;
  const filledLength = useSharedValue(target * GAUGE_PERIMETER);

  useEffect(() => {
    filledLength.value = withTiming(target * GAUGE_PERIMETER, {
      duration: TWEEN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [filledLength, target]);

  const animatedProps = useAnimatedProps(() => ({
    // Space-separated string form — react-native-svg parses this on the
    // native side. Returning an array from a worklet trips the prop diff.
    strokeDasharray: `${filledLength.value} ${GAUGE_PERIMETER - filledLength.value}`,
  }));

  return (
    <Svg
      width={MACRO_GAUGE_WIDTH}
      height={MACRO_GAUGE_HEIGHT}
      viewBox={`0 0 ${MACRO_GAUGE_VIEWBOX_W} ${MACRO_GAUGE_VIEWBOX_H}`}
    >
      <Defs>
        <SvgLinearGradient id="macroLit" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F5D77F" />
          <Stop offset="1" stopColor={GOLD} />
        </SvgLinearGradient>
      </Defs>
      {/* Background dim track */}
      <Path
        d={GAUGE_PATH}
        stroke={GOLD_DIM}
        strokeWidth={MACRO_DIM_STROKE}
        fill="none"
        strokeLinecap="round"
      />
      {/* Animated filled stroke — always mounted so the dasharray can tween from/to 0. */}
      <AnimatedPath
        d={GAUGE_PATH}
        stroke="url(#macroLit)"
        strokeWidth={MACRO_BRIGHT_STROKE}
        fill="none"
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export default MacroGauge;
