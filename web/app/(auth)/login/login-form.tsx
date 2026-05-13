"use client";

import { useActionState, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  type AuthFormState,
  requestEmailOtp,
  verifyEmailOtp,
} from "@/lib/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = {
  status: "idle",
  message: "",
  email: "",
  nextPath: "/",
};

type LoginFormProps = {
  nextPath: string;
  configError: string | null;
};

export function LoginForm({ nextPath, configError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(
    requestEmailOtp,
    { ...initialState, nextPath },
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailOtp,
    { ...initialState, nextPath },
  );

  const requestedEmail = requestState.email || email;
  const canVerify = requestState.status === "success";
  const disabled = Boolean(configError);

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/30">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-era-gold-16 text-era-gold">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-era-white">Admin sign in</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Email OTP keeps the admin dashboard tied to Supabase Auth sessions.
          </p>
        </div>
      </div>

      {configError ? (
        <StatusMessage
          tone="error"
          message={`${configError}. Add Supabase public auth environment variables before signing in.`}
        />
      ) : null}

      <form action={requestAction} className="mt-5 grid gap-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="grid gap-2">
          <Label htmlFor="email">Admin email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={disabled || requestPending}
              className="pl-8"
              placeholder="admin@era.app"
            />
          </div>
        </div>

        <Button type="submit" disabled={disabled || requestPending}>
          {requestPending ? (
            <>
              <Loader2 className="animate-spin" />
              Sending code
            </>
          ) : (
            <>
              <Mail />
              Send OTP
            </>
          )}
        </Button>
      </form>

      {requestState.status === "success" ? (
        <StatusMessage tone="success" message={requestState.message} />
      ) : null}
      {requestState.status === "error" ? (
        <StatusMessage tone="error" message={requestState.message} />
      ) : null}

      <form
        action={verifyAction}
        className="mt-5 grid gap-4 border-t border-border pt-5"
      >
        <input type="hidden" name="email" value={requestedEmail} />
        <input type="hidden" name="next" value={nextPath} />

        <div className="grid gap-2">
          <Label htmlFor="token">Verification code</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={!canVerify || verifyPending}
              required
              className="pl-8"
              placeholder="000000"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant={canVerify ? "default" : "secondary"}
          disabled={!canVerify || verifyPending}
        >
          {verifyPending ? (
            <>
              <Loader2 className="animate-spin" />
              Verifying
            </>
          ) : (
            <>
              <KeyRound />
              Verify and continue
            </>
          )}
        </Button>
      </form>

      {verifyState.status === "error" ? (
        <StatusMessage tone="error" message={verifyState.message} />
      ) : null}
    </div>
  );
}

function StatusMessage({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  const className =
    tone === "success"
      ? "border-era-success/40 bg-era-success/10 text-era-white"
      : "border-destructive/40 bg-destructive/10 text-era-white";

  return (
    <div className={`mt-4 flex gap-3 rounded-lg border p-3 text-sm ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="leading-5">{message}</p>
    </div>
  );
}
