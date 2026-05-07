import * as Sentry from "@sentry/react-native";

export const navigationIntegration = Sentry.reactNavigationIntegration();

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
    integrations: [navigationIntegration],
    tracesSampleRate: 1.0,
    enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  });
};

export const setSentryUser = (user: { id: string; email?: string }) => {
  Sentry.setUser(user);
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};
