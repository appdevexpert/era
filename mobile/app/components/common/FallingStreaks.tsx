import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface StreakSpec {
  left: number;
  width: number;
  length: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface StreakProps extends StreakSpec {
  containerHeight: number;
}

const Streak = ({ left, width, length, duration, delay, opacity, containerHeight }: StreakProps) => {
  const y = useSharedValue(-length);

  useEffect(() => {
    y.value = -length;
    y.value = withDelay(
      delay,
      withRepeat(
        withTiming(containerHeight + length, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, [y, length, delay, duration, containerHeight]);

  // Asymmetric fade — quick fade-in up top, long gradual fade-out at the bottom
  // so streaks dissolve into the dark before reaching the lower content.
  // Top 10% fades in, bottom 40% fades out with an extra mid-point for an easing curve.
  const fadeInEnd = containerHeight * 0.10;
  const fadeOutStart = containerHeight * 0.55;
  const fadeOutMid = containerHeight * 0.78;

  const style = useAnimatedStyle(() => {
    // y is the streak's TOP position. Use streak midpoint so fading tracks where
    // the bright part of the gradient sits.
    const center = y.value + length / 2;
    const fade = interpolate(
      center,
      [0, fadeInEnd, fadeOutStart, fadeOutMid, containerHeight],
      [0, 1, 1, 0.35, 0],
      "clamp",
    );
    return {
      opacity: fade,
      transform: [{ translateY: y.value }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.streak,
        { left, width, height: length, opacity: opacity },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(252,243,192,0)",
          "rgba(247,224,111,0.9)",
          "rgba(201,168,76,0.4)",
          "rgba(0,0,0,0)",
        ]}
        locations={[0, 0.45, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

interface FallingStreaksProps {
  /** Container height (typically screen height). Drives travel distance. */
  height: number;
  /** Container width. Streaks distributed across this. */
  width?: number;
  /** Number of streaks. Defaults to 22. */
  count?: number;
}

// Deterministic pseudo-random so streaks don't reshuffle on re-render.
const rand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const FallingStreaks = ({
  height,
  width = Dimensions.get("window").width,
  count = 22,
}: FallingStreaksProps) => {
  const streaks = useMemo<StreakSpec[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const r1 = rand(i + 1);
      const r2 = rand(i * 7.3 + 11);
      const r3 = rand(i * 3.1 + 5);
      const r4 = rand(i * 11.7 + 19);
      const r5 = rand(i * 5.9 + 31);
      return {
        left: Math.round(r1 * (width - 2)),
        width: r2 > 0.85 ? 2 : 1,
        length: 60 + Math.round(r3 * 110), // 60–170px
        duration: 3500 + Math.round(r4 * 3500), // 3.5–7s
        delay: Math.round(r5 * 4000), // 0–4s stagger
        opacity: 0.35 + r2 * 0.5, // 0.35–0.85
      };
    });
  }, [count, width]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.root]}>
      {streaks.map((s, i) => (
        <Streak key={i} {...s} containerHeight={height} />
      ))}
    </View>
  );
};

export default FallingStreaks;

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
  },
  streak: {
    position: "absolute",
    top: 0,
  },
});
