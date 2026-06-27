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

export interface SubscriptionSnapshot {
  /** "free" / "standard" / "pro" — must match the CHECK constraint on profiles. */
  tier: "free" | "standard" | "pro";
  /** Renewal/expiry timestamp from RC. Null when user is free or RC didn't supply one. */
  expiresAt: string | null;
  /** Identifier of the purchased product (e.g. "era_pro_monthly"). Null for free users. */
  productId: string | null;
}

/**
 * Mirror RevenueCat entitlement state onto the user's profile row. Called
 * by revenueCatService whenever customerInfo changes. Source of truth stays
 * RC; this is a convenience cache so server code can read tier without a
 * round trip to the RC REST API.
 *
 * Idempotent — re-running with the same snapshot is a no-op at the DB level.
 */
export async function saveSubscriptionState(
  userId: string,
  snapshot: SubscriptionSnapshot,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: snapshot.tier,
      subscription_expires_at: snapshot.expiresAt,
      subscription_product_id: snapshot.productId,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
