import { useCallback, useEffect } from "react";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { supabase } from "@/app/utils/auth";

interface GoogleLoginResult {
  type: "success" | "cancel" | "in_progress" | "error";
  error?: Error;
}

export function useGoogleAuth() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "184813130596-cch2jmnqkhnsi9aqrcgdt66if6jfve9b.apps.googleusercontent.com",
      iosClientId:
        "184813130596-0ktq9j7k78ofodl1i55btn4lubp7gmm2.apps.googleusercontent.com",
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<GoogleLoginResult> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try { await GoogleSignin.signOut(); } catch {}

      const signInResult: any = await GoogleSignin.signIn();

      console.log("[GOOGLE] signInResult:", JSON.stringify(signInResult));

      const idToken =
        signInResult?.idToken ?? signInResult?.data?.idToken ?? null;

      if (!idToken) return { type: "cancel" };

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        console.error("[GOOGLE] Supabase error:", error.message);
        return { type: "error", error: new Error(error.message) };
      }

      console.log("[GOOGLE] Success, user:", data?.user?.email);
      return { type: "success" };
    } catch (err: any) {
      console.error("[GOOGLE] catch:", err?.code, err?.message, err);
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) return { type: "cancel" };
      if (err?.code === statusCodes.IN_PROGRESS) return { type: "in_progress" };
      if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { type: "error", error: new Error("Google Play Services is not available") };
      }
      return {
        type: "error",
        error: err instanceof Error ? err : new Error("Google sign-in failed"),
      };
    }
  }, []);

  return { loginWithGoogle };
}
