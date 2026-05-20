import { ChevronBack } from "@/assets/icons";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useAnimatedProps,
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

/* ─── Circular progress ring ─── */

const ProgressRing = ({
  progress,
  seconds,
  label,
}: {
  progress: SharedValue<number>;
  seconds: number;
  label: string;
}) => {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <SvgGradient id="trackGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
            <Stop offset="0.5" stopColor={COLORS.primary.base} stopOpacity={0.15} />
            <Stop offset="1" stopColor={COLORS.primary.dark} stopOpacity={0.25} />
          </SvgGradient>
          <SvgGradient id="ringGrad" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#FCF3C0" />
            <Stop offset="0.35" stopColor="#F7E06F" />
            <Stop offset="0.7" stopColor="#C9A84C" />
            <Stop offset="1" stopColor="#8B7332" />
          </SvgGradient>
        </Defs>
        {/* Track — subtle gold gradient */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="url(#trackGrad)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress — animated */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="url(#ringGrad)"
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
        <Text style={ringStyles.time}>{seconds}</Text>
        <Text style={ringStyles.label}>{label}</Text>
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
    gap: 8,
  },
  time: {
    fontFamily: FONTS.medium,
    fontSize: 76,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});

/* ─── Screen ─── */

const RestTimerScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "RestTimer">>();
  const { t } = useTranslation();

  const {
    exerciseIndex, // 1-based
    totalExercises,
    currentSet,
    totalSets,
    nextExerciseName,
    restDuration,
  } = route.params;

  const exIdx = exerciseIndex - 1; // 0-based
  const { navigateToExercise } = useWorkoutSession();

  /** Skip rest / navigate to the exercise at the correct set */
  const goToExercise = useCallback(() => {
    navigateToExercise(exIdx, currentSet - 1); // currentSet is 1-based, convert to 0-based
  }, [exIdx, currentSet, navigateToExercise]);

  const [totalTime, setTotalTime] = useState(restDuration);
  const [remaining, setRemaining] = useState(restDuration);

  // Smooth animated progress via Reanimated
  const animatedProgress = useSharedValue(1);

  useEffect(() => {
    if (remaining <= 0) {
      goToExercise();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  // Animate the ring smoothly between ticks
  useEffect(() => {
    const target = totalTime > 0 ? remaining / totalTime : 0;
    animatedProgress.value = withTiming(target, {
      duration: 900,
      easing: Easing.linear,
    });
  }, [remaining, totalTime, animatedProgress]);

  const handleAdd30 = useCallback(() => {
    setTotalTime((t) => t + 30);
    setRemaining((r) => r + 30);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Exercise counter */}
      <Text style={styles.exerciseCounter}>
        {t("workout.ui.exerciseProgress", {
          current: exerciseIndex,
          total: totalExercises,
        })}
      </Text>

      {/* Center content */}
      <View style={styles.centerContent}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t("workout.ui.restTimer")}</Text>
          <Text style={styles.subtitle}>
            {t("workout.ui.setStartingIn", { number: currentSet })}
          </Text>
        </View>

        <ProgressRing
          progress={animatedProgress}
          seconds={remaining}
          label={t("workout.ui.seconds")}
        />

        <Pressable style={styles.addBtn} onPress={handleAdd30}>
          <Text style={styles.addBtnText}>{t("workout.ui.addSeconds")}</Text>
        </Pressable>
      </View>

      {/* Up Next card */}
      <View style={[styles.upNextCard, { marginBottom: insets.bottom + 16 }]}>
        <View style={styles.upNextContent}>
          <Text style={styles.upNextLabel}>{t("workout.ui.upNext")}</Text>
          <Text style={styles.upNextName}>{nextExerciseName}</Text>
          <Text style={styles.upNextSet}>
            {t("workout.ui.setProgress", {
              current: currentSet,
              total: totalSets,
            })}
          </Text>
        </View>
        <Pressable style={styles.upNextChevron} onPress={goToExercise}>
          <GlassFill scheme="light" />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(201,168,76,0.12)", "rgba(241,203,48,0.12)"]}
            style={StyleSheet.absoluteFill}
          />
          <ChevronBack
            width={20}
            height={20}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default RestTimerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
    paddingHorizontal: 24,
  },
  exerciseCounter: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16.8,
    color: COLORS.primary.dark,
    letterSpacing: 0.56,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 12,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  titleBlock: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 33.6,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 24,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
  },
  addBtn: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  upNextCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  upNextContent: {
    flex: 1,
    gap: 8,
  },
  upNextLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 18.2,
    color: "rgba(240,240,240,0.6)",
  },
  upNextName: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  upNextSet: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16.8,
    color: COLORS.primary.dark,
    letterSpacing: 0.56,
    textTransform: "uppercase",
  },
  upNextChevron: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
