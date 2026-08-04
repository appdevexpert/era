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

// Some live rows hold a kind their exercise's modality no longer allows — 705
// sets as of 2026-08-03 (Cable Crunch as `working`, Pull-ups as `core`). The
// picker has to keep offering the stored value, or opening a set and saving an
// unrelated column silently rewrites its kind, and set_kind drives PR
// eligibility and the points bonuses. Server-side, savePlannedSets only
// validates a kind the operator actually changed.
export function setKindOptionsFor(
  modality: string | null | undefined,
  storedKind: string | null | undefined,
): string[] {
  const allowed = allowedSetKindsForModality(modality);
  if (storedKind && !allowed.includes(storedKind)) return [storedKind, ...allowed];
  return allowed;
}

// Which columns a set row needs, by modality. Derived from what the live data
// actually uses: strength never sets a duration (0 of 5,853 sets), cardio only
// ever sets duration and rest, core uses both reps and duration.
export function setColumnsForModality(modality: string | null | undefined) {
  const cardio = modality === "cardio";
  return {
    weight: !cardio,
    reps: !cardio,
    duration: cardio || modality === "core",
  };
}

/**
 * One row of the set grid, as the client hands it to savePlannedSets.
 * `id: null` means "insert me"; a row missing from the array is deleted.
 */
export type PlannedSetInput = {
  id: string | null;
  set_kind: string;
  target_weight_value: number | null;
  target_reps_exact: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_seconds: number | null;
  rest_seconds: number | null;
};

/**
 * `target_reps_exact`, `target_reps_min` and `target_reps_max` are three columns
 * for one idea — "how many reps". The grid shows a single input and this pair
 * converts between the two shapes.
 *
 *   ""      -> no rep target (a duration-only set)
 *   "10"    -> exact 10
 *   "10-12" -> range 10..12   (en/em dashes accepted; humans paste them)
 */
export function formatRepsTarget(set: {
  target_reps_exact: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
}): string {
  if (set.target_reps_exact) return String(set.target_reps_exact);
  if (set.target_reps_min && set.target_reps_max) {
    return `${set.target_reps_min}-${set.target_reps_max}`;
  }
  // A half-filled range still has to round-trip, or saving would drop the half
  // that survived.
  if (set.target_reps_min) return String(set.target_reps_min);
  if (set.target_reps_max) return String(set.target_reps_max);
  return "";
}

export function parseRepsTarget(input: string): {
  target_reps_exact: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
} {
  const text = input.trim().replace(/[–—]/g, "-");
  const empty = { target_reps_exact: null, target_reps_min: null, target_reps_max: null };
  if (!text) return empty;

  const range = text.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    if (!min || !max) throw new Error(`Reps "${input}" — both numbers must be above zero.`);
    if (min > max) throw new Error(`Reps "${input}" — put the lower number first.`);
    return { target_reps_exact: null, target_reps_min: min, target_reps_max: max };
  }

  const single = text.match(/^(\d+)$/);
  if (single) {
    const exact = Number(single[1]);
    if (!exact) throw new Error(`Reps "${input}" — must be above zero.`);
    return { target_reps_exact: exact, target_reps_min: null, target_reps_max: null };
  }

  throw new Error(`Reps "${input}" is not a target. Use "10" or "10-12".`);
}

export function parseOptionalNumber(input: string, label: string): number | null {
  const text = input.trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a number, zero or more.`);
  }
  return parsed;
}

export function parseOptionalSeconds(input: string, label: string): number | null {
  const parsed = parseOptionalNumber(input, label);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be whole seconds.`);
  return parsed;
}

export const MAX_SETS_PER_EXERCISE = 20;

/**
 * Whether an edit lands on the one day the operator is looking at, or on that
 * same day in every week of the program.
 *
 * Rami, 30 Jul: "If I make a change to an exercise, it should apply across all
 * weeks automatically — not require me to manually update every single week and
 * every single day." The schema keeps one row per week (program_days is keyed by
 * week_id), so there is nothing to share — "all weeks" means fanning the same
 * write across the sibling rows. See siblingDayExercises in actions.ts.
 */
export type PropagateScope = "day" | "all_weeks";

export const ALL_WEEKS_FIELD = "propagate_scope";

export function scopeFromForm(raw: string | null | undefined): PropagateScope {
  return raw === "all_weeks" ? "all_weeks" : "day";
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
