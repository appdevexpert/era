import { FONTS } from "@/app/constants/fonts";
import { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import MacrosCard from "./dailyTargets/MacrosCard";
import { GOLD } from "./dailyTargets/tokens";
import WaterCard from "./dailyTargets/WaterCard";

interface MacroData {
  eaten: number;
  total: number;
}

interface DailyTargetsCardProps {
  kcalEaten: number;
  kcalTotal: number;
  protein: MacroData;
  carbs: MacroData;
  fats: MacroData;
  waterConsumedMl: number;
  waterGoalMl: number;
  onWaterIncrement?: () => void;
  onWaterDecrement?: () => void;
  /** When true, the water +/− buttons render as faded and non-interactive. */
  waterDisabled?: boolean;
}

// Horizontal padding on the outer screen (matches NutritionScreen.scrollContent).
const SCREEN_HORIZONTAL_PADDING = 20;
const PAGE_GAP = 12;
const DOT_INACTIVE = "rgba(240, 240, 240, 0.2)";
const PAGE_COUNT = 2;

interface PageDotProps {
  index: number;
  scrollX: SharedValue<number>;
  pageStride: number;
}

/** Pagination dot whose width and color interpolate as the user swipes. */
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

const DailyTargetsCard = ({
  kcalEaten,
  kcalTotal,
  protein,
  carbs,
  fats,
  waterConsumedMl,
  waterGoalMl,
  onWaterIncrement,
  onWaterDecrement,
  waterDisabled,
}: DailyTargetsCardProps) => {
  const { t } = useTranslation();
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
      <Text style={styles.title}>{t("nutrition.dailyTargets")}</Text>
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
        // Negative margin lets pages span edge-to-edge while the title above stays inset.
        style={{ marginHorizontal: -SCREEN_HORIZONTAL_PADDING }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_HORIZONTAL_PADDING, gap: PAGE_GAP }}
      >
        <View style={{ width: pageWidth }}>
          <MacrosCard
            kcalEaten={kcalEaten}
            kcalTotal={kcalTotal}
            protein={protein}
            carbs={carbs}
            fats={fats}
          />
        </View>
        <View style={{ width: pageWidth }}>
          <WaterCard
            consumedMl={waterConsumedMl}
            goalMl={waterGoalMl}
            onIncrement={onWaterIncrement}
            onDecrement={onWaterDecrement}
            disabled={waterDisabled}
          />
        </View>
      </Animated.ScrollView>
      <View style={styles.dotsRow}>
        {Array.from({ length: PAGE_COUNT }, (_, i) => (
          <PageDot key={i} index={i} scrollX={scrollX} pageStride={pageStride} />
        ))}
      </View>
    </View>
  );
};

export default DailyTargetsCard;

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
  },
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
