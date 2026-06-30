import AddComment from "@/app/components/common/AddComment";
import CompleteSetBar from "@/app/components/workout/CompleteSetBar";
import EndWorkoutBottomSheet, { type EndWorkoutBottomSheetRef } from "@/app/components/workout/EndWorkoutBottomSheet";
import ExerciseCompletedBottomSheet from "@/app/components/workout/ExerciseCompletedBottomSheet";
import RepsPicker from "@/app/components/workout/RepsPicker";
import SetFeedback from "@/app/components/workout/SetFeedback";
import SetStatCards from "@/app/components/workout/SetStatCards";
import WeightRuler from "@/app/components/workout/WeightRuler";
import WorkoutLogHeader from "@/app/components/workout/WorkoutLogHeader";
import { COLORS } from "@/app/constants/colors";
import type { HomeStackParamList } from "@/app/navigation/types";
import { horizontalScale } from "@/app/utils/responsive";
import { useEntitlement } from "@/app/hooks/useEntitlement";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSessionTimer } from "@/app/hooks/useSessionTimer";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { computeInterSessionSeed } from "@/app/utils/setSuggestion";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import type { RootState } from "@/app/stores/store";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const WorkoutLogScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutLog">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex, // 1-based
    totalExercises,
    setCount,
    showWeight = true,
    currentSet: startSet = 0, // 0-based set to resume from
  } = route.params;

  const { sessionWorkout, navigateToExercise: goToEx, navigateToRest, navigateToSessionComplete, logSetResult, completeExerciseResult, addSet, getSetCount, getExerciseSetStats, getExerciseComment, ensureSessionHydrated } = useWorkoutSession();
  // Smart Weight Engine = Standard+ only. Free users get the planned weight
  // with no inter-session or intra-session auto-adjustment.
  const { hasStandard } = useEntitlement();
  const { formatted: timer } = useSessionTimer();
  const exercises = sessionWorkout?.exercises ?? [];
  const total = exercises.length;
  const exIdx = exerciseIndex - 1; // 0-based
  const currentEx = exercises[exIdx];
  const prevEx = exIdx > 0 ? exercises[exIdx - 1] : undefined;
  const nextEx = exIdx < total - 1 ? exercises[exIdx + 1] : undefined;

  // Smart weight adjustment — if a previous set's feedback produced a
  // suggested weight for the set we're about to log, prefill from it.
  // Falls back to the per-set planned weight, then the exercise's default.
  // Standard+ only — free users never see the suggestion side of the engine.
  const suggestedWeightRaw = useSelector((state: RootState) => {
    const seId = currentEx ? state.session.exerciseMap[currentEx.id] : undefined;
    const ssId = seId ? state.session.setMap[seId]?.[startSet] : undefined;
    return ssId ? state.session.suggestedWeightBySetId[ssId] : undefined;
  });
  const suggestedWeight = hasStandard ? suggestedWeightRaw : undefined;
  // Previously-logged value for this exact (exercise, set) pair — highest
  // priority on initial mount so a revisit or Start Again shows what was saved.
  const previouslyLogged = useSelector((state: RootState) => {
    if (!currentEx) return undefined;
    return state.session.completedSets[currentEx.exerciseLibraryId]?.[startSet];
  });
  // Inter-session seed: last logged set (across ALL prior completed sessions)
  // for this exercise + set_number, adjusted by that set's feedback.
  // Falls back to the last available set index if Day 2 has more sets than Day 1.
  // Standard+ only — free users keep the planned weight as the starting point.
  const interSessionSeedRaw = useSelector((state: RootState) => {
    if (!currentEx) return undefined;
    const byIdx = state.session.lastLoggedSetsByExercise[currentEx.exerciseLibraryId];
    if (!byIdx) return undefined;
    const setNumber = startSet + 1; // session_sets.set_number is 1-based
    const indices = Object.keys(byIdx).map(Number);
    if (indices.length === 0) return undefined;
    const lastLog = byIdx[setNumber] ?? byIdx[Math.max(...indices)];
    if (!lastLog) return undefined;
    const seed = computeInterSessionSeed({
      lastLog,
      nextSetKind: currentEx.sets[startSet]?.setKind ?? "working",
      exerciseCategory: currentEx.exerciseCategory,
    });
    return seed ?? undefined;
  });
  const interSessionSeed = hasStandard ? interSessionSeedRaw : undefined;
  const plannedWeightForSet =
    currentEx?.sets[startSet]?.targetWeight ?? currentEx?.initialWeight ?? 0;
  // Canonical kg. The ruler displays/edits in the user's preferred unit; we
  // convert at the edge so the session log keeps storing kg.
  const [weightKg, setWeightKg] = useState(
    previouslyLogged?.weight
      ?? suggestedWeight
      ?? interSessionSeed
      ?? plannedWeightForSet,
  );
  const { label: weightUnitLabel, range: weightRange, toDisplay, fromDisplayToKg } =
    useWeightUnit();
  const weightDisplay = toDisplay(weightKg);
  const handleWeightChange = useCallback(
    (next: number) => setWeightKg(fromDisplayToKg(next)),
    [fromDisplayToKg],
  );
  const [reps, setReps] = useState(
    previouslyLogged?.reps ?? currentEx?.targetReps ?? 6,
  );
  const [comment, setComment] = useState(previouslyLogged?.comment ?? "");
  const [feedback, setFeedback] = useState<"light_weight" | "correct_weight" | "felt_heavy" | null>(
    previouslyLogged?.feedback ?? null,
  );

  const MAX_SETS = 5;
  const [activeSet, setActiveSet] = useState(startSet);
  const sets = getSetCount(exIdx) || setCount || 3;
  const canAddSet = sets < MAX_SETS;
  const isLastSet = activeSet >= sets - 1;
  const handleAddSet = useCallback(async () => {
    if (!canAddSet) return;
    await addSet(exIdx);
  }, [canAddSet, addSet, exIdx]);

  // Safety net: if the session's lookup maps (exerciseMap/setMap) somehow ended
  // up empty while we landed here (app kill + reopen, partial init, redux-persist
  // edge case), refetch from the DB before the user logs anything — otherwise
  // logSetResult silently bails and "Exercise Completed" shows no set cards.
  useEffect(() => {
    void ensureSessionHydrated();
  }, [ensureSessionHydrated]);

  // Exercise completed bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const endWorkoutSheetRef = useRef<EndWorkoutBottomSheetRef>(null);
  const lastSetLogged = useRef(false);
  // Set true right before any programmatic leave (CompleteSet → RestTimer,
  // prev/next exercise, End Workout confirm). Lets beforeRemove distinguish
  // an intentional navigation from a back-press / swipe-back that should
  // surface the End Workout sheet instead.
  const allowLeaveRef = useRef(false);

  /** Navigate to a specific exercise by 0-based index */
  const goToExercise = useCallback(
    (idx: number, direction: "forward" | "back" = "forward") => {
      allowLeaveRef.current = true;
      goToEx(idx, 0, direction);
    },
    [goToEx],
  );

  /** Guard: weighted exercises require weight > 0 before logging. */
  const ensureWeightLogged = useCallback(() => {
    if (showWeight && weightKg <= 0) {
      Toast.show({
        type: "error",
        text2: t("workout.ui.weightRequired"),
        visibilityTime: 2500,
      });
      return false;
    }
    return true;
  }, [showWeight, weightKg, t]);

  /** Complete Set (not last) → log + rest timer */
  const handleCompleteSet = useCallback(() => {
    if (!ensureWeightLogged()) return;
    logSetResult(exIdx, activeSet, weightKg, reps, feedback, null, comment || null);
    allowLeaveRef.current = true;
    navigateToRest(exIdx, activeSet + 2);
    setActiveSet((s) => s + 1);
    setFeedback(null);
    setComment("");
  }, [ensureWeightLogged, weightKg, reps, activeSet, exIdx, feedback, comment, logSetResult, navigateToRest]);

  /** Complete Exercise (last set) → log once + show bottom sheet */
  const handleCompleteExercise = useCallback(() => {
    if (lastSetLogged.current) {
      sheetRef.current?.expand();
      return;
    }
    if (!ensureWeightLogged()) return;
    lastSetLogged.current = true;
    logSetResult(exIdx, activeSet, weightKg, reps, feedback, null, comment || null);
    sheetRef.current?.expand();
  }, [ensureWeightLogged, weightKg, reps, activeSet, exIdx, feedback, comment, logSetResult]);

  /** Sheet "Continue" → complete exercise + move to next or session complete */
  const handleSheetContinue = useCallback(
    async (_comment: string) => {
      sheetRef.current?.close();
      // PR detection runs inside completeExerciseResult — await it so we know
      // whether to push the PR celebration screen on top of the next destination.
      const result = await completeExerciseResult(exIdx, _comment);

      const nextIdx = exIdx + 1;
      allowLeaveRef.current = true;
      if (nextIdx >= total) {
        await navigateToSessionComplete();
      } else {
        navigateToRest(nextIdx, 1);
      }

      if (result.prDetail) {
        navigation.navigate("PRScreen", {
          exerciseName: result.prDetail.exerciseName,
          exerciseCategory: result.prDetail.exerciseCategory,
          weight: result.prDetail.weightLabel,
          reps: result.prDetail.reps,
          previousBest: result.prDetail.previousBestLabel,
          points: result.prDetail.points,
        });
      }
    },
    [exIdx, total, completeExerciseResult, navigateToRest, navigateToSessionComplete, navigation],
  );

  // Intercept hardware back + iOS swipe-back gesture. When the user tries to
  // leave the workout (not via Complete Set / Next / End-Workout flow), we
  // surface the End Workout sheet instead of letting the screen pop. The
  // sheet's End / Keep Going buttons resolve the intent.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      endWorkoutSheetRef.current?.show();
    });
    return unsubscribe;
  }, [navigation]);

  const handleEndWorkout = useCallback(async () => {
    allowLeaveRef.current = true;
    await navigateToSessionComplete();
  }, [navigateToSessionComplete]);

  // Left-edge swipe → End Workout sheet. We disable the native iOS swipe-back
  // (HomeNavigator sets gestureEnabled:false) because preventDefault inside
  // `beforeRemove` can't catch a native UIKit pop. This JS pan replaces the
  // gesture's feel: same edge, same direction, but it opens the End sheet
  // instead of popping. Sheet's End / Keep Going buttons resolve intent.
  const showEndWorkoutSheet = useCallback(() => {
    endWorkoutSheetRef.current?.show();
  }, []);
  const edgeSwipeBack = Gesture.Pan()
    .activeOffsetX(15)
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX > 40) {
        runOnJS(showEndWorkoutSheet)();
      }
    });

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
        onBack={() => endWorkoutSheetRef.current?.show()}
        scrollY={scrollY}
        topInset={insets.top}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
                label={
                  previouslyLogged?.weight != null
                    || suggestedWeight != null
                    || interSessionSeed != null
                    ? t("workout.ui.nextSetHint", {
                        weight: weightDisplay,
                        unit: weightUnitLabel,
                      })
                    : weightKg > 0
                      ? t("workout.ui.weightLabel")
                      : t("workout.ui.startingWeightHint")
                }
                unit={weightUnitLabel}
                value={weightDisplay}
                onValueChange={handleWeightChange}
                min={weightRange.min}
                max={weightRange.max}
                step={weightRange.step}
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
              <SetFeedback
                initialValue={
                  previouslyLogged?.feedback === "light_weight"
                    ? "light"
                    : previouslyLogged?.feedback === "correct_weight"
                      ? "correct"
                      : previouslyLogged?.feedback === "felt_heavy"
                        ? "heavy"
                        : null
                }
                onSelect={(option) => {
                  const map = { light: "light_weight", correct: "correct_weight", heavy: "felt_heavy" } as const;
                  setFeedback(map[option]);
                }}
              />
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

      <ExerciseCompletedBottomSheet
        ref={sheetRef}
        exerciseLibraryId={currentEx?.exerciseLibraryId}
        initialComment={getExerciseComment(exIdx)}
        onContinue={handleSheetContinue}
      />
      <EndWorkoutBottomSheet
        ref={endWorkoutSheetRef}
        onEnd={handleEndWorkout}
      />

      {/* Left-edge swipe-back replacement. Thin transparent strip on top so
          the underlying scroll/ruler/picker gestures are untouched outside
          the leftmost 20px. */}
      <GestureDetector gesture={edgeSwipeBack}>
        <View style={styles.edgeSwipeArea} pointerEvents="box-only" />
      </GestureDetector>
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
  edgeSwipeArea: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
  },
});
