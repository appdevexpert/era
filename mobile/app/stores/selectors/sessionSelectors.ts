import type { RootState } from "@/app/stores/store";

export const selectSessionId = (state: RootState) => state.session.sessionId;
export const selectSessionProgramDayId = (state: RootState) =>
  state.session.programDayId;
export const selectExerciseMap = (state: RootState) => state.session.exerciseMap;
export const selectSetMap = (state: RootState) => state.session.setMap;
export const selectSetsLogged = (state: RootState) => state.session.setsLogged;
export const selectExercisesCompleted = (state: RootState) =>
  state.session.exercisesCompleted;
export const selectSessionStartedAt = (state: RootState) =>
  state.session.sessionStartedAt;
export const selectExerciseStats = (state: RootState) =>
  state.session.exerciseStats;
export const selectCompletedSets = (state: RootState) =>
  state.session.completedSets;
