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
// Path direction: starts at top-right of gap (43,3), goes clockwise, ends at top-left of gap (16.5,3).
const GAUGE_PATH =
  "M43 3 C50.1797 3 56 8.8203 56 16 V37 C56 45.8366 48.8366 53 40 53 H19 C10.1634 53 3 45.8366 3 37 V16.5 C3 9.04416 9.04416 3 16.5 3";

// Perimeter (viewBox units):
//   top-right quarter (r=13) + right side (21) + bottom-right quarter (r=16) + bottom (21)
// + bottom-left quarter (r=16) + left side (20.5) + top-left quarter (r=13.5)
const GAUGE_PERIMETER =
  (Math.PI * 13) / 2 +
  21 +
  (Math.PI * 16) / 2 +
  21 +
  (Math.PI * 16) / 2 +
  20.5 +
  (Math.PI * 13.5) / 2;

interface MacroGaugeProps {
  value: number;
  total: number;
}

/** Rounded-square gauge with a gap at the top. Bright stroke sits on top of
 *  the dim track and fills clockwise from the right side of the gap. */
const MacroGauge = ({ value, total }: MacroGaugeProps) => {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  const filledLength = ratio * GAUGE_PERIMETER;

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
      {/* Filled portion — slightly thicker, sits on top of the dim track */}
      {ratio > 0 ? (
        <Path
          d={GAUGE_PATH}
          stroke="url(#macroLit)"
          strokeWidth={MACRO_BRIGHT_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${GAUGE_PERIMETER - filledLength}`}
        />
      ) : null}
    </Svg>
  );
};

export default MacroGauge;
