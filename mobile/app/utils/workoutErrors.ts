import type { TFunction } from "i18next";
import type { WorkoutErrorCode } from "@/app/stores/slice/workoutSlice";

/**
 * Turns the stored failure code into a localized, user-facing sentence.
 *
 * The slice deliberately stores a code rather than a message so the same
 * condition reads identically everywhere and in both languages. Every screen
 * that surfaces a workout load failure should go through this helper.
 */
export const workoutErrorMessage = (
  t: TFunction,
  code: WorkoutErrorCode | null,
): string =>
  code === "network"
    ? t("workout.ui.networkError")
    : t("workout.ui.unableToLoadWorkout");
