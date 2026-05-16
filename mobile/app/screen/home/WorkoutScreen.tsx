import StatsChipsRow from "@/app/components/workout/StatsChipsRow";
import StreakSheet from "@/app/components/workout/StreakSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import WeekDaySelector from "@/app/components/workout/WeekDaySelector";
import WorkoutCard from "@/app/components/workout/WorkoutCard";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList, MuscleGroup } from "@/app/navigation/types";
import { selectUser } from "@/app/stores/selectors/authSelectors";
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
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      dispatch(loadWorkoutBootstrap());
    }
  }, [dispatch, hasWorkoutBootstrap, workoutStatus]);

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
          <Pressable
            onPress={() => navigation.navigate("Profile")}
            style={styles.avatar}
            hitSlop={10}
          >
            <LinearGradient
              colors={[COLORS.primary.dark, COLORS.primary.base]}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </Pressable>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t("workout.ui.readyTitle")}</Text>

        {/* Stats chips */}
        <View style={styles.statsSection}>
          <StatsChipsRow
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

      <StreakSheet
        ref={streakRef}
        streak={5}
        days={[
          { key: "mon", label: "Mon", date: "02", title: "", subtitle: "", muscles: [], completed: true },
          { key: "tue", label: "Tue", date: "03", title: "", subtitle: "", muscles: [], completed: true },
          { key: "wed", label: "Wed", date: "04", title: "", subtitle: "", muscles: [], completed: true },
          { key: "thu", label: "Thu", date: "05", title: "", subtitle: "", muscles: [], completed: true },
          { key: "fri", label: "Fri", date: "06", title: "", subtitle: "", muscles: [], active: true },
          { key: "sat", label: "Sat", date: "09", title: "", subtitle: "", muscles: [] },
          { key: "sun", label: "Sun", date: "10", title: "", subtitle: "", muscles: [] },
        ]}
        exercises={20}
        minutes={75}
        points={200}
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
    marginBottom: verticalScale(0),
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
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
