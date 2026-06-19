import PrimaryButton from "@/app/components/common/PrimaryButton";
import ExerciseListScreenSkeleton, {
  ExerciseSectionsSkeleton,
} from "@/app/components/skeleton/ExerciseListScreenSkeleton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { DayStatus, HomeStackParamList } from "@/app/navigation/types";
import {
  selectCurrentDayDetail,
  selectHasWorkoutBootstrap,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import type {
  CompletedExerciseView,
  CompletedSessionDetail,
  CompletedSetView,
  ExerciseListExerciseView,
  ExerciseListSectionView,
} from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { computeDateForDay, getToday } from "@/app/utils/programSchedule";
import { getWeekdayLabel, mapExerciseList } from "@/app/utils/workoutMappers";
import {
  getCompletedSessionDetail,
  getDaySessionSummary,
  type DaySessionSummary,
} from "@/app/services/sessionService";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "@/assets/icons";

const ReorderIcon = () => (
  <View style={styles.reorderIcon}>
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
  </View>
);

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({
  title,
  showEdit = false,
}: {
  title: string;
  showEdit?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
      {showEdit ? (
        <Pressable hitSlop={8} style={styles.editButton}>
          <Text style={styles.editText}>{t("workout.ui.edit")}</Text>
          <Text style={styles.editChevron}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

/* ─── Missed banner ─── */

const MissedBanner = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.missedBanner}>
      <Text style={styles.missedBannerText}>{t("workout.ui.noWorkoutLogged")}</Text>
    </View>
  );
};

/* ─── Exercise row variants ─── */

const ExerciseRow = ({
  exercise,
  mode,
}: {
  exercise: ExerciseListExerciseView;
  mode: DayStatus;
}) => {
  const { t } = useTranslation();
  const showWeight = mode === "active" || mode === "future";
  const showHandle = exercise.showHandle && mode === "active";

  return (
    <View style={styles.exerciseRow}>
      {showHandle ? <ReorderIcon /> : null}
      <View style={styles.exerciseCopy}>
        <Text numberOfLines={1} style={styles.exerciseName}>
          {exercise.name}
        </Text>
        <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
      </View>
      {showWeight && exercise.weight ? (
        <View style={styles.weightBlock}>
          <Text style={styles.weightLabel}>{t("workout.ui.initialWeight")}</Text>
          <Text style={styles.weightValue}>{exercise.weight}</Text>
        </View>
      ) : null}
    </View>
  );
};

/* ─── Completed exercise row (with logged set chips + chevron) ─── */

const formatSetChip = (set: CompletedSetView): string => {
  if (set.weight != null) return `${set.weight}${set.weightUnit} X ${set.reps ?? 0}`;
  if (set.duration != null) return `${set.duration} SEC`;
  return `BW X ${set.reps ?? 0}`;
};

const CompletedExerciseRow = ({
  exercise,
  onPress,
}: {
  exercise: CompletedExerciseView;
  onPress: () => void;
}) => (
  <PressableScale style={styles.exerciseRow} onPress={onPress}>
    <View style={[styles.exerciseCopy, { flex: 1 }]}>
      <Text numberOfLines={1} style={styles.exerciseName}>
        {exercise.name}
      </Text>
      <View style={styles.setChipsRow}>
        {exercise.sets.map((set) => (
          <View key={set.setNumber} style={styles.setChip}>
            <Text style={styles.setChipText}>{formatSetChip(set)}</Text>
          </View>
        ))}
      </View>
    </View>
    <ChevronRight width={16} height={16} color="#F0F0F0" />
  </PressableScale>
);

const SkippedExerciseRow = ({
  exercise,
}: {
  exercise: ExerciseListExerciseView;
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.exerciseRow}>
      <View style={[styles.exerciseCopy, { flex: 1 }]}>
        <Text numberOfLines={1} style={styles.exerciseName}>
          {exercise.name}
        </Text>
        <View style={styles.setChipsRow}>
          <View style={styles.skippedChip}>
            <Text style={styles.skippedChipText}>{t("workout.ui.skipped")}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const ExerciseSection = ({
  section,
  mode,
}: {
  section: ExerciseListSectionView;
  mode: DayStatus;
}) => (
  <View style={styles.section}>
    <SectionHeader title={section.title} />
    <View style={styles.exerciseList}>
      {section.exercises.map((exercise, index) => (
        <View key={exercise.id}>
          <ExerciseRow exercise={exercise} mode={mode} />
          {index < section.exercises.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  </View>
);

const ExerciseListScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "ExerciseList">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const user = useSelector(selectUser);
  const currentDayDetail = useSelector(selectCurrentDayDetail);
  const programStartDate = useSelector(
    (state: RootState) => state.auth.programStartDate,
  );
  const workout = useMemo(
    () => (currentDayDetail ? mapExerciseList(currentDayDetail, i18n.language) : null),
    [currentDayDetail, i18n.language],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const requestedDayId = route.params?.programDayId;
  const dayStatus: DayStatus = route.params?.dayStatus ?? "active";
  const shouldLoadRequestedDay = Boolean(
    requestedDayId && currentDayDetail?.day.id !== requestedDayId,
  );

  // Completed session data (fetched for "completed" mode)
  const [completedSession, setCompletedSession] = useState<CompletedSessionDetail | null>(null);
  const [completedLoading, setCompletedLoading] = useState(dayStatus === "completed");
  const completedFetchedRef = useRef(false);

  // Session progress summary — drives the bottom button's label & behavior
  // (Start Now → Resume Workout → Start Again). `null` until the first fetch
  // resolves; the loaded flag distinguishes "no session" from "still loading".
  const [sessionSummary, setSessionSummary] = useState<DaySessionSummary | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // Today's day allows Start Again even after the day flips to "completed";
  // past completed days stay locked (no restart). Compute the day's calendar
  // date from the program-start anchor and compare with today.
  const isTodayDay = useMemo(() => {
    if (!currentDayDetail || !programStartDate) return false;
    const date = computeDateForDay(
      { programStartDate, totalWeeks: 12 },
      currentDayDetail.week.week_number,
      currentDayDetail.day.day_number,
      false,
    );
    return date === getToday();
  }, [currentDayDetail, programStartDate]);

  // Derive the button mode from the summary + planned exercise count.
  // "all complete" is gated on the count of exercises whose session_exercises
  // row is status='completed' — workout_sessions.status being 'completed' is
  // NOT enough, because the user can End Workout with exercises still skipped.
  // In that case we want Resume so they can finish the skipped ones.
  const totalPlanned = workout?.sections.reduce(
    (acc, s) => acc + s.exercises.length,
    0,
  ) ?? 0;
  const allComplete =
    sessionSummary != null &&
    totalPlanned > 0 &&
    sessionSummary.completedExercises >= totalPlanned;
  const buttonMode: "start" | "resume" | "again" = !sessionSummary
    ? "start"
    : allComplete
      ? "again"
      : "resume";
  const buttonLabel =
    buttonMode === "start"
      ? t("workout.ui.startNow")
      : buttonMode === "resume"
        ? t("workout.ui.resumeWorkout")
        : t("workout.ui.startAgain");

  const findExerciseIndexByDayExerciseId = useCallback(
    (programDayExerciseId: string): number => {
      if (!workout) return 0;
      let idx = 0;
      for (const section of workout.sections) {
        for (const ex of section.exercises) {
          if (ex.id === programDayExerciseId) return idx;
          idx += 1;
        }
      }
      return 0;
    },
    [workout],
  );

  const handlePrimaryAction = useCallback(() => {
    if (!workout || !currentDayDetail) return;

    const firstExercise = workout.sections
      .flatMap((s) => s.exercises)
      .find((e) => e.name);
    const weekLabel = t("workout.ui.weekLabel", {
      number: currentDayDetail.week.week_number ?? 1,
    });
    const dayLabel = getWeekdayLabel(currentDayDetail.day.weekday ?? null, i18n.language);

    const startIdx =
      buttonMode === "resume" && sessionSummary?.firstIncompleteProgramDayExerciseId
        ? findExerciseIndexByDayExerciseId(
            sessionSummary.firstIncompleteProgramDayExerciseId,
          )
        : 0;

    const mode: "fresh" | "resume" | "edit" =
      buttonMode === "start" ? "fresh" : buttonMode === "resume" ? "resume" : "edit";

    navigation.navigate("WorkoutCountdown", {
      weekLabel,
      dayLabel,
      dayTitle: workout.title,
      firstExerciseName: firstExercise?.name ?? "",
      mode,
      startExerciseIndex: startIdx,
    });
  }, [
    buttonMode,
    sessionSummary,
    workout,
    currentDayDetail,
    findExerciseIndexByDayExerciseId,
    navigation,
    t,
    i18n.language,
  ]);

  const handleExercisePress = useCallback(
    (exercise: CompletedExerciseView) => {
      navigation.navigate("ExerciseDetail", {
        title: exercise.name,
        subtitle: route.params?.subtitle ?? "",
        exerciseData: JSON.stringify(exercise),
        sessionDurationMinutes: completedSession?.durationMinutes,
      });
    },
    [navigation, route.params?.subtitle, completedSession?.durationMinutes],
  );

  const isLoading =
    workoutStatus === "idle" ||
    workoutStatus === "loading" ||
    (shouldLoadRequestedDay && workoutStatus !== "failed");
  const errorMessage = workoutError ?? t("workout.ui.unableToLoadWorkout");

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

  // Refetch the session summary every time this screen comes into focus
  // (covers: cold start, return from WorkoutLog gesture-back, return from
  // SessionComplete). Only relevant for the active/in-progress flow — when
  // the route was opened explicitly with dayStatus="completed" or "missed",
  // the summary doesn't change the button rendering.
  const summaryProgramDayId = currentDayDetail?.day.id ?? requestedDayId;
  const summaryEnabled =
    dayStatus === "active" || (dayStatus === "completed" && isTodayDay);
  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !summaryProgramDayId || !summaryEnabled) return;
      let cancelled = false;
      setSummaryLoaded(false);
      getDaySessionSummary({ userId: user.id, programDayId: summaryProgramDayId })
        .then((summary) => {
          if (cancelled) return;
          setSessionSummary(summary);
        })
        .catch((err) => {
          console.warn("[ExerciseList] getDaySessionSummary failed", err);
        })
        .finally(() => {
          if (!cancelled) setSummaryLoaded(true);
        });
      return () => {
        cancelled = true;
      };
    }, [user?.id, summaryProgramDayId, summaryEnabled]),
  );

  // Fetch completed session data when in completed mode
  useEffect(() => {
    if (dayStatus === "completed" && requestedDayId && user?.id && !completedFetchedRef.current) {
      completedFetchedRef.current = true;
      setCompletedLoading(true);
      getCompletedSessionDetail(user.id, requestedDayId)
        .then((result) => {
          if (!result) {
            console.warn("[ExerciseList] No completed session found in Supabase for dayId:", requestedDayId, "userId:", user.id);
          }
          setCompletedSession(result);
        })
        .catch((err) => {
          console.error("[ExerciseList] Failed to fetch completed session:", err);
        })
        .finally(() => setCompletedLoading(false));
    }
  }, [dayStatus, requestedDayId, user?.id]);

  const showStartButton =
    dayStatus === "active" || (dayStatus === "completed" && isTodayDay);
  const showStatsRow = dayStatus !== "missed";
  const dataReady = workout && !shouldLoadRequestedDay;

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.topFade} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(130),
            paddingBottom: insets.bottom + verticalScale(showStartButton ? 132 : 40),
          },
        ]}
      >
        {dataReady ? (
          <>
            {/* Missed banner */}
            {dayStatus === "missed" ? <MissedBanner /> : null}

            {/* Stats row */}
            {showStatsRow ? (
              <View style={styles.statsRow}>
                <StatCard value={String(workout.exerciseCount)} label={t("workout.ui.exercisesLabel")} />
                <StatCard
                  value={String(
                    dayStatus === "completed" && completedSession
                      ? completedSession.durationMinutes
                      : workout.estimatedMinutes,
                  )}
                  label={t("workout.ui.minutesLabel")}
                />
              </View>
            ) : null}

            {/* Completed mode: show sections with logged set chips */}
            {dayStatus === "completed" && completedSession ? (
              workout.sections.map((section) => {
                // Match completed exercises to this section's planned exercises
                const completedByName = new Map(
                  completedSession.exercises.map((e) => [e.name, e]),
                );
                return (
                  <View key={section.id} style={styles.section}>
                    <SectionHeader title={section.title} />
                    <View style={styles.exerciseList}>
                      {section.exercises.map((planned, index) => {
                        const completed = completedByName.get(planned.name);
                        if (completed && completed.sets.length > 0) {
                          return (
                            <View key={planned.id}>
                              <CompletedExerciseRow
                                exercise={completed}
                                onPress={() => handleExercisePress(completed)}
                              />
                              {index < section.exercises.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                          );
                        }
                        return (
                          <View key={planned.id}>
                            <SkippedExerciseRow exercise={planned} />
                            {index < section.exercises.length - 1 ? <View style={styles.divider} /> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : dayStatus === "completed" && completedLoading ? (
              // Inner loading: View-button flow fetches the completed session.
              // Stats row is already rendered above, so we only skeleton the
              // section list here, not the full page.
              <ExerciseSectionsSkeleton />
            ) : null}

            {/* Non-completed modes: show planned exercise sections */}
            {dayStatus !== "completed"
              ? workout.sections.map((section) => (
                  <ExerciseSection key={section.id} section={section} mode={dayStatus} />
                ))
              : null}

            {/* Completed mode fallback: no session data — treat all as skipped */}
            {dayStatus === "completed" && !completedSession && !completedLoading
              ? workout.sections.map((section) => (
                  <View key={section.id} style={styles.section}>
                    <SectionHeader title={section.title} />
                    <View style={styles.exerciseList}>
                      {section.exercises.map((planned, index) => (
                        <View key={planned.id}>
                          <SkippedExerciseRow exercise={planned} />
                          {index < section.exercises.length - 1 ? <View style={styles.divider} /> : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              : null}
          </>
        ) : isLoading ? (
          <ExerciseListScreenSkeleton showHandle={dayStatus === "active"} />
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      {showStartButton && dataReady && summaryLoaded ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.92)"]}
            locations={[0, 0.58]}
            style={styles.bottomFade}
          />
          <View style={[styles.buttonWrap, { paddingBottom: insets.bottom + 12 }]}>
            <PrimaryButton label={buttonLabel} onPress={handlePrimaryAction} />
          </View>
        </>
      ) : null}
    </View>
  );
};

export default ExerciseListScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 121,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(16),
    gap: verticalScale(24),
  },

  /* Missed banner */
  missedBanner: {
    backgroundColor: "rgba(230,119,119,0.16)",
    borderWidth: 1,
    borderColor: "#E67777",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  missedBannerText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: "#F0F0F0",
    lineHeight: 19.2,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.neutral.black3,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  /* Sections */
  section: {
    gap: 18,
  },
  sectionHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 20.4,
    color: COLORS.neutral.white,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    backgroundColor: COLORS.neutral.black2,
  },
  editText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    letterSpacing: 0.48,
  },
  editChevron: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    lineHeight: 18,
    color: "rgba(240,240,240,0.8)",
  },

  /* Exercises */
  exerciseList: {
    width: "100%",
    gap: 12,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reorderIcon: {
    width: 24,
    height: 24,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 3,
  },
  reorderLine: {
    width: 12,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: "rgba(240,240,240,0.65)",
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    paddingVertical: 12,
  },
  exerciseName: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  exercisePrescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },
  weightLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    textAlign: "right",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "right",
  },

  /* Set chips (completed mode) */
  setChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setChip: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  setChipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  skippedChip: {
    backgroundColor: "rgba(230,119,119,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  skippedChipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: "#E67777",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },
  statusBox: {
    minHeight: verticalScale(260),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(240,240,240,0.72)",
    textAlign: "center",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 121,
  },
  buttonWrap: {
    position: "absolute",
    left: horizontalScale(18),
    right: horizontalScale(18),
    bottom: 0,
  },
});
