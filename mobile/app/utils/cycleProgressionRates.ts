/**
 * Weekly progression rates per program kind + exercise category.
 *
 * Used by the Smart Weight Engine when computing "next week's weight"
 * during a Heavier cycle 2 or Bro Split cycle.
 *
 * Source: Rami Knudsen, locked 2026-05-13 and refined 2026-06.
 *   Heavier (cycle 2 standard):  heavy +2.5%, medium +2%, isolation +1.5%
 *   Bro Split (cycle 2 split):   heavy +2%,   medium +1.5%, isolation +1%
 *   Cycle 1 standard:            handled by existing Smart Weight Engine
 *                                (unchanged here).
 */

export type ExerciseCategory = "heavy_compound" | "medium" | "isolation";
export type ProgramKind = "standard" | "bro_split";

export interface ProgressionRateInput {
  programKind: ProgramKind;
  category: ExerciseCategory;
  /** true if this is a Heavier cycle 2+ (vs cycle 1). Has no effect for bro_split. */
  isHeavierCycle: boolean;
}

const HEAVIER_RATES: Record<ExerciseCategory, number> = {
  heavy_compound: 0.025,
  medium: 0.02,
  isolation: 0.015,
};

const BRO_SPLIT_RATES: Record<ExerciseCategory, number> = {
  heavy_compound: 0.02,
  medium: 0.015,
  isolation: 0.01,
};

/**
 * Returns weekly increment as a decimal (e.g. 0.025 = +2.5% per week).
 *
 * For cycle 1 standard programs (isHeavierCycle=false, programKind='standard'),
 * returns 0 — the existing per-set Smart Weight Engine logic applies instead.
 */
export function getWeeklyProgressionRate(input: ProgressionRateInput): number {
  if (input.programKind === "bro_split") {
    return BRO_SPLIT_RATES[input.category];
  }
  if (input.isHeavierCycle) {
    return HEAVIER_RATES[input.category];
  }
  return 0;
}
