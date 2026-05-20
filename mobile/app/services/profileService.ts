import { supabase } from "@/app/utils/auth";

/** Read the user's saved program start date from Supabase. Null if never set. */
export async function fetchProgramStartDate(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("program_start_date")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.program_start_date as string | null) ?? null;
}

/** Save the user's program start date. YYYY-MM-DD format. */
export async function saveProgramStartDate(userId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ program_start_date: date })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
