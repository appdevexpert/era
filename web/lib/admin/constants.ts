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

export const MEAL_CATEGORIES = [
  "breakfast",
  "lunch",
  "snack",
  "evening_snack",
  "dinner",
  "pre_workout",
  "post_workout",
  "cheat_meal",
] as const;

export const MEAL_PHASE_KEYS = ["hypertrophy", "strength", "peak"] as const;

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
