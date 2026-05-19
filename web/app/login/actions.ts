"use server";

import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  getDummyAdminEmail,
  getDummyAdminPassword,
} from "@/lib/auth/session";

export type SignInState = {
  error: string | null;
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (email !== getDummyAdminEmail() || password !== getDummyAdminPassword()) {
    return { error: "Invalid email or password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next && next.startsWith("/") ? next : "/");
}
