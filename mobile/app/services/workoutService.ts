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

export const RAMI_TEMPLATE_PROGRAM_ID = "2a87094c-260a-4a1b-95f6-7de8d5300001";
export const RAMI_TEMPLATE_DAY_ID = "2a87094c-260a-4a1b-95f6-7de8d5300201";

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
  programId = RAMI_TEMPLATE_PROGRAM_ID,
): Promise<WorkoutOverviewData> {
  const programResult = await supabase
    .from("workout_programs")
    .select(
      "id,title,title_translations,subtitle,subtitle_translations,duration_weeks,days_per_week",
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
      "id,program_id,week_number,title,title_translations,focus,focus_translations,notes,notes_translations",
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
      "id,program_id,week_id,day_number,weekday,workout_kind,title,title_translations,subtitle,subtitle_translations,target_muscles,estimated_minutes,points_available,is_rest_day,sort_order",
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

export async function getProgramDayDetail(
  programDayId = RAMI_TEMPLATE_DAY_ID,
): Promise<ProgramDayDetailData> {
  const dayResult = await supabase
    .from("program_days")
    .select(
      "id,program_id,week_id,day_number,weekday,workout_kind,title,title_translations,subtitle,subtitle_translations,target_muscles,estimated_minutes,points_available,is_rest_day,sort_order",
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
      "id,program_id,week_number,title,title_translations,focus,focus_translations,notes,notes_translations",
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
      "id,program_day_id,section_kind,title,title_translations,description,description_translations,sort_order",
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
      "id,program_day_id,section_id,exercise_id,sort_order,display_name,display_name_translations,target_summary,target_summary_translations,initial_weight_value,initial_weight_unit,default_rest_seconds,coach_notes,coach_notes_translations",
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
      "id,program_day_exercise_id,set_number,set_kind,target_weight_value,target_weight_unit,target_reps_exact,target_reps_min,target_reps_max,target_duration_seconds,target_speed_value,target_incline_percent,display_label,display_label_translations,rest_seconds",
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
      "id,slug,name,name_translations,modality,category,primary_muscles,secondary_muscles",
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

/** Get program_day_ids of all completed workout sessions for a user. */
export async function getCompletedSessionDayIds(
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("program_day_id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("program_day_id", "is", null);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => row.program_day_id as string)
    .filter(Boolean);
}
