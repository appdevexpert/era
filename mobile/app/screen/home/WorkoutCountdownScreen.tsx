import { WorkoutCountdownBg } from "@/assets/images";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COUNTDOWN_SECONDS = 3;

const CountdownNumber = ({
  value,
  isActive,
}: {
  value: number;
  isActive: boolean;
}) => (
  <Text style={[styles.countNumber, !isActive && styles.countNumberDimmed]}>
    {value}
  </Text>
);

const WorkoutCountdownScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutCountdown">>();
  const { t } = useTranslation();
  const { ready, startSession, navigateToExercise } = useWorkoutSession();

  const { weekLabel, dayLabel, dayTitle, firstExerciseName } = route.params;

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const hasStarted = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startFadeIn = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    startFadeIn();
  }, [startFadeIn]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    // Countdown finished — start session and navigate to first exercise (once)
    if (ready && !hasStarted.current) {
      hasStarted.current = true;
      void (async () => {
        await startSession();
        navigateToExercise(0);
      })();
    }
  }, [countdown, ready, startSession, navigateToExercise]);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={WorkoutCountdownBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
        locations={[0.45, 0.85]}
        style={styles.bottomGradient}
      />

      <Animated.View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + verticalScale(24), opacity: fadeAnim },
        ]}
      >
        <Text style={styles.eyebrow}>
          {weekLabel} {"\u2022"} {dayLabel}
        </Text>

        <Text style={styles.title}>{dayTitle}</Text>

        <View style={styles.countdownRow}>
          <Text style={styles.startingIn}>
            {t("workout.ui.startingIn", { exercise: firstExerciseName })}
          </Text>
          {[3, 2, 1].map((num) => (
            <CountdownNumber
              key={num}
              value={num}
              isActive={countdown >= num}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export default WorkoutCountdownScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  content: {
    position: "absolute",
    left: horizontalScale(24),
    right: horizontalScale(24),
    bottom: 0,
    gap: 8,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: "500",
    lineHeight: 38.4,
    color: COLORS.neutral.white,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startingIn: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  countNumber: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 21.6,
    color: COLORS.neutral.white,
  },
  countNumberDimmed: {
    color: "rgba(240, 240, 240, 0.2)",
  },
});
