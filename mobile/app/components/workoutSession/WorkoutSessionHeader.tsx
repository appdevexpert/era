import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ArrowBack } from "@/assets/icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE } from "./useWorkoutSessionHeaderScroll";

type SetState = "completed" | "active" | "upcoming";

export type WorkoutSessionHeaderAction = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: ReactNode;
  label?: string;
  onPress: () => void;
};

type WorkoutSessionHeaderProps = {
  contextLabel?: string;
  currentExercise: number;
  currentSet: number;
  elapsedSeconds?: number;
  exerciseProgressLabel?: string;
  onBack: () => void;
  onNextSet?: () => void;
  rightActions?: WorkoutSessionHeaderAction[];
  scrollY: SharedValue<number>;
  title: string;
  totalExercises: number;
  totalSets: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const clampCount = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;

const getSetState = (setNumber: number, currentSet: number): SetState => {
  if (setNumber < currentSet) {
    return "completed";
  }

  if (setNumber === currentSet) {
    return "active";
  }

  return "upcoming";
};

const WorkoutSessionHeader = ({
  contextLabel,
  currentExercise,
  currentSet,
  elapsedSeconds = 0,
  exerciseProgressLabel,
  onBack,
  onNextSet,
  rightActions,
  scrollY,
  title,
  totalExercises,
  totalSets,
}: WorkoutSessionHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const setCount = clampCount(totalSets, 1);
  const activeSet = Math.min(Math.max(clampCount(currentSet, 1), 1), setCount);
  const exerciseCount = clampCount(totalExercises, 1);
  const exercisePosition = Math.min(Math.max(clampCount(currentExercise, 1), 1), exerciseCount);
  const progressLabel =
    exerciseProgressLabel ??
    t("workout.session.exerciseProgress", {
      current: exercisePosition,
      total: exerciseCount,
    });
  const actionButtons =
    rightActions ??
    (onNextSet
      ? [
        {
          accessibilityLabel: t("workout.session.addSet"),
          label: "+",
          onPress: onNextSet,
        },
      ]
      : []);

  const topRowStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      height: interpolate(progress, [0, 1], [24, 0]),
      marginBottom: interpolate(progress, [0, 1], [16, 0]),
      opacity: 1 - progress,
      overflow: "hidden" as const,
    };
  });

  const collapsedBackStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: progress,
      width: interpolate(progress, [0, 1], [0, 36]),
      overflow: "hidden" as const,
    };
  });

  const contextStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      height: interpolate(progress, [0, 1], [15, 0]),
      marginBottom: interpolate(progress, [0, 1], [6, 0]),
      opacity: 1 - progress,
      overflow: "hidden" as const,
    };
  });

  const timerLabelStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      height: interpolate(progress, [0, 1], [17, 0]),
      opacity: 1 - progress,
      overflow: "hidden" as const,
    };
  });

  const timerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale: interpolate(progress, [0, 1], [1, 0.84]) }],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      fontSize: interpolate(progress, [0, 1], [28, 23]),
      lineHeight: interpolate(progress, [0, 1], [34, 28]),
    };
  });

  return (
    <BlurView
      intensity={24}
      tint="dark"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.topRow, topRowStyle]}>
          <Pressable
            accessibilityLabel={t("workout.session.goBack")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBack}
            style={styles.iconButton}
          >
            <ArrowBack width={20} height={20} />
          </Pressable>
          <Text numberOfLines={1} style={styles.exerciseCounter}>
            {progressLabel}
          </Text>
        </Animated.View>

        <View style={styles.middleRow}>
          <Animated.View style={collapsedBackStyle}>
            <Pressable
              accessibilityLabel={t("workout.session.goBack")}
              accessibilityRole="button"
              hitSlop={12}
              onPress={onBack}
              style={styles.collapsedBackButton}
            >
              <ArrowBack width={20} height={20} />
            </Pressable>
          </Animated.View>

          <View style={styles.exerciseInfo}>
            {contextLabel ? (
              <Animated.View style={contextStyle}>
                <Text numberOfLines={1} style={styles.contextLabel}>
                  {contextLabel}
                </Text>
              </Animated.View>
            ) : null}
            <Animated.Text numberOfLines={1} style={[styles.title, titleStyle]}>
              {title}
            </Animated.Text>
          </View>

          <Animated.View style={[styles.timerBlock, timerStyle]}>
            <Text
              accessibilityLabel={t("workout.session.elapsedAccessibility", {
                time: formatElapsed(elapsedSeconds),
              })}
              style={styles.timerValue}
            >
              {formatElapsed(elapsedSeconds)}
            </Text>
            <Animated.View style={timerLabelStyle}>
              <Text numberOfLines={1} style={styles.timerLabel}>
                {t("workout.session.sessionTime")}
              </Text>
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.setsTrack}>
            {Array.from({ length: setCount }, (_, index) => {
              const setNumber = index + 1;
              const state = getSetState(setNumber, activeSet);
              const isActive = state === "active";
              const isCompleted = state === "completed";
              const label = t("workout.session.setLabel", { number: setNumber });
              const statusLabel = isCompleted
                ? t("workout.session.setCompleted")
                : isActive
                  ? t("workout.session.setCurrent")
                  : t("workout.session.setUpcoming");

              return (
                <View
                  accessibilityLabel={t("workout.session.setAccessibility", {
                    set: label,
                    status: statusLabel,
                  })}
                  key={setNumber}
                  style={styles.setItem}
                >
                  <View style={styles.setBarTrack}>
                    <LinearGradient
                      colors={[...GRADIENTS.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.setBarFill,
                        { width: `${isCompleted ? 100 : isActive ? 28 : 0}%` },
                      ]}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.setLabel,
                      (isActive || isCompleted) ? styles.setLabelActive : styles.setLabelInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {actionButtons.length > 0 ? (
            <View style={styles.actions}>
              {actionButtons.map((action) => (
                <AnimatedPressable
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  disabled={action.disabled}
                  hitSlop={8}
                  key={action.accessibilityLabel}
                  onPress={action.onPress}
                  style={[styles.actionButton, action.disabled && styles.actionButtonDisabled]}
                >
                  {action.icon ?? (
                    <Text style={styles.actionButtonLabel}>{action.label}</Text>
                  )}
                </AnimatedPressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </BlurView>
  );
};

export default WorkoutSessionHeader;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    backgroundColor: "rgba(17,17,17,0.72)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  iconButton: {
    width: 28,
    minHeight: 24,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  exerciseCounter: {
    flexShrink: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  middleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  collapsedBackButton: {
    width: 32,
    minHeight: 36,
    justifyContent: "center",
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  contextLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  timerBlock: {
    minWidth: 78,
    alignItems: "flex-end",
  },
  timerValue: {
    fontFamily: FONTS.medium,
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
  },
  timerLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.alpha.white50,
    lineHeight: 16.8,
  },
  bottomRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  setsTrack: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  setItem: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    justifyContent: "center",
  },
  setBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2A2A2A",
    overflow: "hidden",
  },
  setBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  setLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: "400",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 12,
  },
  setLabelActive: {
    color: COLORS.primary.dark,
  },
  setLabelInactive: {
    color: COLORS.neutral.white,
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.primary16,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonLabel: {
    fontFamily: FONTS.light,
    fontSize: 24,
    fontWeight: "300",
    color: COLORS.neutral.white,
    lineHeight: 26,
  },
});
