import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Reanimated, {
  cancelAnimation,
  Easing as ReEasing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GradientBackground from "@/app/components/common/GradientBackground";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { PlanGenerationStackParamList } from "@/app/navigation/types";
import { completePlanGeneration } from "@/app/stores/slice/authSlice";
import { submitGoalData } from "@/app/stores/slice/onboardingSlice";
import { loadWorkoutBootstrap, prefetchAllDays } from "@/app/stores/slice/workoutSlice";
import {
  selectHasWorkoutBootstrap,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import { useAppDispatch } from "@/app/stores/store";
import { EVENTS, logEvent } from "@/app/services/analyticsService";
import { horizontalScale, responsiveFontSize, verticalScale } from "@/app/utils/responsive";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type PlanGenerationProps = NativeStackScreenProps<
  PlanGenerationStackParamList,
  "PlanGeneration"
>;

// ── Constants ────────────────────────────────────────────────────────────────

const STEP_KEYS = [
  "analysingLevel",
  "creatingProgram",
  "buildingStructure",
  "calculatingWeights",
  "preparingDiet",
  "programReady",
] as const;

const TOTAL_STEPS = STEP_KEYS.length;
const PROGRESS_DURATION_MS = 16000;
const TOTAL_ESTIMATED_SECONDS = 92;

type StepStatus = "completed" | "loading" | "pending";

const getStepStatus = (index: number, progress: number): StepStatus => {
  const threshold = ((index + 1) / TOTAL_STEPS) * 100;
  const activeStart = (index / TOTAL_STEPS) * 100;
  if (progress >= threshold) return "completed";
  if (progress >= activeStart) return "loading";
  return "pending";
};

const getStepOpacity = (index: number, progress: number): number => {
  const activeIndex = Math.min(
    Math.floor((progress / 100) * TOTAL_STEPS),
    TOTAL_STEPS - 1,
  );
  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  return 0.28;
};

const STATUS_TRANSITION = {
  duration: 480,
  easing: ReEasing.out(ReEasing.cubic),
} as const;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// ── Icons ────────────────────────────────────────────────────────────────────

const AsteriskGlyph = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 4V20"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path
      d="M5.07 8L18.93 16"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path
      d="M18.93 8L5.07 16"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

const StarburstGlyph = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M12 17V21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M3 12H7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M17 12H21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M5.64 5.64L8.46 8.46" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M15.54 15.54L18.36 18.36" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M5.64 18.36L8.46 15.54" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M15.54 8.46L18.36 5.64" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

/**
 * 22×22 icon slot that crossfades between pending / loading / completed
 * glyphs based on `status`.
 */
const StepIcon = ({ status }: { status: StepStatus }) => {
  const spin = useSharedValue(0);
  const loadingOp = useSharedValue(status === "loading" ? 1 : 0);
  const completedOp = useSharedValue(status === "completed" ? 1 : 0);
  const pendingOp = useSharedValue(status === "pending" ? 1 : 0);

  useEffect(() => {
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: 1100, easing: ReEasing.linear }),
      -1,
      false,
    );
  }, [spin]);

  useEffect(() => {
    loadingOp.value = withTiming(status === "loading" ? 1 : 0, STATUS_TRANSITION);
    completedOp.value = withTiming(status === "completed" ? 1 : 0, STATUS_TRANSITION);
    pendingOp.value = withTiming(status === "pending" ? 1 : 0, STATUS_TRANSITION);
  }, [status, loadingOp, completedOp, pendingOp]);

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOp.value,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const completedStyle = useAnimatedStyle(() => ({ opacity: completedOp.value }));
  const pendingStyle = useAnimatedStyle(() => ({ opacity: pendingOp.value }));

  return (
    <View style={iconStyles.iconWrap}>
      <Reanimated.View style={[iconStyles.layer, pendingStyle]} pointerEvents="none">
        <AsteriskGlyph color="#6F6C7D" />
      </Reanimated.View>
      <Reanimated.View style={[iconStyles.layer, loadingStyle]} pointerEvents="none">
        <StarburstGlyph color={COLORS.primary.base} />
      </Reanimated.View>
      <Reanimated.View style={[iconStyles.layer, completedStyle]} pointerEvents="none">
        <View style={iconStyles.completedCircle}>
          <Feather name="check" size={14} color={COLORS.neutral.white} />
        </View>
      </Reanimated.View>
    </View>
  );
};

