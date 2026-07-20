/**
 * Analytics wrapper — currently a no-op stub.
 *
 * Firebase Analytics native SDK (@react-native-firebase/analytics) was
 * removed because it doesn't compile against Xcode 27 beta / iOS 27 SDK
 * (RN Firebase's Obj-C bridge trips -Werror=non-modular-include-in-
 * framework-module and no workaround holds cleanly under useFrameworks:
 * static). Once Xcode 27 goes stable OR RN Firebase releases a fixed
 * version, restore this file to call `analytics().logEvent(...)` etc.
 *
 * All callers already use `EVENTS`, `logEvent`, `logScreenView`,
 * `identifyUser`, and `resetUser` — so re-enabling Firebase is a one-file
 * change. In dev, calls still log to console so you can verify the event
 * pipeline visually.
 *
 * Session-recording + heatmaps: handled by Clarity (see clarityService.ts).
 * Crash + error tracking: handled by Sentry (see utils/sentry.ts).
 */

export const EVENTS = Object.freeze({
  // Auth
  LOGIN_STARTED: "login_started",
  LOGIN_COMPLETED: "login_completed",
  SIGN_UP: "sign_up",
  LOGOUT: "logout",

  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Plan generation
  PLAN_GEN_STARTED: "plan_gen_started",
  PLAN_GEN_COMPLETED: "plan_gen_completed",
  PLAN_GEN_FAILED: "plan_gen_failed",

  // Workouts
  WORKOUT_STARTED: "workout_started",
  WORKOUT_COMPLETED: "workout_completed",
  WORKOUT_ABANDONED: "workout_abandoned",
  SET_COMPLETED: "set_completed",
  PR_UNLOCKED: "pr_unlocked",

  // Weight
  WEIGHT_LOGGED: "weight_logged",

  // Monetization
  PAYWALL_VIEWED: "paywall_viewed",
  PAYWALL_DISMISSED: "paywall_dismissed",
  PURCHASE_COMPLETED: "purchase_completed",
  PURCHASE_RESTORED: "purchase_restored",
} as const);

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

type EventParams = Record<string, string | number | boolean | undefined>;

export const logEvent = async (
  event: AnalyticsEvent | string,
  params?: EventParams,
): Promise<void> => {
  if (__DEV__) console.log(`[analytics] ${event}`, params ?? {});
};

export const logScreenView = async (routeName: string): Promise<void> => {
  if (__DEV__) console.log(`[analytics] screen_view ${routeName}`);
};

export type UserProperties = {
  isPro?: boolean;
  isInTrial?: boolean;
  gender?: string;
  level?: string;
  program?: string;
  trainingDaysPerWeek?: number;
};

export const identifyUser = async (
  userId: string,
  props?: UserProperties,
): Promise<void> => {
  if (__DEV__) console.log(`[analytics] identify ${userId}`, props ?? {});
};

export const resetUser = async (): Promise<void> => {
  if (__DEV__) console.log("[analytics] reset user");
};
