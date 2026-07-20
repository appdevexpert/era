import analytics from "@react-native-firebase/analytics";

/**
 * Canonical event names. Keep < 40 chars, snake_case, no PII in the name.
 * Adding an event? Also list it in mobile/doc/ANALYTICS.md.
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

const safe = async (fn: () => Promise<unknown>, label: string) => {
  try {
    await fn();
  } catch (err) {
    if (__DEV__) console.warn(`[analytics] ${label} failed`, err);
  }
};

export const logEvent = (event: AnalyticsEvent | string, params?: EventParams) => {
  if (__DEV__) console.log(`[analytics] ${event}`, params ?? {});
  return safe(() => analytics().logEvent(event, params), event);
};

export const logScreenView = (routeName: string) => {
  if (__DEV__) console.log(`[analytics] screen_view ${routeName}`);
  return safe(
    () =>
      analytics().logScreenView({
        screen_name: routeName,
        screen_class: routeName,
      }),
    "screen_view",
  );
};

export type UserProperties = {
  isPro?: boolean;
  isInTrial?: boolean;
  gender?: string;
  level?: string;
  program?: string;
  trainingDaysPerWeek?: number;
};

export const identifyUser = async (userId: string, props?: UserProperties) => {
  await safe(() => analytics().setUserId(userId), "setUserId");
  if (!props) return;
  const stringified: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== null) stringified[k] = String(v);
  }
  await safe(() => analytics().setUserProperties(stringified), "setUserProperties");
};

export const resetUser = async () => {
  await safe(() => analytics().setUserId(null), "setUserId(null)");
};
