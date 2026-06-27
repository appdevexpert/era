import type { TFunction } from "i18next";
import type { RootState } from "@/app/stores/store";
import type { SessionWorkout } from "@/app/types/workout";
import type { PlanPhase } from "@/app/components/workout/PlanProgressBar";
import { mapSessionWorkout } from "@/app/utils/workoutMappers";
import { computeCurrentPosition } from "@/app/utils/programSchedule";

export const selectWorkoutStatus = (state: RootState) => state.workout.status;

export const selectWorkoutError = (state: RootState) => state.workout.error;

export const selectWorkoutOverview = (state: RootState) => state.workout.overview;

export const selectCurrentDayDetail = (state: RootState) =>
  state.workout.currentDayDetail;

export const selectHasWorkoutBootstrap = (state: RootState) =>
  Boolean(
    state.auth.user?.id &&
      state.workout.userId === state.auth.user.id &&
      state.workout.overview &&
      state.workout.currentDayDetail,
  );

/** Returns a flat, screen-ready workout with ordered exercises. Memoize with useMemo in components. */
export const selectSessionWorkoutData = (state: RootState) =>
  state.workout.currentDayDetail;

/** Helper to build SessionWorkout from state + language. Use with useMemo. */
export const buildSessionWorkout = (
  state: RootState,
  language: string,
): SessionWorkout | null => {
  const detail = state.workout.currentDayDetail;
  const isDeloadWeek = state.workout.assignment?.is_deload_week === true;
  const program = state.workout.overview?.program;
  const usesTopSetBackoff =
    program?.gender === "male" && program?.level === "advanced";
  return detail
    ? mapSessionWorkout(detail, language, { isDeloadWeek, usesTopSetBackoff })
    : null;
};

/** Current week number (1..totalWeeks) based on programStartDate, or null when unknown. */
export const selectCurrentWeekNumber = (state: RootState): number | null => {
  const programStartDate = state.auth.programStartDate;
  const totalWeeks = state.workout.overview?.program.duration_weeks;
  if (!programStartDate || !totalWeeks) return null;
  return computeCurrentPosition({ programStartDate, totalWeeks }).weekNumber;
};

const PHASE_COUNT = 3;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Builds Hypertrophy / Strength / Peak phases. Phases share totalWeeks equally;
 * each completed week inside a phase fills 1 / phaseLength of that phase's bar.
 * Pure function — wrap in useMemo at call site with primitives from selectors.
 */
export const buildPlanPhases = (
  currentWeek: number,
  totalWeeks: number,
  t: TFunction,
): PlanPhase[] => {
  const phaseLength = totalWeeks / PHASE_COUNT;

  const labels = [
    t("progress.phaseHypertrophy"),
    t("progress.phaseStrength"),
    t("progress.phasePeak"),
  ];

  const activeIdx = Math.min(
    PHASE_COUNT - 1,
    Math.floor(Math.max(currentWeek - 1, 0) / phaseLength),
  );

  return labels.map((label, idx) => ({
    label,
    active: idx === activeIdx,
    progress: clamp01((currentWeek - idx * phaseLength) / phaseLength),
  }));
};
