import EntitlementGate from "@/app/components/common/EntitlementGate";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSessionTimer } from "@/app/hooks/useSessionTimer";
import { useWallClockCountdown } from "@/app/hooks/useWallClockCountdown";
import EndWorkoutBottomSheet, { type EndWorkoutBottomSheetRef } from "@/app/components/workout/EndWorkoutBottomSheet";
import WorkoutLogHeader, {
  estimateWorkoutLogHeaderHeight,
} from "@/app/components/workout/WorkoutLogHeader";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

const RING_SIZE = 260;
const STROKE_WIDTH = 20;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const formatMmSs = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/* ─── Progress ring ─── */

const CountdownRing = ({
  progress,
  timeText,
}: {
  progress: SharedValue<number>;
  timeText: string;
}) => {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgGradient id="cTrack" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
            <Stop offset="0.5" stopColor={COLORS.primary.base} stopOpacity={0.15} />
            <Stop offset="1" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
          </SvgGradient>
          <SvgGradient id="cRing" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#FCF3C0" />
            <Stop offset="0.35" stopColor="#F7E06F" />
            <Stop offset="0.7" stopColor="#C9A84C" />
            <Stop offset="1" stopColor="#8B7332" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="url(#cTrack)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="url(#cRing)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={ringStyles.center}>
        <Text style={ringStyles.time}>{timeText}</Text>
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
    position: "absolute",
    alignItems: "center",
  },
  time: {
    fontFamily: FONTS.medium,
    fontSize: 56,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});

/* ─── Screen ─── */

const CardioTimerScreen = () => {
  const insets = useSafeAreaInsets();
  // Expanded height of the overlay header — seeded with the estimate so the
  // first frame lands close, then replaced by the real measurement on layout.
  const [headerHeight, setHeaderHeight] = useState(() =>
    estimateWorkoutLogHeaderHeight(insets.top, false),
  );
  const route = useRoute<RouteProp<HomeStackParamList, "CardioTimer">>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const {
    sessionWorkout,
    navigateToRest,
    navigateToSessionComplete,
    logCardioResult,
    completeExerciseResult,
  } = useWorkoutSession();

  const endWorkoutSheetRef = useRef<EndWorkoutBottomSheetRef>(null);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      endWorkoutSheetRef.current?.show();
    });
    return unsubscribe;
  }, [navigation]);

  const handleEndWorkout = useCallback(async () => {
    allowLeaveRef.current = true;
    await navigateToSessionComplete();
  }, [navigateToSessionComplete]);

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex,
    totalExercises,
    duration,
    idealTime,
    topTime,
  } = route.params;

  // Session timer (shared across all workout screens)
  const { formatted: sessionTimerText } = useSessionTimer();

  // Countdown — wall-clock backed so backgrounding the app doesn't freeze
  // the visible remaining (see useWallClockCountdown for the why).
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const animatedProgress = useSharedValue(1);
  const { remaining, reset: resetCountdown } = useWallClockCountdown({
    totalSeconds: duration,
    running,
    // When the 4-min run completes we just pause; the user still has to tap
    // "Complete Session" to log the duration, so no auto-navigation here.
    onComplete: () => setRunning(false),
  });

  useEffect(() => {
    const target = duration > 0 ? remaining / duration : 0;
    animatedProgress.value = withTiming(target, {
      duration: 900,
      easing: Easing.linear,
    });
  }, [remaining, duration, animatedProgress]);

  const handleStart = useCallback(() => setRunning(true), []);
  const handleStop = useCallback(() => setRunning(false), []);
  const handleCancel = useCallback(() => {
    setRunning(false);
    resetCountdown();
    animatedProgress.value = withTiming(1, { duration: 300 });
  }, [resetCountdown, animatedProgress]);

  // Scroll (for header collapse)
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          // The header is an overlay now, so the list has to reserve its
          // measured height plus the usual 16px breathing room.
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Stat cards */}
        {idealTime || topTime ? (
          <View style={styles.statsRow}>
            {idealTime ? (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{idealTime}</Text>
                <Text style={styles.statLabel}>
                  {t("workout.ui.idealSet")}
                </Text>
              </View>
            ) : null}
            <EntitlementGate requires="pro">
              {topTime ? (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{topTime}</Text>
                  <Text style={styles.statLabel}>
                    {t("workout.ui.topSet")}
                  </Text>
                </View>
              ) : null}
            </EntitlementGate>
          </View>
        ) : null}

        {/* Countdown ring */}
        <View style={styles.ringSection}>
          <CountdownRing
            progress={animatedProgress}
            timeText={formatMmSs(remaining)}
          />
        </View>

        {/* Cancel / Start buttons */}
        <View style={styles.controlsRow}>
          <PressableScale style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>{t("workout.ui.cancel")}</Text>
          </PressableScale>

          <PressableScale
            style={[styles.startBtn, running && styles.stopBtn]}
            onPress={running ? handleStop : handleStart}
          >
            <Text style={[styles.startBtnText, running && styles.stopBtnText]}>
              {running ? "Stop" : t("workout.ui.start")}
            </Text>
          </PressableScale>
        </View>
      </Animated.ScrollView>

      <WorkoutLogHeader
        exerciseName={exerciseName}
        exerciseCategory={exerciseCategory}
        exerciseIndex={exerciseIndex}
        totalExercises={totalExercises}
        timer={sessionTimerText}
        activeSet={0}
        sets={1}
        canAddSet={false}
        onAddSet={() => undefined}
        onBack={() => endWorkoutSheetRef.current?.show()}
        scrollY={scrollY}
        topInset={insets.top}
        showSets={false}
        onHeightChange={setHeaderHeight}
      />

      {/* Bottom fade */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]}
        locations={[0, 0.51]}
        style={styles.bottomFade}
      />

      {/* Complete Session button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <PressableScale
          style={styles.completeBtn}
          disabled={saving}
          onPress={async () => {
            if (saving) return;
            setSaving(true);
            try {
              const exIdx = exerciseIndex - 1;
              const actualDuration = duration - remaining;

              // Log cardio duration to session_sets + session_cardio_logs
              await logCardioResult(exIdx, actualDuration);
              await completeExerciseResult(exIdx);

              const nextIdx = exIdx + 1;
              const total = sessionWorkout?.exercises.length ?? 0;
              allowLeaveRef.current = true;
              if (nextIdx >= total) {
                navigateToSessionComplete();
              } else {
                navigateToRest(nextIdx, 1);
              }
              // Keep saving=true so spinner stays until screen unmounts on navigation
            } catch (e) {
              setSaving(false);
              throw e;
            }
          }}
        >
          <LinearGradient
            colors={[
              "rgba(201,168,76,0.6)",
              "rgba(247,224,111,0.6)",
              "rgba(252,243,192,0.6)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <GlassFill />
          {saving ? (
            <ActivityIndicator color={COLORS.neutral.white} />
          ) : (
            <Text style={styles.completeBtnText}>
              {t("workout.ui.completeSession")}
            </Text>
          )}
        </PressableScale>
      </View>

      <EndWorkoutBottomSheet
        ref={endWorkoutSheetRef}
        onEnd={handleEndWorkout}
      />
    </View>
  );
};

export default CardioTimerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 21.6,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  ringSection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  cancelBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 24,
    color: "rgba(240,240,240,0.6)",
  },
  startBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(201,168,76,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    backgroundColor: "rgba(140,60,60,0.4)",
  },
  startBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  stopBtnText: {
    color: "#E67777",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 121,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  completeBtn: {
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  completeBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
