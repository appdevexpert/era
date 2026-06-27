/**
 * Smart weight adjustment constants.
 * Locked by Rami 2026-06-25: progression amounts tied to set feedback,
 * universal across compound and isolation.
 */

/** Next-session delta when user rates the set "For lett" (too light) — kg. */
export const WEIGHT_DELTA_LIGHT = 5;

/** Next-session delta when user rates the set "Passer" (correct) — kg. */
export const WEIGHT_DELTA_CORRECT = 2.5;

/** Next-session delta when user rates the set "For tungt" (too heavy) — kg. */
export const WEIGHT_DELTA_HEAVY = -5;

/** Back-off weight = top set weight × this multiplier. Rami 2026-06-12: 80%. */
export const BACKOFF_MULTIPLIER = 0.8;

/** Back-off reps = top set reps + this */
export const BACKOFF_REPS_ADDITION = 2;

/** Round back-off weight to nearest this (kg) */
export const WEIGHT_ROUND_TO = 2.5;

/** WeightRuler display range — kg vs lb. Kg-canonical storage; these are UX hints. */
export const RULER_RANGE = {
  kg: { min: 0, max: 400, step: 1 },
  lb: { min: 0, max: 880, step: 1 },
} as const;
