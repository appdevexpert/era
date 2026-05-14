import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export type PointsAwardDisplayProps = {
  /** Numeric amount to award, e.g. `100`. Will be prefixed with `+`. */
  points: number;
  /** Trailing label, e.g. `ERA Points`. */
  label: string;
  /** Accessibility label override. Defaults to `+{points} {label}`. */
  accessibilityLabel?: string;
  /** Whether the entrance animation should play. Defaults to `true`. */
  animated?: boolean;
  /** Delay before the entrance animation starts, in ms. Defaults to `220`. */
  entranceDelay?: number;
  testID?: string;
};

/**
 * Reusable points-award display: a gold `+N` numeral paired with a label such
 * as `ERA Points`. Uses Reanimated for a subtle scale + fade entrance so it
 * can punctuate achievement flows without feeling loud.
 */
const PointsAwardDisplay = ({
  points,
  label,
  accessibilityLabel,
  animated = true,
  entranceDelay = 220,
  testID,
}: PointsAwardDisplayProps) => {
  const opacity = useSharedValue(animated ? 0 : 1);
  const scale = useSharedValue(animated ? 0.82 : 1);

  useEffect(() => {
    if (!animated) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }

    opacity.value = withDelay(
      entranceDelay,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(
      entranceDelay,
      withSequence(
        withSpring(1.06, { damping: 11, stiffness: 180, mass: 0.6 }),
        withSpring(1, { damping: 14, stiffness: 220, mass: 0.6 }),
      ),
    );
  }, [animated, entranceDelay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const formattedPoints = useMemo(() => `+${Math.trunc(points)}`, [points]);
  const a11yLabel = accessibilityLabel ?? `${formattedPoints} ${label}`;

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.container, animatedStyle]}
      testID={testID}
    >
      <Text style={styles.points}>{formattedPoints}</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
};

export default PointsAwardDisplay;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  points: {
    fontFamily: FONTS.display,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "600",
    letterSpacing: 0.4,
    textAlign: "center",
    color: COLORS.primary.base,
    textShadowColor: COLORS.alpha.primary20,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: COLORS.alpha.white72,
  },
});
