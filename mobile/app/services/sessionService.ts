/**
 * Supabase write functions for workout session logging.
 * Follows the same pattern as workoutService.ts.
 */

import type {
  CompletedExerciseView,
  CompletedSessionDetail,
  CompletedSetView,
  ExerciseHistoryRaw,
  ExerciseSummaryRaw,
  SessionExercise,
  SessionExerciseSet,
  SessionSetHistoryRow,
} from "@/app/types/workout";
import { supabase } from "@/app/utils/auth";

/* ─── Helpers ─── */

const throwIfError = (error: { message?: string } | null, fallback: string) => {
  if (error) throw new Error(error.message ?? fallback);
};

/* ─── Session lifecycle ─── */

export async function createWorkoutSession(params: {
  userId: string;
  programDayId: string;
  totalExercises: number;
}) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: params.userId,
      program_day_id: params.programDayId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      total_exercises: params.totalExercises,
      exercises_completed: 0,
      sets_logged: 0,
    })
    .select("id")
    .single();

  throwIfError(error, "Failed to create workout session");
  return data!;
}

/**
 * Look up any existing session row for this user + program_day.
 * Returns null when nothing exists. The unique index guarantees at most one row.
 */
export async function findExistingSession(params: {
  userId: string;
  programDayId: string;
}): Promise<{ id: string; status: "in_progress" | "completed" | "abandoned" } | null> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("user_id", params.userId)
    .eq("program_day_id", params.programDayId)
    .maybeSingle();

  if (error) throw new Error(error.message ?? "Failed to look up workout session");
  if (!data) return null;
  return { id: data.id as string, status: data.status as "in_progress" | "completed" | "abandoned" };
}

/**
 * Re-hydrate an in_progress session: read existing session_exercises + session_sets
 * and rebuild the exerciseMap / setMap that Redux needs.
 * Returns null when no children exist (corrupt session — caller should self-heal).
 */
export async function loadSessionState(sessionId: string): Promise<{
  exerciseMap: Record<string, string>;
  setMap: Record<string, string[]>;
} | null> {
  const { data: exRows, error: exError } = await supabase
    .from("session_exercises")
    .select("id, program_day_exercise_id")
    .eq("session_id", sessionId);

  if (exError) throw new Error(exError.message ?? "Failed to load session exercises");
  if (!exRows || exRows.length === 0) return null;

  const sessionExerciseIds = exRows.map((r) => r.id as string);
  const { data: setRows, error: setError } = await supabase
    .from("session_sets")
    .select("id, set_number, session_exercise_id")
    .in("session_exercise_id", sessionExerciseIds)
    .order("set_number", { ascending: true });

  if (setError) throw new Error(setError.message ?? "Failed to load session sets");

  const exerciseMap: Record<string, string> = {};
  for (const row of exRows) {
    if (row.program_day_exercise_id) {
      exerciseMap[row.program_day_exercise_id as string] = row.id as string;
    }
  }

  const setMap: Record<string, string[]> = {};
  for (const row of setRows ?? []) {
    const seId = row.session_exercise_id as string;
    if (!setMap[seId]) setMap[seId] = [];
    setMap[seId].push(row.id as string);
  }

  return { exerciseMap, setMap };
}

/** Hard-delete a session row (cascade removes children). Used to self-heal corrupt sessions. */
export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);
  throwIfError(error, "Failed to delete workout session");
}

export async function createSessionExercises(
  sessionId: string,
  exercises: SessionExercise[],
) {
  const rows = exercises.map((ex, i) => ({
    session_id: sessionId,
    program_day_exercise_id: ex.id,
    exercise_id: ex.exerciseLibraryId,
    section_kind: ex.sectionKind,
    sort_order: i + 1,
    display_name_snapshot: ex.name,
    category_snapshot: ex.exerciseCategory,
    status: "pending",
  }));

  const { data, error } = await supabase
    .from("session_exercises")
    .insert(rows)
    .select("id, program_day_exercise_id");

  throwIfError(error, "Failed to create session exercises");
  return data ?? [];
}

export async function createSessionSets(
  sessionExerciseId: string,
  sets: SessionExerciseSet[],
) {
  const rows = sets.map((s) => ({
    session_exercise_id: sessionExerciseId,
    planned_set_id: s.id,
    set_number: s.setNumber,
    set_kind: s.setKind,
    target_weight_value: s.targetWeight,
    target_weight_unit: s.targetWeightUnit,
    target_reps_exact: s.targetReps,
    target_reps_min: s.targetRepsMin,
    target_reps_max: s.targetRepsMax,
    target_duration_seconds: s.targetDuration,
    rest_seconds_planned: s.restSeconds,
    display_label: s.displayLabel,
    status: "planned",
  }));

  const { data, error } = await supabase
    .from("session_sets")
    .insert(rows)
    .select("id, set_number, planned_set_id");

  throwIfError(error, "Failed to create session sets");
  return data ?? [];
}

