import { supabase } from "@/app/utils/auth";
import type { GeneratedPlanItem } from "@/app/services/aiMealPlanService";
import type {
  DailyMacroTargets,
  MealLogRow,
  MealPhaseKey,
  UserMealPlanItemRow,
  UserMealPlanRow,
  WaterLogRow,
  WeeklyMealPlan,
} from "@/app/types/nutrition";

// =====================================================================
// Supabase reads/writes for the nutrition flow. All errors propagate to
// the caller — thunks decide how to surface them.
// =====================================================================

// -------- per-user weekly meal plan ----------------------------------

/** The user's saved plan for one program week, or null if not generated yet. */
export async function getUserMealPlan(
  userId: string,
  weekNumber: number,
): Promise<WeeklyMealPlan | null> {
  const planResult = await supabase
    .from("user_meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (planResult.error) throw new Error(planResult.error.message);
  const plan = planResult.data as UserMealPlanRow | null;
  if (!plan) return null;

  const itemsResult = await supabase
    .from("user_meal_plan_items")
    .select("*")
    .eq("user_meal_plan_id", plan.id)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true });

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  return { plan, items: (itemsResult.data ?? []) as UserMealPlanItemRow[] };
}

/** Persist a freshly generated week: one plan row + its meal items. */
export async function saveUserMealPlan(args: {
  userId: string;
  weekNumber: number;
  phase: MealPhaseKey;
  targets: DailyMacroTargets;
  items: GeneratedPlanItem[];
}): Promise<WeeklyMealPlan> {
  const planResult = await supabase
    .from("user_meal_plans")
    .insert({
      user_id: args.userId,
      week_number: args.weekNumber,
      phase_key: args.phase,
      kcal_target: args.targets.kcal,
      protein_g_target: args.targets.protein_g,
      carbs_g_target: args.targets.carbs_g,
      fats_g_target: args.targets.fats_g,
      source: "ai",
    })
    .select("*")
    .single();

  if (planResult.error) throw new Error(planResult.error.message);
  const plan = planResult.data as UserMealPlanRow;

  const rows = args.items.map((it) => ({
    user_meal_plan_id: plan.id,
    day_of_week: it.day_of_week,
    category: it.category,
    sort_order: it.sort_order,
    name_translations: it.name_translations,
    note_translations: it.note_translations,
    kcal: it.kcal,
    protein_g: it.protein_g,
    carbs_g: it.carbs_g,
    fats_g: it.fats_g,
  }));

  const itemsResult = await supabase
    .from("user_meal_plan_items")
    .insert(rows)
    .select("*");

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  return { plan, items: (itemsResult.data ?? []) as UserMealPlanItemRow[] };
}

/** All meal_logs for the user in [startDate, endDate] inclusive. */
export async function getMealLogsForRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<MealLogRow[]> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MealLogRow[];
}

/**
 * Payload for INSERT INTO meal_logs. The client provides the `id` (a UUID
 * generated up-front) so retries are idempotent — if the original insert
 * succeeded server-side but the response was lost, the retry hits the PK
 * unique constraint and we treat it as success.
 */
export type MealLogInsertPayload = MealLogRow;

/** Insert a single meal_log row, returning the saved row. */
export async function insertMealLog(
  payload: MealLogInsertPayload,
): Promise<MealLogRow> {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation. The row already exists with this client-
    // supplied id, which means our original insert won the race even though
    // we never saw the response. Fetch and return the existing row so the
    // caller can treat the write as successful.
    if (error.code === "23505") {
      const existing = await supabase
        .from("meal_logs")
        .select("*")
        .eq("id", payload.id)
        .single();
      if (existing.error) throw new Error(existing.error.message);
      return existing.data as MealLogRow;
    }
    throw new Error(error.message);
  }
  return data as MealLogRow;
}

/** Remove a meal_log by id. RLS ensures only the owner can delete. */
export async function deleteMealLog(id: string): Promise<void> {
  const { error } = await supabase.from("meal_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// -------- water_logs -------------------------------------------------
// One row per (user_id, log_date) — enforced by a UNIQUE index. The +/−
// buttons in the UI update the running total on that single row.

/** All water_logs for the user in [startDate, endDate] inclusive. */
export async function getWaterLogsForRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<WaterLogRow[]> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate);

  if (error) throw new Error(error.message);
  return (data ?? []) as WaterLogRow[];
}

/** Create the single row for a given date. */
export async function insertWaterLog(
  userId: string,
  logDate: string,
  amountMl: number,
): Promise<WaterLogRow> {
  const { data, error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, log_date: logDate, amount_ml: amountMl })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WaterLogRow;
}

/** Overwrite the running total on an existing row. */
export async function updateWaterAmount(
  id: string,
  amountMl: number,
): Promise<WaterLogRow> {
  const { data, error } = await supabase
    .from("water_logs")
    .update({ amount_ml: amountMl })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WaterLogRow;
}

/**
 * Remove the row entirely — used when the running total would hit 0 or
 * below, since `amount_ml` has a CHECK (> 0) constraint.
 */
export async function deleteWaterLog(id: string): Promise<void> {
  const { error } = await supabase.from("water_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
