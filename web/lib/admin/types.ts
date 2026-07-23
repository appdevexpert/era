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

import type { UserGender, ExperienceLevel } from "@/lib/admin/constants";

export type ProgramKind = "standard" | "bro_split";

export type ProgramRow = {
  id: string;
  title: string;
  title_translations: TranslationMap;
  duration_weeks: number;
  days_per_week: number;
  gender: UserGender | null;
  level: ExperienceLevel | null;
  kind: ProgramKind;
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
    modality?: string | null;
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

export type AppCopyRow = {
  key: string;
  category: string;
  description: string | null;
  translations: TranslationMap;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  admin_id: string;
  admin_name: string;
  action: "create" | "update" | "delete" | string;
  entity: string;
  table_name: string;
  record_id: string | null;
  summary: string;
  details: unknown;
  created_at: string;
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

