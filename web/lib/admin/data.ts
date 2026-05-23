import "server-only";

import { getAdminClient } from "@/lib/admin/supabase";
import type {
  AdminDataState,
  PaginatedDataState,
  DashboardStats,
  DayExerciseRow,
  DaySectionRow,
  ExerciseRow,
  MealLibraryRow,
  MealProgramDetail,
  MealProgramPhaseDayItemRow,
  MealProgramPhaseDayRow,
  MealProgramPhaseRow,
  MealProgramRow,
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

export type RecentUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  active_assignment_count: number;
  created_at: string | null;
};

export async function getRecentUsers(
  windowDays = 7,
  limit = 20,
): Promise<AdminDataState<RecentUser[]>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: [], configError };

  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceMs = since.getTime();

  const [authResult, profilesResult, assignmentsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase.from("profiles").select("id, full_name, avatar_url, role"),
    supabase
      .from("user_program_assignments")
      .select("id, user_id")
      .eq("status", "active"),
  ]);

  const profilesById = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id as string,
      {
        full_name: p.full_name as string | null,
        avatar_url: p.avatar_url as string | null,
        role: (p.role as string | null) ?? "user",
      },
    ]),
  );

  const assignmentsByUser = new Map<string, number>();
  for (const row of assignmentsResult.data ?? []) {
    const uid = row.user_id as string | null;
    if (!uid) continue;
    assignmentsByUser.set(uid, (assignmentsByUser.get(uid) ?? 0) + 1);
  }

  const users = (authResult.data?.users ?? [])
    .filter((u) => u.created_at && new Date(u.created_at).getTime() >= sinceMs)
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, limit)
    .map<RecentUser>((u) => {
      const profile = profilesById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        role: profile?.role ?? "user",
        active_assignment_count: assignmentsByUser.get(u.id) ?? 0,
        created_at: u.created_at ?? null,
      };
    });

  return {
    data: users,
    configError:
      authResult.error?.message ??
      profilesResult.error?.message ??
      assignmentsResult.error?.message ??
      null,
  };
}

export type DashboardActivityPoint = {
  date: string;
  programs: number;
  exercises: number;
  users: number;
};

export async function getDashboardActivity(
  windowDays = 90,
): Promise<AdminDataState<DashboardActivityPoint[]>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: [], configError };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (windowDays - 1));

  const [programsResult, exercisesResult, profilesResult] = await Promise.all([
    supabase
      .from("workout_programs")
      .select("created_at")
      .gte("created_at", since.toISOString()),
    supabase
      .from("exercise_library")
      .select("created_at")
      .gte("created_at", since.toISOString()),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", since.toISOString()),
  ]);

  const buckets = new Map<string, DashboardActivityPoint>();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, programs: 0, exercises: 0, users: 0 });
  }

  function tally(rows: { created_at?: string | null }[] | null | undefined, key: "programs" | "exercises" | "users") {
    for (const row of rows ?? []) {
      const day = row.created_at?.slice(0, 10);
      if (!day) continue;
      const bucket = buckets.get(day);
      if (bucket) bucket[key]++;
    }
  }
  tally(programsResult.data, "programs");
  tally(exercisesResult.data, "exercises");
  tally(profilesResult.data, "users");

  return {
    data: Array.from(buckets.values()),
    configError:
      programsResult.error?.message ??
      exercisesResult.error?.message ??
      profilesResult.error?.message ??
      null,
  };
}

const DEFAULT_PAGE_SIZE = 20;

export type ExerciseStatusFilter = "all" | "active" | "inactive";

