import { useEffect } from "react";
import { StyleSheet, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

const PULSE_LOW = 0.35;
const PULSE_HIGH = 0.9;
const PULSE_DURATION = 900;

/**
 * Shimmering rounded rectangle. The base primitive every screen-level
 * skeleton composes from. Sits on the dark app background (`#0A0A0A`) with
 * a translucent white fill that pulses via reanimated on the UI thread.
 *
 * The pulse animation is intentionally subtle — quick enough to read as
 * "loading" but not distracting on long lists.
 */
const Skeleton = ({ width, height, radius = 8, style }: SkeletonProps) => {
  const pulse = useSharedValue(PULSE_LOW);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(PULSE_HIGH, {
        duration: PULSE_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default Skeleton;

const styles = StyleSheet.create({
  base: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});
