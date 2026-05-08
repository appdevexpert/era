const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
)

export function getSupabaseUrl() {
  if (!supabaseUrl) {
    throw new Error("Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL")
  }

  return supabaseUrl
}

export function getSupabasePublishableKey() {
  if (!supabasePublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }

  return supabasePublishableKey
}

export function getSupabaseConfig() {
  return {
    supabaseUrl: getSupabaseUrl(),
    supabasePublishableKey: getSupabasePublishableKey(),
  }
}
