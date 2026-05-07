import { useCallback } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/app/utils/auth";

interface AppleLoginResult {
  type: "success" | "cancel" | "error";
  error?: Error;
}

const isCancelError = (err: unknown) => {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message.toLowerCase() : "";

  return code === "ERR_REQUEST_CANCELED" || message.includes("cancel");
};

export function useAppleAuth() {
  const loginWithApple = useCallback(async (): Promise<AppleLoginResult> => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return {
          type: "error",
          error: new Error("Apple Sign-In is not available on this device"),
        };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { type: "error", error: new Error("No identity token returned") };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) return { type: "error", error: new Error(error.message) };

      return { type: "success" };
    } catch (err: unknown) {
      if (isCancelError(err)) return { type: "cancel" };
      return {
        type: "error",
        error: err instanceof Error ? err : new Error("Apple sign-in failed"),
      };
    }
  }, []);

  return { loginWithApple };
}
