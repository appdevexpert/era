import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

export const navigationIntegration = Sentry.reactNavigationIntegration();

export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
  Sentry.init({
    dsn,
    integrations: [navigationIntegration],
    environment: __DEV__ ? "development" : "production",
    release: `com.erafit@${Constants.expoConfig?.version ?? "0.0.0"}`,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableAutoSessionTracking: true,
    enabled: !!dsn,
  });
};

export const setSentryUser = (user: { id: string; email?: string }) => {
  Sentry.setUser(user);
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Report a background/fire-and-forget failure. Logs to console.warn for
 * dev visibility and pushes a breadcrumb + non-fatal exception to Sentry
 * so prod failures still surface even when the UI swallows them.
 */
export const reportBackgroundError = (
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  console.warn(`[bg-error] ${context}`, error, extra);
  Sentry.addBreadcrumb({
    category: "background",
    message: context,
    level: "warning",
    data: extra,
  });
  if (error instanceof Error) {
    Sentry.captureException(error, { tags: { background: context }, extra });
  } else {
    Sentry.captureMessage(`${context}: ${describeNonError(error)}`, {
      level: "warning",
      tags: { background: context },
      extra,
    });
  }
};

/**
 * Readable text for a thrown non-Error. Plain objects (RTK's SerializedError /
 * ConditionError, Supabase PostgrestError) otherwise stringify to
 * "[object Object]" and the real cause is lost.
 */
const describeNonError = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const { name, code, message } = error as Record<string, unknown>;
    const parts = [name, code, message].filter(
      (part) => typeof part === "string" || typeof part === "number",
    );
    if (parts.length > 0) return parts.join(": ");
    try {
      return JSON.stringify(error);
    } catch {
      // Circular — fall through to String().
    }
  }
  return String(error);
};
