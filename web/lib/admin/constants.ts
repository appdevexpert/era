export const EXERCISE_MODALITIES = ["strength", "cardio", "mobility", "core"] as const;

export const EXERCISE_CATEGORIES = [
  "compound",
  "isolation",
  "core",
  "cardio",
  "warmup",
  "cooldown",
] as const;

export const PROGRAM_STATUSES = ["draft", "active", "archived"] as const;

export const USER_GENDERS = ["male", "female"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const GENDER_LABELS: Record<UserGender, string> = {
  male: "Male",
  female: "Female",
};

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const WORKOUT_PHASES = ["Hypertrophy", "Strength", "Peak"] as const;

export const WORKOUT_DAY_KINDS = [
  "push",
  "pull",
  "legs",
  "shoulders",
  "cardio",
  "rest",
  "custom",
] as const;

export const SECTION_KINDS = [
  "main_exercises",
  "core_finisher",
  "treadmill_walk",
  "warmup",
  "cooldown",
  "custom",
] as const;

export const PLANNED_SET_KINDS = [
  "warmup",
  "working",
  "top_set",
  "backoff",
  "drop_set",
  "amrap",
  "core",
  "cardio",
] as const;

// The four launch programs (Male/Female × Beginner/Advanced). Intermediate
// users share the Beginner program — ensure_my_program_assignment maps
// `level = 'intermediate'` to the Beginner row of the user's gender.
// IDs are locked seed UUIDs from supabase/workout_schema.sql and are
// referenced from admin guards (no delete, no gender/level edit).
export const MAIN_PROGRAM_IDS = [
  "11111111-1111-1111-1111-111111111111", // Male Beginner
  "33333333-3333-3333-3333-333333333333", // Male Advanced
  "44444444-4444-4444-4444-444444444444", // Female Beginner
  "66666666-6666-6666-6666-666666666666", // Female Advanced
  "88888888-8888-8888-8888-888888888888", // Bro Split (Cycle 2, male-only)
] as const;

export function isMainProgramId(id: string | null | undefined): boolean {
  return !!id && (MAIN_PROGRAM_IDS as readonly string[]).includes(id);
}

export const MUSCLE_GROUPS = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "back",
  "legs",
  "glutes",
  "core",
  "hamstrings",
  "quads",
  "calves",
  "forearms",
] as const;
