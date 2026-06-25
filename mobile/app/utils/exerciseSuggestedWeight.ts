// =====================================================================
// Exercise-list "starting weight" suggestion.
//
// The Exercise List screen shows a weight on each row. Before the user
// has logged this exercise, that's the program's INITIAL weight. Once
// they have history, we replace it with a SUGGESTED weight derived from
// their last log + feedback so the row reflects what they should lift
// today, not the canned program baseline.
//
// Math is delegated to the existing intra-/inter-session smart engine
// (utils/setSuggestion.ts) so the suggestion stays in lock-step with the
// per-set ruler shown during logging.
// =====================================================================
import {
  computeInterSessionSeed,
  type SetFeedbackValue,
} from "@/app/utils/setSuggestion";

export type SuggestedWeightKind = "initial" | "suggested";

export interface SuggestedWeightInput {
  /** Program-defined initial weight in kg (the "starting" baseline). */
  initialWeightKg: number | null | undefined;
  /** Most recent logged weight (kg) for this exercise across all sessions. */
  lastWeightKg: number | null | undefined;
  /** Feedback on the user's last logged set for this exercise. */
  lastFeedback: SetFeedbackValue | null | undefined;
  /** Set kind of the last logged set — drives the cross-tier rule in setSuggestion. */
  lastSetKind?: string | null;
  /** Exercise category from the library row (compound | isolation | core | cardio). */
  exerciseCategory: string;
}

export interface SuggestedWeightResult {
  /** Resolved weight in kg (or null when nothing usable is available). */
  weightKg: number | null;
  /** "initial" before user has history; "suggested" after. */
  kind: SuggestedWeightKind;
  /** The feedback used to derive the suggestion. Null when kind === "initial". */
  feedback: SetFeedbackValue | null;
}

/**
 * Decide what weight + label to show on an exercise list row.
 *
 *  - No prior log → return the program's initial weight, kind "initial".
 *  - Prior log exists → seed via computeInterSessionSeed (last weight ± feedback delta).
 *    Falls back to the raw last weight when the engine returns null (e.g. unsupported
 *    cross-tier transition) so we never silently regress to "Initial 0 kg" once the
 *    user has data.
 */
export function getSuggestedExerciseWeight({
  initialWeightKg,
  lastWeightKg,
  lastFeedback,
  lastSetKind,
  exerciseCategory,
}: SuggestedWeightInput): SuggestedWeightResult {
  const hasHistory =
    lastWeightKg != null && Number.isFinite(lastWeightKg) && lastWeightKg > 0;

  if (!hasHistory) {
    return {
      weightKg: toFiniteOrNull(initialWeightKg),
      kind: "initial",
      feedback: null,
    };
  }

  const feedback = normalizeFeedback(lastFeedback);
  // Exercise list rows are agnostic of set-kind; assume "working" so the
  // engine applies a symmetric ± delta without back-off rounding.
  const fromKind = lastSetKind ?? "working";

  const seeded = computeInterSessionSeed({
    lastLog: {
      weight: lastWeightKg as number,
      feedback,
      setKind: fromKind,
    },
    nextSetKind: "working",
    exerciseCategory,
  });

  return {
    weightKg: seeded ?? (lastWeightKg as number),
    kind: "suggested",
    feedback,
  };
}

function toFiniteOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function normalizeFeedback(
  value: SetFeedbackValue | string | null | undefined,
): SetFeedbackValue | null {
  if (value === "light_weight" || value === "correct_weight" || value === "felt_heavy") {
    return value;
  }
  return null;
}
