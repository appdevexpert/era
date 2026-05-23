import { useEffect, useId } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

// Drop silhouette — viewBox 38 × 52.
const DROP_PATH =
  "M0 33.4559C0 23.3819 9.58288 9.53854 15.3496 2.12003C17.5496 -0.710194 21.6784 -0.70997 23.8517 2.14082C29.284 9.26638 38 22.419 38 33.4559C38 42.1829 33.7553 51.9246 19.6064 51.9246C5.45745 51.9246 0 43.8065 0 33.4559Z";

const VIEW_BOX_WIDTH = 38;
const VIEW_BOX_HEIGHT = 52;

const DARK = "#312D20";
const GRADIENT_TOP = "#C9A84C";
const GRADIENT_BOTTOM = "#FBEFAF";

// Reanimated wrapper — hoisted so the wrapper isn't re-created per render.
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface WaterDropProps {
  /** Target fill: 0 = empty, 1 = full. Anything in between animates to it. */
  filled: number;
  /** Rendered width in px (default 38). Height scales with the drop's aspect ratio. */
  size?: number;
}

const WaterDrop = ({ filled, size = 38 }: WaterDropProps) => {
  // SVG-internal ids must be unique per instance, otherwise multiple drops
  // share the same clip path and animate together (React Native SVG resolves
  // url(#id) globally inside an Svg, but ids should still be unique per def).
  const rawId = useId().replace(/:/g, "");
  const clipId = `drop-clip-${rawId}`;
  const gradId = `drop-grad-${rawId}`;

  const clamped = Math.max(0, Math.min(1, filled));
  const progress = useSharedValue(clamped);

  // Each prop change runs withTiming from the current SharedValue to the new
  // target. On first mount the value is already correct, so withTiming is a
  // no-op. Subsequent +/− taps animate.
  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  // Animated clip rect — y moves from VIEW_BOX_HEIGHT (no gold visible) up
  // to 0 (fully covered). Everything ABOVE the rect is clipped, so as y
  // shrinks the gold layer is revealed from the bottom up.
  const animatedClipProps = useAnimatedProps(() => ({
    y: (1 - progress.value) * VIEW_BOX_HEIGHT,
  }));

  return (
    <Svg
      width={size}
      height={size * (VIEW_BOX_HEIGHT / VIEW_BOX_WIDTH)}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
    >
      <Defs>
        <SvgLinearGradient
          id={gradId}
          x1="19"
          y1="-3.07544"
          x2="19"
          y2="51.9246"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={GRADIENT_TOP} />
          <Stop offset="1" stopColor={GRADIENT_BOTTOM} />
        </SvgLinearGradient>
        <ClipPath id={clipId}>
          <AnimatedRect
            x={0}
            width={VIEW_BOX_WIDTH}
            height={VIEW_BOX_HEIGHT}
            animatedProps={animatedClipProps}
          />
        </ClipPath>
      </Defs>
      {/* Dark base — always visible. */}
      <Path d={DROP_PATH} fill={DARK} />
      {/* Gold gradient on top, revealed from the bottom up via the clip rect. */}
      <G clipPath={`url(#${clipId})`}>
        <Path d={DROP_PATH} fill={`url(#${gradId})`} />
      </G>
    </Svg>
  );
};

export default WaterDrop;
