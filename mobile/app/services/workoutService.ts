import type {
  ActiveWorkoutSessionSnapshot,
  ExerciseLibraryRow,
  PlannedExerciseSetRow,
  ProgramDayDetailData,
  ProgramDayExerciseRow,
  ProgramDayRow,
  ProgramDaySectionRow,
  ProgramWeekRow,
  SessionExerciseRow,
  WorkoutSessionRow,
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

const WORKOUT_SESSION_SELECT =
  "id,user_id,scheduled_workout_id,program_day_id,status,started_at,completed_at,duration_seconds,current_exercise_index,total_exercises,exercises_completed,sets_logged,points_awarded,session_notes,created_at,updated_at";

const SESSION_EXERCISE_SELECT =
  "id,session_id,program_day_exercise_id,exercise_id,section_kind,sort_order,display_name_snapshot,category_snapshot,muscle_snapshot,status,started_at,completed_at,skipped_reason,comment,created_at,updated_at";

const startSessionRequests = new Map<string, Promise<ActiveWorkoutSessionSnapshot>>();

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

export async function startOrResumeWorkoutSession(
  programDayId: string,
): Promise<ActiveWorkoutSessionSnapshot> {
  const userId = await getCurrentUserId();
  const requestKey = `${userId}:${programDayId}`;
  const existingRequest = startSessionRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = startOrResumeWorkoutSessionRequest(userId, programDayId)
    .finally(() => {
      if (startSessionRequests.get(requestKey) === request) {
        startSessionRequests.delete(requestKey);
      }
    });

  startSessionRequests.set(requestKey, request);
  return request;
}

async function startOrResumeWorkoutSessionRequest(
  userId: string,
  programDayId: string,
): Promise<ActiveWorkoutSessionSnapshot> {
  const dayDetail = await getProgramDayDetail(programDayId);
  const orderedExercises = getOrderedPlannedExercises(dayDetail);
  const existingSession = await getCanonicalActiveWorkoutSession(userId, programDayId);

  let session = existingSession ??
    await createWorkoutSession(userId, programDayId, orderedExercises.length);
  session = await getCanonicalActiveWorkoutSession(userId, programDayId) ?? session;

  const sessionExercises = await hydrateSessionExercises(session.id, dayDetail);

  if (session.total_exercises !== sessionExercises.length) {
    session = await updateWorkoutSessionTotal(session.id, sessionExercises.length);
  }

  return {
    session,
    sessionExercises,
    programDayDetail: dayDetail,
  };
}

export async function getActiveWorkoutSessionSnapshot(
  programDayId: string,
): Promise<ActiveWorkoutSessionSnapshot | null> {
  const userId = await getCurrentUserId();
  const session = await getCanonicalActiveWorkoutSession(userId, programDayId);

  if (!session) {
    return null;
  }

  const dayDetail = await getProgramDayDetail(programDayId);
  const sessionExercises = await hydrateSessionExercises(session.id, dayDetail);
  const hydratedSession = session.total_exercises === sessionExercises.length
    ? session
    : await updateWorkoutSessionTotal(session.id, sessionExercises.length);

  return {
    session: hydratedSession,
    sessionExercises,
    programDayDetail: dayDetail,
  };
}

export async function getWorkoutSessionSnapshot(
  sessionId: string,
): Promise<ActiveWorkoutSessionSnapshot> {
  const session = await getWorkoutSession(sessionId);

  if (!session) {
    throw new Error("Workout session was not found.");
  }

  const [sessionExercises, programDayDetail] = await Promise.all([
    getSessionExercises(session.id),
    session.program_day_id ? getProgramDayDetail(session.program_day_id) : null,
  ]);

  return {
    session,
    sessionExercises,
    programDayDetail,
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

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to start a workout.");
  }

  return data.user.id;
}

async function getCanonicalActiveWorkoutSession(userId: string, programDayId: string) {
  const sessions = await findActiveWorkoutSessions(userId, programDayId);
  const [canonicalSession, ...duplicateSessions] = sessions;

  if (duplicateSessions.length > 0) {
    await retireDuplicateWorkoutSessions(
      duplicateSessions.map((session) => session.id),
      canonicalSession.id,
    );
  }

  return canonicalSession ?? null;
}

async function findActiveWorkoutSessions(userId: string, programDayId: string) {
  const result = await supabase
    .from("workout_sessions")
    .select(WORKOUT_SESSION_SELECT)
    .eq("user_id", userId)
    .eq("program_day_id", programDayId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: true })
    .order("id", { ascending: true });

  return requireList(
    result.data as WorkoutSessionRow[] | null,
    result.error,
    "Active workout session could not be loaded.",
  );
}

