import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import type { HomeStackParamList } from "@/app/navigation/types";
import { startNextCycle } from "@/app/services/assignmentService";
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch } from "@/app/stores/store";
import type { RootState } from "@/app/stores/store";
import { detectCycleCompletion } from "@/app/utils/cycleDetection";
import { isDeloadComplete } from "@/app/utils/deloadTransform";

/**
 * Drives the Cycle 1 → Cycle 2 transition triggers from the workout home.
 *
 *   1. Calendar-based: once today is past Week 12 / Day 7 of the current
 *      cycle, navigate to the TwelveWeekCompletion celebration screen on
 *      every WorkoutScreen mount until the user picks a cycle 2 choice
 *      (Heavier / Deload / Bro Split). The natural stop condition is the
 *      RPC resetting programStartDate to today — Week 12 hasn't elapsed
 *      again yet, so the trigger naturally stops firing.
 *
 *   2. Deload auto-route: if the active assignment is is_deload_week=true
 *      and 7 days have elapsed since started_at, automatically call
 *      start_next_cycle('heavier') so the user lands on the Heavier cycle
 *      without manually re-confirming.
 *
 * No-op if onboarding incomplete or no active assignment.
 */
export function useCycleCompletionTrigger(): void {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const programStartDate = useSelector((s: RootState) => s.auth.programStartDate);
  const assignment = useSelector((s: RootState) => s.workout.assignment);

  useEffect(() => {
    if (!programStartDate || !assignment) return;

    // 1) Deload auto-route takes precedence — if the current cycle is a
    //    deload week and 7 days have elapsed, transition to Heavier silently.
    if (assignment.is_deload_week && assignment.started_at) {
      if (isDeloadComplete(assignment.started_at)) {
        startNextCycle("heavier")
          .then(() => dispatch(loadWorkoutBootstrap({})))
          .catch((err) => console.warn("[cycle] deload auto-restart failed", err));
        return;
      }
    }

    // 2) Calendar completion check. Fires on every mount while the cycle
    //    is past Week 12 / Day 7 and no choice has been picked yet. Stops
    //    naturally once start_next_cycle resets programStartDate to today.
    const { isComplete } = detectCycleCompletion({
      programStartDate,
      totalWeeks: 12,
    });
    if (isComplete) {
      navigation.navigate("TwelveWeekCompletion");
    }
  }, [programStartDate, assignment, dispatch, navigation]);
}
