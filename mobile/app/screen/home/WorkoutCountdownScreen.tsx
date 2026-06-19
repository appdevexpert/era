import { WorkoutCountdownBg } from "@/assets/images";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useWallClockCountdown } from "@/app/hooks/useWallClockCountdown";
import EndWorkoutBottomSheet, { type EndWorkoutBottomSheetRef } from "@/app/components/workout/EndWorkoutBottomSheet";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Reanimated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const COUNTDOWN_SECONDS = 3;

const RING_SIZE = 92;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const CountdownRing = ({ value }: { value: number }) => {
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(0, {
      duration: COUNTDOWN_SECONDS * 1000,
      easing: Easing.linear,
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgGradient id="countdownRingTrack" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
            <Stop offset="0.5" stopColor={COLORS.primary.base} stopOpacity={0.15} />
            <Stop offset="1" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
          </SvgGradient>
          <SvgGradient id="countdownRingProgress" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={COLORS.primary.light} />
            <Stop offset="0.35" stopColor={COLORS.primary.base} />
            <Stop offset="0.7" stopColor={COLORS.primary.dark} />
            <Stop offset="1" stopColor="#8B7332" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="url(#countdownRingTrack)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="url(#countdownRingProgress)"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={ringStyles.center} pointerEvents="none">
        <Text style={ringStyles.number}>{value}</Text>
      </View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    fontFamily: FONTS.medium,
    fontSize: 36,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 43,
  },
});

const WorkoutCountdownScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutCountdown">>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { ready, startSession, navigateToExercise, navigateToSessionComplete } = useWorkoutSession();

  const {
    weekLabel,
    dayLabel,
    dayTitle,
    firstExerciseName,
    mode = "fresh",
    startExerciseIndex = 0,
  } = route.params;

  const { remaining: countdown } = useWallClockCountdown({
    totalSeconds: COUNTDOWN_SECONDS,
    running: true,
  });
  const hasStarted = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const endWorkoutSheetRef = useRef<EndWorkoutBottomSheetRef>(null);
  const allowLeaveRef = useRef(false);

  // Once the user is past the 3-2-1 ramp, a session exists (fresh insert or
  // resumed/edit-mode load). Backing out now should trigger the End Workout
  // sheet so the user can decide whether to wrap up or keep going.
  // During the ramp itself (no session yet) we just let the back-press
  // pop the screen — nothing to "end" yet.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;
      if (!hasStarted.current) return;
      e.preventDefault();
      endWorkoutSheetRef.current?.show();
    });
    return unsubscribe;
  }, [navigation]);

  const handleEndWorkout = useCallback(async () => {
    allowLeaveRef.current = true;
    await navigateToSessionComplete();
  }, [navigateToSessionComplete]);

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

  // After the 3-2-1 ramp finishes AND the bootstrap is ready, kick off the
  // real session start. Both gates have to be true — if the user has a slow
  // network we hold here until `ready` flips, instead of racing it.
  useEffect(() => {
    if (countdown > 0) return;
    if (!ready || hasStarted.current) return;
    hasStarted.current = true;
    void (async () => {
      await startSession({ editMode: mode === "edit" });
      // The replace below would otherwise be intercepted by the beforeRemove
      // listener that was just armed by hasStarted=true.
      allowLeaveRef.current = true;
      navigateToExercise(startExerciseIndex);
    })();
  }, [countdown, ready, startSession, navigateToExercise, mode, startExerciseIndex]);

  const displayNumber = countdown > 0 ? countdown : 1;

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
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>
            {weekLabel} {"•"} {dayLabel}
          </Text>
          <Text style={styles.title}>{dayTitle}</Text>
          <Text style={styles.startingIn}>
            {t("workout.ui.startingIn", { exercise: firstExerciseName })}
          </Text>
        </View>
        <CountdownRing value={displayNumber} />
      </Animated.View>

      <EndWorkoutBottomSheet
        ref={endWorkoutSheetRef}
        onEnd={handleEndWorkout}
      />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  textColumn: {
    flex: 1,
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
  startingIn: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
});
