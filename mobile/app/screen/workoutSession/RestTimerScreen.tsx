import ExerciseProgressLabel from "@/app/components/workoutSession/ExerciseProgressLabel";
import RestTimerCard from "@/app/components/workoutSession/RestTimerCard";
import UpNextCard from "@/app/components/workoutSession/UpNextCard";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// UI-only dummy values. Per ERA-12 the screen is a static visual preview with
// no real countdown business logic, navigation, or persistence.
const DUMMY_INITIAL_SECONDS = 47;
const DUMMY_TOTAL_SECONDS = 60;
const DUMMY_EXERCISE_CURRENT = 1;
const DUMMY_EXERCISE_TOTAL = 5;
const DUMMY_UP_NEXT_EXERCISE = "Deadlift";
const DUMMY_UP_NEXT_SET_CURRENT = 2;
const DUMMY_UP_NEXT_SET_TOTAL = 3;
const EXTEND_SECONDS = 30;

const RestTimerScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Local visual-only state so the `+ 30 sec` button has a noticeable effect
  // during preview. This is intentionally not connected to real timing logic.
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    DUMMY_INITIAL_SECONDS,
  );
  const [totalSeconds, setTotalSeconds] = useState<number>(
    DUMMY_TOTAL_SECONDS,
  );

  const handleExtend = useCallback(() => {
    setSecondsRemaining((current) => current + EXTEND_SECONDS);
    setTotalSeconds((current) =>
      Math.max(current, secondsRemaining + EXTEND_SECONDS),
    );
  }, [secondsRemaining]);

  const handleSkip = useCallback(() => {
    // UI-only phase: no navigation or workout-state mutation.
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0.18)", "rgba(10,10,10,0)"]}
        style={styles.topGlow}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + verticalScale(20),
            paddingBottom: insets.bottom + verticalScale(24),
          },
        ]}
      >
        <View style={styles.topSection}>
          <ExerciseProgressLabel
            current={DUMMY_EXERCISE_CURRENT}
            total={DUMMY_EXERCISE_TOTAL}
          />
          <Text style={styles.title}>{t("workout.restTimer.title")}</Text>
          <Text style={styles.subtitle}>
            {t("workout.restTimer.subtitle", { number: 2 })}
          </Text>
        </View>

        <View style={styles.timerSection}>
          <RestTimerCard
            secondsRemaining={secondsRemaining}
            totalSeconds={totalSeconds}
            onExtend={handleExtend}
          />
        </View>

        <View style={styles.bottomSection}>
          <UpNextCard
            exerciseName={DUMMY_UP_NEXT_EXERCISE}
            setInfo={t("workout.restTimer.upNextSetInfo", {
              current: DUMMY_UP_NEXT_SET_CURRENT,
              total: DUMMY_UP_NEXT_SET_TOTAL,
            })}
            onSkip={handleSkip}
          />
        </View>
      </View>
    </View>
  );
};

export default RestTimerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(18),
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.alpha.white72,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  timerSection: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  bottomSection: {
    paddingBottom: verticalScale(8),
  },
});
