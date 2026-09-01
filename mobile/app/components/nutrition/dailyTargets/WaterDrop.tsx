import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
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

interface WaterDropProps {
  /** Target fill: 0 = empty, 1 = full. Anything in between animates to it. */
  filled: number;
  /** Rendered width in px (default 38). Height scales with the drop's aspect ratio. */
  size?: number;
}

/**
 * The fill is revealed by a clipping window that SLIDES, using two transforms
 * that cancel each other out — no animated SVG `<ClipPath>`, and no animated
 * height.
 *
 * Two earlier approaches failed, each on Android only:
 *
 * 1. An animated `<Rect>` inside `<ClipPath>`. `GroupView` caches the resolved
 *    clip in `mCachedClipPath`, and a Reanimated write straight to the rect's
 *    `y` on the UI thread never runs the React commit that clears that cache —
 *    so the clip was computed once at mount and the drop never moved again.
 *
 * 2. Animating the window's `height`. That updates, but `height` is a layout
 *    prop: every frame runs a Yoga pass, ten drops at once, which is why it
 *    stepped rather than glided.
 *
 * The window is instead translated DOWN by the unfilled fraction, and the gold
 * drop inside is translated UP by the same amount. The drop therefore paints in
 * exactly the same place as the dark base, and only the part that falls inside
 * the shifted window survives the clip — the bottom `progress` of the drop.
 * Both writes are transforms, so this runs entirely on the UI thread and is as
 * smooth on Android as it is on iOS.
 */
const WaterDrop = ({ filled, size = 38 }: WaterDropProps) => {
  // Gradient ids must be unique per instance, otherwise every drop resolves
  // url(#id) to the same def.
  const gradId = `drop-grad-${useId().replace(/:/g, "")}`;

  const height = size * (VIEW_BOX_HEIGHT / VIEW_BOX_WIDTH);
  const clamped = Math.max(0, Math.min(1, filled));
  const progress = useSharedValue(clamped);

  // On first mount the value is already correct, so this is a no-op.
  // Subsequent +/− taps animate.
  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  // Window slides down by the unfilled fraction, so its top edge is the
  // waterline.
  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height }],
  }));
  // ...and the drop slides back up by the same amount, so it stays registered
  // with the dark base underneath.
  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - progress.value) * height }],
  }));

  const dropSvg = (fill: string) => (
    <Svg
      width={size}
      height={height}
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
      </Defs>
      <Path d={DROP_PATH} fill={fill} />
    </Svg>
  );

  return (
    <View style={{ width: size, height }}>
      {/* Dark base — always visible. */}
      {dropSvg(DARK)}

      {/* Gold copy, revealed bottom-up by the sliding window. */}
      <Animated.View
        style={[styles.fillWindow, { width: size, height }, windowStyle]}
      >
        <Animated.View style={[styles.fillDrop, { width: size, height }, dropStyle]}>
          {dropSvg(`url(#${gradId})`)}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default WaterDrop;

const styles = StyleSheet.create({
  fillWindow: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
  },
  fillDrop: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
