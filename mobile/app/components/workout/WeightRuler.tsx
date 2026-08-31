import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useRef, useState } from "react";
import {
  Dimensions,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TICK_SPACING = 18;

type WeightRulerProps = {
  label: string;
  unit: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Hide the label + gold-gradient value text above the ruler (the parent renders its own). */
  headerless?: boolean;
};

/* ─── Tick helpers ─── */

const getTickStyle = (i: number) => {
  if (i % 10 === 0) return styles.tickLarge;
  if (i % 5 === 0) return styles.tickMedium;
  return styles.tickSmall;
};

/* ─── Component ─── */

const WeightRuler = ({
  label,
  unit,
  value,
  onValueChange,
  min = 20,
  max = 200,
  step = 1,
  headerless = false,
}: WeightRulerProps) => {
  const tickCount = Math.floor((max - min) / step);
  // The ruler is sometimes rendered inside a parent that's narrower (or via
  // negative margins, wider) than the screen. We measure the actual ScrollView
  // width on layout so the leading/trailing padding centers a tick under the
  // indicator instead of using the (often wrong) screen halfWidth.
  const [rulerWidth, setRulerWidth] = useState(SCREEN_WIDTH);
  const halfRuler = rulerWidth / 2;
  const scrollRef = useRef<Animated.ScrollView>(null);
  const lastReported = useSharedValue(value);
  const lastWidth = useRef(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    // Round + skip no-op updates. onLayout can fire with sub-pixel jitter on
    // every render; setting state each time would re-render → re-layout →
    // loop ("Maximum update depth exceeded"). Only commit real width changes.
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== lastWidth.current) {
      lastWidth.current = w;
      setRulerWidth(w);
    }
  }, []);

  const report = useCallback(
    (v: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round(v / step) * step));
      onValueChange(clamped);
      Haptics.selectionAsync();
    },
    [max, min, step, onValueChange],
  );

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        // 1 tick = 1 step. For step=1 this is a no-op; for fractional steps
        // (e.g. height in ft uses step=0.1) we must multiply tick count by step
        // so scrolling 25 ticks from min=3 maps to 3 + 25 × 0.1 = 5.5 ft.
        const v = min + (e.contentOffset.x / TICK_SPACING) * step;
        const rounded = Math.round(v / step) * step;
        if (rounded !== lastReported.value) {
          lastReported.value = rounded;
          runOnJS(report)(rounded);
        }
      },
    },
    [min, step, report],
  );

  // Initial scroll position, captured ONCE at mount. We deliberately never
  // re-apply contentOffset on later renders: while scrolling, `report` sends
  // the new value to the parent, the parent feeds `value` back down, and
  // re-applying contentOffset would scroll-to-self → fire onScroll → report
  // again → infinite setState ("Maximum update depth exceeded"). Unit/range
  // changes remount the ruler via `key`, so this stays correct per unit.
  const initialContentOffset = useRef({
    x: ((value - min) / step) * TICK_SPACING,
    y: 0,
  }).current;

  return (
    <View style={styles.container}>
      {/* Label + value (skipped when parent renders its own) */}
      {headerless ? null : (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Svg height={34} width={SCREEN_WIDTH} style={styles.valueSvg}>
            <Defs>
              <SvgGradient id="goldTextGrad" x1="1" y1="0" x2="0" y2="0">
                <Stop offset="0" stopColor={COLORS.primary.light} />
                <Stop offset="0.196" stopColor={COLORS.primary.base} />
                <Stop offset="0.835" stopColor={COLORS.primary.dark} />
              </SvgGradient>
            </Defs>
            <SvgText
              fill="url(#goldTextGrad)"
              fontSize={28}
              fontWeight="500"
              fontFamily={Platform.OS === "ios" ? "System" : "Roboto"}
              x="45%"
              y={26}
              textAnchor="middle"
            >
              {value} {unit}
            </SvgText>
          </Svg>
        </View>
      )}

      {/* Ruler */}
      <View style={styles.rulerWrap}>
        {/* Center indicator line */}
        <View style={styles.indicatorWrap} pointerEvents="none">
          <LinearGradient
            colors={[COLORS.primary.light, COLORS.primary.base, COLORS.primary.dark]}
            style={styles.indicator}
          />
        </View>

        {/* Scrollable ticks */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_SPACING}
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentOffset={initialContentOffset}
          onLayout={handleLayout}
          contentContainerStyle={{
            paddingHorizontal: halfRuler,
            alignItems: "flex-end",
          }}
        >
          {Array.from({ length: tickCount + 1 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                getTickStyle(i),
                // Every tick carries a trailing margin to space out the next
                // one. On the LAST tick there is no next one, so that margin
                // becomes scrollable content past the end of the range — a full
                // TICK_SPACING of it, which is also a snapToInterval point. The
                // ruler therefore settles with the indicator one tick beyond the
                // final tick, pointing at empty space (the reported value still
                // clamps, so the number looks right while the ruler disagrees).
                i === tickCount && styles.tickLast,
              ]}
            />
          ))}
        </Animated.ScrollView>
      </View>
    </View>
  );
};

// Memoized — every render of WorkoutLogScreen (e.g. when setMap updates after
// addSet) otherwise re-renders this scrubbable SVG ruler. Props are all
// primitives + a stable useCallback, so the default shallow comparison is
// enough to skip the work.
export default memo(WeightRuler);

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {

    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 28.8,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  valueSvg: {
    alignSelf: "center",
  },

  /* Ruler area */
  rulerWrap: {
    height: 70,
    justifyContent: "flex-end",
  },
  indicatorWrap: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    zIndex: 1,
    width: 2,
    marginLeft: -1,
  },
  indicator: {
    flex: 1,
    width: 2,
    borderRadius: 1,
  },

  /* Ticks */
  tick: {
    width: 1.5,
    marginRight: TICK_SPACING - 1.5,
    borderRadius: 0.5,
  },
  tickLast: {
    marginRight: 0,
  },
  tickSmall: {
    height: 10,
    backgroundColor: "rgba(240,240,240,0.2)",
  },
  tickMedium: {
    height: 18,
    backgroundColor: "rgba(240,240,240,0.35)",
  },
  tickLarge: {
    height: 26,
    backgroundColor: "rgba(240,240,240,0.55)",
  },
});
