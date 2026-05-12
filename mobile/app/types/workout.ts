import type { MuscleGroup } from "@/app/navigation/types";

export type TranslationMap = Record<string, string> | null;

export type WorkoutDayStatus = "completed" | "missed" | "active" | "future";

export interface WorkoutProgramRow {
  id: string;
  title: string;
  title_translations: TranslationMap;
  subtitle: string | null;
  subtitle_translations: TranslationMap;
  duration_weeks: number;
  days_per_week: number;
}

export interface ProgramWeekRow {
  id: string;
  program_id: string;
  week_number: number;
  title: string;
  title_translations: TranslationMap;
  focus: string | null;
  focus_translations: TranslationMap;
  notes: string | null;
  notes_translations: TranslationMap;
}

export interface ProgramDayRow {
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
  points_available: number;
  is_rest_day: boolean;
  sort_order: number;
}

export interface ProgramDaySectionRow {
  id: string;
  program_day_id: string;
  section_kind: string;
  title: string;
  title_translations: TranslationMap;
  description: string | null;
  description_translations: TranslationMap;
  sort_order: number;
}

export interface ExerciseLibraryRow {
  id: string;
  slug: string;
  name: string;
  name_translations: TranslationMap;
  modality: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
}

export interface ProgramDayExerciseRow {
  id: string;
  program_day_id: string;
  section_id: string;
  exercise_id: string;
  sort_order: number;
  display_name: string | null;
  display_name_translations: TranslationMap;
  target_summary: string | null;
  target_summary_translations: TranslationMap;
  initial_weight_value: number | string | null;
  initial_weight_unit: string;
  default_rest_seconds: number | null;
  coach_notes: string | null;
  coach_notes_translations: TranslationMap;
}

export interface PlannedExerciseSetRow {
  id: string;
  program_day_exercise_id: string;
  set_number: number;
  set_kind: string;
  target_weight_value: number | string | null;
  target_weight_unit: string;
  target_reps_exact: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_seconds: number | null;
  target_speed_value: number | string | null;
  target_incline_percent: number | string | null;
  display_label: string | null;
  display_label_translations: TranslationMap;
  rest_seconds: number | null;
}

export interface WorkoutOverviewData {
  program: WorkoutProgramRow;
  weeks: ProgramWeekRow[];
  days: ProgramDayRow[];
  currentDay: ProgramDayRow;
  currentDayExerciseCount: number;
}

export interface ProgramDayDetailData {
  day: ProgramDayRow;
  week: ProgramWeekRow;
  sections: ProgramDaySectionRow[];
  exercises: ProgramDayExerciseRow[];
  libraryExercises: ExerciseLibraryRow[];
  sets: PlannedExerciseSetRow[];
}

export interface WorkoutHomeView {
  programId: string;
  currentDayId: string;
  title: string;
  subtitle: string;
  workoutName: string;
  exerciseCount: number;
  duration: string;
  tags: string[];
  targetMuscles: string[];
  programType: string;
  programWeek: string;
  programDay: string;
  days: {
    key: string;
    label: string;
    date: string;
    active?: boolean;
  }[];
}

export interface WorkoutPlanPhaseView {
  label: string;
  active: boolean;
  progress: number;
}

export interface WorkoutPlanWeekView {
  weekNumber: number;
  title: string;
  phase: string;
  completedDays: number;
  totalDays: number;
  days: {
    programDayId: string;
    isRestDay: boolean;
    date: string;
    dayLabel: string;
    status: WorkoutDayStatus;
    title: string;
    subtitle: string;
    muscles: MuscleGroup[];
  }[];
  isCurrentWeek: boolean;
}

export interface WorkoutPlanView {
  phases: WorkoutPlanPhaseView[];
  weeks: WorkoutPlanWeekView[];
}

export interface ExerciseListExerciseView {
  id: string;
  name: string;
  prescription: string;
  weight?: string;
  showHandle: boolean;
}

export interface ExerciseListSectionView {
  id: string;
  title: string;
  showEdit: boolean;
  exercises: ExerciseListExerciseView[];
}

export interface ExerciseListView {
  id: string;
  title: string;
  subtitle: string;
  exerciseCount: number;
  estimatedMinutes: number;
  sections: ExerciseListSectionView[];
}
