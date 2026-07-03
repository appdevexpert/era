"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { createBrowserClient } from "@supabase/ssr";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import eraLogo from "@/assets/images/ERA.png";

// The mobile app registers the `erafit://` URL scheme (see mobile/app.json).
// We hand the recovery tokens back to the app through a deep link so the user
// can finish resetting inside the native new-password screen.
const APP_SCHEME = "erafit://reset-password";
const APP_HOME_SCHEME = "erafit://";

const MIN_PASSWORD_LENGTH = 6;

// Bilingual copy. The mobile app appends `?lang=<en|nb>` to the redirect URL
// (see mobile/app/utils/auth.ts); we fall back to the browser locale.
const STRINGS = {
  en: {
    title: "Reset Password",
    description: "Enter your new password below.",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    submit: "Reset Password",
    submitting: "Saving…",
    openInApp: "Open in the ERA app",
    resetHereInstead: "Or reset it here in your browser",
    passwordTooShort: "Password must be at least 6 characters.",
    passwordsDoNotMatch: "Passwords do not match.",
    success: "Password updated successfully!",
    successHint: "You can now sign in to the ERA app with your new password.",
    openApp: "Open the ERA app",
    invalidTitle: "This link has expired",
    invalidBody:
      "Password reset links can only be used once and expire after a short time. Please request a new one from the app.",
    genericError: "Something went wrong. Please request a new reset link.",
  },
  nb: {
    title: "Tilbakestill passord",
    description: "Skriv inn ditt nye passord nedenfor.",
    newPassword: "Nytt passord",
    confirmNewPassword: "Bekreft nytt passord",
    submit: "Tilbakestill passord",
    submitting: "Lagrer…",
    openInApp: "Åpne i ERA-appen",
    resetHereInstead: "Eller tilbakestill det her i nettleseren",
    passwordTooShort: "Passordet må være minst 6 tegn.",
    passwordsDoNotMatch: "Passordene stemmer ikke overens.",
    success: "Passordet er oppdatert!",
    successHint: "Du kan nå logge inn i ERA-appen med ditt nye passord.",
    openApp: "Åpne ERA-appen",
    invalidTitle: "Denne lenken har utløpt",
    invalidBody:
      "Lenker for tilbakestilling av passord kan bare brukes én gang og utløper etter kort tid. Be om en ny fra appen.",
    genericError: "Noe gikk galt. Be om en ny tilbakestillingslenke.",
  },
} as const;

type Lang = keyof typeof STRINGS;

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
  rawHash: string;
};

type Phase = "loading" | "invalid" | "ready" | "success";

type InitState = {
  phase: Phase;
  lang: Lang;
  isMobile: boolean;
  tokens: RecoveryTokens | null;
  showForm: boolean;
};

function resolveLang(): Lang {
  const fromQuery = new URLSearchParams(window.location.search)
    .get("lang")
    ?.toLowerCase();
  const candidate = (fromQuery || navigator.language || "en").toLowerCase();
  return candidate.startsWith("nb") || candidate.startsWith("no") ? "nb" : "en";
}