/** Create a single dynamically-added set (no planned_set_id). */
export async function createSingleSessionSet(
  sessionExerciseId: string,
  setNumber: number,
  template: Partial<SessionExerciseSet>,
) {
  const { data, error } = await supabase
    .from("session_sets")
    .insert({
      session_exercise_id: sessionExerciseId,
      planned_set_id: null,
      set_number: setNumber,
      set_kind: template.setKind ?? "working",
      target_weight_value: template.targetWeight ?? null,
      target_weight_unit: template.targetWeightUnit ?? "kg",
      target_reps_exact: template.targetReps ?? null,
      target_reps_min: template.targetRepsMin ?? null,
      target_reps_max: template.targetRepsMax ?? null,
      target_duration_seconds: template.targetDuration ?? null,
      rest_seconds_planned: template.restSeconds ?? null,
      display_label: null,
      status: "planned",
    })
    .select("id, set_number")
    .single();

  throwIfError(error, "Failed to add session set");
  return data!;
}

/* ─── Set logging ─── */

export async function logSet(params: {
  sessionSetId: string;
  loggedWeight: number | null;
  loggedWeightUnit: string;
  loggedReps: number | null;
  loggedDuration: number | null;
  feedback: "light_weight" | "correct_weight" | "felt_heavy" | null;
  comment: string | null;
  isBestSet: boolean;
  isPersonalRecord: boolean;
  previousBestWeight: number | null;
  previousBestReps: number | null;
  restSecondsTaken: number | null;
}) {
  const { data, error } = await supabase
    .from("session_sets")
    .update({
      logged_weight_value: params.loggedWeight,
      logged_weight_unit: params.loggedWeightUnit,
      logged_reps: params.loggedReps,
      logged_duration_seconds: params.loggedDuration,
      perceived_feedback: params.feedback,
      comment: params.comment,
      is_best_set: params.isBestSet,
      is_personal_record: params.isPersonalRecord,
      previous_best_weight_value: params.previousBestWeight,
      previous_best_reps: params.previousBestReps,
      rest_seconds_taken: params.restSecondsTaken,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.sessionSetId)
    .select("id")
    .single();

  throwIfError(error, "Failed to log set");
  return data!;
}

/* ─── Exercise completion ─── */

export async function completeExercise(
  sessionExerciseId: string,
  comment?: string,
) {
  const { error } = await supabase
    .from("session_exercises")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      comment: comment ?? null,
    })
    .eq("id", sessionExerciseId);

  throwIfError(error, "Failed to complete exercise");
}

export async function skipExercise(sessionExerciseId: string) {
  const { error } = await supabase
    .from("session_exercises")
    .update({ status: "skipped" })
    .eq("id", sessionExerciseId);

  throwIfError(error, "Failed to skip exercise");
}

/* ─── Session completion ─── */

export async function completeSession(params: {
  sessionId: string;
  durationSeconds: number;
  exercisesCompleted: number;
  setsLogged: number;
  pointsAwarded?: number;
}) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_seconds: params.durationSeconds,
      exercises_completed: params.exercisesCompleted,
      sets_logged: params.setsLogged,
      points_awarded: params.pointsAwarded ?? 0,
    })
    .eq("id", params.sessionId);

  throwIfError(error, "Failed to complete session");
}

/* ─── Cardio logging ─── */

