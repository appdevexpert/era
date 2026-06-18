import { supabase } from "@/app/utils/auth";

/**
 * Cycle 1 → Cycle 2 transition service.
 *
 * Thin wrappers around the `start_next_cycle` Postgres RPC and
 * supporting reads from user_program_assignments / user_exercise_stats.
 *
 * All write paths route through the RPC so that the (mark old completed +
 * insert new + reset program_start_date) sequence is atomic.
 */

export type CycleChoice = "heavier" | "deload" | "bro_split";

export interface StartNextCycleResult {
  assignment_id: string;
  program_id: string;
  choice: CycleChoice;
  is_deload: boolean;
  cycle_number: number;
  previous_assignment_id: string;
}

/** Calls the atomic `start_next_cycle` RPC and returns the new assignment. */
export async function startNextCycle(choice: CycleChoice): Promise<StartNextCycleResult> {
  const { data, error } = await supabase.rpc("start_next_cycle", { p_choice: choice });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("start_next_cycle returned no data");
  return data as StartNextCycleResult;
}

export interface AssignmentRow {
  id: string;
  program_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  current_week_number: number;
  current_day_number: number;
  cycle_number: number;
  previous_assignment_id: string | null;
  is_deload_week: boolean;
}

/** Return the user's active assignment row (or null if none). */
export async function getActiveAssignment(userId: string): Promise<AssignmentRow | null> {
  const { data, error } = await supabase
    .from("user_program_assignments")
    .select(
      "id, program_id, status, started_at, completed_at, current_week_number, current_day_number, cycle_number, previous_assignment_id, is_deload_week",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AssignmentRow | null) ?? null;
}

/** Full assignment history for the user, oldest first. */
export async function getAssignmentHistory(userId: string): Promise<AssignmentRow[]> {
  const { data, error } = await supabase
    .from("user_program_assignments")
    .select(
      "id, program_id, status, started_at, completed_at, current_week_number, current_day_number, cycle_number, previous_assignment_id, is_deload_week",
    )
    .eq("user_id", userId)
    .order("assigned_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as AssignmentRow[] | null) ?? [];
}

/**
 * Returns best-ever weight per exercise slug from user_exercise_stats.
 * Used by Cycle2Begins screen to render the old → new weights table
 * and by cycleStartingWeights utils to compute Heavier / Bro Split targets.
 */
export async function getUserBestWeightsBySlug(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("user_exercise_stats")
    .select("best_weight_value, exercise:exercise_library!inner(slug)")
    .eq("user_id", userId)
    .not("best_weight_value", "is", null);

  if (error) throw new Error(error.message);

  const out: Record<string, number> = {};
  type Row = {
    best_weight_value: number | null;
    exercise: { slug: string } | { slug: string }[] | null;
  };
  for (const row of (data ?? []) as Row[]) {
    if (row.best_weight_value == null || row.exercise == null) continue;
    const slug = Array.isArray(row.exercise) ? row.exercise[0]?.slug : row.exercise.slug;
    if (slug) {
      out[slug] = Number(row.best_weight_value);
    }
  }
  return out;
}
