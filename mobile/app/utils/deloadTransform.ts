/**
 * Deload week render-time transformation — pure functions.
 *
 * A deload week is NOT a separate program; it's a 1-week transformation
 * applied to the user's existing program. Rules per Rami's spec:
 *   - All weights reduced to 50%
 *   - Sets reduced from 4 (or template count) to a max of 2
 *   - Top-set / back-off rows are hidden during deload
 *   - After 7 days, the app auto-routes to Heavier restart
 *
 * Callers: workoutMappers.ts (when assignment.is_deload_week=true) +
 * the auto-restart trigger that watches assignment.started_at.
 */

/** Matches the planned_set_kind Postgres enum. */
export type PlannedSetKind =
  | "warmup"
  | "working"
  | "top_set"
  | "backoff"
  | "drop_set"
  | "amrap"
  | "core"
  | "cardio";

export const DELOAD_WEIGHT_MULTIPLIER = 0.5;
export const DELOAD_MAX_SETS = 2;
export const DELOAD_WEEK_DURATION_DAYS = 7;

export interface DeloadTransformInput {
  /** User's current weight (NOT template default — pre-deload personalized value). */
  baseWeightKg: number | null;
  baseSets: number;
  setKind: PlannedSetKind;
}

export interface DeloadTransformResult {
  /** Transformed weight (base × 0.5). null if base was null. */
  weightKg: number | null;
  /** Transformed sets (capped at DELOAD_MAX_SETS). */
  sets: number;
  /** true → caller should not render this row at all (top_set / backoff). */
  hide: boolean;
}

export function applyDeloadTransform(input: DeloadTransformInput): DeloadTransformResult {
  const hide = input.setKind === "top_set" || input.setKind === "backoff";

  return {
    weightKg: input.baseWeightKg == null ? null : round(input.baseWeightKg * DELOAD_WEIGHT_MULTIPLIER),
    sets: Math.min(input.baseSets, DELOAD_MAX_SETS),
    hide,
  };
}

/**
 * Returns true if today is past startedAt + 7 days — caller should
 * auto-trigger the Heavier restart flow.
 */
export function isDeloadComplete(startedAt: string, today?: string): boolean {
  const start = new Date(startedAt);
  const ref = today ? new Date(`${today}T00:00:00`) : new Date();
  const diffDays = Math.floor((ref.getTime() - start.getTime()) / 86_400_000);
  return diffDays >= DELOAD_WEEK_DURATION_DAYS;
}

function round(weightKg: number): number {
  return Math.round(weightKg / 2.5) * 2.5;
}