function isMobileDevice(): boolean {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Recovery tokens arrive in the URL hash fragment (implicit flow), which never
// reaches the server — so we can only read them client-side.
function parseTokensFromHash(): RecoveryTokens | "error" | null {
  const rawHash = window.location.hash.replace(/^#/, "");
  if (!rawHash) return null;
  const params = new URLSearchParams(rawHash);
  if (params.get("error") || params.get("error_code")) return "error";
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    return { accessToken, refreshToken, rawHash };
  }
  return null;
}

// Runs once on the client to read language, device, and the recovery tokens
// out of the URL. Returns the full initial UI state in a single object.
function computeInit(): InitState {
  const lang = resolveLang();
  const isMobile = isMobileDevice();
  const parsed = parseTokensFromHash();
  if (parsed === "error" || parsed === null) {
    return { phase: "invalid", lang, isMobile, tokens: null, showForm: false };
  }
  return {
    phase: "ready",
    lang,
    isMobile,
    tokens: parsed,
    // On mobile, lead with "open in app" and keep the browser form as a
    // secondary fallback so we don't rotate the refresh token prematurely.
    showForm: !isMobile,
  };
}

const INITIAL: InitState = {
  phase: "loading",
  lang: "en",
  isMobile: false,
  tokens: null,
  showForm: false,
};

export default function ResetPasswordPage() {
  const [init, setInit] = useState<InitState>(INITIAL);
  const { phase, lang, isMobile, tokens, showForm } = init;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const t = STRINGS[lang];

  useEffect(() => {
    // One-time read of the URL/device on mount; safe to set state once here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInit(computeInit());
  }, []);

  const appDeepLink = useMemo(
    () => (tokens ? `${APP_SCHEME}#${tokens.rawHash}` : APP_SCHEME),
    [tokens],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }
    if (!tokens) {
      setError(t.genericError);
      return;
    }

    setSubmitting(true);
    try {
      const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
      // Isolated client: never persist or auto-refresh, so this recovery
      // session can't leak into the admin cookie jar or rotate the token.
      const supabase = createBrowserClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          detectSessionInUrl: false,
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (sessionError) {
        setInit((prev) => ({ ...prev, phase: "invalid" }));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setInit((prev) => ({ ...prev, phase: "success" }));
    } catch {
      setError(t.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-1">
        <Image
          src={eraLogo}
          alt="ERA"
          priority
          className="h-8 w-auto object-contain"
        />
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-era-gold-dark">
          Fitness
        </span>
      </div>

      <div className="w-full max-w-sm">
        {phase === "loading" ? (
          <div className="h-40 animate-pulse rounded-lg bg-accent/40" />
        ) : phase === "invalid" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Alert01Icon} size={24} strokeWidth={1.8} />
            </span>
            <h1 className="font-display text-2xl font-medium text-foreground">
              {t.invalidTitle}
            </h1>
            <p className="text-sm text-balance text-muted-foreground">
              {t.invalidBody}
            </p>
          </div>
        ) : phase === "success" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-era-gold-dark/15 text-era-gold-dark">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={24}
                strokeWidth={1.8}
              />
            </span>
            <h1 className="font-display text-2xl font-medium text-foreground">
              {t.success}
            </h1>
            <p className="text-sm text-balance text-muted-foreground">
              {t.successHint}
            </p>
            {isMobile ? (
              <a
                href={APP_HOME_SCHEME}
                className={cn(buttonVariants(), "mt-2 w-full")}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} size={18} strokeWidth={1.8} />
                {t.openApp}
              </a>
            ) : null}
          </div>
        ) : (
          <FieldGroup>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="font-display text-2xl font-medium text-foreground">
                {t.title}
              </h1>
              <p className="text-sm text-balance text-muted-foreground">
                {t.description}
              </p>
            </div>

            {isMobile ? (
              <a href={appDeepLink} className={cn(buttonVariants(), "w-full")}>
                <HugeiconsIcon icon={SmartPhone01Icon} size={18} strokeWidth={1.8} />
                {t.openInApp}
              </a>
            ) : null}

            {isMobile && !showForm ? (
              <button
                type="button"
                onClick={() => setInit((prev) => ({ ...prev, showForm: true }))}
                className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t.resetHereInstead}
              </button>
            ) : null}

            {showForm ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <HugeiconsIcon
                      icon={Alert01Icon}
                      size={16}
                      strokeWidth={1.8}
                      className="mt-0.5 shrink-0"
                    />
                    <p>{error}</p>
                  </div>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="password">{t.newPassword}</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    {t.confirmNewPassword}
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? t.submitting : t.submit}
                  {!submitting ? (
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={18}
                      strokeWidth={1.8}
                    />
                  ) : null}
                </Button>
              </form>
            ) : null}
          </FieldGroup>
        )}
      </div>
    </div>
  );
}