export async function getExercises(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search = "",
  statusFilter: ExerciseStatusFilter = "all",
): Promise<PaginatedDataState<ExerciseRow[]>> {
  const empty = { data: [] as ExerciseRow[], configError: null as string | null, page, pageSize, totalCount: 0, totalPages: 0 };
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { ...empty, configError };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("exercise_library")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (statusFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;

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

// ---------------------------------------------------------------------------
// Nutrition — meal library
// ---------------------------------------------------------------------------

export type MealLibraryStatusFilter = "all" | "active" | "inactive";

export async function getMealLibrary(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search = "",
  statusFilter: MealLibraryStatusFilter = "all",
): Promise<PaginatedDataState<MealLibraryRow[]>> {
  const empty = {
    data: [] as MealLibraryRow[],
    configError: null as string | null,
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
  };
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { ...empty, configError };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("meal_library")
    .select("*", { count: "exact" })
    .order("category", { ascending: true })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("slug", `%${search}%`);
  }
  if (statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (statusFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;
  const totalCount = count ?? 0;

  return {
    data: error ? [] : (data as MealLibraryRow[]),
    configError: error?.message ?? null,
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getMealLibraryItem(
  id?: string,
): Promise<AdminDataState<MealLibraryRow | null>> {
  if (!id) return { data: null, configError: null };

  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: null, configError };

  const { data, error } = await supabase
    .from("meal_library")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: error ? null : (data as MealLibraryRow | null),
    configError: error?.message ?? null,
  };
}

// ---------------------------------------------------------------------------
// Nutrition — meal programs (list + detail with phases/days/items)
// ---------------------------------------------------------------------------

export async function getMealPrograms(): Promise<AdminDataState<MealProgramRow[]>> {
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: [], configError };

  const [programsResult, phasesResult, itemsResult] = await Promise.all([
    supabase
      .from("meal_programs")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("meal_program_phases").select("id, meal_program_id"),
    supabase
      .from("meal_program_phase_day_items")
      .select(
        "id, meal_program_phase_days!inner(meal_program_phases!inner(meal_program_id))",
      ),
  ]);

  const phases = phasesResult.data ?? [];

  type ItemRow = {
    id: string;
    meal_program_phase_days?: {
      meal_program_phases?: { meal_program_id?: string } | null;
    } | null;
  };
  const itemsByProgram = new Map<string, number>();
  (itemsResult.data ?? []).forEach((row) => {
    const item = row as ItemRow;
    const programId = item.meal_program_phase_days?.meal_program_phases?.meal_program_id;
    if (programId) {
      itemsByProgram.set(programId, (itemsByProgram.get(programId) ?? 0) + 1);
    }
  });

  const programs = ((programsResult.data ?? []) as MealProgramRow[]).map(
    (program) => ({
      ...program,
      phaseCount: phases.filter((p) => p.meal_program_id === program.id).length,
      itemCount: itemsByProgram.get(program.id) ?? 0,
    }),
  );

  return {
    data: programs,
    configError:
      programsResult.error?.message ??
      phasesResult.error?.message ??
      itemsResult.error?.message ??
      null,
  };
}

export async function getMealProgram(
  id?: string,
): Promise<AdminDataState<MealProgramRow | null>> {
  if (!id) return { data: null, configError: null };

  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: null, configError };

  const { data, error } = await supabase
    .from("meal_programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return {
    data: error ? null : (data as MealProgramRow | null),
    configError: error?.message ?? null,
  };
}

export async function getMealProgramDetail(
  programId: string,
): Promise<AdminDataState<MealProgramDetail>> {
  const empty: MealProgramDetail = {
    program: null,
    phases: [],
    phaseDays: [],
    phaseDayItems: [],
    library: [],
  };
  const { supabase, configError } = getAdminClient();
  if (!supabase) return { data: empty, configError };

  const [programResult, phasesResult, libraryResult] = await Promise.all([
    supabase
      .from("meal_programs")
      .select("*")
      .eq("id", programId)
      .maybeSingle(),
    supabase
      .from("meal_program_phases")
      .select("*")
      .eq("meal_program_id", programId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("meal_library")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("updated_at", { ascending: false }),
  ]);

  const phases = (phasesResult.data ?? []) as MealProgramPhaseRow[];
  const phaseIds = phases.map((p) => p.id);

  const phaseDaysResult = phaseIds.length
    ? await supabase
        .from("meal_program_phase_days")
        .select("*")
        .in("meal_program_phase_id", phaseIds)
        .order("day_of_week", { ascending: true })
    : { data: [] as MealProgramPhaseDayRow[], error: null };

  const phaseDays = (phaseDaysResult.data ?? []) as MealProgramPhaseDayRow[];
  const phaseDayIds = phaseDays.map((d) => d.id);

  const itemsResult = phaseDayIds.length
    ? await supabase
        .from("meal_program_phase_day_items")
        .select(
          "*, meal_library:meal_library_id(name_translations, category, kcal)",
        )
        .in("meal_program_phase_day_id", phaseDayIds)
        .order("sort_order", { ascending: true })
    : { data: [] as MealProgramPhaseDayItemRow[], error: null };

  return {
    data: {
      program: (programResult.data ?? null) as MealProgramRow | null,
      phases,
      phaseDays,
      phaseDayItems: (itemsResult.data ?? []) as MealProgramPhaseDayItemRow[],
      library: (libraryResult.data ?? []) as MealLibraryRow[],
    },
    configError:
      programResult.error?.message ??
      phasesResult.error?.message ??
      libraryResult.error?.message ??
      null,
  };
}
