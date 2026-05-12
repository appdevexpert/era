import "server-only";

import { getAdminClient } from "@/lib/admin/supabase";
import type {
  AdminDataState,
  PaginatedDataState,
  DashboardStats,
  DayExerciseRow,
  DaySectionRow,
  ExerciseRow,
  PlannedSetRow,
  ProfileRow,
  ProgramDayRow,
  ProgramDetail,
  ProgramRow,
  ProgramWeekRow,
} from "@/lib/admin/types";

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalExercises: 0,
  totalPrograms: 0,
  activePrograms: 0,
  draftPrograms: 0,
};

async function rowCount(
  supabase: NonNullable<ReturnType<typeof getAdminClient>["supabase"]>,
  table: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function getDashboardStats(): Promise<AdminDataState<DashboardStats>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: EMPTY_STATS, configError };

  const activeSince = new Date();
  activeSince.setDate(activeSince.getDate() - 30);

  const [
    totalUsers,
    totalExercises,
    totalPrograms,
    activePrograms,
    draftPrograms,
    activeSessions,
  ] = await Promise.all([
    rowCount(supabase, "profiles"),
    rowCount(supabase, "exercise_library"),
    rowCount(supabase, "workout_programs"),
    supabase
      .from("workout_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("workout_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("workout_sessions")
      .select("user_id")
      .gte("started_at", activeSince.toISOString()),
  ]);

  const activeUsers = new Set(
    (activeSessions.data ?? [])
      .map((session) => session.user_id as string | null)
      .filter(Boolean),
  ).size;

  return {
    data: {
      totalUsers,
      activeUsers,
      totalExercises,
      totalPrograms,
      activePrograms: activePrograms.count ?? 0,
      draftPrograms: draftPrograms.count ?? 0,
    },
    configError: null,
  };
}

const DEFAULT_PAGE_SIZE = 20;

export async function getExercises(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedDataState<ExerciseRow[]>> {
  const empty = { data: [] as ExerciseRow[], configError: null as string | null, page, pageSize, totalCount: 0, totalPages: 0 };
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { ...empty, configError };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("exercise_library")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  const totalCount = count ?? 0;

  return {
    data: error ? [] : (data as ExerciseRow[]),
    configError: error?.message ?? null,
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getExercise(id?: string): Promise<AdminDataState<ExerciseRow | null>> {
  if (!id) return { data: null, configError: null };

  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: null, configError };

  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: error ? null : (data as ExerciseRow | null),
    configError: error?.message ?? null,
  };
}

export async function getPrograms(): Promise<AdminDataState<ProgramRow[]>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: [], configError };

  const [programsResult, weeksResult, daysResult] = await Promise.all([
    supabase
      .from("workout_programs")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("program_weeks").select("id, program_id"),
    supabase.from("program_days").select("id, program_id"),
  ]);

  const weeks = weeksResult.data ?? [];
  const days = daysResult.data ?? [];

  const programs = ((programsResult.data ?? []) as ProgramRow[]).map((program) => ({
    ...program,
    weekCount: weeks.filter((week) => week.program_id === program.id).length,
    dayCount: days.filter((day) => day.program_id === program.id).length,
  }));

  return {
    data: programs,
    configError:
      programsResult.error?.message ??
      weeksResult.error?.message ??
      daysResult.error?.message ??
      null,
  };
}

export async function getProgram(id?: string): Promise<AdminDataState<ProgramRow | null>> {
  if (!id) return { data: null, configError: null };

  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: null, configError };

  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: error ? null : (data as ProgramRow | null),
    configError: error?.message ?? null,
  };
}

export async function getUsers(): Promise<AdminDataState<ProfileRow[]>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: [], configError };

  const [profilesResult, assignmentsResult, authUsersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_program_assignments")
      .select("id, user_id")
      .eq("status", "active"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const assignments = assignmentsResult.data ?? [];
  const authUsers = authUsersResult.data?.users ?? [];

  const users = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    email: authUsers.find((user) => user.id === profile.id)?.email,
    active_assignment_count: assignments.filter(
      (assignment) => assignment.user_id === profile.id,
    ).length,
  }));

  return {
    data: users,
    configError:
      profilesResult.error?.message ??
      assignmentsResult.error?.message ??
      authUsersResult.error?.message ??
      null,
  };
}

export async function getProgramDetail(
  programId: string,
): Promise<AdminDataState<ProgramDetail>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) {
    return {
      data: {
        program: null,
        weeks: [],
        days: [],
        sections: [],
        dayExercises: [],
        sets: [],
        exercises: [],
      },
      configError,
    };
  }

  const [
    programResult,
    weeksResult,
    daysResult,
    sectionsResult,
    dayExercisesResult,
    setsResult,
    exercisesResult,
  ] = await Promise.all([
    supabase
      .from("workout_programs")
      .select("*")
      .eq("id", programId)
      .maybeSingle(),
    supabase
      .from("program_weeks")
      .select("*")
      .eq("program_id", programId)
      .order("week_number"),
    supabase
      .from("program_days")
      .select("*")
      .eq("program_id", programId)
      .order("sort_order"),
    supabase
      .from("program_day_sections")
      .select("*")
      .order("sort_order"),
    supabase
      .from("program_day_exercises")
      .select("*, exercise_library(name, name_translations)")
      .order("sort_order"),
    supabase
      .from("planned_exercise_sets")
      .select("*")
      .order("set_number"),
    supabase
      .from("exercise_library")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);

  const dayIds = new Set(((daysResult.data ?? []) as ProgramDayRow[]).map((day) => day.id));
  const dayExerciseIds = new Set(
    ((dayExercisesResult.data ?? []) as DayExerciseRow[])
      .filter((row) => dayIds.has(row.program_day_id))
      .map((row) => row.id),
  );

  return {
    data: {
      program: programResult.error ? null : (programResult.data as ProgramRow | null),
      weeks: (weeksResult.data ?? []) as ProgramWeekRow[],
      days: (daysResult.data ?? []) as ProgramDayRow[],
      sections: ((sectionsResult.data ?? []) as DaySectionRow[]).filter((section) =>
        dayIds.has(section.program_day_id),
      ),
      dayExercises: ((dayExercisesResult.data ?? []) as DayExerciseRow[]).filter((row) =>
        dayIds.has(row.program_day_id),
      ),
      sets: ((setsResult.data ?? []) as PlannedSetRow[]).filter((set) =>
        dayExerciseIds.has(set.program_day_exercise_id),
      ),
      exercises: (exercisesResult.data ?? []) as ExerciseRow[],
    },
    configError:
      programResult.error?.message ??
      weeksResult.error?.message ??
      daysResult.error?.message ??
      sectionsResult.error?.message ??
      dayExercisesResult.error?.message ??
      setsResult.error?.message ??
      exercisesResult.error?.message ??
      null,
  };
}
