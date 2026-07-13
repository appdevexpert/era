import { ArrowBack } from "@/assets/icons";
import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale } from "@/app/utils/responsive";
import IconButton from "@/app/components/common/IconButton";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

const COLLAPSE_DISTANCE = 60;
// 1 line of exerciseName (fontSize 28 → lineHeight 33.6) + category label +
// 6px gap. Long names truncate with ellipsis (numberOfLines={1}) rather than
// wrap — 2-line wrap was misaligning with the timer column.
const INFO_HEIGHT = 68;

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

/* ─── Play / pause glyph (drawn with Views — no SVG asset needed) ─── */

const PlayPauseIcon = ({ paused }: { paused: boolean }) =>
  paused ? (
    <View style={ppStyles.playTriangle} />
  ) : (
    <View style={ppStyles.pauseWrap}>
      <View style={ppStyles.pauseBar} />
      <View style={ppStyles.pauseBar} />
    </View>
  );

const ppStyles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pauseWrap: {
    flexDirection: "row",
    gap: 4,
  },
  pauseBar: {
    width: 3.5,
    height: 13,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.white,
  },
  playTriangle: {
    marginLeft: 3,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: COLORS.neutral.white,
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
  /** Whether the session is paused (freezes the timer, dims the set bar). */
  isPaused?: boolean;
  /** Toggle pause/resume from the header. Button hidden when omitted. */
  onTogglePause?: () => void;
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
  isPaused = false,
  onTogglePause,
}: WorkoutLogHeaderProps) => {
  const { t } = useTranslation();

  const HALF = COLLAPSE_DISTANCE / 2;

  // Expanded fades out in the first half of scroll
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HALF],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Collapsed fades in during the second half of scroll
  const collapsedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HALF, COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const infoStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [INFO_HEIGHT, 0],
      Extrapolation.CLAMP,
    ),
    marginTop: interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [16, 0],
      Extrapolation.CLAMP,
    ),
    opacity: interpolate(
      scrollY.value,
      [0, COLLAPSE_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <BlurView intensity={24} tint="dark" style={[styles.header, { paddingTop: topInset + 8 }]}>
      {/* Nav row */}
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

        {onTogglePause ? (
          <PressableScale
            onPress={onTogglePause}
            hitSlop={10}
            style={ppStyles.button}
            accessibilityLabel={
              isPaused ? t("workout.ui.resume") : t("workout.ui.pause")
            }
          >
            <PlayPauseIcon paused={isPaused} />
          </PressableScale>
        ) : null}
      </View>

      {/* Info section — collapses on scroll */}
      <Animated.View style={[styles.infoWrapper, infoStyle]}>
        <View style={styles.infoRow}>
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

      {/* Set progress row */}
      {showSets ? <View style={styles.setRow}>
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
      </View> : null}
    </BlurView>
  );
};

export default WorkoutLogHeader;

/* ─── Styles ─── */

const styles = StyleSheet.create({
  header: {
    backgroundColor: "rgba(17,17,17,0.6)",
    paddingHorizontal: horizontalScale(24),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    zIndex: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
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
  infoWrapper: {
    overflow: "hidden",
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
    marginTop: 16,
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