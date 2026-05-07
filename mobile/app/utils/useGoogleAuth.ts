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
        "989359166941-ppi5ek70bip29tkcpudhe1rq6m4svin7.apps.googleusercontent.com",
      iosClientId:
        "989359166941-igq8e3utrhb6gi4smdrmm9kqi2td4qd2.apps.googleusercontent.com",
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<GoogleLoginResult> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear cached account so the account picker always shows
      try { await GoogleSignin.signOut(); } catch {}

      const signInResult: any = await GoogleSignin.signIn();
      const idToken =
        signInResult?.idToken ?? signInResult?.data?.idToken ?? null;

      if (!idToken) return { type: "cancel" };

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) return { type: "error", error: new Error(error.message) };

      return { type: "success" };
    } catch (err: any) {
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
