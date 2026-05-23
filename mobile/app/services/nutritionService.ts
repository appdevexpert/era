import { supabase } from "@/app/utils/auth";
import type {
  MealLibraryRow,
  MealLogRow,
  MealProgramBootstrapData,
  MealProgramPhaseDayItemRow,
  MealProgramPhaseDayRow,
  MealProgramPhaseRow,
  MealProgramRow,
  WaterLogRow,
} from "@/app/types/nutrition";

// =====================================================================
// Supabase reads for the nutrition flow. Writes will live in the next
// slice (Log Meal / +/− buttons). All errors propagate to the caller —
// thunks decide how to surface them.
// =====================================================================

/**
 * Bootstrap: returns the active meal program plus every phase, weekday
 * slot, item, and library row needed to render the screen offline.
 *
 * The result is small (~108 rows for a 12-week program) so we fetch
 * everything in one round trip. Logs are paged in by date as the user
 * navigates the week selector.
 */
export async function getActiveMealProgram(): Promise<MealProgramBootstrapData | null> {
  const programResult = await supabase
    .from("meal_programs")
    .select("id,duration_days,is_active,title_translations")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (programResult.error) throw new Error(programResult.error.message);
  const program = programResult.data as MealProgramRow | null;
  if (!program) return null;

  const [phasesResult, libraryResult] = await Promise.all([
    supabase
      .from("meal_program_phases")
      .select("*")
      .eq("meal_program_id", program.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("meal_library")
      .select(
        "id,slug,category,kcal,protein_g,carbs_g,fats_g,name_translations,note_translations,is_active",
      )
      .eq("is_active", true),
  ]);

  if (phasesResult.error) throw new Error(phasesResult.error.message);
  if (libraryResult.error) throw new Error(libraryResult.error.message);

  const phases = (phasesResult.data ?? []) as MealProgramPhaseRow[];
  const library = (libraryResult.data ?? []) as MealLibraryRow[];

  if (!phases.length) {
    return { program, phases, phaseDays: [], phaseDayItems: [], library };
  }

  const phaseDaysResult = await supabase
    .from("meal_program_phase_days")
    .select("*")
    .in(
      "meal_program_phase_id",
      phases.map((p) => p.id),
    )
    .order("day_of_week", { ascending: true });

  if (phaseDaysResult.error) throw new Error(phaseDaysResult.error.message);
  const phaseDays = (phaseDaysResult.data ?? []) as MealProgramPhaseDayRow[];

  if (!phaseDays.length) {
    return { program, phases, phaseDays, phaseDayItems: [], library };
  }

  const itemsResult = await supabase
    .from("meal_program_phase_day_items")
    .select("*")
    .in(
      "meal_program_phase_day_id",
      phaseDays.map((d) => d.id),
    )
    .order("sort_order", { ascending: true });

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const phaseDayItems = (itemsResult.data ?? []) as MealProgramPhaseDayItemRow[];

  return { program, phases, phaseDays, phaseDayItems, library };
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

/** Payload for INSERT INTO meal_logs (no id; server generates). */
export type MealLogInsertPayload = Omit<MealLogRow, "id">;

/** Insert a single meal_log row, returning the saved row with its server id. */
export async function insertMealLog(
  payload: MealLogInsertPayload,
): Promise<MealLogRow> {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
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
