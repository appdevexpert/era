import "server-only";

import { requireAdminClient } from "@/lib/admin/supabase";

export type AdminRecord = {
  user_id: string;
  email: string;
  display_name: string;
  can_view_activity: boolean;
};

// Looks up the admin allow-list row for a Supabase user. Uses the service-role
// client because public.admin_users has RLS on with no policies (locked to the
// server). Returns null for any authenticated user who isn't an admin.
export async function getAdminRecord(
  userId: string,
): Promise<AdminRecord | null> {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, email, display_name, can_view_activity")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as AdminRecord | null) ?? null;
}
