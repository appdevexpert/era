import {
  BACKOFF_MULTIPLIER,
  WEIGHT_ROUND_TO,
  WEIGHT_STEP_COMPOUND,
  WEIGHT_STEP_ISOLATION,
} from "@/app/constants/workout";
import type { SessionExerciseSet } from "@/app/types/workout";

// =====================================================================
// Smart set-by-set weight suggestion.
//
// After each logged set, we suggest a weight for the upcoming sets in
// the same exercise based on the user's feedback. Same-tier rule:
//
//   top_set → top_set : weight ± delta
//   top_set → backoff : (weight ± delta) × 0.9, rounded to 2.5 kg
//   top_set → working : weight ± delta  (working treated as a lift)
//   working → working : weight ± delta
//   working → backoff : no suggestion (no top reference)
//   backoff → backoff : weight ± delta
//   backoff → top/working : no suggestion (don't propagate up)
//   anything → core/cardio : no suggestion
//
// Delta:
//   compound  light_weight = +2.5 kg  | felt_heavy = -2.5 kg | correct = 0
//   isolation light_weight = +1.25 kg | felt_heavy = -1.25 kg| correct = 0
// =====================================================================

export type SetFeedbackValue = "light_weight" | "correct_weight" | "felt_heavy";

export interface ComputeSuggestionInput {
  loggedWeight: number | null;
  feedback: SetFeedbackValue | null;
  exerciseCategory: string;
  currentSetKind: string;
  nextSetKind: string;
}

/**
 * Returns the suggested weight for a single upcoming set, or `null`
 * when we don't have enough info to suggest (missing feedback, missing
 * weight, non-lift kind, or a cross-tier transition that we don't auto-adjust).
 */
export function computeNextSetWeight({
  loggedWeight,
  feedback,
  exerciseCategory,
  currentSetKind,
  nextSetKind,
}: ComputeSuggestionInput): number | null {
  if (loggedWeight == null || feedback == null) return null;
  if (nextSetKind === "core" || nextSetKind === "cardio") return null;

  const delta = pickDelta(feedback, exerciseCategory);
  const newReferenceWeight = Math.max(0, loggedWeight + delta);

  if (currentSetKind === "top_set") {
    if (nextSetKind === "backoff") {
      return roundToStep(newReferenceWeight * BACKOFF_MULTIPLIER, WEIGHT_ROUND_TO);
    }
    // top → top, top → working
    return newReferenceWeight;
  }

  if (currentSetKind === "working") {
    if (nextSetKind === "backoff") return null; // no top reference for back-off
    return newReferenceWeight;
  }

  if (currentSetKind === "backoff") {
    if (nextSetKind === "backoff") return newReferenceWeight;
    return null; // back-off feedback doesn't bump top/working sets up
  }

  return null;
}

export interface SuggestFutureSetsInput {
  loggedWeight: number | null;
  feedback: SetFeedbackValue | null;
  exerciseCategory: string;
  currentSetKind: string;
  /** Planned sets *after* the just-logged one, in order. */
  futureSets: Pick<SessionExerciseSet, "id" | "setKind">[];
}

/**
 * Computes suggestions for every upcoming set in the same exercise.
 * Returns a map of `sessionSetId → suggested weight` (omitting keys
 * for which no suggestion applies).
 */
export function suggestFutureSetWeights({
  loggedWeight,
  feedback,
  exerciseCategory,
  currentSetKind,
  futureSets,
}: SuggestFutureSetsInput): Record<string, number> {
  const result: Record<string, number> = {};
  for (const planned of futureSets) {
    const suggestion = computeNextSetWeight({
      loggedWeight,
      feedback,
      exerciseCategory,
      currentSetKind,
      nextSetKind: planned.setKind,
    });
    if (suggestion != null) {
      result[planned.id] = suggestion;
    }
  }
  return result;
}

// -------- helpers ----------------------------------------------------

function pickDelta(feedback: SetFeedbackValue, exerciseCategory: string): number {
  if (feedback === "correct_weight") return 0;
  const step = exerciseCategory === "compound"
    ? WEIGHT_STEP_COMPOUND
    : WEIGHT_STEP_ISOLATION;
  return feedback === "light_weight" ? step : -step;
}

function roundToStep(value: number, step: number): number {
  return Math.max(0, Math.round(value / step) * step);
}