const iconStyles = StyleSheet.create({
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  completedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary.dark,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Step row ─────────────────────────────────────────────────────────────────

interface StepRowProps {
  stepKey: (typeof STEP_KEYS)[number];
  status: StepStatus;
  targetOpacity: number;
}

const StepRow = ({ stepKey, status, targetOpacity }: StepRowProps) => {
  const { t } = useTranslation();
  const opacity = useSharedValue(targetOpacity);

  useEffect(() => {
    opacity.value = withTiming(targetOpacity, STATUS_TRANSITION);
  }, [targetOpacity, opacity]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Reanimated.View style={[styles.checklistItem, rowStyle]}>
      <StepIcon status={status} />
      <Text style={styles.checklistText}>
        {t(`planGeneration.steps.${stepKey}`)}
      </Text>
    </Reanimated.View>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const PlanGeneration = (_props: PlanGenerationProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);

  const [completed, setCompleted] = useState(false);

  // progressAnim drives the visual bar (Animated API — interpolation to "%" is simpler here).
  const progressAnim = useRef(new Animated.Value(0)).current;

  // counterSV is the single source of truth for the percentage number.
  // A Reanimated shared value gives us cancelAnimation — the only way to
  // truly stop a withTiming mid-flight. useAnimatedCounter wraps withTiming
  // but exposes no cancel handle, which was the root cause of both the
  // "counter keeps running after failure" and "counter goes backward on retry" bugs.
  const counterSV = useSharedValue(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progress = displayProgress;

  const isFailed = workoutStatus === "failed";
  const isReady = completed && hasWorkoutBootstrap;

  const startWorkoutBootstrap = useCallback(async () => {
    void logEvent(EVENTS.PLAN_GEN_STARTED);
    try {
      await dispatch(submitGoalData()).unwrap();
    } catch (error) {
      console.warn("[planGeneration] failed to submit onboarding data", error);
    }
    dispatch(loadWorkoutBootstrap());
  }, [dispatch]);

  const remainingSeconds = useMemo(
    () => Math.max(0, TOTAL_ESTIMATED_SECONDS * (1 - progress / 100)),
    [progress],
  );

  // Bridge the UI-thread counter value back to JS so the checklist,
  // estimated-time countdown, and completion check all read the same number.
  useAnimatedReaction(
    () => Math.round(counterSV.value),
    (current, previous) => {
      if (current !== previous) setDisplayProgress(current);
    },
  );

  // Fetch workout data on first mount (idle state only).
  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      startWorkoutBootstrap();
    }
  }, [hasWorkoutBootstrap, startWorkoutBootstrap, workoutStatus]);

  // Start both animations from the same trigger so bar and counter stay in sync.
  // This effect also re-fires when isFailed clears after retry, restarting
  // both animations cleanly from their already-reset positions.
  useEffect(() => {
    if (completed || isFailed) return;
    counterSV.value = withTiming(100, {
      duration: PROGRESS_DURATION_MS,
      easing: ReEasing.out(ReEasing.cubic),
    });
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: PROGRESS_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completed, isFailed, progressAnim, counterSV]);

  // Stop both animations the moment the fetch fails so the bar and counter
  // freeze at the failure point instead of running to 100% with an error shown.
  useEffect(() => {
    if (!isFailed) return;
    progressAnim.stopAnimation();
    cancelAnimation(counterSV);
  }, [isFailed, progressAnim, counterSV]);

  // Mark complete once the counter reaches 100.
  useEffect(() => {
    if (progress >= 100 && !completed) setCompleted(true);
  }, [progress, completed]);

  // Navigate when both the animation finished and the bootstrap data is ready.
  useEffect(() => {
    if (isReady) {
      void logEvent(EVENTS.PLAN_GEN_COMPLETED);
      dispatch(prefetchAllDays());
      dispatch(completePlanGeneration());
    }
  }, [dispatch, isReady]);

  useEffect(() => {
    if (isFailed) {
      void logEvent(EVENTS.PLAN_GEN_FAILED, { reason: workoutError ?? "unknown" });
    }
  }, [isFailed, workoutError]);

  const handleRetry = () => {
    // Cancel before zeroing: without cancelAnimation the withTiming worklet
    // could still tick for one frame after .value = 0, causing a ghost flash.
    // Setting counterSV.value = 0 directly (no withTiming) means no backward
    // animation — the old bug where the counter animated from e.g. 40 → 0
    // before going forward was caused by setProgressTarget(0) passing through
    // useAnimatedCounter which always wrapped every change in withTiming.
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    cancelAnimation(counterSV);
    counterSV.value = 0;
    setCompleted(false);
    startWorkoutBootstrap();
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/*
          ScrollView with flexGrow: 1 replaces the plain flex: 1 View.
          Normal (no-error) state: content fills the screen exactly as before —
          marginTop: "auto" on the footer still pushes it to the bottom.
          Error state: the errorContainer grows the content beyond the screen
          height and the user can scroll down to reach the Retry button instead
          of it being clipped off-screen.
        */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, verticalScale(20)) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Heading */}
          <Text style={styles.title}>
            {t("planGeneration.headingLine1")}
            {"\n"}
            <Text style={styles.titleGold}>
              {t("planGeneration.headingLine2")}
            </Text>
          </Text>

          {/* Percentage */}
          <Text style={styles.percentage}>{displayProgress}%</Text>

          {/* Description */}
          <Text style={styles.subtitle}>
            {t("planGeneration.description")}
          </Text>

          {/* Animated progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground} />
            <Animated.View
              style={[styles.progressBarWrapper, { width: progressBarWidth }]}
            >
              <LinearGradient
                colors={[
                  COLORS.primary.dark,
                  COLORS.primary.base,
                  COLORS.primary.light,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressBarFill}
              />
            </Animated.View>
          </View>

          {/* Checklist */}
          <View style={styles.checklistContainer}>
            {STEP_KEYS.map((key, index) => (
              <StepRow
                key={key}
                stepKey={key}
                status={getStepStatus(index, progress)}
                targetOpacity={getStepOpacity(index, progress)}
              />
            ))}
          </View>

          {/* Estimated time — marginTop: "auto" pushes this to the screen
              bottom in the normal state; error banner sits below it in the
              scroll area so neither element clips the other. */}
          <View style={styles.estimatedTimeRow}>
            <Text style={styles.estimatedTimeLabel}>
              {t("planGeneration.estimatedTime")}
            </Text>
            <Text style={styles.estimatedTimeValue}>
              {formatTime(remainingSeconds)}
            </Text>
          </View>

          {/* Error / retry — placed after the footer inside the scroll area
              so it never overflows off-screen */}
          {isFailed ? (
            <View style={styles.errorContainer}>
              {workoutError ? (
                <Text style={styles.errorText}>{workoutError}</Text>
              ) : null}
              <PressableScale onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>
                  {t("planGeneration.actions.retry")}
                </Text>
              </PressableScale>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

export default PlanGeneration;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // flexGrow: 1 lets the scroll content fill the screen in the normal state
  // (so marginTop: "auto" still works) while allowing it to grow taller when
  // the error banner is shown, making the Retry button reachable via scroll.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: horizontalScale(32),
    paddingTop: verticalScale(60),
  },

  title: {
    fontFamily: FONTS.display,
    fontWeight: "500",
    fontSize: responsiveFontSize(26),
    lineHeight: 36,
    color: COLORS.neutral.white,
    marginBottom: verticalScale(22),
  },
  titleGold: {
    color: COLORS.primary.dark,
    fontWeight: "600",
  },

  percentage: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: responsiveFontSize(56),
    color: COLORS.neutral.white,
    marginBottom: verticalScale(8),
    minWidth: horizontalScale(190),
    fontVariant: ["tabular-nums"],
  },

  subtitle: {
    fontFamily: FONTS.regular,
    fontWeight: "400",
    fontSize: responsiveFontSize(14),
    lineHeight: 22,
    color: COLORS.neutral.white,
    marginBottom: verticalScale(24),
  },

  progressBarContainer: {
    height: 6,
    width: "100%",
    marginBottom: verticalScale(32),
    position: "relative",
  },
  progressBarBackground: {
    position: "absolute",
    height: 6,
    width: "100%",
    backgroundColor: COLORS.alpha.white12,
    borderRadius: 3,
  },
  progressBarWrapper: {
    position: "absolute",
    height: 6,
    overflow: "hidden",
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    width: "100%",
    borderRadius: 3,
  },

  checklistContainer: {
    gap: verticalScale(24),
    marginBottom: verticalScale(32),
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: horizontalScale(16),
  },
  checklistText: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 14,
    color: COLORS.neutral.white,
    flex: 1,
  },

  estimatedTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: horizontalScale(8),
    marginTop: "auto",
    marginBottom: verticalScale(40),
  },
  estimatedTimeLabel: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 14,
    color: COLORS.neutral.white,
  },
  estimatedTimeValue: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 14,
    color: COLORS.primary.dark,
  },

  errorContainer: {
    backgroundColor: "rgba(230,119,119,0.1)",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 14,
    textAlign: "center",
    color: COLORS.semantic.danger,
    marginBottom: verticalScale(12),
  },
  retryButton: {
    backgroundColor: COLORS.alpha.primary16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary60,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 14,
    color: COLORS.primary.base,
  },
});
