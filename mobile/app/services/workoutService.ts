import type {
  ExerciseLibraryRow,
  PlannedExerciseSetRow,
  ProgramDayDetailData,
  ProgramDayExerciseRow,
  ProgramDayRow,
  ProgramDaySectionRow,
  ProgramWeekRow,
  WorkoutOverviewData,
  WorkoutProgramRow,
} from "@/app/types/workout";
import { supabase } from "@/app/utils/auth";

/**
 * Resolve which `workout_programs.id` the user should be reading.
 *
 * Delegates to the `ensure_my_program_assignment` Postgres function (security
 * definer) which:
 *   1. Returns the existing active assignment if one exists.
 *   2. Otherwise matches `goals.gender` + `goals.level` to one of the 4
 *      launch programs (Male/Female × Beginner/Advanced). Intermediate users
 *      are mapped to the Beginner program of their gender — the mapping
 *      lives inside the RPC, not here. See web/doc/PROGRAMS.md.
 *   3. Returns NULL when the user has no goals or no matching program —
 *      the caller surfaces this as "complete onboarding first".
 */
export async function resolveUserProgramId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_my_program_assignment");
  if (error) {
    console.warn("[resolveUserProgramId]", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

type SupabaseError = {
  message?: string;
};

type IdRow = {
  id: string;
};

const requireData = <T>(
  data: T | null,
  error: SupabaseError | null,
  fallbackMessage: string,
) => {
  if (error) {
    throw new Error(error.message ?? fallbackMessage);
  }

  if (!data) {
    throw new Error(fallbackMessage);
  }

  return data;
};

const requireList = <T>(
  data: T[] | null,
  error: SupabaseError | null,
  fallbackMessage: string,
) => {
  if (error) {
    throw new Error(error.message ?? fallbackMessage);
  }

  return data ?? [];
};

export async function getWorkoutOverview(
  programId: string,
): Promise<WorkoutOverviewData> {
  const programResult = await supabase
    .from("workout_programs")
    .select(
      "id,title,title_translations,duration_weeks,days_per_week,gender,level",
    )
    .eq("id", programId)
    .single();

  const program = requireData(
    programResult.data as WorkoutProgramRow | null,
    programResult.error,
    "Workout program was not found.",
  );

  const weeksResult = await supabase
    .from("program_weeks")
    .select(
      "id,program_id,week_number,title,title_translations,focus,focus_translations",
    )
    .eq("program_id", program.id)
    .order("week_number", { ascending: true });

  const weeks = requireList(
    weeksResult.data as ProgramWeekRow[] | null,
    weeksResult.error,
    "Workout weeks could not be loaded.",
  );

  const daysResult = await supabase
    .from("program_days")
    .select(
      "id,program_id,week_id,day_number,weekday,workout_kind,title,title_translations,subtitle,subtitle_translations,target_muscles,estimated_minutes,is_rest_day,sort_order",
    )
    .eq("program_id", program.id)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true });

  const days = requireList(
    daysResult.data as ProgramDayRow[] | null,
    daysResult.error,
    "Workout days could not be loaded.",
  );

  const currentDay = days.find((day) => !day.is_rest_day) ?? days[0];

  if (!currentDay) {
    throw new Error("Workout program has no workout days.");
  }

  const mainSectionsResult = await supabase
    .from("program_day_sections")
    .select("id")
    .eq("program_day_id", currentDay.id)
    .eq("section_kind", "main_exercises");

  const mainSections = requireList(
    mainSectionsResult.data as IdRow[] | null,
    mainSectionsResult.error,
    "Workout sections could not be loaded.",
  );
  const currentDayExerciseCount = await getExerciseCount(
    currentDay.id,
    mainSections.map((section) => section.id),
  );

  return {
    program,
    weeks,
    days,
    currentDay,
    currentDayExerciseCount,
  };
}

/**
 * Fast variant of getProgramDayDetail used when day + week rows are already
 * cached in Redux (which is true for every day after PlanGeneration runs
 * getWorkoutOverview). Skips the day/week roundtrips and parallelizes the
 * remaining four queries into two batches:
 *   - parallel: [sections, exercises]   (both keyed only by programDayId)
 *   - parallel: [planned sets, library] (both derived from exercises[])
 *
 * 6 sequential queries -> 2 parallel batches. Net effect for a typical
 * mobile connection: ~1.2s -> ~0.4s per first-time day open.
 */
