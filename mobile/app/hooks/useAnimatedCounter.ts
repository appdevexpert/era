import { useEffect, useState } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Options {
  /** Total tween duration in ms. Defaults to 900 — matches the gauges in the daily targets card. */
  duration?: number;
  /**
   * Step the displayed number rounds to. 1 = smooth, 5 / 10 cuts re-render
   * cost when the counter spans hundreds of units (e.g. kcal targets).
   */
  step?: number;
}

/**
 * Smoothly tweens between numeric values using reanimated, returning the
 * current integer-display value as React state.
 *
 * The tween runs on the UI thread; only the rounded snapshot is bridged
 * back to JS, so a 0 → 1250 ramp triggers at most ~125 re-renders at
 * step = 10 (cheap for a single Text node).
 */
export function useAnimatedCounter(target: number, options: Options = {}): number {
  const { duration = 900, step = 1 } = options;

  const animated = useSharedValue(target);
  const [display, setDisplay] = useState(() => Math.round(target / step) * step);

  useEffect(() => {
    animated.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [animated, target, duration]);

  useAnimatedReaction(
    () => {
      "worklet";
      // Inlined rounding — calling an out-of-worklet helper from inside a
      // worklet crashes under the Reanimated 4 worklet runtime. Using the
      // divide formula uniformly handles step=1, step=10, AND step=0.1.
      const v = animated.value;
      return Math.round(v / step) * step;
    },
    (current, previous) => {
      if (current !== previous) runOnJS(setDisplay)(current);
    },
    [step],
  );

  return display;
}
