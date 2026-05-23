export type TranslationMap = Record<string, string>;

export type AdminDataState<T> = {
  data: T;
  configError: string | null;
};

export type PaginatedDataState<T> = AdminDataState<T> & {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalExercises: number;
  totalPrograms: number;
  activePrograms: number;
  draftPrograms: number;
};

export type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  name_translations: TranslationMap;
  modality: string;
  category: string;
  primary_muscles: string[];
  default_rest_seconds: number | null;
  is_active: boolean;
  updated_at: string;
};

export type ProgramRow = {
  id: string;
  title: string;
  title_translations: TranslationMap;
  duration_weeks: number;
  days_per_week: number;
  created_at: string;
  updated_at: string;
  weekCount?: number;
  dayCount?: number;
};

export type ProfileRow = {
  id: string;
  email?: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  active_assignment_count?: number;
};

export type ProgramWeekRow = {
  id: string;
  program_id: string;
  week_number: number;
  title: string;
  title_translations: TranslationMap;
  focus: string | null;
  focus_translations: TranslationMap;
  updated_at: string;
};

export type ProgramDayRow = {
  id: string;
  program_id: string;
  week_id: string;
  day_number: number;
  weekday: number | null;
  workout_kind: string;
  title: string;
  title_translations: TranslationMap;
  subtitle: string | null;
  subtitle_translations: TranslationMap;
  target_muscles: string[];
  estimated_minutes: number | null;
  is_rest_day: boolean;
  sort_order: number;
  updated_at: string;
};

export type DaySectionRow = {
  id: string;
  program_day_id: string;
  section_kind: string;
  title: string;
  title_translations: TranslationMap;
  sort_order: number;
};

export type DayExerciseRow = {
  id: string;
  program_day_id: string;
  section_id: string;
  exercise_id: string;
  sort_order: number;
  display_name: string | null;
  display_name_translations: TranslationMap;
  initial_weight_value: number | null;
  initial_weight_unit: string;
  default_rest_seconds: number | null;
  exercise_library?: {
    name: string;
    name_translations: TranslationMap;
  } | null;
};

export type PlannedSetRow = {
  id: string;
  program_day_exercise_id: string;
  set_number: number;
  set_kind: string;
  target_weight_value: number | null;
  target_reps_exact: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_seconds: number | null;
  rest_seconds: number | null;
};

export type ProgramDetail = {
  program: ProgramRow | null;
  weeks: ProgramWeekRow[];
  days: ProgramDayRow[];
  sections: DaySectionRow[];
  dayExercises: DayExerciseRow[];
  sets: PlannedSetRow[];
  exercises: ExerciseRow[];
};

// ---------------------------------------------------------------------------
// Nutrition (meal library + meal programs)
// ---------------------------------------------------------------------------

export type MealCategory =
  | "breakfast"
  | "lunch"
  | "snack"
  | "evening_snack"
  | "dinner"
  | "pre_workout"
  | "post_workout"
  | "cheat_meal";

export type MealPhaseKey = "hypertrophy" | "strength" | "peak";

export type MealLibraryRow = {
  id: string;
  slug: string;
  category: MealCategory;
  name_translations: TranslationMap;
  note_translations: TranslationMap;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MealProgramRow = {
  id: string;
  title_translations: TranslationMap;
  description_translations: TranslationMap;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phaseCount?: number;
  itemCount?: number;
};

export type MealProgramPhaseRow = {
  id: string;
  meal_program_id: string;
  phase_key: MealPhaseKey;
  sort_order: number;
  week_count: number;
  label_translations: TranslationMap;
  kcal_target: number | null;
  protein_g_target: number | null;
  carbs_g_target: number | null;
  fats_g_target: number | null;
  notes_translations: TranslationMap;
};

export type MealProgramPhaseDayRow = {
  id: string;
  meal_program_phase_id: string;
  day_of_week: number;
  kcal_target: number | null;
  protein_g_target: number | null;
  carbs_g_target: number | null;
  fats_g_target: number | null;
  notes_translations: TranslationMap;
};

export type MealProgramPhaseDayItemRow = {
  id: string;
  meal_program_phase_day_id: string;
  meal_library_id: string;
  sort_order: number;
  note_translations: TranslationMap;
  meal_library?: {
    name_translations: TranslationMap;
    category: MealCategory;
    kcal: number;
  } | null;
};

export type MealProgramDetail = {
  program: MealProgramRow | null;
  phases: MealProgramPhaseRow[];
  phaseDays: MealProgramPhaseDayRow[];
  phaseDayItems: MealProgramPhaseDayItemRow[];
  library: MealLibraryRow[];
};
