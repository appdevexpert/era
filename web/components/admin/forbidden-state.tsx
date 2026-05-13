import { AlertTriangle, LogOut, RefreshCcw, ShieldAlert } from "lucide-react";

import type { AdminAuthState } from "@/lib/admin/auth";
import { signOut } from "@/lib/admin/auth-actions";

type ForbiddenStateProps = {
  authState: Exclude<AdminAuthState, { status: "authorized" | "unauthenticated" }>;
  nextPath?: string;
};

export function ForbiddenState({ authState, nextPath = "/" }: ForbiddenStateProps) {
  const isConfigError = authState.status === "configuration_error";
  const email =
    authState.status === "unauthorized" ? authState.email : "Authenticated session";
  const role =
    authState.status === "unauthorized" ? authState.profile?.role ?? "No profile" : null;
  const title = isConfigError ? "Admin auth is not ready" : "Access denied";
  const message = isConfigError
    ? authState.message
    : authState.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl shadow-black/30">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-era-gold-16 text-era-gold">
            {isConfigError ? (
              <AlertTriangle className="size-5" />
            ) : (
              <ShieldAlert className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-era-gold-dark">
              ERA Admin
            </p>
            <h1 className="mt-2 font-display text-3xl text-era-white">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 rounded-lg border border-border bg-era-black-2 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Account</dt>
            <dd className="truncate text-era-white">{email}</dd>
          </div>
          {role ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="rounded-full border border-border px-2 py-0.5 text-xs uppercase text-era-gold-light">
                {role}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form action={signOut} className="flex-1">
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-era-gold-light"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
          <a
            href="/login"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RefreshCcw className="size-4" />
            Retry login
          </a>
        </div>
      </section>
    </main>
  );
}
