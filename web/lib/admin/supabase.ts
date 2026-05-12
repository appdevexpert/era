import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export function getAdminClient() {
  try {
    return {
      supabase: createAdminClient(),
      configError: null,
    };
  } catch (error) {
    return {
      supabase: null,
      configError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }
}

export function requireAdminClient() {
  const { supabase, configError } = getAdminClient();

  if (!supabase) {
    throw new Error(configError ?? "Supabase admin client is not configured.");
  }

  return supabase;
}
