/**
 * Cycle 2 starting-weight calculation — pure math helpers.
 *
 * Two flavors:
 *   1. Heavier restart (Fortsett Hardere)  — formula on user's Week 12 Top Set.
 *   2. Bro Split                            — per-exercise ratios mapped from cycle 1 lifts.
 *
 * Both are side-effect free. Callers compose them with data they fetched
 * from user_exercise_stats / planned_exercise_sets and write the result
 * wherever the Smart Weight Engine reads from.
 *
 * Source of truth for formulas: Rami Knudsen, locked 2026-06-12 in #era Slack.
 */

// ─── Heavier (Fortsett Hardere) ─────────────────────────────────────────────

export type Week12Rating = "correct" | "too_light" | "too_heavy" | "failed" | null;

export interface HeavierWeightInput {
  /** Last successful Week 12 Top Set weight in kg. null if exercise wasn't done. */
  week12TopSetKg: number | null;
  /** User's rating on that Top Set. */
  week12Rating: Week12Rating;
  /** Fallback: Week 11 weight for the same exercise — used when W12 was skipped. */
  week11WeightKg: number | null;
  /** For "failed" case: the attempted weight that the user couldn't complete. */
  attemptedWeightKg: number | null;
}

/**
 * New Week 1 Top Set for the Heavier cycle.
 *
 *   Base case:               Week 12 Top Set × 1.05
 *   Failed final Top Set:    attempted weight × 0.90
 *   Skipped Week 12:         Week 11 weight × 1.025
 *   No data at all:          returns null — caller falls back to template default
 */
export function calculateHeavierStartingWeight(input: HeavierWeightInput): number | null {
  if (input.week12Rating === "failed" && input.attemptedWeightKg != null) {
    return round(input.attemptedWeightKg * 0.9);
  }

  if (input.week12TopSetKg != null) {
    return round(input.week12TopSetKg * 1.05);
  }

  if (input.week11WeightKg != null) {
    return round(input.week11WeightKg * 1.025);
  }

  return null;
}

// ─── Bro Split ──────────────────────────────────────────────────────────────

/**
 * Bro Split starting weights derived from cycle 1 main lifts.
 * Slugs reference exercise_library.slug.
 */
export interface BroSplitWeightRatio {
  sourceExerciseSlug: string;
  ratio: number;
}

export const BRO_SPLIT_WEIGHT_RATIOS: Record<string, BroSplitWeightRatio> = {
  incline_barbell_press:  { sourceExerciseSlug: "bench-press",    ratio: 0.80 },
  decline_bench_press:    { sourceExerciseSlug: "bench-press",    ratio: 0.90 },
  t_bar_row:              { sourceExerciseSlug: "barbell_row",    ratio: 0.80 },
  front_squat:            { sourceExerciseSlug: "squat",          ratio: 0.70 },
  behind_neck_press:      { sourceExerciseSlug: "overhead_press", ratio: 0.80 },
  close_grip_bench_press: { sourceExerciseSlug: "bench-press",    ratio: 0.85 },
};

export interface BroSplitWeightInput {
  /** Best lifetime weights from user_exercise_stats, keyed by exercise slug. */
  cycle1BestWeightsBySlug: Record<string, number>;
  /** Template defaults (planned_exercise_sets target_weight) keyed by slug. */
  templateDefaultBySlug: Record<string, number>;
}

/**
 * Returns suggested starting weight per Bro Split exercise slug.
 * Exercises NOT in the ratio map fall back to template default
 * (Smart Weight Engine adjusts from there once the user starts logging).
 */
export function calculateBroSplitStartingWeights(
  input: BroSplitWeightInput,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [slug, mapping] of Object.entries(BRO_SPLIT_WEIGHT_RATIOS)) {
    const cycle1Best = input.cycle1BestWeightsBySlug[mapping.sourceExerciseSlug];
    if (cycle1Best != null) {
      result[slug] = round(cycle1Best * mapping.ratio);
    } else if (input.templateDefaultBySlug[slug] != null) {
      result[slug] = input.templateDefaultBySlug[slug];
    }
  }

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Round to nearest 2.5 kg increment (smallest practical plate jump). */
function round(weightKg: number): number {
  return Math.round(weightKg / 2.5) * 2.5;
}
