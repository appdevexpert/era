import CompleteSetBar from "@/app/components/workout/CompleteSetBar";
import ExerciseCompletedBottomSheet from "@/app/components/workout/ExerciseCompletedBottomSheet";
import WorkoutLogHeader from "@/app/components/workout/WorkoutLogHeader";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSessionTimer } from "@/app/hooks/useSessionTimer";
import BottomSheet from "@gorhom/bottom-sheet";
import { RouteProp, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const formatStopwatch = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
};

const TimerLogScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "TimerLog">>();
  const { t } = useTranslation();
  const {
    sessionWorkout,
    navigateToExercise,
    navigateToRest,
    navigateToSessionComplete,
    logSetResult,
    completeExerciseResult,
    addSet,
    getSetCount,
    getCompletedSetsForSheet,
  } = useWorkoutSession();

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex,
    totalExercises,
    setCount,
    currentSet: startSet = 0,
    idealTime,
    topTime,
  } = route.params;

  const exIdx = exerciseIndex - 1; // 0-based
  const exercises = sessionWorkout?.exercises ?? [];
  const total = exercises.length;
  const prevEx = exIdx > 0 ? exercises[exIdx - 1] : undefined;
  const nextEx = exIdx < total - 1 ? exercises[exIdx + 1] : undefined;

  // Session timer (shared across all workout screens)
  const { formatted: sessionTimer } = useSessionTimer();

  // Set state
  const MAX_SETS = 5;
  const [activeSet, setActiveSet] = useState(startSet);
  const sets = getSetCount(exIdx) || setCount || 3;
  const canAddSet = sets < MAX_SETS;
  const isLastSet = activeSet >= sets - 1;
  const handleAddSet = useCallback(async () => {
    if (!canAddSet) return;
    await addSet(exIdx);
  }, [canAddSet, addSet, exIdx]);

  // Stopwatch
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStopwatch = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setStopwatchMs((ms) => ms + 10);
    }, 10);
  }, []);

  const stopStopwatch = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetStopwatch = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStopwatchMs(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Exercise completed bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const lastSetLogged = useRef(false);

  /** Complete Set (not last) → log duration + rest timer */
  const handleCompleteSet = useCallback(() => {
    const durationSec = Math.floor(stopwatchMs / 1000);
    logSetResult(exIdx, activeSet, null, null, null, durationSec);
    resetStopwatch();
    navigateToRest(exIdx, activeSet + 2);
    setActiveSet((s) => s + 1);
  }, [stopwatchMs, activeSet, exIdx, logSetResult, resetStopwatch, navigateToRest]);

  /** Complete Exercise (last set) → log once + show bottom sheet */
  const handleCompleteExercise = useCallback(() => {
    if (lastSetLogged.current) {
      sheetRef.current?.expand();
      return;
    }
    lastSetLogged.current = true;
    const durationSec = Math.floor(stopwatchMs / 1000);
    logSetResult(exIdx, activeSet, null, null, null, durationSec);
    resetStopwatch();
    sheetRef.current?.expand();
  }, [stopwatchMs, activeSet, exIdx, logSetResult, resetStopwatch]);

  /** Sheet "Continue" → complete exercise + move to next or session complete */
  const handleSheetContinue = useCallback(
    (_comment: string) => {
      sheetRef.current?.close();
      completeExerciseResult(exIdx, _comment);

      const nextIdx = exIdx + 1;
      if (nextIdx >= total) {
        navigateToSessionComplete();
        return;
      }
      navigateToRest(nextIdx, 1);
    },
    [exIdx, total, completeExerciseResult, navigateToRest, navigateToSessionComplete],
  );

  /** Navigate to a specific exercise by 0-based index */
  const goToExercise = useCallback(
    (idx: number, direction: "forward" | "back" = "forward") => navigateToExercise(idx, 0, direction),
    [navigateToExercise],
  );

  // Scroll
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <View style={styles.root}>
      <WorkoutLogHeader
        exerciseName={exerciseName}
        exerciseCategory={exerciseCategory}
        exerciseIndex={exerciseIndex}
        totalExercises={totalExercises}
        timer={sessionTimer}
        activeSet={activeSet}
        sets={sets}
        canAddSet={canAddSet}
        onAddSet={handleAddSet}
        onBack={() => {
          Alert.alert(
            t("workout.ui.quitTitle"),
            t("workout.ui.quitMessage"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("workout.ui.quitConfirm"),
                style: "destructive",
                onPress: () => {
                  navigateToSessionComplete();
                },
              },
            ],
          );
        }}
        scrollY={scrollY}
        topInset={insets.top}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
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
            {topTime ? (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{topTime}</Text>
                <Text style={styles.statLabel}>
                  {t("workout.ui.topSet")}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Stopwatch display */}
        <View style={styles.stopwatchSection}>
          <Text style={styles.stopwatchText}>
            {formatStopwatch(stopwatchMs)}
          </Text>
        </View>

        {/* Start / Reset buttons */}
        <View style={styles.controlsRow}>
          <Pressable style={styles.resetBtn} onPress={resetStopwatch}>
            <Text style={styles.resetBtnText}>{t("workout.ui.reset")}</Text>
          </Pressable>

          <Pressable
            style={[styles.startBtn, running && styles.stopBtn]}
            onPress={running ? stopStopwatch : startStopwatch}
          >
            <Text style={[styles.startBtnText, running && styles.stopBtnText]}>
              {running ? "Stop" : t("workout.ui.start")}
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>

      {/* Bottom fade */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]}
        locations={[0, 0.51]}
        style={styles.bottomFade}
      />

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <CompleteSetBar
          onComplete={isLastSet ? handleCompleteExercise : handleCompleteSet}
          onNext={nextEx ? () => goToExercise(exIdx + 1, "forward") : undefined}
          onPrevious={prevEx ? () => goToExercise(exIdx - 1, "back") : undefined}
          showNext={!!nextEx}
          showPrevious={!!prevEx}
          isLastSet={isLastSet}
        />
      </View>

      <ExerciseCompletedBottomSheet
        ref={sheetRef}
        sets={getCompletedSetsForSheet(exIdx)}
        onContinue={handleSheetContinue}
      />
    </View>
  );
};

export default TimerLogScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  stopwatchSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  stopwatchText: {
    fontFamily: FONTS.light,
    fontSize: 80,
    fontWeight: "100",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.8,
    width: "100%",
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  resetBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
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
  stopBtnText: {
    color: "#E67777",
  },
  startBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 24,
    color: COLORS.neutral.white,
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
});
