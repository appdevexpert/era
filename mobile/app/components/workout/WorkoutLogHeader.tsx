import { ArrowBack } from "@/assets/icons";
import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale } from "@/app/utils/responsive";
import IconButton from "@/app/components/common/IconButton";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useCallback, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

// Gap between the nav row and the info block. It lives INSIDE the collapsing
// window (as its top inset) so the window is one fixed box the content slides
// through, rather than a second thing to animate.
const INFO_GAP = 16;
// Starting guess for the info block: timer (lineHeight 43.2) + session label
// (16.8). The real value is measured on layout — the block is a pure
// line-height stack and Android's includeFontPadding makes it taller than the
// iOS box, so a hardcoded constant is wrong on one platform or the other. Long
// names truncate with ellipsis (numberOfLines={1}) rather than wrap — a 2-line
// wrap was misaligning with the timer column.
const INFO_HEIGHT_FALLBACK = 60;

// Fixed pieces of the header box. Named because the estimate below has to add
// up to the same thing the styles lay out — if one drifts, so does the other.
const TOP_PADDING = 8;
const BOTTOM_PADDING = 16;
const NAV_ROW_HEIGHT = 36;
const SET_ROW_GAP = 16;
// Segment track (6) + setContent gap (10) + label lineHeight (12).
const SET_ROW_HEIGHT = 28;

/**
 * What the expanded header will measure, near enough.
 *
 * The header is an overlay, so a screen pads its scroll content by the measured
 * height — but that measurement only arrives on layout. Seeding the padding
 * with this keeps the first frame in roughly the right place instead of
 * dropping the list ~180px the moment `onHeightChange` fires. The real value
 * replaces it immediately; any error here is a few pixels of font metrics.
 */
export const estimateWorkoutLogHeaderHeight = (
  topInset: number,
  showSets = true,
): number =>
  topInset +
  TOP_PADDING +
  NAV_ROW_HEIGHT +
  INFO_GAP +
  INFO_HEIGHT_FALLBACK +
  (showSets ? SET_ROW_GAP + SET_ROW_HEIGHT : 0) +
  BOTTOM_PADDING;

/* ─── Set progress segment ─── */

const SetSegment = ({
  index,
  activeIndex,
}: {
  index: number;
  activeIndex: number;
}) => {
  const filled = index < activeIndex;
  const active = index === activeIndex;

  return (
    <View style={segStyles.track}>
      {(filled || active) && (
        <LinearGradient
          colors={[...GRADIENTS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[segStyles.fill, active && segStyles.fillPartial]}
        />
      )}
    </View>
  );
};

const segStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.charcoal,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    width: "100%",
  },
  fillPartial: {
    width: "35%",
  },
});

/* ─── Header props ─── */

type WorkoutLogHeaderProps = {
  exerciseName: string;
  exerciseCategory: string;
  exerciseIndex: number;
  totalExercises: number;
  timer: string;
  activeSet: number;
  sets: number;
  canAddSet: boolean;
  onAddSet: () => void;
  onBack: () => void;
  scrollY: SharedValue<number>;
  topInset: number;
  showSets?: boolean;
  /**
   * Expanded height, measured. The header is an overlay, so the screen needs
   * this as its scroll content's top inset — see the note on `styles.header`.
   */
  onHeightChange?: (height: number) => void;
};

/* ─── Component ─── */

