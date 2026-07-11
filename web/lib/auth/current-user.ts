import "server-only";

import { getAdminRecord } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

export type CurrentAdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  canViewActivity: boolean;
};

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Authenticated via Supabase, but only allow-listed admins get an identity.
  const admin = await getAdminRecord(user.id);
  if (!admin) return null;

  return {
    id: user.id,
    email: admin.email ?? user.email ?? null,
    full_name: admin.display_name,
    avatar_url: null,
    role: admin.can_view_activity ? "owner" : "admin",
    canViewActivity: admin.can_view_activity,
  };
}
