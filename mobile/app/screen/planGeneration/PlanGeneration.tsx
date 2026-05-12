import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import GradientBackground from "@/app/components/layout/GradientBackground";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { PlanGenerationStackParamList } from "@/app/navigation/types";
import { completePlanGeneration } from "@/app/stores/slice/authSlice";
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import {
  selectHasWorkoutBootstrap,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import { useAppDispatch } from "@/app/stores/store";
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
const PROGRESS_STEP = 4;
const PROGRESS_INTERVAL_MS = 160;
const TOTAL_ESTIMATED_SECONDS = 92;

type StepStatus = "completed" | "loading" | "pending";

const getStepStatus = (index: number, progress: number): StepStatus => {
  const threshold = ((index + 1) / TOTAL_STEPS) * 100;
  const activeStart = (index / TOTAL_STEPS) * 100;
  if (progress >= threshold) return "completed";
  if (progress >= activeStart) return "loading";
  return "pending";
};

/** Figma opacity: active step = 1.0, ±1 step = 0.5, ±2+ steps = 0.3 */
const getStepOpacity = (index: number, progress: number): number => {
  const activeIndex = Math.min(
    Math.floor((progress / 100) * TOTAL_STEPS),
    TOTAL_STEPS - 1,
  );
  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  return 0.3;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// ── Icons ────────────────────────────────────────────────────────────────────

const SpinningLoader = () => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[iconStyles.iconWrap, { transform: [{ rotate }] }]}>
      <Feather name="loader" size={22} color={COLORS.neutral.white} />
    </Animated.View>
  );
};

const StepIcon = ({ status }: { status: StepStatus }) => {
  if (status === "completed") {
    return (
      <View style={[iconStyles.circle, iconStyles.completedBg]}>
        <Feather name="check" size={16} color={COLORS.neutral.white} />
      </View>
    );
  }
  if (status === "loading") {
    return <SpinningLoader />;
  }
  return (
    <View style={iconStyles.iconWrap}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 6V18M17.196 9L6.804 15M6.804 9L17.196 15"
          stroke="#A2A1A6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const iconStyles = StyleSheet.create({
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  completedBg: {
    backgroundColor: COLORS.primary.dark,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Screen ───────────────────────────────────────────────────────────────────

const PlanGeneration = (_props: PlanGenerationProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);

  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isFailed = workoutStatus === "failed";
  const isReady = completed && hasWorkoutBootstrap;

  const remainingSeconds = useMemo(
    () => Math.max(0, TOTAL_ESTIMATED_SECONDS * (1 - progress / 100)),
    [progress],
  );

  // Fetch workout data
  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      dispatch(loadWorkoutBootstrap());
    }
  }, [dispatch, hasWorkoutBootstrap, workoutStatus]);

  // Animate progress counter
  useEffect(() => {
    if (completed || isFailed) return;

    const timer = setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + PROGRESS_STEP, 100);
        if (next === 100) setCompleted(true);
        return next;
      });
    }, PROGRESS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [completed, isFailed]);

  // Sync animated bar to progress
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: progress === 100 ? 450 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Navigate when ready
  useEffect(() => {
    if (isReady) {
      dispatch(completePlanGeneration());
    }
  }, [dispatch, isReady]);

  const handleRetry = () => {
    setProgress(0);
    setCompleted(false);
    dispatch(loadWorkoutBootstrap());
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Heading */}
          <Text style={styles.title}>
            {t("planGeneration.headingLine1")}
            {"\n"}
            <Text style={styles.titleGold}>
              {t("planGeneration.headingLine2")}
            </Text>
          </Text>

          {/* Percentage */}
          <Text style={styles.percentage}>{progress}%</Text>

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
            {STEP_KEYS.map((key, index) => {
              const status = getStepStatus(index, progress);
              const opacity = getStepOpacity(index, progress);
              return (
                <View key={key} style={[styles.checklistItem, { opacity }]}>
                  <StepIcon status={status} />
                  <Text style={styles.checklistText}>
                    {t(`planGeneration.steps.${key}`)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Estimated time */}
          <View style={styles.estimatedTimeRow}>
            <Text style={styles.estimatedTimeLabel}>
              {t("planGeneration.estimatedTime")}
            </Text>
            <Text style={styles.estimatedTimeValue}>
              {formatTime(remainingSeconds)}
            </Text>
          </View>

          {/* Error / retry */}
          {isFailed ? (
            <View style={styles.errorContainer}>
              {workoutError ? (
                <Text style={styles.errorText}>{workoutError}</Text>
              ) : null}
              <Pressable onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>
                  {t("planGeneration.actions.retry")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(32),
    paddingTop: verticalScale(60),
  },

  // Heading
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

  // Percentage
  percentage: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: responsiveFontSize(56),
    color: COLORS.neutral.white,
    marginBottom: verticalScale(8),
  },

  // Subtitle
  subtitle: {
    fontFamily: FONTS.regular,
    fontWeight: "400",
    fontSize: responsiveFontSize(14),
    lineHeight: 22,
    color: COLORS.neutral.white,
    marginBottom: verticalScale(24),
  },

  // Progress bar
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

  // Checklist
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

  // Estimated time
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

  // Error
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
