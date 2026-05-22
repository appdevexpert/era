import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

// Empty / full drop outline — viewBox 38 × 52.
const FULL_DROP_PATH =
  "M0 33.4559C0 23.3819 9.58288 9.53854 15.3496 2.12003C17.5496 -0.710194 21.6784 -0.70997 23.8517 2.14082C29.284 9.26638 38 22.419 38 33.4559C38 42.1829 33.7553 51.9246 19.6064 51.9246C5.45745 51.9246 0 43.8065 0 33.4559Z";

// Half-fill drop outline — viewBox 39 × 55.
const HALF_DROP_PATH =
  "M0.159668 36.5314C0.159668 26.4574 9.74255 12.614 15.5092 5.19547C17.7093 2.36525 21.8381 2.36547 24.0114 5.21626C29.4436 12.3418 38.1597 25.4945 38.1597 36.5314C38.1597 45.2583 33.915 55 19.7661 55C5.61712 55 0.159668 46.8819 0.159668 36.5314Z";

// Gold wave that fills the lower portion of the half-drop.
const HALF_WAVE_PATH =
  "M19.6072 54.9997C5.4583 54.9997 0.000854492 46.8816 0.000854492 36.531C0.000854492 33.2967 0.98866 29.6738 2.52083 25.9997C4.78175 24.7754 9.61362 25.3207 16.8036 29.8267C27.5009 36.5308 35.5529 30.5 37.0009 29C41.0009 43.5 34.7711 54.9997 19.6072 54.9997Z";

const DARK = "#312D20";
const GRADIENT_TOP = "#C9A84C";
const GRADIENT_BOTTOM = "#FBEFAF";

interface WaterDropProps {
  /** 0 = empty (dark only), 1 = full (gold), in between = half (gold wave). */
  filled: number;
  /** Rendered width in px (default 38). Height scales with the drop's natural aspect. */
  size?: number;
}

const WaterDrop = ({ filled, size = 38 }: WaterDropProps) => {
  const clamped = Math.max(0, Math.min(1, filled));

  // Empty drop — just the dark outline.
  if (clamped <= 0) {
    return (
      <Svg width={size} height={size * (52 / 38)} viewBox="0 0 38 52">
        <Path d={FULL_DROP_PATH} fill={DARK} />
      </Svg>
    );
  }

  // Full drop — dark base + gold gradient over the whole shape.
  if (clamped >= 1) {
    return (
      <Svg width={size} height={size * (52 / 38)} viewBox="0 0 38 52">
        <Defs>
          <SvgLinearGradient
            id="dropFull"
            x1="19"
            y1="-3.07544"
            x2="19"
            y2="51.9246"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={GRADIENT_TOP} />
            <Stop offset="1" stopColor={GRADIENT_BOTTOM} />
          </SvgLinearGradient>
        </Defs>
        <Path d={FULL_DROP_PATH} fill={DARK} />
        <Path d={FULL_DROP_PATH} fill="url(#dropFull)" />
      </Svg>
    );
  }

  // Half drop — dark outline + gold wave filling the bottom portion.
  return (
    <Svg width={size} height={size * (55 / 39)} viewBox="0 0 39 55">
      <Defs>
        <SvgLinearGradient
          id="dropHalf"
          x1="19.706"
          y1="22.5063"
          x2="19.706"
          y2="54.8719"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={GRADIENT_TOP} />
          <Stop offset="1" stopColor={GRADIENT_BOTTOM} />
        </SvgLinearGradient>
      </Defs>
      <Path d={HALF_DROP_PATH} fill={DARK} />
      <Path d={HALF_WAVE_PATH} fill="url(#dropHalf)" />
    </Svg>
  );
};

export default WaterDrop;
