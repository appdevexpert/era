"use server";

import { redirect } from "next/navigation";

import { loginRedirectPath, safeNextPath } from "@/lib/admin/auth-paths";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "success" | "error";
  message: string;
  email: string;
  nextPath: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorState(message: string, email: string, nextPath: string): AuthFormState {
  return {
    status: "error",
    message,
    email,
    nextPath,
  };
}

export async function requestEmailOtp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = textValue(formData, "email").toLowerCase();
  const nextPath = safeNextPath(textValue(formData, "next"));

  if (!email) {
    return errorState("Enter the admin account email.", email, nextPath);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return errorState("Enter a valid email address.", email, nextPath);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return errorState(error.message, email, nextPath);
    }

    return {
      status: "success",
      message: "OTP sent. Check the email inbox for the verification code.",
      email,
      nextPath,
    };
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Supabase authentication is not configured.",
      email,
      nextPath,
    );
  }
}

export async function verifyEmailOtp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = textValue(formData, "email").toLowerCase();
  const token = textValue(formData, "token").replace(/\s+/g, "");
  const nextPath = safeNextPath(textValue(formData, "next"));
  let redirectTo: string | null = null;

  if (!email) {
    return errorState("Request an OTP before verifying.", email, nextPath);
  }

  if (!token) {
    return errorState("Enter the OTP code from the email.", email, nextPath);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return errorState(error.message, email, nextPath);
    }

    redirectTo = nextPath;
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Supabase authentication is not configured.",
      email,
      nextPath,
    );
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return errorState("Unable to verify the OTP code.", email, nextPath);
}

export async function signOut(formData?: FormData) {
  const nextPath = safeNextPath(
    formData instanceof FormData ? textValue(formData, "next") : "/",
  );

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // If auth is not configured, still return the user to the public login route.
  }

  redirect(loginRedirectPath(nextPath));
}
