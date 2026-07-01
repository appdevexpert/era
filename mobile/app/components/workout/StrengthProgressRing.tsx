import { memo } from "react";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

interface StrengthProgressRingProps {
  /** 0-1. Values are clamped and NaN falls back to 0. */
  progress?: number;
  size?: number;
}

// Matches Figma node 4585:25930 (36x36). Ring geometry pulled from the original
// strength-icon.svg so the base and progress arcs align pixel-for-pixel with the
// static asset — only the arc length is now driven by the progress prop.
const VIEWBOX = 36;
const CENTER = VIEWBOX / 2;
const OUTER_R = 18;
const INNER_R = 13.2642;
const STROKE_R = (OUTER_R + INNER_R) / 2; // 15.6321
const STROKE_WIDTH = OUTER_R - INNER_R; // 4.7358
const CIRCUMFERENCE = 2 * Math.PI * STROKE_R;

const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const StrengthProgressRing = ({ progress = 0, size = 36 }: StrengthProgressRingProps) => {
  const pct = clamp01(progress);
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} fill="none">
      {/* Base ring — muted white so the unfilled portion stays visible. */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={STROKE_R}
        stroke="white"
        strokeOpacity={0.4}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />

      {/* Progress arc — dashoffset shrinks toward 0 as progress → 1. Rotated so
          the fill grows clockwise starting at 12 o'clock. */}
      {pct > 0 ? (
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={STROKE_R}
          stroke="white"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      ) : null}

      {/* Dumbbell glyph — copied verbatim from strength-icon.svg so the center
          artwork stays identical to the static asset. */}
      <Defs>
        <ClipPath id="strengthGlyphClip">
          <Rect x={10.189} y={10.4858} width={14.3786} height={14.3786} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#strengthGlyphClip)">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.8265 16.0741C11.9131 15.9179 12.0723 15.7222 12.352 15.5608C12.6317 15.3993 12.8808 15.3593 13.0593 15.3624C13.3347 15.3666 13.5169 15.5409 13.6063 15.6885C13.7842 15.9829 14.3679 16.9555 15.4317 18.7982C16.4956 20.6408 17.0461 21.6326 17.212 21.9338C17.2951 22.0848 17.355 22.33 17.221 22.5707C17.1344 22.7268 16.9752 22.9225 16.6955 23.084C16.4159 23.2455 16.1668 23.2855 15.9882 23.2824C15.7129 23.2781 15.5306 23.1039 15.4412 22.9562C15.2635 22.6621 14.6797 21.6893 13.6158 19.8466C12.5519 18.0039 12.0015 17.0122 11.8355 16.7109C11.7525 16.5599 11.6925 16.3147 11.8265 16.0741ZM18.7666 12.0673C18.588 12.0642 18.3389 12.1042 18.0593 12.2657C17.7796 12.4271 17.6204 12.6228 17.5338 12.779C17.4001 13.0195 17.4596 13.2646 17.5428 13.4158C17.7086 13.7168 18.2592 14.7088 19.3231 16.5515C20.3869 18.3942 20.9706 19.3668 21.1485 19.6611C21.2377 19.8085 21.4201 19.983 21.6955 19.9873C21.8741 19.9904 22.1232 19.9504 22.4028 19.7889C22.6825 19.6274 22.8417 19.4317 22.9283 19.2756C23.062 19.0351 23.0025 18.79 22.9193 18.6388C22.7533 18.3375 22.2029 17.3457 21.139 15.5031C20.0752 13.6604 19.4915 12.6878 19.3136 12.3934C19.2243 12.2461 19.0417 12.0717 18.7666 12.0673ZM10.8958 18.131C10.7246 18.2298 10.6053 18.3402 10.5238 18.4416C10.3192 18.696 10.3818 18.9926 10.4744 19.1619C10.6036 19.3976 10.9374 20.0004 11.5404 21.0448C12.1434 22.0892 12.4983 22.6799 12.6378 22.9096C12.7382 23.0745 12.9641 23.2771 13.2866 23.2269C13.4151 23.2069 13.5704 23.1588 13.7416 23.06C13.9128 22.9611 14.032 22.8508 14.1136 22.7494C14.3183 22.4953 14.2555 22.1984 14.163 22.0291C14.0338 21.7934 13.7 21.1906 13.097 20.1462C12.4939 19.1017 12.1391 18.511 11.9995 18.2813C11.8992 18.1165 11.6732 17.9139 11.3508 17.9641C11.1901 17.9911 11.0359 18.0477 10.8958 18.131ZM21.4683 12.1228C21.3076 12.1498 21.1533 12.2064 21.0132 12.2897C20.842 12.3885 20.7228 12.4989 20.6412 12.6003C20.4369 12.8545 20.4993 13.1513 20.5919 13.3206C20.721 13.5563 21.0549 14.1591 21.6579 15.2035C22.2609 16.2479 22.6157 16.8386 22.7553 17.0683C22.8556 17.2331 23.0816 17.4358 23.404 17.3856C23.5326 17.3656 23.6881 17.3174 23.859 17.2187C24.0302 17.1198 24.1495 17.0095 24.231 16.9081C24.4355 16.6541 24.373 16.3571 24.2804 16.1878C24.1513 15.9521 23.8174 15.3493 23.2144 14.3048C22.6114 13.2604 22.2565 12.6697 22.117 12.44C22.0166 12.2752 21.7907 12.0726 21.4683 12.1228ZM16.3785 19.2398L15.5227 17.7574C15.3807 17.5115 15.5074 17.2661 15.7113 17.1238C15.7532 17.0941 15.8168 17.0514 15.902 16.9957C16.0727 16.884 16.3337 16.7209 16.7034 16.5074C17.0731 16.294 17.3452 16.1494 17.527 16.0575C17.6178 16.0115 17.6866 15.9778 17.7332 15.9564C17.9583 15.8507 18.2343 15.864 18.3763 16.1099L19.2321 17.5922C19.3743 17.8384 19.2474 18.0836 19.0435 18.2259C19.0016 18.2556 18.9381 18.2983 18.8528 18.3539C18.6821 18.4656 18.4211 18.6288 18.0514 18.8422C17.6817 19.0557 17.4097 19.2003 17.2278 19.2921C17.137 19.3381 17.0682 19.3718 17.0216 19.3932C16.7965 19.4989 16.5205 19.4857 16.3785 19.2398Z"
          fill="white"
        />
      </G>
    </Svg>
  );
};

export default memo(StrengthProgressRing);
