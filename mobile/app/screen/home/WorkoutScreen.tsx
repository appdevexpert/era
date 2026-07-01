import ProfileAvatar from "@/app/components/common/ProfileAvatar";
import StatsChipsRow from "@/app/components/workout/StatsChipsRow";
import StreakBottomSheet from "@/app/components/workout/StreakBottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import WeekDaySelector from "@/app/components/workout/WeekDaySelector";
import WorkoutCard from "@/app/components/workout/WorkoutCard";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList, MuscleGroup } from "@/app/navigation/types";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import {
  selectCurrentStreak,
  selectRewardStatus,
  selectTotalPoints,
  selectWeekByDate,
} from "@/app/stores/selectors/rewardSelectors";
import { loadRewardBootstrap } from "@/app/stores/slice/rewardSlice";
import {
  selectHasWorkoutBootstrap,
  selectWorkoutOverview,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import {
  selectExercisesCompleted,
  selectSessionProgramDayId,
} from "@/app/stores/selectors/sessionSelectors";
import {
  loadWorkoutBootstrap,
  refreshTodayIfStale,
} from "@/app/stores/slice/workoutSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { mapMusclesToIcons, mapWorkoutHome } from "@/app/utils/workoutMappers";
import { getToday } from "@/app/utils/programSchedule";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCycleCompletionTrigger } from "@/app/hooks/useCycleCompletionTrigger";

const WorkoutScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const streakRef = useRef<BottomSheetModal>(null);
  const handleStreakPress = useCallback(() => streakRef.current?.present(), []);
  const user = useSelector(selectUser);
  const overview = useSelector(selectWorkoutOverview);
  const programStartDate = useSelector((state: RootState) => state.auth.programStartDate);
  const completedDayIds = useSelector((state: RootState) => state.workout.completedDayIds);
  const completedDayDurations = useSelector(
    (state: RootState) => state.workout.completedDayDurations,
  );
  // Per-day cache feeds mapWorkoutHome the resolved day's real exercise count
  // (overview.currentDayExerciseCount is pinned to Day 1 at bootstrap and goes
  // stale the moment "today" rolls past it).
  const dayDetailsById = useSelector(
    (state: RootState) => state.workout.dayDetailsById,
  );
  // Tracks local calendar date so the workout memo + `currentDayDetail` re-anchor
  // when the user crosses midnight (or changes timezone) without backgrounding
  // the app. Without this, mapWorkoutHome's `getToday()` call is captured inside
  // a memo whose deps never change on a rollover and the home card keeps
  // resolving yesterday's program_day_id.
  const [todayStr, setTodayStr] = useState(getToday());
  useFocusEffect(
    useCallback(() => {
      const now = getToday();
      if (now !== todayStr) setTodayStr(now);
      dispatch(refreshTodayIfStale());
    }, [dispatch, todayStr]),
  );
  const workout = useMemo(
    () => {
      // `todayStr` is read indirectly via mapWorkoutHome → getToday(); listing
      // it in deps forces recompute on calendar/timezone rollover even though
      // ESLint can't trace the read through the helper.
      void todayStr;
      return overview
        ? mapWorkoutHome(
            overview,
            i18n.language,
            programStartDate,
            completedDayIds,
            completedDayDurations,
            dayDetailsById,
          )
        : null;
    },
    [
      i18n.language,
      overview,
      programStartDate,
      completedDayIds,
      completedDayDurations,
      dayDetailsById,
      todayStr,
    ],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);

  // Drive the strength ring on the WorkoutCard. Layered signals:
  //   1. Today's day completed → full ring (celebration state).
  //   2. Active session for today → live exercises-completed fraction.
  //   3. Program-level baseline: completed days across the whole program /
  //      total program days. Keeps a small fill visible whenever the week is
  //      active, so a fresh open mid-program still shows progress.
  // The session and baseline signals are combined with max() so the ring never
  // moves backward when starting a new session.
  const sessionProgramDayId = useSelector(selectSessionProgramDayId);
  const sessionExercisesCompleted = useSelector(selectExercisesCompleted);
  const workoutProgress = useMemo(() => {
    if (!workout || !overview) return 0;
    if (workout.isCompleted) return 1;

    const totalDays = overview.program.duration_weeks * 7;
    const programBase = totalDays > 0 ? completedDayIds.length / totalDays : 0;

    if (
      sessionProgramDayId &&
      sessionProgramDayId === workout.currentDayId &&
      workout.exerciseCount > 0
    ) {
      const sessionFrac = sessionExercisesCompleted / workout.exerciseCount;
      return Math.min(1, Math.max(programBase, sessionFrac));
    }
    return Math.min(1, programBase);
  }, [
    workout,
    overview,
    sessionProgramDayId,
    sessionExercisesCompleted,
    completedDayIds,
  ]);
  const displayName = user?.name || user?.email?.split("@")[0] || t("profile.fallbackName");
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const isLoading = workoutStatus === "idle" || workoutStatus === "loading";
  const errorMessage = workoutError ?? t("workout.ui.unableToLoadWorkout");

  // Reward state — read from the dedicated slice. Not persisted, so we
  // hydrate it from this screen on cold open (see useEffect below).
  const totalPoints = useSelector(selectTotalPoints);
  const currentStreak = useSelector(selectCurrentStreak);
  const weekByDate = useSelector(selectWeekByDate);
  const rewardStatus = useSelector(selectRewardStatus);

  // Build the streak bottom-sheet day pills for the last 7 days, anchored on today.
  const streakSheetDays = useMemo(() => {
    const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    // Step back to the most recent Monday (ISO weekday 1=Mon, 7=Sun)
    const isoDow = ((today.getDay() + 6) % 7) + 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - (isoDow - 1));

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const status = weekByDate[iso];
      const isToday = iso === todayIso;
      return {
        key: iso,
        label: WEEKDAY[i] ?? "",
        date: String(d.getDate()).padStart(2, "0"),
        title: "",
        subtitle: "",
        muscles: [] as MuscleGroup[],
        active: isToday,
        completed: status === "completed",
        missed: !isToday && status === "missed",
      };
    });
  }, [weekByDate]);

  // Stat cards inside the streak sheet mirror today's workout — read the raw
  // minutes off the same mapped view-model the golden card renders, so the
  // two numbers can never drift (estimated vs actual, calendar rollover, etc.).
  const streakSheetExercises = workout?.exerciseCount ?? 0;
  const streakSheetMinutes = workout?.durationMinutes ?? 0;
  const streakSheetPoints = totalPoints;

  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      dispatch(loadWorkoutBootstrap());
    }
    // Reward slice is not persisted — on a returning app open the workout
    // cache is hit and the bootstrap chain skips, leaving points/streak at 0.
    if (user?.id && rewardStatus === "idle") {
      dispatch(loadRewardBootstrap(user.id));
    }
  }, [dispatch, hasWorkoutBootstrap, workoutStatus, user?.id, rewardStatus]);

  // Cycle 1 → Cycle 2 completion detection.
  // Calendar-driven: once today is past Week 12 / Day 7, fire the celebration
  // screen once per cycle. The "shown" flag is reset whenever programStartDate
  // changes (i.e. a new cycle starts), so this re-arms naturally for cycle 3+.
  useCycleCompletionTrigger();

  const openWorkoutPlan = () => {
    navigation.navigate("WorkoutPlan", {
      programId: workout?.programId,
      subtitle: workout?.title,
      title: t("workout.ui.workoutPlan"),
    });
  };

  const startWorkout = () => {
    if (!workout) {
      return;
    }

    navigation.navigate("ExerciseList", {
      programId: workout.programId,
      programDayId: workout.currentDayId,
      subtitle: workout.subtitle,
      title: workout.workoutName,
      muscles: mapMusclesToIcons(workout.targetMuscles),
      dayStatus: workout.isCompleted ? "completed" : "active",
    });
  };

  const handleDayPress = useCallback((day: { key: string; title: string; subtitle: string; muscles: MuscleGroup[]; active?: boolean; completed?: boolean; missed?: boolean }) => {
    if (!workout) return;

    // Future / pre-signup days are not interactive
    if (!day.active && !day.completed && !day.missed) return;

    let dayStatus: "missed" | "completed" | "active" | "future" = "future";
    if (day.active) dayStatus = workout.isCompleted ? "completed" : "active";
    else if (day.completed) dayStatus = "completed";
    else if (day.missed) dayStatus = "missed";

    navigation.navigate("ExerciseList", {
      programId: workout.programId,
      programDayId: day.key,
      title: day.title,
      subtitle: day.subtitle,
      muscles: day.muscles,
      dayStatus,
    });
  }, [workout, navigation]);

  return (
    <View style={styles.root}>
      {/* Background glow at bottom */}
      {/* <LinearGradient
        colors={["transparent", "rgba(201, 168, 76, 0.06)", "transparent"]}
        style={styles.bgGlow}
      /> */}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.greeting}>
            <Text style={styles.greetingDim}>{t("workout.ui.greeting")} </Text>
            {displayName}
          </Text>
          <ProfileAvatar initial={avatarInitial} marginBottom={0} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t("workout.ui.readyTitle")}</Text>

        {/* Stats chips */}
        <View style={styles.statsSection}>
          <StatsChipsRow
            points={totalPoints}
            streakDays={currentStreak}
            onPointsPress={() => navigation.navigate("Points")}
            onStreakPress={handleStreakPress}
            onWorkoutPlanPress={openWorkoutPlan}
          />
        </View>

        {/* Week day selector */}
        <View style={styles.weekRow}>
          {workout ? (
            <WeekDaySelector days={workout.days} onDayPress={handleDayPress} />
          ) : (
            <Text style={styles.statusText}>
              {isLoading ? t("workout.ui.loadingWorkout") : errorMessage}
            </Text>
          )}
        </View>

        {/* Workout card */}
        {workout ? (
          <WorkoutCard
            duration={workout.duration}
            exerciseCount={workout.exerciseCount}
            completed={workout.isCompleted}
            progress={workoutProgress}
            onCardPress={openWorkoutPlan}
            onStartPress={startWorkout}
            programDay={workout.programDay}
            programType={workout.programType}
            programWeek={workout.programWeek}
            tags={workout.tags}
            workoutName={workout.workoutName}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.statusText}>
              {isLoading ? t("workout.ui.loadingWorkout") : errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      <StreakBottomSheet
        ref={streakRef}
        streak={currentStreak}
        days={streakSheetDays}
        exercises={streakSheetExercises}
        minutes={streakSheetMinutes}
        points={streakSheetPoints}
        onViewPoints={() => {
          streakRef.current?.dismiss();
          navigation.navigate("Points");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  // bgGlow: {
  //   position: "absolute",
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   height: 300,
  // },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(-8),
  },
  greeting: {
    flex: 1,
    marginRight: 16,
    fontSize: 20,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.9)",
  },
  greetingDim: {
    color: "rgba(240, 240, 240, 0.6)",
  },

  // Title
  title: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: "500",
    lineHeight: 48,
    color: "rgba(240, 240, 240, 0.85)",
    width: 235,
    marginBottom: verticalScale(20),
  },

  // Stats
  statsSection: {
    marginBottom: verticalScale(28),
  },

  // Week day selector
  weekRow: {
    marginBottom: verticalScale(28),
  },
  emptyCard: {
    minHeight: verticalScale(220),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(240,240,240,0.72)",
    textAlign: "center",
  },

});

export default WorkoutScreen;
