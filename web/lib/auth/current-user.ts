import "server-only";

import { cookies } from "next/headers";

import { DUMMY_USER, SESSION_COOKIE } from "@/lib/auth/session";

export type CurrentAdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(SESSION_COOKIE)?.value);
  if (!hasSession) return null;

  return { ...DUMMY_USER };
}
