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
    Sentry.captureException(error, { tags: { background: context } });
  } else {
    Sentry.captureMessage(`${context}: ${String(error)}`, "warning");
  }
};
