import type { RootState } from "@/app/stores/store";
import type { SessionWorkout } from "@/app/types/workout";
import { mapSessionWorkout } from "@/app/utils/workoutMappers";

export const selectWorkoutStatus = (state: RootState) => state.workout.status;

export const selectWorkoutError = (state: RootState) => state.workout.error;

export const selectWorkoutOverview = (state: RootState) => state.workout.overview;

export const selectCurrentDayDetail = (state: RootState) =>
  state.workout.currentDayDetail;

export const selectHasWorkoutBootstrap = (state: RootState) =>
  Boolean(state.workout.overview && state.workout.currentDayDetail);

/** Returns a flat, screen-ready workout with ordered exercises. Memoize with useMemo in components. */
export const selectSessionWorkoutData = (state: RootState) =>
  state.workout.currentDayDetail;

/** Helper to build SessionWorkout from state + language. Use with useMemo. */
export const buildSessionWorkout = (
  state: RootState,
  language: string,
): SessionWorkout | null => {
  const detail = state.workout.currentDayDetail;
  return detail ? mapSessionWorkout(detail, language) : null;
};
