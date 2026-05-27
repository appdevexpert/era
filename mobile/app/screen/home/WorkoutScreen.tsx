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
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { mapMusclesToIcons, mapWorkoutHome } from "@/app/utils/workoutMappers";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
  const workout = useMemo(
    () => (overview ? mapWorkoutHome(overview, i18n.language, programStartDate, completedDayIds) : null),
    [i18n.language, overview, programStartDate, completedDayIds],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
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

  // Weekly aggregates for the stat cards inside the streak sheet.
  // (Read straight from completedDayIds count for the current week; exercises/
  // minutes come from the workout overview — placeholder until the streak
  // sheet has a dedicated query.)
  const streakSheetExercises = workout?.exerciseCount ?? 0;
  const streakSheetMinutes = overview?.currentDay.estimated_minutes ?? 0;
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
