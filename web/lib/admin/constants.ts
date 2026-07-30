// "mobility" temporarily commented out 2026-07-14 — zero mobility exercises
// seeded in the library and no immediate plan to add stretching/warm-up drills.
// Enum value stays in Postgres for DB parity; uncomment here to re-enable in
// the admin Modality picker when mobility content is needed.
export const EXERCISE_MODALITIES = ["strength", "cardio", /* "mobility", */ "core"] as const;

// Category is a display-only tag on the exercise card (no mobile logic branches
// on it). "warmup" and "cooldown" hidden 2026-07-14 — section kinds already
// cover those roles at the day level; keeping them on the exercise added noise.
// Enum values stay in Postgres for parity.
export const EXERCISE_CATEGORIES = [
  "compound",
  "isolation",
  "core",
  "cardio",
  // "warmup",
  // "cooldown",
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

// Rami locked "no warm-up sets" 2026-06-25 — warmup removed from admin picker.
// The enum value stays in Postgres and in mobile PlannedSetKind for DB parity,
// but no new planned rows should emit it. See mobile/app/utils/deloadTransform.ts.
export const PLANNED_SET_KINDS = [
  "working",
  "top_set",
  "backoff",
  "core",
  "cardio",
] as const;

// Which Kind values are valid for a given exercise Modality. Enforced in the
// admin Kind dropdown (filtered options) and in server actions on save.
// - cardio modality → cardio-only sets (drives session_cardio_logs + +150 bonus)
// - core modality   → core-only sets (no weight, no PR)
// - strength (or legacy mobility) → working plus top_set/backoff for advanced
//   planning. mobility is hidden from the admin Modality picker as of
//   2026-07-14 but the fallback stays so any legacy rows still validate.
//   (warmup dropped 2026-06-25 per Rami — see PLANNED_SET_KINDS comment)
export function allowedSetKindsForModality(modality: string | null | undefined): string[] {
  if (modality === "cardio") return ["cardio"];
  if (modality === "core") return ["core"];
  return ["working", "top_set", "backoff"];
}

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

/**
 * Public storage bucket holding the per-exercise demo clips.
 *
 * Public (not signed) on purpose: the clips are identical for every user, so
 * the URL is CDN-cacheable and never expires. The mobile app caches raw rows in
 * persisted Redux, and a signed URL sitting in that cache would go dead.
 */
export const EXERCISE_MEDIA_BUCKET = "exercise-media";

/** Matches the bucket's `file_size_limit` — keep the two in sync. */
export const EXERCISE_VIDEO_MAX_BYTES = 10 * 1024 * 1024;

export const EXERCISE_MEDIA_GENDERS = ["male", "female"] as const;
export type ExerciseMediaGender = (typeof EXERCISE_MEDIA_GENDERS)[number];

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