async function getWorkoutSession(sessionId: string) {
  const result = await supabase
    .from("workout_sessions")
    .select(WORKOUT_SESSION_SELECT)
    .eq("id", sessionId)
    .limit(1);

  const sessions = requireList(
    result.data as WorkoutSessionRow[] | null,
    result.error,
    "Workout session could not be loaded.",
  );

  return sessions[0] ?? null;
}

async function retireDuplicateWorkoutSessions(
  duplicateSessionIds: string[],
  canonicalSessionId: string,
) {
  if (duplicateSessionIds.length === 0) {
    return;
  }

  const result = await supabase
    .from("workout_sessions")
    .update({
      status: "skipped",
      session_notes: `Superseded by active session ${canonicalSessionId}.`,
    })
    .in("id", duplicateSessionIds);

  if (result.error) {
    throw new Error(
      result.error.message ?? "Duplicate workout sessions could not be retired.",
    );
  }
}

async function createWorkoutSession(
  userId: string,
  programDayId: string,
  totalExercises: number,
) {
  const result = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      program_day_id: programDayId,
      status: "in_progress",
      current_exercise_index: 1,
      total_exercises: totalExercises,
    })
    .select(WORKOUT_SESSION_SELECT)
    .single();

  return requireData(
    result.data as WorkoutSessionRow | null,
    result.error,
    "Workout session could not be created.",
  );
}

async function updateWorkoutSessionTotal(sessionId: string, totalExercises: number) {
  const result = await supabase
    .from("workout_sessions")
    .update({ total_exercises: totalExercises })
    .eq("id", sessionId)
    .select(WORKOUT_SESSION_SELECT)
    .single();

  return requireData(
    result.data as WorkoutSessionRow | null,
    result.error,
    "Workout session could not be updated.",
  );
}

async function getSessionExercises(sessionId: string) {
  const result = await supabase
    .from("session_exercises")
    .select(SESSION_EXERCISE_SELECT)
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  return requireList(
    result.data as SessionExerciseRow[] | null,
    result.error,
    "Workout session exercises could not be loaded.",
  );
}

async function hydrateSessionExercises(
  sessionId: string,
  dayDetail: ProgramDayDetailData,
) {
  const existingExercises = await getSessionExercises(sessionId);

  if (existingExercises.length > 0) {
    return existingExercises;
  }

  const orderedExercises = getOrderedPlannedExercises(dayDetail);

  if (orderedExercises.length === 0) {
    return [];
  }

  const libraryById = new Map(
    dayDetail.libraryExercises.map((exercise) => [exercise.id, exercise]),
  );
  const startedAt = new Date().toISOString();
  const rows = orderedExercises.map(({ exercise, section }, index) => {
    const libraryExercise = libraryById.get(exercise.exercise_id);

    return {
      session_id: sessionId,
      program_day_exercise_id: exercise.id,
      exercise_id: exercise.exercise_id,
      section_kind: section.section_kind,
      sort_order: index + 1,
      display_name_snapshot:
        exercise.display_name ?? libraryExercise?.name ?? "Exercise",
      category_snapshot: libraryExercise?.category ?? null,
      muscle_snapshot: libraryExercise?.primary_muscles ?? [],
      status: index === 0 ? "in_progress" : "pending",
      started_at: index === 0 ? startedAt : null,
    };
  });

  const result = await supabase
    .from("session_exercises")
    .insert(rows)
    .select(SESSION_EXERCISE_SELECT)
    .order("sort_order", { ascending: true });

  return requireList(
    result.data as SessionExerciseRow[] | null,
    result.error,
    "Workout session exercises could not be created.",
  );
}

function getOrderedPlannedExercises(dayDetail: ProgramDayDetailData) {
  const sections = [...dayDetail.sections].sort((a, b) => a.sort_order - b.sort_order);

  return sections.flatMap((section) =>
    dayDetail.exercises
      .filter((exercise) => exercise.section_id === section.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((exercise) => ({ exercise, section })),
  );
}
