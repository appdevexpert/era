/**
 * Smart weight adjustment constants.
 * Extracted as named constants for future admin override from Supabase.
 */

/** Weight increment for compound exercises (kg) */
export const WEIGHT_STEP_COMPOUND = 2.5;

/** Weight increment for isolation exercises (kg) */
export const WEIGHT_STEP_ISOLATION = 1.25;

/** Back-off weight = top set weight × this multiplier */
export const BACKOFF_MULTIPLIER = 0.9;

/** Back-off reps = top set reps + this */
export const BACKOFF_REPS_ADDITION = 2;

/** Round back-off weight to nearest this (kg) */
export const WEIGHT_ROUND_TO = 2.5;

/** WeightRuler display range — kg vs lb. Kg-canonical storage; these are UX hints. */
export const RULER_RANGE = {
  kg: { min: 0, max: 200, step: 1 },
  lb: { min: 0, max: 440, step: 1 },
} as const;
