import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import i18n from "@/app/locales/i18n";

// --- Supabase client ---

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Public URL of the web app that hosts the /reset-password landing page.
// The page validates the recovery token and can hand it back into the app
// via the `erafit://` deep link. Set in mobile/.env after the web deploy.
const webUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/$/, "");

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- Types ---

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider?: string;
  created_at?: string;
};

// --- Helpers ---

export const mapSupabaseUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email ?? "",
  name:
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.full_name as string) ||
    "",
  provider: user.app_metadata?.provider,
  created_at: user.created_at,
});

// --- Auth methods ---

export const signUp = (email: string, password: string, name: string) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const resetPassword = (email: string) => {
  // Pass the user's current language so the web page renders in en/nb.
  const lang = i18n.language?.toLowerCase().startsWith("nb") ? "nb" : "en";
  const redirectTo = `${webUrl}/reset-password?lang=${lang}`;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
};

export const verifyRecoveryToken = (tokenHash: string) =>
  supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });

export const updatePassword = (newPassword: string) =>
  supabase.auth.updateUser({ password: newPassword });

export const signOut = () => supabase.auth.signOut();

export const signOutLocal = () => supabase.auth.signOut({ scope: "local" });

// --- Validation ---

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
