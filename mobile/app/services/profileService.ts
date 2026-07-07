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

// NOTE: subscription state (profiles.subscription_*) is NOT written from the
// client anymore. Those columns are locked to service_role and written only by
// the `revenuecat-webhook` edge function (see supabase/functions/revenuecat-webhook).
// The client reads live entitlement from the RC SDK via revenueCatService.
