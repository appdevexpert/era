import "server-only";

import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";

import {
  type AdminRole,
  isAdminRole,
  loginRedirectPath,
  safeNextPath,
} from "@/lib/admin/auth-paths";
import { requireAdminClient } from "@/lib/admin/supabase";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  full_name: string | null;
  role: string;
};

export type AuthorizedAdmin = {
  user: User;
  profile: AdminProfile & { role: AdminRole };
  email: string;
};

export type AdminAuthState =
  | ({ status: "authorized" } & AuthorizedAdmin)
  | { status: "unauthenticated" }
  | {
      status: "unauthorized";
      user: User;
      email: string;
      profile: AdminProfile | null;
      message: string;
    }
  | { status: "configuration_error"; message: string };

export async function getCurrentAdminPath() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-era-pathname") ?? "/";
  const search = requestHeaders.get("x-era-search") ?? "";

  return safeNextPath(`${pathname}${search}`);
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return { status: "unauthenticated" };
    }

    if (userError) {
      return { status: "configuration_error", message: userError.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    const email = user.email ?? "Unknown email";

    if (profileError) {
      return { status: "configuration_error", message: profileError.message };
    }

    if (!profile) {
      return {
        status: "unauthorized",
        user,
        email,
        profile: null,
        message: "This account does not have a profile row.",
      };
    }

    if (!isAdminRole(profile.role)) {
      return {
        status: "unauthorized",
        user,
        email,
        profile,
        message: "This account is not authorized for the ERA admin dashboard.",
      };
    }

    return {
      status: "authorized",
      user,
      profile: { ...profile, role: profile.role },
      email,
    };
  } catch (error) {
    return {
      status: "configuration_error",
      message:
        error instanceof Error
          ? error.message
          : "Supabase authentication is not configured.",
    };
  }
}

export async function requireAuthorizedAdminClient() {
  const authState = await getAdminAuthState();

  if (authState.status === "authorized") {
    return requireAdminClient();
  }

  if (authState.status === "unauthenticated") {
    throw new Error("Sign in before changing ERA admin data.");
  }

  throw new Error(authState.message);
}

export { loginRedirectPath, safeNextPath };
