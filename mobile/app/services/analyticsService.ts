/**
 * Analytics wrapper — Firebase Analytics (@react-native-firebase/analytics).
 *
 * Session-recording + heatmaps: handled by Clarity (see clarityService.ts).
 * Crash + error tracking: handled by Sentry (see utils/sentry.ts).
 */

import analytics from "@react-native-firebase/analytics";

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

const sanitize = (params?: EventParams): Record<string, string | number | boolean> | undefined => {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
};

export const logEvent = async (
  event: AnalyticsEvent | string,
  params?: EventParams,
): Promise<void> => {
  if (__DEV__) console.log(`[analytics] ${event}`, params ?? {});
  try {
    await analytics().logEvent(event, sanitize(params));
  } catch (e) {
    if (__DEV__) console.warn(`[analytics] logEvent failed: ${event}`, e);
  }
};

export const logScreenView = async (routeName: string): Promise<void> => {
  if (__DEV__) console.log(`[analytics] screen_view ${routeName}`);
  try {
    await analytics().logScreenView({
      screen_name: routeName,
      screen_class: routeName,
    });
  } catch (e) {
    if (__DEV__) console.warn(`[analytics] logScreenView failed: ${routeName}`, e);
  }
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
  try {
    await analytics().setUserId(userId);
    if (props) {
      const entries: [string, string][] = [];
      if (props.isPro !== undefined) entries.push(["is_pro", String(props.isPro)]);
      if (props.isInTrial !== undefined) entries.push(["is_in_trial", String(props.isInTrial)]);
      if (props.gender) entries.push(["gender", props.gender]);
      if (props.level) entries.push(["level", props.level]);
      if (props.program) entries.push(["program", props.program]);
      if (props.trainingDaysPerWeek !== undefined)
        entries.push(["training_days_per_week", String(props.trainingDaysPerWeek)]);
      await analytics().setUserProperties(Object.fromEntries(entries));
    }
  } catch (e) {
    if (__DEV__) console.warn(`[analytics] identifyUser failed: ${userId}`, e);
  }
};

export const resetUser = async (): Promise<void> => {
  if (__DEV__) console.log("[analytics] reset user");
  try {
    await analytics().setUserId(null);
  } catch (e) {
    if (__DEV__) console.warn("[analytics] resetUser failed", e);
  }
};
