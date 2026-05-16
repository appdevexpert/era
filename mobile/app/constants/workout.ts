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
