import { supabase } from "@/app/utils/auth";

export interface WeightLogRow {
  id: string;
  weight_kg: number;
  logged_for_date: string;
  logged_at: string;
  source: string;
  note: string | null;
}

export interface UserMetricsRow {
  weight: number;
  weight_unit: "kg" | "lb";
  height: number;
  height_unit: "cm" | "ft";
}

const throwIfError = (error: unknown, context: string) => {
  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
    throw new Error(`${context}: ${message}`);
  }
};

export async function fetchWeightLog(
  userId: string,
  limit = 200,
): Promise<WeightLogRow[]> {
  const { data, error } = await supabase
    .from("body_weight_log")
    .select("id, weight_kg, logged_for_date, logged_at, source, note")
    .eq("user_id", userId)
    .order("logged_for_date", { ascending: false })
    .limit(limit);
  throwIfError(error, "Failed to fetch weight log");
  return (data as WeightLogRow[]) ?? [];
}

export async function fetchUserMetrics(
  userId: string,
): Promise<UserMetricsRow | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("weight, weight_unit, height, height_unit")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, "Failed to fetch user metrics");
  return (data as UserMetricsRow | null) ?? null;
}

/**
 * Idempotent per (user_id, logged_for_date) thanks to the UNIQUE constraint.
 * Re-logging the same day updates the existing row.
 *
 * Returns `wasNew = true` only when no prior row existed for that date — the
 * caller uses this to gate the +10 ERA points award so multiple logs on the
 * same day don't earn points more than once.
 */
export async function upsertWeightLog(params: {
  userId: string;
  weightKg: number;
  loggedForDate?: string;
  source?: string;
}): Promise<{ row: WeightLogRow; wasNew: boolean }> {
  const loggedForDate =
    params.loggedForDate ?? new Date().toISOString().slice(0, 10);

  // Check first so we know whether to award points for a fresh day.
  const { data: existing, error: existingError } = await supabase
    .from("body_weight_log")
    .select("id")
    .eq("user_id", params.userId)
    .eq("logged_for_date", loggedForDate)
    .maybeSingle();
  throwIfError(existingError, "Failed to check existing weight log");
  const wasNew = !existing;

  const row = {
    user_id: params.userId,
    weight_kg: Number(params.weightKg.toFixed(2)),
    logged_for_date: loggedForDate,
    logged_at: new Date().toISOString(),
    source: params.source ?? "manual",
  };
  const { data, error } = await supabase
    .from("body_weight_log")
    .upsert(row, { onConflict: "user_id,logged_for_date" })
    .select("id, weight_kg, logged_for_date, logged_at, source, note")
    .single();
  throwIfError(error, "Failed to log weight");
  return { row: data as WeightLogRow, wasNew };
}
