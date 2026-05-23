import type { DailyMacroTargets, MealPhaseKey } from "@/app/types/nutrition";

// =====================================================================
// Daily kcal/macro target calculator.
//   Mifflin-St Jeor BMR
//     × activity multiplier (mapped from goals.level)
//     + workout-goal kcal offset (build_muscle / lose_fat / …)
//     + nutrition-phase kcal offset (hypertrophy / strength / peak)
//
// Returns whole grams, never below a 1200 kcal floor.
// =====================================================================

export interface GoalInputs {
  birth_year: number | null;
  gender: string | null;
  weight: number;
  weight_unit: "kg" | "lb";
  height: number;
  height_unit: "cm" | "ft";
  level: string | null;
  goal: string | null;
}

const PHASE_KCAL_OFFSET: Record<MealPhaseKey, number> = {
  hypertrophy: 200, //  small surplus
  strength: 0, //      maintenance
  peak: -200, //       cut
};

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  beginner: 1.4,
  intermediate: 1.55,
  advanced: 1.75,
};

const GOAL_KCAL_OFFSET: Record<string, number> = {
  build_muscle: 400,
  lose_fat: -500,
  get_stronger: 300,
  general_fitness: 0,
};

const DEFAULT_AGE = 25;
const KG_PER_LB = 0.45359237;
const CM_PER_FT = 30.48;
const KCAL_FLOOR = 1200;
const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_FAT = 9;
const KCAL_PER_GRAM_CARBS = 4;

// Water-intake tuning.
const ML_PER_KG = 35;
const WATER_ACTIVITY_BONUS_ML: Record<string, number> = {
  beginner: 0,
  intermediate: 350,
  advanced: 700,
};
const WATER_GOAL_BONUS_ML: Record<string, number> = {
  lose_fat: 250,
};
const WATER_ROUND_TO_ML = 250;
const WATER_FLOOR_ML = 1500;
const WATER_CEIL_ML = 5000;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateDailyTargets(
  goals: GoalInputs,
  phaseKey?: MealPhaseKey,
): DailyMacroTargets {
  const age = goals.birth_year
    ? new Date().getFullYear() - goals.birth_year
    : DEFAULT_AGE;

  const weightKg =
    goals.weight_unit === "lb" ? goals.weight * KG_PER_LB : goals.weight;
  const heightCm =
    goals.height_unit === "ft" ? goals.height * CM_PER_FT : goals.height;

  // Mifflin-St Jeor — gender offset: +5 male, -161 female.
  const bmr =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (goals.gender === "female" ? -161 : 5);

  const activity = ACTIVITY_MULTIPLIER[goals.level ?? ""] ?? 1.55;
  const goalOffset = GOAL_KCAL_OFFSET[goals.goal ?? ""] ?? 0;
  const phaseOffset = phaseKey ? PHASE_KCAL_OFFSET[phaseKey] : 0;

  const kcal = Math.max(
    KCAL_FLOOR,
    Math.round(bmr * activity + goalOffset + phaseOffset),
  );

  // Macro split — 2g protein/kg, 0.9g fat/kg, carbs fill remaining kcal.
  const protein_g = Math.round(weightKg * 2);
  const fats_g = Math.round(weightKg * 0.9);
  const carbsKcal =
    kcal - protein_g * KCAL_PER_GRAM_PROTEIN - fats_g * KCAL_PER_GRAM_FAT;
  const carbs_g = Math.max(0, Math.round(carbsKcal / KCAL_PER_GRAM_CARBS));

  // Water — body weight × 35 ml, plus activity & goal bonuses,
  // rounded to a clean 250 ml step.
  const waterBase = weightKg * ML_PER_KG;
  const waterActivity = WATER_ACTIVITY_BONUS_ML[goals.level ?? ""] ?? 0;
  const waterGoal = WATER_GOAL_BONUS_ML[goals.goal ?? ""] ?? 0;
  const water_ml = clamp(
    roundToStep(waterBase + waterActivity + waterGoal, WATER_ROUND_TO_ML),
    WATER_FLOOR_ML,
    WATER_CEIL_ML,
  );

  return { kcal, protein_g, carbs_g, fats_g, water_ml };
}
