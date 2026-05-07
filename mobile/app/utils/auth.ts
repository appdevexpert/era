import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

// --- Supabase client ---

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
  name: (user.user_metadata?.name as string) ?? "",
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

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "mobile://reset-password",
  });

export const verifyRecoveryToken = (tokenHash: string) =>
  supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });

export const updatePassword = (newPassword: string) =>
  supabase.auth.updateUser({ password: newPassword });

export const signOut = () => supabase.auth.signOut();

// --- Validation ---

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
