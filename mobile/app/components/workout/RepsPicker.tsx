import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_WIDTH = 56;
const CELL_GAP = 14;
const ITEM_TOTAL = CELL_WIDTH + CELL_GAP;

const OPACITY_MAP: Record<number, number> = {
  0: 1,
  1: 0.25,
  2: 0.1,
  3: 0.04,
};

type RepsPickerProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
};

const RepsPicker = ({
  label,
  value,
  onValueChange,
  min = 1,
  max = 30,
}: RepsPickerProps) => {
  const count = max - min + 1;
  const halfScreen = (SCREEN_WIDTH - CELL_WIDTH) / 2;
  const scrollRef = useRef<Animated.ScrollView>(null);
  const lastReported = useSharedValue(value);

  const report = useCallback(
    (v: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round(v)));
      onValueChange(clamped);
      Haptics.selectionAsync();
    },
    [max, min, onValueChange],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const idx = Math.round(e.contentOffset.x / ITEM_TOTAL);
      const v = min + idx;
      if (v !== lastReported.value) {
        lastReported.value = v;
        runOnJS(report)(v);
      }
    },
  });

  const initialOffset = (value - min) * ITEM_TOTAL;
  const snapOffsets = Array.from({ length: count }, (_, i) => i * ITEM_TOTAL);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.scrollWrap}>
        {/* Fixed center highlight — does not scroll */}
        <View style={styles.highlightWrap} pointerEvents="none">
          <LinearGradient
            colors={[
              "rgba(201,168,76,0.1)",
              "rgba(247,224,111,0.1)",
              "rgba(252,243,192,0.1)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.highlightBg}
          />
        </View>

        {/* Scrollable numbers */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentOffset={{ x: initialOffset, y: 0 }}
          contentContainerStyle={{
            paddingHorizontal: halfScreen,
            gap: CELL_GAP,
          }}
        >
          {Array.from({ length: count }, (_, i) => {
            const num = min + i;
            const dist = Math.abs(num - value);
            const isSelected = dist === 0;
            const opacity = OPACITY_MAP[dist] ?? 0.04;

            return (
              <View key={num} style={styles.cell}>
                <Text
                  style={[
                    styles.number,
                    isSelected ? styles.numberSelected : { opacity },
                  ]}
                >
                  {num}
                </Text>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>
    </View>
  );
};

// Memoized — every render of WorkoutLogScreen (e.g. when setMap updates after
// addSet) otherwise re-renders this scrubbable list and burns a frame on
// scroll-position recalc. Props are all primitives + a stable useCallback,
// so the default shallow comparison is enough.
export default memo(RepsPicker);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 28.8,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  scrollWrap: {
    height: 66,
  },

  /* Fixed center highlight */
  highlightWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: (SCREEN_WIDTH - CELL_WIDTH) / 2,
    width: CELL_WIDTH,
    zIndex: 1,
  },
  highlightBg: {
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.primary.dark,
  },

  /* Cells */
  cell: {
    width: CELL_WIDTH,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    fontFamily: FONTS.medium,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 33.6,
    color: COLORS.neutral.white,
    textAlign: "center",
    width: 40,
  },
  numberSelected: {
    color: COLORS.primary.dark,
  },
});
