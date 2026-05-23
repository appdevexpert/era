// =====================================================================
// Nutrition — row types mirror Supabase schema, view models are computed
// client-side in selectors/mappers.
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

export interface MealLibraryRow {
  id: string;
  slug: string;
  category: MealCategoryEnum;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  name_translations: TranslationMap;
  note_translations: TranslationMap;
  is_active: boolean;
}

export interface MealProgramRow {
  id: string;
  duration_days: number;
  is_active: boolean;
  title_translations: TranslationMap;
}

export interface MealProgramPhaseRow {
  id: string;
  meal_program_id: string;
  phase_key: MealPhaseKey;
  sort_order: number;
  week_count: number;
  kcal_target: number | null;
  protein_g_target: number | null;
  carbs_g_target: number | null;
  fats_g_target: number | null;
}

export interface MealProgramPhaseDayRow {
  id: string;
  meal_program_phase_id: string;
  day_of_week: number; // 1=Mon..7=Sun
  kcal_target: number | null;
  protein_g_target: number | null;
  carbs_g_target: number | null;
  fats_g_target: number | null;
}

export interface MealProgramPhaseDayItemRow {
  id: string;
  meal_program_phase_day_id: string;
  meal_library_id: string;
  sort_order: number;
}

export interface MealLogRow {
  id: string;
  user_id: string;
  log_date: string; // 'YYYY-MM-DD'
  meal_library_id: string | null;
  meal_program_phase_day_item_id: string | null;
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

// -------- bootstrap + computed view models ---------------------------

export interface MealProgramBootstrapData {
  program: MealProgramRow;
  phases: MealProgramPhaseRow[];
  phaseDays: MealProgramPhaseDayRow[];
  phaseDayItems: MealProgramPhaseDayItemRow[];
  library: MealLibraryRow[];
}

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
