import AddComment from "@/app/components/workout/AddComment";
import CompleteSetBar from "@/app/components/workout/CompleteSetBar";
import ExerciseCompletedSheet from "@/app/components/workout/ExerciseCompletedSheet";
import RepsPicker from "@/app/components/workout/RepsPicker";
import SetFeedback from "@/app/components/workout/SetFeedback";
import SetStatCards from "@/app/components/workout/SetStatCards";
import WeightRuler from "@/app/components/workout/WeightRuler";
import WorkoutLogHeader from "@/app/components/workout/WorkoutLogHeader";
import { COLORS } from "@/app/constants/colors";
import type { HomeStackParamList } from "@/app/navigation/types";
import { horizontalScale } from "@/app/utils/responsive";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSessionTimer } from "@/app/hooks/useSessionTimer";
import { useAppDispatch } from "@/app/stores/store";
import { clearSession } from "@/app/stores/slice/sessionSlice";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const WorkoutLogScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutLog">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex, // 1-based
    totalExercises,
    setCount,
    showWeight = true,
    currentSet: startSet = 0, // 0-based set to resume from
  } = route.params;

  const { t } = useTranslation();
  const { sessionWorkout, navigateToExercise: goToEx, navigateToRest, navigateToSessionComplete, logSetResult, completeExerciseResult, finishSession, addSet, getSetCount, getExerciseSetStats, getCompletedSetsForSheet } = useWorkoutSession();
  const { formatted: timer } = useSessionTimer();
  const exercises = sessionWorkout?.exercises ?? [];
  const total = exercises.length;
  const exIdx = exerciseIndex - 1; // 0-based
  const currentEx = exercises[exIdx];
  const prevEx = exIdx > 0 ? exercises[exIdx - 1] : undefined;
  const nextEx = exIdx < total - 1 ? exercises[exIdx + 1] : undefined;

  const [weight, setWeight] = useState(currentEx?.initialWeight ?? 120);
  const [reps, setReps] = useState(currentEx?.targetReps ?? 6);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<"light_weight" | "correct_weight" | "felt_heavy" | null>(null);

  const MAX_SETS = 5;
  const [activeSet, setActiveSet] = useState(startSet);
  const sets = getSetCount(exIdx) || setCount || 3;
  const canAddSet = sets < MAX_SETS;
  const isLastSet = activeSet >= sets - 1;
  const handleAddSet = useCallback(async () => {
    if (!canAddSet) return;
    await addSet(exIdx);
  }, [canAddSet, addSet, exIdx]);

  // Exercise completed bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const lastSetLogged = useRef(false);

  /** Navigate to a specific exercise by 0-based index */
  const goToExercise = useCallback(
    (idx: number, direction: "forward" | "back" = "forward") => goToEx(idx, 0, direction),
    [goToEx],
  );

  /** Complete Set (not last) → log + rest timer */
  const handleCompleteSet = useCallback(() => {
    logSetResult(exIdx, activeSet, weight, reps, feedback, null, comment || null);
    navigateToRest(exIdx, activeSet + 2);
    setActiveSet((s) => s + 1);
    setFeedback(null);
    setComment("");
  }, [weight, reps, activeSet, exIdx, feedback, comment, logSetResult, navigateToRest]);

  /** Complete Exercise (last set) → log once + show bottom sheet */
  const handleCompleteExercise = useCallback(() => {
    if (lastSetLogged.current) {
      sheetRef.current?.expand();
      return;
    }
    lastSetLogged.current = true;
    logSetResult(exIdx, activeSet, weight, reps, feedback, null, comment || null);
    sheetRef.current?.expand();
  }, [weight, reps, activeSet, exIdx, feedback, comment, logSetResult]);

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

  const COLLAPSE_DISTANCE = 60;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const contentHoldStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, COLLAPSE_DISTANCE],
          [0, COLLAPSE_DISTANCE],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.root}>
      <WorkoutLogHeader
        exerciseName={exerciseName}
        exerciseCategory={exerciseCategory}
        exerciseIndex={exerciseIndex}
        totalExercises={totalExercises}
        timer={timer}
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
                onPress: async () => {
                  await finishSession();
                  dispatch(clearSession());
                  navigation.popToTop();
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
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Animated.View style={contentHoldStyle}>
          <SetStatCards
            bestSet={getExerciseSetStats(exIdx).bestSet}
            lastSet={getExerciseSetStats(exIdx).lastSet}
          />

          {showWeight ? (
            <View style={styles.rulerFullWidth}>
              <WeightRuler
                label="Weight"
                unit="Kgs"
                value={weight}
                onValueChange={setWeight}
                min={20}
                max={200}
              />
            </View>
          ) : null}

          <View style={styles.repsSection}>
            <RepsPicker
              label="Reps"
              value={reps}
              onValueChange={setReps}
              min={1}
              max={30}
            />
          </View>

          {showWeight ? (
            <View style={styles.bodyPadded}>
              <SetFeedback onSelect={(option) => {
                const map = { light: "light_weight", correct: "correct_weight", heavy: "felt_heavy" } as const;
                setFeedback(map[option]);
              }} />
            </View>
          ) : null}

          <View style={[styles.bodyPaddeds, { paddingTop: 32 }]}>
            <AddComment value={comment} onChangeText={setComment} />
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]}
        locations={[0, 0.51]}
        style={styles.bottomFade}
      />

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

      <ExerciseCompletedSheet
        ref={sheetRef}
        sets={getCompletedSetsForSheet(exIdx)}
        onContinue={handleSheetContinue}
      />
    </View>
  );
};

export default WorkoutLogScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  repsSection: {
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: -16,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  rulerFullWidth: {
    marginTop: 24,
    marginHorizontal: -horizontalScale(24),
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
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
  bodyPadded: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingBottom: 32,
    marginHorizontal: -16,
    borderColor: COLORS.neutral.charcoal,
  },
  bodyPaddeds: {
    paddingHorizontal: 16,
    paddingBottom: 130,
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
