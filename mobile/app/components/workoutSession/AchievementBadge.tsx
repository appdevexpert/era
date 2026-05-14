import { COLORS } from "@/app/constants/colors";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";

export type AchievementBadgeType = "trophy" | "star" | "flame";

export type AchievementBadgeProps = {
  /** Visual type. Adds a glyph inside the gold ring. Defaults to `trophy`. */
  type?: AchievementBadgeType;
  /** Accessibility label, e.g. `New PR Achieved badge`. */
  label: string;
  /** Diameter of the outer ring in pixels. Defaults to 96. */
  size?: number;
  /** Plays a subtle pulse + rotate entrance. Defaults to `true`. */
  animated?: boolean;
  /** Delay before the entrance animation starts, in ms. Defaults to `0`. */
  entranceDelay?: number;
  testID?: string;
};

/**
 * Reusable achievement visual: a circular gold ring with a glyph (trophy /
 * star / flame) inside. Designed to be reused for future achievement types
 * such as streaks or milestones by swapping the `type`.
 *
 * When `animated`, the badge eases in with a spring scale, plays a single
 * shimmer pulse on the outer ring, and then settles. Subtle, not loud.
 */
const AchievementBadge = ({
  type = "trophy",
  label,
  size = 96,
  animated = true,
  entranceDelay = 0,
  testID,
}: AchievementBadgeProps) => {
  const scale = useSharedValue(animated ? 0.6 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      scale.value = 1;
      opacity.value = 1;
      pulse.value = 0;
      return;
    }

    opacity.value = withDelay(
      entranceDelay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(
      entranceDelay,
      withSequence(
        withSpring(1.08, { damping: 10, stiffness: 160, mass: 0.7 }),
        withSpring(1, { damping: 14, stiffness: 200, mass: 0.7 }),
      ),
    );
    pulse.value = withDelay(
      entranceDelay + 280,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [animated, entranceDelay, opacity, pulse, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  const ringSize = size;
  const innerSize = Math.round(size * 0.78);
  const glyphSize = Math.round(size * 0.46);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.wrapper, { width: ringSize, height: ringSize }, containerStyle]}
      testID={testID}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: ringSize * 1.4,
            height: ringSize * 1.4,
            borderRadius: ringSize * 0.7,
          },
          glowStyle,
        ]}
      />
      <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <BadgeGlyph type={type} size={glyphSize} />
        </View>
      </View>
    </Animated.View>
  );
};

const BadgeGlyph = ({ type, size }: { type: AchievementBadgeType; size: number }) => {
  const fill = "url(#achievementBadgeGoldFill)";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="achievementBadgeGoldFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FCF3C0" />
          <Stop offset="55%" stopColor="#F7E06F" />
          <Stop offset="100%" stopColor="#C9A84C" />
        </SvgLinearGradient>
      </Defs>
      {type === "trophy" ? (
        <Path
          d="M6 3h12v2.5a4.5 4.5 0 0 1-3 4.24V11a3 3 0 0 1-3 3 3 3 0 0 1-3-3V9.74A4.5 4.5 0 0 1 6 5.5V3Zm-3 2.5h3V8a3 3 0 0 1-3-3v.5Zm15 0V5a3 3 0 0 1-3 3V5.5h3ZM9 14h6v1.5a2.5 2.5 0 0 0 2.5 2.5H18v2H6v-2h.5A2.5 2.5 0 0 0 9 15.5V14Z"
          fill={fill}
        />
      ) : type === "flame" ? (
        <Path
          d="M12 2c.5 3 3 4.5 3 8a3 3 0 0 1-6 0c0-1.4.5-2.3 1-3-2 1-4 3-4 6a6 6 0 0 0 12 0c0-5-3-7-6-11Z"
          fill={fill}
        />
      ) : (
        <Path
          d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16l-5.4 3 1.2-6L3.3 8.8l6.1-.7L12 2.5Z"
          fill={fill}
        />
      )}
    </Svg>
  );
};

export default AchievementBadge;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: COLORS.alpha.primary20,
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.alpha.primary60,
    backgroundColor: COLORS.alpha.primary16,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
    backgroundColor: COLORS.neutral.black2,
  },
});
