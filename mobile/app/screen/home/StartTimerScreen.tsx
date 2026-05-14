import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  selectCurrentDayDetail,
  selectHasWorkoutBootstrap,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch } from "@/app/stores/store";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { mapWorkoutStartTimer } from "@/app/utils/workoutMappers";
import { StartTimerDumbbell } from "@/assets/images";
import { RouteProp, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const COUNTDOWN_STEPS = [3, 2, 1];

const StartTimerScreen = () => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const route = useRoute<RouteProp<HomeStackParamList, "StartTimer">>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const currentDayDetail = useSelector(selectCurrentDayDetail);
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const requestedDayId = route.params?.programDayId;
  const shouldLoadRequestedDay = Boolean(
    requestedDayId && currentDayDetail?.day.id !== requestedDayId,
  );
  const timerView = useMemo(
    () =>
      currentDayDetail && !shouldLoadRequestedDay
        ? mapWorkoutStartTimer(
          currentDayDetail,
          i18n.language,
          route.params?.programDayExerciseId,
        )
        : null,
    [
      currentDayDetail,
      i18n.language,
      route.params?.programDayExerciseId,
      shouldLoadRequestedDay,
    ],
  );
  const [countdown, setCountdown] = useState(3);
  const isLoading =
    workoutStatus === "idle" ||
    workoutStatus === "loading" ||
    (shouldLoadRequestedDay && workoutStatus !== "failed");
  const statusText = isLoading
    ? t("workout.ui.loadingWorkout")
    : workoutError ?? t("workout.ui.noExerciseToStart");
  const imageWidth = Math.min(width * 0.82, horizontalScale(316));
  const imageTop = Math.max(insets.top + verticalScale(168), height * 0.29);

  useEffect(() => {
    const shouldLoad = !hasWorkoutBootstrap || shouldLoadRequestedDay;
    const canLoad =
      workoutStatus === "idle" ||
      (shouldLoadRequestedDay && workoutStatus === "succeeded");

    if (shouldLoad && canLoad) {
      dispatch(loadWorkoutBootstrap({
        programId: route.params?.programId,
        programDayId: route.params?.programDayId,
      }));
    }
  }, [
    dispatch,
    hasWorkoutBootstrap,
    route.params?.programDayId,
    route.params?.programId,
    shouldLoadRequestedDay,
    workoutStatus,
  ]);

  useEffect(() => {
    setCountdown(3);
  }, [timerView?.id]);

  useEffect(() => {
    if (!timerView || countdown <= 1) {
      return;
    }

    const timeout = setTimeout(() => {
      setCountdown((current) => Math.max(current - 1, 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [countdown, timerView]);

  return (
    <View style={styles.root}>
      <Image
        accessibilityIgnoresInvertColors
        source={StartTimerDumbbell}
        style={[
          styles.dumbbellImage,
          {
            top: imageTop,
            width: imageWidth,
            height: imageWidth * 0.98,
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[COLORS.neutral.black, "rgba(0,0,0,0.28)", "rgba(0,0,0,0)"]}
        locations={[0, 0.62, 1]}
        style={styles.topShade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.82)", COLORS.neutral.black]}
        locations={[0, 0.58, 1]}
        style={styles.bottomShade}
      />

      {timerView ? (
        <View style={[styles.copyBlock, { bottom: insets.bottom + verticalScale(36) }]}>
          <Text style={styles.eyebrow}>
            {t("workout.ui.weekDayEyebrow", {
              day: timerView.dayLabel,
              week: timerView.weekNumber,
            })}
          </Text>
          <Text numberOfLines={2} style={styles.title}>
            {timerView.workoutTitle}
          </Text>
          <Text style={styles.countdownLine}>
            {t("workout.ui.exerciseStartingIn", {
              exercise: timerView.exerciseName,
            })}
            {COUNTDOWN_STEPS.map((step) => (
              <Text
                key={step}
                style={step === countdown ? styles.countdownActive : styles.countdownInactive}
              >
                {`  ${step}`}
              </Text>
            ))}
          </Text>
        </View>
      ) : (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      )}
    </View>
  );
};

export default StartTimerScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
    overflow: "hidden",
  },
  dumbbellImage: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 2,
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "46%",
  },
  copyBlock: {
    position: "absolute",
    left: horizontalScale(20),
    right: horizontalScale(20),
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    letterSpacing: 0.4,
    color: COLORS.primary.dark,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 34,
    color: COLORS.neutral.white,
  },
  countdownLine: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  countdownActive: {
    color: COLORS.neutral.white,
  },
  countdownInactive: {
    color: COLORS.alpha.white50,
  },
  statusBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.alpha.white72,
    textAlign: "center",
  },
});
