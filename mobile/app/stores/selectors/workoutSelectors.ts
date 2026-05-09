import type { RootState } from "@/app/stores/store";

export const selectWorkoutStatus = (state: RootState) => state.workout.status;

export const selectWorkoutError = (state: RootState) => state.workout.error;

export const selectWorkoutOverview = (state: RootState) => state.workout.overview;

export const selectCurrentDayDetail = (state: RootState) =>
  state.workout.currentDayDetail;

export const selectHasWorkoutBootstrap = (state: RootState) =>
  Boolean(state.workout.overview && state.workout.currentDayDetail);
