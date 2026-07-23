import { supabase } from "@/app/utils/auth";

/**
 * Every remote-editable copy key the mobile app knows about. Adding one:
 *   1. Insert a row in Supabase (`app_copy` table) — SQL migration.
 *   2. Add its literal here so callers get type-checked keys.
 *   3. Read it via getCopyString / from Redux with an i18n.t() fallback.
 */
export type CopyKey =
  | "lifetime_volume_share"
  | "notification_daily_title"
  | "notification_daily_body"
  | "notification_streak_title"
  | "notification_streak_body"
  | "notification_pr_title"
  | "notification_pr_body";

export interface AppCopyRow {
  key: CopyKey;
  translations: Record<string, string>;
}

export async function fetchAppCopy(key: CopyKey): Promise<AppCopyRow | null> {
  const { data, error } = await supabase
    .from("app_copy")
    .select("key, translations")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(`fetchAppCopy(${key}): ${error.message}`);
  if (!data) return null;

  return {
    key: data.key as CopyKey,
    translations: (data.translations ?? {}) as Record<string, string>,
  };
}

// Single round-trip hydrator used at app boot. Returns every row so the
// mobile client can populate its cache once instead of paying per-screen
// latency.
export async function fetchAllAppCopy(): Promise<AppCopyRow[]> {
  const { data, error } = await supabase
    .from("app_copy")
    .select("key, translations");

  if (error) throw new Error(`fetchAllAppCopy: ${error.message}`);

  return (data ?? []).map((row) => ({
    key: row.key as CopyKey,
    translations: (row.translations ?? {}) as Record<string, string>,
  }));
}