const WorkoutLogHeader = ({
  exerciseName,
  exerciseCategory,
  exerciseIndex,
  totalExercises,
  timer,
  activeSet,
  sets,
  canAddSet,
  onAddSet,
  onBack,
  scrollY,
  topInset,
  showSets = true,
  onHeightChange,
}: WorkoutLogHeaderProps) => {
  const { t } = useTranslation();

  // Nothing in this header changes size while you scroll — it only slides.
  //
  // The collapse used to animate the info block's height, which meant a Yoga
  // pass every frame AND (because the header was in flow above the ScrollView)
  // a scroll viewport that resized every frame. Layout commits land a frame
  // after the transforms computed alongside them, so the two disagreed by a
  // frame continuously: invisible at speed, a visible shimmy when creeping.
  //
  // Now the header is an overlay of constant height and three transforms do
  // the work: the surface slides up so its bottom edge (and border) rises, the
  // info block slides up through a fixed-size clipping window, and the set row
  // rises to meet the nav row. The nav row never moves. Since the surface's
  // bottom edge falls at exactly the same rate the content scrolls up, the two
  // stay flush with no compensating transform anywhere.
  const [infoHeight, setInfoHeight] = useState(INFO_HEIGHT_FALLBACK);
  const collapseDistance = infoHeight + INFO_GAP;
  const half = collapseDistance / 2;

  // Latch the tallest measurement rather than tracking every one. Belt and
  // braces now that nothing feeds back into layout, but it also absorbs the
  // one-off jump when a longer exercise name or a localized label lands.
  const onInfoLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    setInfoHeight((previous) => (height > previous ? height : previous));
  }, []);

  const onHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange?.(Math.round(event.nativeEvent.layout.height));
    },
    [onHeightChange],
  );

  // Shared by the three sliding pieces: 0 → -collapseDistance, clamped.
  const rise = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -interpolate(
          scrollY.value,
          [0, collapseDistance],
          [0, collapseDistance],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const infoStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -interpolate(
          scrollY.value,
          [0, collapseDistance],
          [0, collapseDistance],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollY.value,
      [0, collapseDistance],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Expanded fades out in the first half of scroll
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, half],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Collapsed fades in during the second half of scroll
  const collapsedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [half, collapseDistance],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.header} onLayout={onHeaderLayout} pointerEvents="box-none">
      {/* The only thing that "shrinks": it slides up, so its bottom edge and
          border rise. `top` overshoots by collapseDistance so the strip behind
          the status bar stays covered once it has slid. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.surface, { top: -collapseDistance }, rise]}
      >
        {Platform.OS === "android" ? (
          // dimezisBlurView re-snapshots whatever scrolls behind it every
          // frame — that was the flicker — and paints over the container tint
          // anyway. Opaque surface here, matching the screen root.
          <View style={[StyleSheet.absoluteFill, styles.surfaceAndroid]} />
        ) : (
          <BlurView
            intensity={24}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.surfaceBlur]}
          />
        )}
      </Animated.View>

      <View style={[styles.inner, { paddingTop: topInset + TOP_PADDING }]} pointerEvents="box-none">
        {/* Nav row — pinned, never moves */}
        <View style={styles.navRow}>
          <PressableScale onPress={onBack} hitSlop={12}>
            <ArrowBack width={24} height={24} />
          </PressableScale>

          <View style={styles.navContent}>
            <Animated.View
              style={[styles.counterWrap, expandedOpacity]}
              pointerEvents="none"
            >
              <Text style={styles.counterText}>
                {t("workout.ui.exerciseProgress", {
                  current: exerciseIndex,
                  total: totalExercises,
                })}
              </Text>
            </Animated.View>

            <Animated.View
              style={[styles.collapsedRow, collapsedOpacity]}
              pointerEvents="none"
            >
              <Text style={styles.collapsedTitle} numberOfLines={1}>
                {exerciseName}
              </Text>
              <Text style={styles.collapsedTimer}>{timer}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Fixed-size window. The info block slides up THROUGH it and is
            clipped at the top edge, so it can never ghost over the nav row —
            which is what a plain slide-and-fade would do. */}
        <View
          pointerEvents="none"
          style={[styles.infoWindow, { height: collapseDistance }]}
        >
          <Animated.View style={infoStyle}>
            <View style={styles.infoRow} onLayout={onInfoLayout}>
              <View style={styles.infoLeft}>
                <Text style={styles.category}>{exerciseCategory}</Text>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exerciseName}
                </Text>
              </View>
              <View style={styles.infoRight}>
                <Text style={styles.timerLarge}>{timer}</Text>
                <Text style={styles.sessionLabel}>
                  {t("workout.ui.sessionTime")}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Set progress row — rises by exactly the window's height, landing its
            usual 16px below the nav row. */}
        {showSets ? (
          <Animated.View style={[styles.setRow, rise]}>
            <View style={styles.setContent}>
              <View style={styles.segmentRow}>
                {Array.from({ length: sets }, (_, i) => (
                  <SetSegment key={i} index={i} activeIndex={activeSet} />
                ))}
              </View>
              <View style={styles.setLabelRow}>
                {Array.from({ length: sets }, (_, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.setLabel,
                      i === activeSet && styles.setLabelActive,
                    ]}
                  >
                    {t("workout.ui.setLabel", { number: i + 1 }).toUpperCase()}
                  </Text>
                ))}
              </View>
            </View>

            <IconButton
              onPress={onAddSet}
              disabled={!canAddSet}
              hitSlop={8}
              size={32}
              borderRadius={16}
              glassEffect="regular"
              tint="subtle"
            >
              <Text style={styles.addSetIcon}>+</Text>
            </IconButton>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
};

export default WorkoutLogHeader;

/* ─── Styles ─── */

const styles = StyleSheet.create({
  // An overlay, not a row in the column. The screen pads its scroll content by
  // the measured height instead, so the list runs UNDER the header and its own
  // scrolling is what keeps it flush with the receding bottom edge. `box-none`
  // so the band the collapsed header no longer covers doesn't eat touches.
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  // Padding lives here, not on `header`: `surface` is absolutely positioned
  // against `header`, and keeping that box padding-free makes `bottom: 0` mean
  // the header's real bottom edge.
  inner: {
    paddingHorizontal: horizontalScale(24),
    paddingBottom: BOTTOM_PADDING,
  },
  surface: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  surfaceBlur: {
    backgroundColor: "rgba(17,17,17,0.6)",
  },
  surfaceAndroid: {
    backgroundColor: COLORS.neutral.black2,
  },
  infoWindow: {
    overflow: "hidden",
    // Content rests on the bottom edge, leaving INFO_GAP above it.
    justifyContent: "flex-end",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: NAV_ROW_HEIGHT,
    gap: 16,
  },
  navContent: {
    flex: 1,
    height: 36,
    justifyContent: "center",
  },
  counterWrap: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  counterText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  collapsedRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsedTitle: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 33.6,
    color: COLORS.neutral.white,
    marginRight: 12,
  },
  collapsedTimer: {
    fontFamily: FONTS.medium,
    fontSize: 30,
    fontWeight: "500",
    lineHeight: 36,
    color: COLORS.neutral.white,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  infoLeft: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  category: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  exerciseName: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 33.6,
    color: COLORS.neutral.white,
  },
  infoRight: {
    alignItems: "center",
  },
  timerLarge: {
    fontFamily: FONTS.medium,
    fontSize: 36,
    fontWeight: "500",
    lineHeight: 43.2,
    color: COLORS.neutral.white,
  },
  sessionLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16.8,
    color: COLORS.alpha.white50,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginTop: SET_ROW_GAP,
  },
  setContent: {
    flex: 1,
    gap: 10,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
  },
  setLabelRow: {
    flexDirection: "row",
    gap: 12,
  },
  setLabel: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 12,
    color: COLORS.alpha.white50,
    textAlign: "center",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  setLabelActive: {
    color: COLORS.primary.dark,
  },
  addSetIcon: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 22,
    color: COLORS.neutral.white,
  },
});