export async function logCardio(params: {
  sessionExerciseId: string;
  plannedSetId?: string;
  durationSeconds: number;
  distanceValue?: number;
  distanceUnit?: string;
  speedAvg?: number;
  inclinePercent?: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("session_cardio_logs")
    .insert({
      session_exercise_id: params.sessionExerciseId,
      planned_set_id: params.plannedSetId ?? null,
      started_at: new Date(Date.now() - params.durationSeconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: params.durationSeconds,
      distance_value: params.distanceValue ?? null,
      distance_unit: params.distanceUnit ?? null,
      speed_avg_value: params.speedAvg ?? null,
      incline_percent: params.inclinePercent ?? null,
      notes: params.notes ?? null,
    })
    .select("id")
    .single();

  throwIfError(error, "Failed to log cardio");
  return data!;
}

/* ─── User exercise stats ─── */

export async function fetchUserExerciseStats(
  userId: string,
  exerciseIds: string[],
) {
  if (exerciseIds.length === 0) return new Map<string, UserExerciseStat>();

  const { data, error } = await supabase
    .from("user_exercise_stats")
    .select("*")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds);

  throwIfError(error, "Failed to fetch exercise stats");

  const map = new Map<string, UserExerciseStat>();
  for (const row of data ?? []) {
    map.set(row.exercise_id, row as UserExerciseStat);
  }
  return map;
}

export interface UserExerciseStat {
  user_id: string;
  exercise_id: string;
  last_weight_value: number | null;
  last_weight_unit: string | null;
  last_reps: number | null;
  last_duration_seconds: number | null;
  last_set_feedback: string | null;
  best_weight_value: number | null;
  best_weight_unit: string | null;
  best_reps: number | null;
  best_estimated_one_rep_max: number | null;
  last_logged_at: string | null;
}

export async function upsertUserExerciseStat(params: {
  userId: string;
  exerciseId: string;
  lastWeight: number | null;
  lastWeightUnit: string;
  lastReps: number | null;
  lastDuration: number | null;
  lastFeedback: string | null;
  sessionSetId: string | null;
  isBest: boolean;
  bestWeight?: number | null;
  bestReps?: number | null;
  bestSessionSetId?: string | null;
}) {
  const upsertData: Record<string, unknown> = {
    user_id: params.userId,
    exercise_id: params.exerciseId,
    last_weight_value: params.lastWeight,
    last_weight_unit: params.lastWeightUnit,
    last_reps: params.lastReps,
    last_duration_seconds: params.lastDuration,
    last_set_feedback: params.lastFeedback,
    last_set_session_set_id: params.sessionSetId,
    last_logged_at: new Date().toISOString(),
  };

  if (params.isBest) {
    upsertData.best_weight_value = params.bestWeight ?? params.lastWeight;
    upsertData.best_weight_unit = params.lastWeightUnit;
    upsertData.best_reps = params.bestReps ?? params.lastReps;
    upsertData.best_set_session_set_id = params.bestSessionSetId ?? params.sessionSetId;
  }

  const { error } = await supabase
    .from("user_exercise_stats")
    .upsert(upsertData, { onConflict: "user_id,exercise_id" });

  throwIfError(error, "Failed to upsert exercise stats");
}

/* ─── Personal records ─── */

export type PrMetric =
  | "max_weight"
  | "max_reps"
  | "best_set"
  | "estimated_one_rep_max"
  | "duration"
  | "distance";

const PR_POINTS = 100; // per metric broken, per spec image

/**
 * Insert one PR row + award +100 per broken metric (Option A in the spec).
 * Pre-checks the existing best for this (user, exercise, metric) and skips
 * if the new value doesn't beat it.
 *
 * @returns The new PR row id + previous best, or null if no PR was made.
 */
export async function checkAndCreatePR(params: {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionExerciseId: string;
  sessionSetId: string;
  metric: PrMetric;
  value: number;
  unit: string;
  weight?: number;
  reps?: number;
  duration?: number;
}): Promise<{ prId: string; previousBest: number } | null> {
  // Check existing best
  const { data: existing } = await supabase
    .from("personal_records")
    .select("value_numeric")
    .eq("user_id", params.userId)
    .eq("exercise_id", params.exerciseId)
    .eq("metric", params.metric)
    .order("value_numeric", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousBest = Number(existing?.value_numeric ?? 0);
  if (params.value <= previousBest) return null;

  const { data, error } = await supabase
    .from("personal_records")
    .insert({
      user_id: params.userId,
      exercise_id: params.exerciseId,
      session_id: params.sessionId,
      session_exercise_id: params.sessionExerciseId,
      session_set_id: params.sessionSetId,
      metric: params.metric,
      value_numeric: params.value,
      value_unit: params.unit,
      weight_value: params.weight ?? null,
      weight_unit: params.unit,
      reps: params.reps ?? null,
      duration_seconds: params.duration ?? null,
      previous_value_numeric: previousBest > 0 ? previousBest : null,
      previous_label: previousBest > 0 ? `${previousBest} ${params.unit}` : null,
      points_awarded: PR_POINTS,
      achieved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  throwIfError(error, "Failed to create PR");

  // Award the +100 ERA points for this metric (separate event ledger entry).
  await awardPoints({
    userId: params.userId,
    sessionId: params.sessionId,
    eventType: "personal_record",
    points: PR_POINTS,
    title: `New PR · ${params.exerciseName}`,
  });

  return { prId: data!.id as string, previousBest };
}

/**
 * PR detection for a single logged set.
 *
 * Locked spec: only `max_weight` counts as a PR. Same weight + more reps is
 * NOT a PR. See memory/project_pr_calculation_spec.md.
 */
export interface SetPRDetail {
  weightKg: number;
  reps: number;
  previousBestKg: number;
  weightUnit: string;
  points: number;
}

export async function checkAndCreateSetPRs(params: {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionExerciseId: string;
  sessionSetId: string;
  loggedWeight: number | null;
  loggedReps: number | null;
  weightUnit: string;
}): Promise<{ prCount: number; pointsAwarded: number; prDetail: SetPRDetail | null }> {
  const { loggedWeight, loggedReps } = params;
  if (loggedWeight == null || loggedReps == null || loggedWeight <= 0 || loggedReps <= 0) {
    return { prCount: 0, pointsAwarded: 0, prDetail: null };
  }

  const result = await checkAndCreatePR({
    userId: params.userId,
    exerciseId: params.exerciseId,
    exerciseName: params.exerciseName,
    sessionId: params.sessionId,
    sessionExerciseId: params.sessionExerciseId,
    sessionSetId: params.sessionSetId,
    metric: "max_weight",
    value: loggedWeight,
    unit: params.weightUnit,
    weight: loggedWeight,
    reps: loggedReps,
  });

  if (!result) return { prCount: 0, pointsAwarded: 0, prDetail: null };
  return {
    prCount: 1,
    pointsAwarded: PR_POINTS,
    prDetail: {
      weightKg: loggedWeight,
      reps: loggedReps,
      previousBestKg: result.previousBest,
      weightUnit: params.weightUnit,
      points: PR_POINTS,
    },
  };
}

/**
 * Marks the given session_sets row as a personal record. Called by
 * useWorkoutSession after checkAndCreateSetPRs confirms a PR, so the
 * Exercise History badge picks up the flag on read.
 */
export async function markSetAsPersonalRecord(sessionSetId: string): Promise<void> {
  const { error } = await supabase
    .from("session_sets")
    .update({ is_personal_record: true })
    .eq("id", sessionSetId);
  throwIfError(error, "Failed to mark set as personal record");
}

/* ─── Points + streak ─── */

export type PointEventType =
  | "workout_completed"
  | "exercise_completed"
  | "personal_record"
  | "streak_added"
  | "progress_photo_added"
  | "manual_adjustment"
  | "set_logged"
  | "cardio_completed"
  | "body_weight_logged";

/**
 * Award points via the SQL RPC. Inserts the event row and bumps
 * user_reward_state.total_points in a single transaction so the
 * scoreboard never drifts from the ledger.
 */
export async function awardPoints(params: {
  userId: string;
  eventType: PointEventType;
  points: number;
  title: string;
  sessionId?: string | null;
  occurredAt?: string;
}): Promise<{ eventId: string; totalPoints: number }> {
  const { data, error } = await supabase.rpc("award_points", {
    p_user_id: params.userId,
    p_event_type: params.eventType,
    p_points: params.points,
    p_title: params.title,
    p_session_id: params.sessionId ?? null,
    p_occurred_at: params.occurredAt ?? new Date().toISOString(),
  });

  throwIfError(error, "Failed to award points");
  const row = data as { event_id: string; total_points: number };
  return { eventId: row.event_id, totalPoints: row.total_points };
}

/**
 * Atomic streak + reward update. Idempotent per (user, date) so re-completing
 * the same session won't double the streak. Awards the 200-point milestone
 * bonus whenever the new streak crosses a multiple of 7.
 */
export async function recordWorkoutCompletion(params: {
  userId: string;
  sessionId: string;
  streakDate?: string;       // YYYY-MM-DD; defaults to server date
  completedAt?: string;      // ISO; defaults to now()
}): Promise<{
  previousStreak: number;
  newStreak: number;
  longestStreak: number;
  wasExtended: boolean;
  sevenDayBonusPoints: number;
  bonusEventId: string | null;
}> {
  const { data, error } = await supabase.rpc("record_workout_completion", {
    p_user_id: params.userId,
    p_session_id: params.sessionId,
    p_streak_date: params.streakDate ?? null,
    p_completed_at: params.completedAt ?? new Date().toISOString(),
  });

  throwIfError(error, "Failed to record workout completion");
  const row = data as {
    previous_streak: number;
    new_streak: number;
    longest_streak: number;
    was_extended: boolean;
    seven_day_bonus_points: number;
    bonus_event_id: string | null;
  };
  return {
    previousStreak: row.previous_streak,
    newStreak: row.new_streak,
    longestStreak: row.longest_streak,
    wasExtended: row.was_extended,
    sevenDayBonusPoints: row.seven_day_bonus_points,
    bonusEventId: row.bonus_event_id,
  };
}

export async function recordRestDay(params: {
  userId: string;
  streakDate?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("record_rest_day", {
    p_user_id: params.userId,
    p_streak_date: params.streakDate ?? null,
  });
  throwIfError(error, "Failed to record rest day");
}

/**
 * Back-compat shim — older callers used createPointEvent before the RPC
 * existed. Routes through awardPoints so total_points stays in sync.
 */
export async function createPointEvent(params: {
  userId: string;
  sessionId?: string;
  eventType: PointEventType;
  title: string;
  points: number;
}): Promise<void> {
  await awardPoints({
    userId: params.userId,
    sessionId: params.sessionId ?? null,
    eventType: params.eventType,
    points: params.points,
    title: params.title,
  });
}

/** How many PR rows were inserted for this session. Used on SessionComplete. */
export async function countSessionPRs(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from("personal_records")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  throwIfError(error, "Failed to count session PRs");
  return count ?? 0;
}

/* ─── Personal records READ ─── */

export interface LatestPRRow {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameTranslations: Record<string, string> | null;
  exerciseCategory: string;
  weightKg: number;
  reps: number | null;
  previousWeightKg: number | null;
  achievedAt: string;
}

/**
 * Fetch the latest max_weight PR per exercise for a user, newest first.
 *
 * Locked spec: only `max_weight` PRs are read (see project_pr_calculation_spec).
 * Old `max_reps` / `estimated_one_rep_max` rows in the DB are ignored.
 *
 * Dedupes by exercise_id in JS — the first row per exercise (highest
 * achieved_at) wins. Fetches more rows than needed so dedup can still
 * deliver `limit` distinct exercises.
 */
export async function listLatestPRs(
  userId: string,
  limit = 10,
): Promise<LatestPRRow[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select(
      `id, exercise_id, value_numeric, weight_value, reps,
       previous_value_numeric, achieved_at,
       exercise_library:exercise_id ( name, name_translations, category )`,
    )
    .eq("user_id", userId)
    .eq("metric", "max_weight")
    .order("achieved_at", { ascending: false })
    .limit(Math.max(limit * 5, 25));

  throwIfError(error, "Failed to list latest PRs");

  type Row = {
    id: string;
    exercise_id: string;
    value_numeric: number | string;
    weight_value: number | string | null;
    reps: number | null;
    previous_value_numeric: number | string | null;
    achieved_at: string;
    exercise_library: {
      name: string;
      name_translations: Record<string, string> | null;
      category: string;
    } | null;
  };

  const seen = new Set<string>();
  const out: LatestPRRow[] = [];
  for (const r of (data as unknown as Row[]) ?? []) {
    if (seen.has(r.exercise_id)) continue;
    seen.add(r.exercise_id);
    out.push({
      id: r.id,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_library?.name ?? "",
      exerciseNameTranslations: r.exercise_library?.name_translations ?? null,
      exerciseCategory: r.exercise_library?.category ?? "compound",
      weightKg: Number(r.weight_value ?? r.value_numeric),
      reps: r.reps,
      previousWeightKg:
        r.previous_value_numeric != null ? Number(r.previous_value_numeric) : null,
      achievedAt: r.achieved_at,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export interface ExercisePRRow {
  id: string;
  weightKg: number;
  reps: number | null;
  previousWeightKg: number | null;
  achievedAt: string;
}

/**
 * Fetch all max_weight PRs for one exercise, newest first. Used by the
 * per-exercise PR history screen (the chart + list view).
 */
export async function listExercisePRs(params: {
  userId: string;
  exerciseId: string;
}): Promise<ExercisePRRow[]> {
  const { data, error } = await supabase
    .from("personal_records")
    .select("id, weight_value, value_numeric, reps, previous_value_numeric, achieved_at")
    .eq("user_id", params.userId)
    .eq("exercise_id", params.exerciseId)
    .eq("metric", "max_weight")
    .order("achieved_at", { ascending: false });

  throwIfError(error, "Failed to list exercise PRs");

  type Row = {
    id: string;
    weight_value: number | string | null;
    value_numeric: number | string;
    reps: number | null;
    previous_value_numeric: number | string | null;
    achieved_at: string;
  };

  return ((data as Row[]) ?? []).map((r) => ({
    id: r.id,
    weightKg: Number(r.weight_value ?? r.value_numeric),
    reps: r.reps,
    previousWeightKg:
      r.previous_value_numeric != null ? Number(r.previous_value_numeric) : null,
    achievedAt: r.achieved_at,
  }));
}

/**
 * Count `max_weight` PRs achieved in the trailing 7 days. Used by the
 * Progress screen banner ("You've nailed X PRs this week!").
 */
export async function countPRsThisWeek(userId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("personal_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("metric", "max_weight")
    .gte("achieved_at", sevenDaysAgo);
  throwIfError(error, "Failed to count weekly PRs");
  return count ?? 0;
}

/* ─── Reward + streak READ ─── */

export interface RewardStateRow {
  user_id: string;
  total_points: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_streak_date: string | null;
  last_workout_completed_at: string | null;
}

export async function fetchRewardState(userId: string): Promise<RewardStateRow | null> {
  const { data, error } = await supabase
    .from("user_reward_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error, "Failed to fetch reward state");
  return (data as RewardStateRow | null) ?? null;
}

export interface StreakDayRow {
  streak_date: string;
  status: "completed" | "rest_day" | "missed";
  session_id: string | null;
}

export async function fetchStreakDays(params: {
  userId: string;
  fromDate: string;
  toDate: string;
}): Promise<StreakDayRow[]> {
  const { data, error } = await supabase
    .from("user_streak_days")
    .select("streak_date, status, session_id")
    .eq("user_id", params.userId)
    .gte("streak_date", params.fromDate)
    .lte("streak_date", params.toDate)
    .order("streak_date", { ascending: true });
  throwIfError(error, "Failed to fetch streak days");
  return (data as StreakDayRow[]) ?? [];
}

export interface PointEventRow {
  id: string;
  event_type: PointEventType;
  title: string;
  points: number;
  occurred_at: string;
  session_id: string | null;
}

export async function fetchRecentPointEvents(params: {
  userId: string;
  limit?: number;
}): Promise<PointEventRow[]> {
  const { data, error } = await supabase
    .from("era_point_events")
    .select("id, event_type, title, points, occurred_at, session_id")
    .eq("user_id", params.userId)
    .order("occurred_at", { ascending: false })
    .limit(params.limit ?? 50);
  throwIfError(error, "Failed to fetch point events");
  return (data as PointEventRow[]) ?? [];
}

/* ─── Read: completed session detail ─── */

export async function getCompletedSessionDetail(
  userId: string,
  programDayId: string,
): Promise<CompletedSessionDetail | null> {
  // 1. Find the completed session for this day
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, duration_seconds, total_exercises, exercises_completed, sets_logged")
    .eq("user_id", userId)
    .eq("program_day_id", programDayId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (sessionError || !session) return null;

  // 2. Fetch exercises for this session
  const { data: exercises, error: exError } = await supabase
    .from("session_exercises")
    .select("id, display_name_snapshot, sort_order, status, comment")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true });

  if (exError) throw new Error(exError.message);
  const exerciseRows = exercises ?? [];

  // 3. Fetch all sets for these exercises
  const exerciseIds = exerciseRows.map((e) => e.id);
  const { data: sets, error: setError } = await supabase
    .from("session_sets")
    .select(
      "id, session_exercise_id, set_number, logged_weight_value, logged_weight_unit, logged_reps, logged_duration_seconds, perceived_feedback, comment, status",
    )
    .in("session_exercise_id", exerciseIds.length > 0 ? exerciseIds : ["_none_"])
    .order("set_number", { ascending: true });

  if (setError) throw new Error(setError.message);
  const setRows = sets ?? [];

  // 4. Group sets by exercise
  const setsByExercise = new Map<string, typeof setRows>();
  for (const s of setRows) {
    const arr = setsByExercise.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsByExercise.set(s.session_exercise_id, arr);
  }

  // 5. Build result
  const completedExercises: CompletedExerciseView[] = exerciseRows.map((ex) => {
    const exSets = setsByExercise.get(ex.id) ?? [];
    const completedSets: CompletedSetView[] = exSets
      .filter((s) => s.status === "completed")
      .map((s) => ({
        setNumber: s.set_number,
        weight: s.logged_weight_value != null ? Number(s.logged_weight_value) : null,
        weightUnit: s.logged_weight_unit ?? "kg",
        reps: s.logged_reps,
        duration: s.logged_duration_seconds,
        feedback: s.perceived_feedback as CompletedSetView["feedback"],
        comment: s.comment,
      }));

    return {
      id: ex.id,
      name: ex.display_name_snapshot ?? "",
      sets: completedSets,
      totalSets: completedSets.length,
      durationMinutes: 0, // not tracked per-exercise
      comment: ex.comment,
    };
  });

  return {
    sessionId: session.id,
    programDayId,
    exercises: completedExercises,
    totalExercises: session.total_exercises ?? exerciseRows.length,
    durationMinutes: Math.round((session.duration_seconds ?? 0) / 60),
  };
}

/* ─── Read: WeightsScreen — last + previous heaviest set per exercise ─── */

/**
 * Returns last/previous numbers per exercise for a batch of exercise ids.
 * Pulls every completed set (weighted OR duration-only) in one query,
 * groups by exercise → session, then picks:
 *   - lastKg / previousKg     = heaviest weight in most-recent / prior session
 *   - lastDurationSec / prev  = longest duration in those same sessions
 * UI uses whichever pair matches the exercise's logged metric.
 */
export async function fetchCurrentDayExerciseSummaries(params: {
  userId: string;
  exerciseIds: string[];
}): Promise<Map<string, ExerciseSummaryRaw>> {
  const result = new Map<string, ExerciseSummaryRaw>();
  if (params.exerciseIds.length === 0) return result;

  const { data, error } = await supabase
    .from("session_sets")
    .select(
      `id, logged_weight_value, logged_reps, logged_duration_seconds, completed_at,
       session_exercises!inner ( exercise_id, session_id,
         workout_sessions!inner ( user_id, completed_at ) )`,
    )
    .eq("session_exercises.workout_sessions.user_id", params.userId)
    .in("session_exercises.exercise_id", params.exerciseIds)
    .or("logged_weight_value.not.is.null,logged_duration_seconds.not.is.null")
    .eq("status", "completed");

  throwIfError(error, "Failed to fetch exercise summaries");

  type Row = {
    id: string;
    logged_weight_value: number | string | null;
    logged_reps: number | null;
    logged_duration_seconds: number | null;
    completed_at: string | null;
    session_exercises: {
      exercise_id: string;
      session_id: string;
      workout_sessions: { user_id: string; completed_at: string | null };
    };
  };

  type SessionAgg = {
    sessionDate: string;
    heaviestKg: number | null;
    reps: number | null;
    longestSec: number | null;
  };

  const byExercise = new Map<string, Map<string, SessionAgg>>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const exerciseId = row.session_exercises.exercise_id;
    const sessionId = row.session_exercises.session_id;
    const sessionDate = row.session_exercises.workout_sessions.completed_at ?? row.completed_at ?? "";
    const weight = row.logged_weight_value == null ? null : Number(row.logged_weight_value);
    const seconds = row.logged_duration_seconds;

    let sessions = byExercise.get(exerciseId);
    if (!sessions) {
      sessions = new Map();
      byExercise.set(exerciseId, sessions);
    }
    const prev = sessions.get(sessionId) ?? {
      sessionDate,
      heaviestKg: null,
      reps: null,
      longestSec: null,
    };
    if (weight != null && (prev.heaviestKg == null || weight > prev.heaviestKg)) {
      prev.heaviestKg = weight;
      prev.reps = row.logged_reps;
    }
    if (seconds != null && (prev.longestSec == null || seconds > prev.longestSec)) {
      prev.longestSec = seconds;
    }
    sessions.set(sessionId, prev);
  }

  for (const [exerciseId, sessions] of byExercise.entries()) {
    const ordered = [...sessions.values()].sort((a, b) =>
      a.sessionDate < b.sessionDate ? 1 : a.sessionDate > b.sessionDate ? -1 : 0,
    );
    result.set(exerciseId, {
      lastKg: ordered[0]?.heaviestKg ?? null,
      lastReps: ordered[0]?.reps ?? null,
      previousKg: ordered[1]?.heaviestKg ?? null,
      lastDurationSec: ordered[0]?.longestSec ?? null,
      previousDurationSec: ordered[1]?.longestSec ?? null,
    });
  }

  return result;
}

/* ─── Read: ExerciseHistoryScreen — full history for one exercise ─── */

/**
 * Returns every logged set for (user, exercise) — weighted OR duration-only.
 * Picks a `metricKind` based on which metric the sets actually carry, then
 * computes stats accordingly:
 *   - weight mode    → current / heaviest / lightest (kg + reps)
 *   - duration mode  → current / longest / shortest (seconds)
 * Week/day numbers are joined from program_weeks.
 */
export async function fetchExerciseHistoryDetail(params: {
  userId: string;
  exerciseId: string;
}): Promise<ExerciseHistoryRaw> {
  const { data, error } = await supabase
    .from("session_sets")
    .select(
      `id, logged_weight_value, logged_reps, logged_duration_seconds, is_personal_record, is_best_set, completed_at,
       session_exercises!inner ( exercise_id, session_id,
         workout_sessions!inner ( id, user_id, completed_at, program_day_id,
           program_days!inner ( day_number,
             program_weeks!inner ( week_number ) ) ) )`,
    )
    .eq("session_exercises.workout_sessions.user_id", params.userId)
    .eq("session_exercises.exercise_id", params.exerciseId)
    .or("logged_weight_value.not.is.null,logged_duration_seconds.not.is.null")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  throwIfError(error, "Failed to fetch exercise history");

  type Row = {
    id: string;
    logged_weight_value: number | string | null;
    logged_reps: number | null;
    logged_duration_seconds: number | null;
    is_personal_record: boolean;
    is_best_set: boolean;
    completed_at: string | null;
    session_exercises: {
      exercise_id: string;
      session_id: string;
      workout_sessions: {
        id: string;
        user_id: string;
        completed_at: string | null;
        program_day_id: string;
        program_days: {
          day_number: number;
          program_weeks: { week_number: number };
        };
      };
    };
  };

  const sets: SessionSetHistoryRow[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    logged_weight_value: row.logged_weight_value == null ? null : Number(row.logged_weight_value),
    logged_reps: row.logged_reps,
    logged_duration_seconds: row.logged_duration_seconds,
    is_personal_record: !!row.is_personal_record,
    is_best_set: !!row.is_best_set,
    completed_at: row.session_exercises.workout_sessions.completed_at ?? row.completed_at,
    week_number: row.session_exercises.workout_sessions.program_days.program_weeks.week_number,
    day_number: row.session_exercises.workout_sessions.program_days.day_number,
    session_id: row.session_exercises.workout_sessions.id,
  }));

  // Decide metric: if any set logged weight, treat as weight; else if any
  // logged duration, treat as duration. Mixed exercises (unlikely) prefer weight.
  const hasWeight = sets.some((s) => s.logged_weight_value != null);
  const hasDuration = sets.some((s) => s.logged_duration_seconds != null);
  const metricKind: "weight" | "duration" = hasWeight || !hasDuration ? "weight" : "duration";

  // Weight stats
  const weights = sets
    .map((s) => s.logged_weight_value)
    .filter((w): w is number => w != null);
  const heaviestKg = weights.length ? Math.max(...weights) : null;
  const lightestKg = weights.length ? Math.min(...weights) : null;

  // Duration stats
  const durations = sets
    .map((s) => s.logged_duration_seconds)
    .filter((d): d is number => d != null);
  const longestSec = durations.length ? Math.max(...durations) : null;
  const shortestSec = durations.length ? Math.min(...durations) : null;

  // Most recent session = first set's session (already ordered desc by completed_at)
  let currentKg: number | null = null;
  let currentReps: number | null = null;
  let currentSec: number | null = null;
  if (sets.length > 0) {
    const recentSessionId = sets[0].session_id;
    const recentSets = sets.filter((s) => s.session_id === recentSessionId);
    if (metricKind === "weight") {
      const top = recentSets.reduce(
        (best, s) =>
          s.logged_weight_value != null && s.logged_weight_value > (best?.logged_weight_value ?? -Infinity)
            ? s
            : best,
        recentSets[0],
      );
      currentKg = top.logged_weight_value;
      currentReps = top.logged_reps;
    } else {
      const top = recentSets.reduce(
        (best, s) =>
          s.logged_duration_seconds != null &&
          s.logged_duration_seconds > (best?.logged_duration_seconds ?? -Infinity)
            ? s
            : best,
        recentSets[0],
      );
      currentSec = top.logged_duration_seconds;
    }
  }

  return {
    metricKind,
    stats: {
      currentKg,
      currentReps,
      heaviestKg,
      lightestKg,
      currentSec,
      longestSec: metricKind === "duration" ? longestSec : null,
      shortestSec: metricKind === "duration" ? shortestSec : null,
    },
    sets,
  };
}
