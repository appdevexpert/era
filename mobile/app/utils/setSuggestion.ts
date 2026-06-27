import {
  BACKOFF_MULTIPLIER,
  WEIGHT_DELTA_CORRECT,
  WEIGHT_DELTA_HEAVY,
  WEIGHT_DELTA_LIGHT,
  WEIGHT_ROUND_TO,
} from "@/app/constants/workout";
import type { SessionExerciseSet } from "@/app/types/workout";

// =====================================================================
// Smart set-by-set weight suggestion.
//
// After each logged set, we suggest a weight for the upcoming sets in
// the same exercise based on the user's feedback. Same-tier rule:
//
//   top_set → top_set : weight ± delta
//   top_set → backoff : (weight ± delta) × BACKOFF_MULTIPLIER, rounded to 2.5 kg
//   top_set → working : weight ± delta  (working treated as a lift)
//   working → working : weight ± delta
//   working → backoff : no suggestion (no top reference)
//   backoff → backoff : weight ± delta
//   backoff → top/working : no suggestion (don't propagate up)
//   anything → core/cardio : no suggestion
//
// Delta (Rami 2026-06-25, universal across compound + isolation):
//   light_weight   = +5 kg
//   correct_weight = +2.5 kg  (steady progression, no longer flat)
//   felt_heavy     = -5 kg
// =====================================================================

export type SetFeedbackValue = "light_weight" | "correct_weight" | "felt_heavy";

export interface ComputeSuggestionInput {
  loggedWeight: number | null;
  feedback: SetFeedbackValue | null;
  /**
   * Retained for callsite compatibility — the universal Rami delta (2026-06-25)
   * no longer scales by compound vs isolation. Safe to pass any string.
   */
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
  currentSetKind,
  nextSetKind,
}: ComputeSuggestionInput): number | null {
  if (loggedWeight == null || feedback == null) return null;
  if (nextSetKind === "core" || nextSetKind === "cardio") return null;

  const delta = pickDelta(feedback);
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

// =====================================================================
// Inter-session smart weight seed.
//
// On a NEW session, for each planned set we look up the user's most recent
// log for the same (exercise, set_number) across ALL prior completed sessions.
// We then apply the same feedback delta as the intra-session engine so the
// ruler starts where the user "should" be lifting today.
//
// Reuses computeNextSetWeight: treat the last logged set as the "current"
// set and the planned set as the "next" set. Same cross-tier rules apply
// (e.g., working → backoff still returns null; top_set → backoff still ×0.9).
// =====================================================================

export interface ComputeInterSessionSeedInput {
  lastLog: {
    weight: number;
    feedback: SetFeedbackValue | null;
    setKind: string;
  };
  nextSetKind: string;
  exerciseCategory: string;
}

/**
 * Returns the seed weight for the FIRST set of the same exercise in a new
 * session, derived from the user's last log + its feedback. Returns null
 * for non-lift kinds or unsupported cross-tier transitions.
 *
 * When the previous set had no feedback, we still seed with the raw weight
 * so the user lands on what they did last time — they can adjust manually.
 */
export function computeInterSessionSeed({
  lastLog,
  nextSetKind,
  exerciseCategory,
}: ComputeInterSessionSeedInput): number | null {
  if (nextSetKind === "core" || nextSetKind === "cardio") return null;

  // No feedback on the previous set → no delta; seed raw weight so the user
  // continues from where they left off.
  if (lastLog.feedback == null) {
    return Math.max(0, lastLog.weight);
  }

  return computeNextSetWeight({
    loggedWeight: lastLog.weight,
    feedback: lastLog.feedback,
    exerciseCategory,
    currentSetKind: lastLog.setKind,
    nextSetKind,
  });
}

// -------- helpers ----------------------------------------------------

function pickDelta(feedback: SetFeedbackValue): number {
  if (feedback === "light_weight") return WEIGHT_DELTA_LIGHT;
  if (feedback === "correct_weight") return WEIGHT_DELTA_CORRECT;
  return WEIGHT_DELTA_HEAVY;
}

function roundToStep(value: number, step: number): number {
  return Math.max(0, Math.round(value / step) * step);
}
