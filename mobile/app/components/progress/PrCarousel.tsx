import PrCard, { type PrEntry } from "@/app/components/progress/PrCard";
import { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

// Matches ProgressScreen.scrollContent horizontal padding.
const SCREEN_HORIZONTAL_PADDING = 16;
const PAGE_GAP = 12;
const GOLD = "#C9A84C";
const DOT_INACTIVE = "rgba(240, 240, 240, 0.2)";

interface PageDotProps {
  index: number;
  scrollX: SharedValue<number>;
  pageStride: number;
}

const PageDot = ({ index, scrollX, pageStride }: PageDotProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageStride, index * pageStride, (index + 1) * pageStride];
    const width = interpolate(scrollX.value, inputRange, [6, 16, 6], "clamp");
    const backgroundColor = interpolateColor(scrollX.value, inputRange, [
      DOT_INACTIVE,
      GOLD,
      DOT_INACTIVE,
    ]);
    return { width, backgroundColor };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

interface PrCarouselProps {
  entries: PrEntry[];
}

const PrCarousel = ({ entries }: PrCarouselProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - SCREEN_HORIZONTAL_PADDING * 2.5;
  const pageStride = pageWidth + PAGE_GAP;
  const [pageIndex, setPageIndex] = useState(0);

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageStride);
    if (idx !== pageIndex) setPageIndex(idx);
  };

  return (
    <View style={styles.wrap}>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageStride}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        // Negative margin lets pages span edge-to-edge while the section header above stays inset.
        style={{ marginHorizontal: -SCREEN_HORIZONTAL_PADDING }}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
          gap: PAGE_GAP,
        }}
      >
        {entries.map((entry) => (
          <View key={entry.id} style={{ width: pageWidth }}>
            <PrCard entry={entry} />
          </View>
        ))}
      </Animated.ScrollView>
      <View style={styles.dotsRow}>
        {entries.map((entry, i) => (
          <PageDot key={entry.id} index={i} scrollX={scrollX} pageStride={pageStride} />
        ))}
      </View>
    </View>
  );
};

export default PrCarousel;

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
