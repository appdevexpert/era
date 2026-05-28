// =====================================================================
// Nutrition — row types mirror Supabase schema, view models are computed
// client-side in selectors/mappers.
//
// Meal plans are per-user and AI-generated, one row per program week
// (user_meal_plans) plus its meals (user_meal_plan_items). There is no
// admin-authored meal program anymore.
// =====================================================================

export type MealCategoryEnum =
  | "breakfast"
  | "lunch"
  | "snack"
  | "evening_snack"
  | "dinner"
  | "pre_workout"
  | "post_workout"
  | "cheat_meal";

export type MealLogSource = "plan" | "library_custom" | "user_custom";

export type MealPhaseKey = "hypertrophy" | "strength" | "peak";

export type TranslationMap = Record<string, string>;

// -------- raw rows ---------------------------------------------------

/** One AI-generated weekly plan for a user (user_meal_plans). */
export interface UserMealPlanRow {
  id: string;
  user_id: string;
  week_number: number;
  phase_key: MealPhaseKey;
  kcal_target: number;
  protein_g_target: number;
  carbs_g_target: number;
  fats_g_target: number;
  source: string;
  generated_at: string;
}

/** One meal within a weekly plan (user_meal_plan_items). */
export interface UserMealPlanItemRow {
  id: string;
  user_meal_plan_id: string;
  day_of_week: number; // 1=Mon..7=Sun
  category: MealCategoryEnum;
  sort_order: number;
  name_translations: TranslationMap;
  note_translations: TranslationMap;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

/** A plan row joined with its items — what the slice caches per week. */
export interface WeeklyMealPlan {
  plan: UserMealPlanRow;
  items: UserMealPlanItemRow[];
}

export interface MealLogRow {
  id: string;
  user_id: string;
  log_date: string; // 'YYYY-MM-DD'
  user_meal_plan_item_id: string | null;
  category: MealCategoryEnum;
  source: MealLogSource;
  name_snapshot: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  notes: string | null;
}

export interface WaterLogRow {
  id: string;
  user_id: string;
  log_date: string; // 'YYYY-MM-DD'
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

// -------- computed view models ---------------------------------------

export interface DailyMacroTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_ml: number;
}

export interface DailyMacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export type DayStatus =
  | "before_program" // unreachable, dashed
  | "future"         // after today, dashed
  | "today"          // current calendar day
  | "completed"      // past + has logs
  | "missed";        // past + no logs
