import CompleteSetBar from "@/app/components/workout/CompleteSetBar";
import SetStatCards from "@/app/components/workout/SetStatCards";
import WorkoutLogHeader from "@/app/components/workout/WorkoutLogHeader";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { horizontalScale } from "@/app/utils/responsive";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

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
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex,
    totalExercises,
    setCount,
    idealTime,
    topTime,
  } = route.params;

  // Session timer
  const [sessionElapsed, setSessionElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSessionElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const sessionTimer = formatTime(sessionElapsed);

  // Set state
  const MAX_SETS = 5;
  const [activeSet] = useState(0);
  const [sets, setSets] = useState(setCount || 3);
  const canAddSet = sets < MAX_SETS;
  const handleAddSet = () => {
    if (canAddSet) setSets((s) => s + 1);
  };

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
        onBack={() => navigation.goBack()}
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
          onComplete={() => undefined}
          onNext={() => undefined}
          showNext
        />
      </View>
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
