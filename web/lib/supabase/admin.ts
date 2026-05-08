import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getSupabaseUrl } from "@/lib/supabase/config"

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase env var: SUPABASE_SERVICE_ROLE_KEY")
  }

  return createSupabaseClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
