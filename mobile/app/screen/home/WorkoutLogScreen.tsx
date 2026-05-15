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
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const WorkoutLogScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutLog">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const {
    exerciseName,
    exerciseCategory,
    exerciseIndex,
    totalExercises,
    setCount,
    showWeight = true,
  } = route.params;

  // Session timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = formatTime(elapsed);

  const [weight, setWeight] = useState(120);
  const [reps, setReps] = useState(6);
  const [comment, setComment] = useState("");

  const MAX_SETS = 5;
  const [activeSet] = useState(2); // TODO: change back to 0 after testing
  const [sets, setSets] = useState(setCount || 3);
  const canAddSet = sets < MAX_SETS;
  const isLastSet = activeSet >= sets - 1;
  const handleAddSet = () => {
    if (canAddSet) setSets((s) => s + 1);
  };

  // Exercise completed bottom sheet
  const sheetRef = useRef<BottomSheet>(null);
  const completedSets = [
    { weight: "120 Kg", reps: 6, setNumber: 1 },
    { weight: "125kg", reps: 6, setNumber: 2 },
    { weight: "130kg", reps: 6, setNumber: 3 },
  ];
  const handleCompleteExercise = useCallback(() => {
    sheetRef.current?.expand();
  }, []);
  const handleSheetContinue = useCallback(
    (_comment: string) => {
      sheetRef.current?.close();
      // TODO: check if PR was hit, then show PR screen, otherwise goBack
      navigation.navigate("PRScreen", {
        exerciseName,
        exerciseCategory,
        weight: `${weight} kg`,
        reps,
        previousBest: "114 kg",
        points: 100,
      });
    },
    [navigation, exerciseName, exerciseCategory, weight, reps],
  );

  const COLLAPSE_DISTANCE = 60;

  // Scroll-driven collapse
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Content stays still while header collapses, then scrolls normally
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
        onBack={() => navigation.goBack()}
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
          bestSet={{ weight: "120kg", reps: 4 }}
          lastSet={showWeight ? { weight: "110 Kg", reps: 6 } : undefined}
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
            <SetFeedback />
          </View>
        ) : null}

        <View style={[styles.bodyPaddeds, { paddingTop: 32 }]}>
          <AddComment value={comment} onChangeText={setComment} />
        </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Bottom fade overlay */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]}
        locations={[0, 0.51]}
        style={styles.bottomFade}
      />

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <CompleteSetBar
          onComplete={
            isLastSet
              ? handleCompleteExercise
              : () =>
                  navigation.navigate("RestTimer", {
                    exerciseIndex,
                    totalExercises,
                    currentSet: activeSet + 2,
                    totalSets: sets,
                    nextExerciseName: exerciseName,
                    restDuration: 60,
                  })
          }
          onNext={() =>
            navigation.navigate("TimerLog", {
              exerciseName: "Plank",
              exerciseCategory: "core finisher",
              exerciseIndex: 3,
              totalExercises: 3,
              setCount: 3,
              idealTime: "60 sec",
              topTime: "1min 20sec",
            })
          }
          onPrevious={() =>
            navigation.navigate("CardioTimer", {
              exerciseName: "Incline Walk",
              exerciseCategory: "treadmill",
              exerciseIndex: 3,
              totalExercises: 3,
              duration: 1200,
              idealTime: "20 min",
              topTime: "40 min",
            })
          }
          showNext
          showPrevious
          isLastSet={isLastSet}
        />
      </View>

      {/* Exercise completed bottom sheet */}
      <ExerciseCompletedSheet
        ref={sheetRef}
        sets={completedSets}
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