export async function getProgramDayDetailFast(
  day: ProgramDayRow,
  week: ProgramWeekRow,
): Promise<ProgramDayDetailData> {
  const [sectionsResult, exercisesResult] = await Promise.all([
    supabase
      .from("program_day_sections")
      .select(
        "id,program_day_id,section_kind,title,title_translations,sort_order",
      )
      .eq("program_day_id", day.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("program_day_exercises")
      .select(
        "id,program_day_id,section_id,exercise_id,sort_order,display_name,display_name_translations,initial_weight_value,initial_weight_unit,default_rest_seconds",
      )
      .eq("program_day_id", day.id)
      .order("sort_order", { ascending: true }),
  ]);

  const sections = requireList(
    sectionsResult.data as ProgramDaySectionRow[] | null,
    sectionsResult.error,
    "Workout sections could not be loaded.",
  );
  const exercises = requireList(
    exercisesResult.data as ProgramDayExerciseRow[] | null,
    exercisesResult.error,
    "Workout exercises could not be loaded.",
  );

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const libraryIds = exercises.map((exercise) => exercise.exercise_id);

  const [sets, libraryExercises] = await Promise.all([
    exerciseIds.length > 0 ? getPlannedSets(exerciseIds) : Promise.resolve([]),
    libraryIds.length > 0
      ? getLibraryExercises(libraryIds)
      : Promise.resolve([]),
  ]);

  return {
    day,
    week,
    sections,
    exercises,
    libraryExercises,
    sets,
  };
}

export async function getProgramDayDetail(
  programDayId: string,
): Promise<ProgramDayDetailData> {
  const dayResult = await supabase
    .from("program_days")
    .select(
      "id,program_id,week_id,day_number,weekday,workout_kind,title,title_translations,subtitle,subtitle_translations,target_muscles,estimated_minutes,is_rest_day,sort_order",
    )
    .eq("id", programDayId)
    .single();

  const day = requireData(
    dayResult.data as ProgramDayRow | null,
    dayResult.error,
    "Workout day was not found.",
  );

  const weekResult = await supabase
    .from("program_weeks")
    .select(
      "id,program_id,week_number,title,title_translations,focus,focus_translations",
    )
    .eq("id", day.week_id)
    .single();

  const week = requireData(
    weekResult.data as ProgramWeekRow | null,
    weekResult.error,
    "Workout week was not found.",
  );

  const sectionsResult = await supabase
    .from("program_day_sections")
    .select(
      "id,program_day_id,section_kind,title,title_translations,sort_order",
    )
    .eq("program_day_id", day.id)
    .order("sort_order", { ascending: true });

  const sections = requireList(
    sectionsResult.data as ProgramDaySectionRow[] | null,
    sectionsResult.error,
    "Workout sections could not be loaded.",
  );

  const exercisesResult = await supabase
    .from("program_day_exercises")
    .select(
      "id,program_day_id,section_id,exercise_id,sort_order,display_name,display_name_translations,initial_weight_value,initial_weight_unit,default_rest_seconds",
    )
    .eq("program_day_id", day.id)
    .order("sort_order", { ascending: true });

  const exercises = requireList(
    exercisesResult.data as ProgramDayExerciseRow[] | null,
    exercisesResult.error,
    "Workout exercises could not be loaded.",
  );

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const libraryIds = exercises.map((exercise) => exercise.exercise_id);

  const sets = exerciseIds.length > 0 ? await getPlannedSets(exerciseIds) : [];
  const libraryExercises =
    libraryIds.length > 0 ? await getLibraryExercises(libraryIds) : [];

  return {
    day,
    week,
    sections,
    exercises,
    libraryExercises,
    sets,
  };
}

async function getPlannedSets(exerciseIds: string[]) {
  const result = await supabase
    .from("planned_exercise_sets")
    .select(
      "id,program_day_exercise_id,set_number,set_kind,target_weight_value,target_weight_unit,target_reps_exact,target_reps_min,target_reps_max,target_duration_seconds,rest_seconds",
    )
    .in("program_day_exercise_id", exerciseIds)
    .order("set_number", { ascending: true });

  return requireList(
    result.data as PlannedExerciseSetRow[] | null,
    result.error,
    "Planned exercise sets could not be loaded.",
  );
}

async function getLibraryExercises(libraryIds: string[]) {
  const result = await supabase
    .from("exercise_library")
    .select(
      "id,slug,name,name_translations,modality,category,primary_muscles",
    )
    .in("id", libraryIds);

  return requireList(
    result.data as ExerciseLibraryRow[] | null,
    result.error,
    "Exercise library could not be loaded.",
  );
}

async function getExerciseCount(programDayId: string, sectionIds: string[]) {
  let query = supabase
    .from("program_day_exercises")
    .select("id", { count: "exact", head: true })
    .eq("program_day_id", programDayId);

  if (sectionIds.length > 0) {
    query = query.in("section_id", sectionIds);
  }

  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.count ?? 0;
}

/**
 * One summary row per completed program day for a user — the program_day_id
 * plus the duration of the latest completed session for that day. A day can
 * have multiple completed sessions if the user re-played it; we keep only the
 * most recent (matches getCompletedSessionDetail's "latest by completed_at"
 * semantics).
 */
export type CompletedSessionSummary = {
  programDayId: string;
  durationMinutes: number;
};

export async function getCompletedSessionSummaries(
  userId: string,
): Promise<CompletedSessionSummary[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("program_day_id, duration_seconds, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("program_day_id", "is", null)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);

  const latestByDay = new Map<string, CompletedSessionSummary>();
  for (const row of data ?? []) {
    const programDayId = row.program_day_id as string | null;
    if (!programDayId || latestByDay.has(programDayId)) continue;
    latestByDay.set(programDayId, {
      programDayId,
      durationMinutes: Math.round((row.duration_seconds ?? 0) / 60),
    });
  }
  return Array.from(latestByDay.values());
}

/**
 * Returns MAX(updated_at) across all 8 workout-plan tables.
 * Used on app foreground to detect admin-side changes without refetching the
 * whole bootstrap. Returns null on network/RPC failure so callers can silently
 * skip the freshness check and keep the cached plan.
 */
export async function getProgramVersion(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_program_version");
  if (error) {
    console.warn("[getProgramVersion]", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}
