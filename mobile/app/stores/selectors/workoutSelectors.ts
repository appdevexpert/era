import type { RootState } from "@/app/stores/store";

export const selectWorkoutStatus = (state: RootState) => state.workout.status;

export const selectWorkoutError = (state: RootState) => state.workout.error;

export const selectActiveSessionStatus = (state: RootState) =>
  state.workout.activeSessionStatus;

export const selectActiveSessionError = (state: RootState) =>
  state.workout.activeSessionError;

export const selectWorkoutOverview = (state: RootState) => state.workout.overview;

export const selectCurrentDayDetail = (state: RootState) =>
  state.workout.currentDayDetail;

export const selectActiveWorkoutSession = (state: RootState) =>
  state.workout.activeSession;

export const selectHasWorkoutBootstrap = (state: RootState) =>
  Boolean(state.workout.overview && state.workout.currentDayDetail);
