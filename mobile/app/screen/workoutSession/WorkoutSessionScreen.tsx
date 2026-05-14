import WorkoutSessionHeader from "@/app/components/workoutSession/WorkoutSessionHeader";
import {
  useWorkoutSessionHeaderScroll,
  WORKOUT_SESSION_HEADER_EXPANDED_HEIGHT,
} from "@/app/components/workoutSession/useWorkoutSessionHeaderScroll";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
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
import { mapWorkoutSessionHeader } from "@/app/utils/workoutMappers";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const MAX_VISIBLE_SETS = 5;

const WorkoutSessionScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutSession">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const currentDayDetail = useSelector(selectCurrentDayDetail);
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const { scrollY, scrollHandler, scrollEventThrottle } = useWorkoutSessionHeaderScroll();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [extraSets, setExtraSets] = useState(0);
  const requestedDayId = route.params?.programDayId;
  const shouldLoadRequestedDay = Boolean(
    requestedDayId && currentDayDetail?.day.id !== requestedDayId,
  );
  const sessionView = useMemo(
    () =>
      currentDayDetail && !shouldLoadRequestedDay
        ? mapWorkoutSessionHeader(
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
  const totalSets = sessionView
    ? Math.min(sessionView.totalSets + extraSets, MAX_VISIBLE_SETS)
    : 1;
  const activeSet = Math.min(currentSet, totalSets);
  const isLoading =
    workoutStatus === "idle" ||
    workoutStatus === "loading" ||
    (shouldLoadRequestedDay && workoutStatus !== "failed");
  const statusText = isLoading
    ? t("workout.session.loading")
    : workoutError ?? t("workout.session.unableToLoad");

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
    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentSet(1);
    setExtraSets(0);
  }, [sessionView?.id]);

  const handleNextSet = useCallback(() => {
    if (!sessionView) {
      return;
    }

    if (activeSet < totalSets) {
      setCurrentSet((current) => Math.min(current + 1, totalSets));
      return;
    }

    if (totalSets < MAX_VISIBLE_SETS) {
      setExtraSets((current) => current + 1);
      setCurrentSet(totalSets + 1);
    }
  }, [activeSet, sessionView, totalSets]);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0.18)", "rgba(10,10,10,0)"]}
        style={styles.topGlow}
      />

      {sessionView ? (
        <WorkoutSessionHeader
          contextLabel={sessionView.contextLabel}
          currentExercise={sessionView.currentExercise}
          currentSet={activeSet}
          elapsedSeconds={elapsedSeconds}
          onBack={() => navigation.goBack()}
          onNextSet={handleNextSet}
          scrollY={scrollY}
          title={sessionView.exerciseName}
          totalExercises={sessionView.totalExercises}
          totalSets={totalSets}
        />
      ) : null}

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + WORKOUT_SESSION_HEADER_EXPANDED_HEIGHT + verticalScale(22),
            paddingBottom: insets.bottom + verticalScale(132),
          },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {sessionView ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.kicker}>{t("workout.session.inProgress")}</Text>
              <Text style={styles.dayTitle}>{sessionView.dayTitle}</Text>
              <Text numberOfLines={2} style={styles.workoutTitle}>
                {sessionView.workoutTitle}
              </Text>
            </View>

            <View style={styles.exercisePanel}>
              <View style={styles.panelMetaRow}>
                <Text numberOfLines={1} style={styles.panelMeta}>
                  {sessionView.contextLabel}
                </Text>
                {sessionView.weight ? (
                  <Text style={styles.weightText}>{sessionView.weight}</Text>
                ) : null}
              </View>
              <Text style={styles.exerciseName}>{sessionView.exerciseName}</Text>
              {sessionView.targetSummary ? (
                <Text style={styles.targetText}>{sessionView.targetSummary}</Text>
              ) : null}
              <View style={styles.currentSetCard}>
                <Text style={styles.blockLabel}>{t("workout.session.currentSet")}</Text>
                <Text style={styles.currentSetValue}>
                  {t("workout.session.setOfTotal", {
                    current: activeSet,
                    total: totalSets,
                  })}
                </Text>
              </View>
            </View>

            {sessionView.nextExerciseName ? (
              <View style={styles.nextPanel}>
                <Text style={styles.blockLabel}>{t("workout.session.upNext")}</Text>
                <Text style={styles.nextExercise}>{sessionView.nextExerciseName}</Text>
              </View>
            ) : null}

            <View style={styles.scrollSpacer} />
          </>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}
      </Animated.ScrollView>

      {sessionView ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.96)"]}
            locations={[0, 0.58]}
            style={styles.bottomFade}
          />
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <PrimaryButton
              disabled
              label={t("workout.session.loggingComingNext")}
              onPress={() => undefined}
            />
          </View>
        </>
      ) : null}
    </View>
  );
};

export default WorkoutSessionScreen;

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
    height: 220,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(18),
    gap: verticalScale(20),
  },
  hero: {
    gap: 8,
  },
  kicker: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.primary.dark,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  dayTitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white72,
    letterSpacing: 0.52,
    textTransform: "uppercase",
  },
  workoutTitle: {
    maxWidth: 300,
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
  },
  exercisePanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    backgroundColor: COLORS.neutral.black3,
    padding: 18,
    gap: 16,
  },
  panelMetaRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelMeta: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  exerciseName: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 34,
  },
  targetText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white72,
    lineHeight: 19,
    textTransform: "uppercase",
    letterSpacing: 0.32,
  },
  currentSetCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    backgroundColor: COLORS.alpha.white04,
    padding: 14,
    gap: 8,
  },
  blockLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.alpha.white72,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  currentSetValue: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  nextPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    padding: 16,
    gap: 8,
  },
  nextExercise: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  scrollSpacer: {
    height: verticalScale(280),
  },
  statusBox: {
    minHeight: verticalScale(320),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.alpha.white72,
    textAlign: "center",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 132,
  },
  footer: {
    position: "absolute",
    left: horizontalScale(18),
    right: horizontalScale(18),
    bottom: 0,
  },
});
