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
import type {
  ExerciseListExerciseView,
  ExerciseListSectionView,
} from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { mapExerciseList } from "@/app/utils/workoutMappers";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const ExerciseRow = ({ exercise }: { exercise: ExerciseListExerciseView }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.exerciseRow}>
      {exercise.showHandle ? <ReorderIcon /> : null}
      <View style={styles.exerciseCopy}>
        <Text numberOfLines={1} style={styles.exerciseName}>
          {exercise.name}
        </Text>
        <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
      </View>
      {exercise.weight ? (
        <View style={styles.weightBlock}>
          <Text style={styles.weightLabel}>{t("workout.ui.initialWeight")}</Text>
          <Text style={styles.weightValue}>{exercise.weight}</Text>
        </View>
      ) : null}
    </View>
  );
};

const ExerciseSection = ({ section }: { section: ExerciseListSectionView }) => (
  <View style={styles.section}>
    <SectionHeader title={section.title} showEdit={section.showEdit} />
    <View style={styles.exerciseList}>
      {section.exercises.map((exercise, index) => (
        <View key={exercise.id}>
          <ExerciseRow exercise={exercise} />
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
  const currentDayDetail = useSelector(selectCurrentDayDetail);
  const workout = useMemo(
    () => (currentDayDetail ? mapExerciseList(currentDayDetail, i18n.language) : null),
    [currentDayDetail, i18n.language],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const requestedDayId = route.params?.programDayId;
  const shouldLoadRequestedDay = Boolean(
    requestedDayId && currentDayDetail?.day.id !== requestedDayId,
  );
  const handleStartNow = () => {
    if (!workout) return;
    const firstExercise = workout.sections
      .flatMap((s) => s.exercises)
      .find((e) => e.name);
    const subtitle = route.params?.subtitle ?? "";
    const parts = subtitle.split("\u2022").map((s) => s.trim());
    navigation.navigate("WorkoutCountdown", {
      weekLabel: parts[0] ?? "",
      dayLabel: parts[1] ?? "",
      dayTitle: workout.title,
      firstExerciseName: firstExercise?.name ?? "",
    });
  };
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

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.topFade} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(156),
            paddingBottom: insets.bottom + verticalScale(132),
          },
        ]}
      >
        {workout && !shouldLoadRequestedDay ? (
          <>
            <View style={styles.statsRow}>
              <StatCard value={String(workout.exerciseCount)} label={t("workout.ui.exercisesLabel")} />
              <StatCard value={String(workout.estimatedMinutes)} label={t("workout.ui.minutesLabel")} />
            </View>

            {workout.sections.map((section) => (
              <ExerciseSection key={section.id} section={section} />
            ))}
          </>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isLoading ? t("workout.ui.loadingWorkout") : errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      {workout && !shouldLoadRequestedDay ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.92)"]}
            locations={[0, 0.58]}
            style={styles.bottomFade}
          />
          <View style={[styles.buttonWrap, { paddingBottom: insets.bottom + 12 }]}>
            <PrimaryButton label={t("workout.ui.startNow")} onPress={handleStartNow} />
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
