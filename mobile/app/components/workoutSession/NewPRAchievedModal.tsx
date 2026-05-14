import AchievementBadge from "@/app/components/workoutSession/AchievementBadge";
import PointsAwardDisplay from "@/app/components/workoutSession/PointsAwardDisplay";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export type NewPRAchievedModalProps = {
  /** Whether the modal is currently visible. */
  isVisible: boolean;
  /** Exercise name, e.g. `Deadlift`. */
  exerciseName: string;
  /** New PR weight (display unit decided by caller / formatter). */
  newPRWeight: number;
  /** New PR rep count. */
  newPRReps: number;
  /** Previous PR weight, if available. Omit to hide the comparison row. */
  previousPRWeight?: number;
  /** Previous PR rep count. Defaults to `newPRReps` when omitted. */
  previousPRReps?: number;
  /** Points awarded. Defaults to `100`. */
  pointsAwarded?: number;
  /** Called when the user dismisses the modal via the continue button. */
  onDismiss: () => void;
  testID?: string;
};

const ENTER_DURATION = 280;
const EXIT_DURATION = 200;

/**
 * `NewPRAchievedModal` is a subtle, premium celebration overlay shown when the
 * user beats a previous personal record. It dims/blurs the underlying workout
 * UI, presents the achievement badge, exercise/PR details, points award, and
 * a single continue action. Backdrop taps do not dismiss; the user must
 * explicitly acknowledge via the button.
 *
 * This is phase-one UI only: no PR detection, no points persistence, no
 * navigation. `onDismiss` is a parent-controlled no-op or local close.
 */
const NewPRAchievedModal = ({
  isVisible,
  exerciseName,
  newPRWeight,
  newPRReps,
  previousPRWeight,
  previousPRReps,
  pointsAwarded = 100,
  onDismiss,
  testID,
}: NewPRAchievedModalProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(isVisible);
  const backdropOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(24);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      cardOpacity.value = withDelay(
        80,
        withTiming(1, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) }),
      );
      cardTranslate.value = withDelay(
        80,
        withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) }),
      );
      return;
    }

    backdropOpacity.value = withTiming(0, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    cardOpacity.value = withTiming(0, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    cardTranslate.value = withTiming(16, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    const handle = setTimeout(() => setIsMounted(false), EXIT_DURATION + 40);
    return () => clearTimeout(handle);
  }, [backdropOpacity, cardOpacity, cardTranslate, isVisible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const previousWeight = previousPRWeight;
  const previousReps = previousPRReps ?? newPRReps;

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal
      testID={testID}
    >
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        {/* Non-dismissing backdrop pressable for a11y focus only — taps are
            absorbed but never dismiss the modal. */}
        <Pressable
          accessibilityLabel={t("workout.newPRAchieved.backdropAccessibility")}
          accessibilityRole="none"
          style={StyleSheet.absoluteFill}
          onPress={() => undefined}
        />
      </Animated.View>

      <View style={styles.centerWrapper} pointerEvents="box-none">
        <Animated.View
          accessible
          accessibilityRole="alert"
          accessibilityLabel={t("workout.newPRAchieved.modalAccessibility", {
            exercise: exerciseName,
          })}
          style={[styles.card, cardStyle]}
        >
          <View style={styles.badgeRow}>
            <AchievementBadge
              type="trophy"
              size={104}
              label={t("workout.newPRAchieved.badgeAccessibility")}
              entranceDelay={120}
            />
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.kicker}>{t("workout.newPRAchieved.kicker")}</Text>
            <Text style={styles.title}>{t("workout.newPRAchieved.title")}</Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.exerciseLabel}>
              {t("workout.newPRAchieved.exerciseLabel")}
            </Text>
            <Text style={styles.exerciseName}>{exerciseName}</Text>

            <View style={styles.statRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>
                  {t("workout.newPRAchieved.newPRLabel")}
                </Text>
                <Text style={styles.statValuePrimary}>
                  {t("workout.newPRAchieved.weightReps", {
                    weight: newPRWeight,
                    reps: newPRReps,
                  })}
                </Text>
              </View>
              {previousWeight !== undefined ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>
                      {t("workout.newPRAchieved.previousPRLabel")}
                    </Text>
                    <Text style={styles.statValueSecondary}>
                      {t("workout.newPRAchieved.weightReps", {
                        weight: previousWeight,
                        reps: previousReps,
                      })}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.pointsBlock}>
            <PointsAwardDisplay
              points={pointsAwarded}
              label={t("workout.newPRAchieved.pointsLabel")}
              accessibilityLabel={t("workout.newPRAchieved.pointsAccessibility", {
                points: pointsAwarded,
              })}
              entranceDelay={260}
            />
          </View>

          <View style={styles.footer}>
            <PrimaryButton
              label={t("workout.newPRAchieved.continue")}
              onPress={onDismiss}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default NewPRAchievedModal;

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
    backgroundColor: COLORS.neutral.black3,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 24,
  },
  badgeRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: {
    alignItems: "center",
    gap: 6,
  },
  kicker: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: COLORS.primary.dark,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  detailBlock: {
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  exerciseLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: COLORS.alpha.white72,
  },
  exerciseName: {
    fontFamily: FONTS.medium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 4,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.alpha.white72,
  },
  statValuePrimary: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary.base,
    textAlign: "center",
  },
  statValueSecondary: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.alpha.white78,
    textAlign: "center",
  },
  divider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.alpha.white12,
  },
  pointsBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  footer: {
    paddingTop: 4,
  },
});
