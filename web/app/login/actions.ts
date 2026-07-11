"use server";

import { redirect } from "next/navigation";

import { getAdminRecord } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  error: string | null;
};

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  // Supabase verified the password; now check the admin allow-list. A valid
  // app user who isn't an admin must not get into the panel.
  const admin = await getAdminRecord(data.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized for the admin panel." };
  }

  redirect(next && next.startsWith("/") ? next : "/");
}
