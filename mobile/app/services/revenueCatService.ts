/**
 * RevenueCat SDK wrapper — the only file in the app that imports
 * `react-native-purchases` or `react-native-purchases-ui`.
 *
 * RC is the single source of truth for entitlement state. We keep a tiny
 * in-module cache so components can read the current tier synchronously
 * without forcing every consumer to hit the native bridge. The SDK's
 * customerInfo listener feeds the cache; React hooks subscribe via
 * `subscribeSnapshot` for live updates.
 *
 * Entitlement identifiers are LOCKED to `standard` and `pro` (lowercase).
 * Product identifiers are LOCKED to `era_{standard|pro}_{monthly|annual}`.
 * See doc/PAYMENT_FEATURE.md for the full pricing/feature matrix.
 */

import { Linking, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
} from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { ENV } from "@/app/config/env";
import { FEATURE_FLAGS } from "@/app/config/featureFlags";

export const ENTITLEMENT_STANDARD = "standard";
export const ENTITLEMENT_PRO = "pro";

export type EntitlementTier = "free" | "standard" | "pro";

export interface EntitlementSnapshot {
  tier: EntitlementTier;
  /** ISO timestamp when the active subscription ends. Null for free users. */
  expiresAt: string | null;
  /** Product identifier (e.g. era_pro_monthly). Null for free users. */
  productId: string | null;
}

const initialSnapshot: EntitlementSnapshot = {
  tier: "free",
  expiresAt: null,
  productId: null,
};

let configured = false;
let cachedSnapshot: EntitlementSnapshot = { ...initialSnapshot };
const snapshotSubscribers = new Set<(snapshot: EntitlementSnapshot) => void>();

const resolveApiKey = (): string => {
  if (Platform.OS === "ios") return ENV.REVENUECAT_APPLE_API_KEY;
  if (Platform.OS === "android") return ENV.REVENUECAT_GOOGLE_API_KEY;
  return "";
};

const snapshotFromCustomerInfo = (
  info: CustomerInfo | null,
): EntitlementSnapshot => {
  if (!info) return { ...initialSnapshot };
  const active = info.entitlements.active;
  const pro = active[ENTITLEMENT_PRO];
  const standard = active[ENTITLEMENT_STANDARD];
  const winner = pro ?? standard ?? null;
  return {
    tier: pro ? "pro" : standard ? "standard" : "free",
    expiresAt: winner?.expirationDate ?? null,
    productId: winner?.productIdentifier ?? null,
  };
};

const snapshotsEqual = (a: EntitlementSnapshot, b: EntitlementSnapshot) =>
  a.tier === b.tier && a.expiresAt === b.expiresAt && a.productId === b.productId;

const updateCachedSnapshot = (info: CustomerInfo | null) => {
  const next = snapshotFromCustomerInfo(info);
  if (!snapshotsEqual(next, cachedSnapshot)) {
    cachedSnapshot = next;
    snapshotSubscribers.forEach((cb) => cb(cachedSnapshot));
  }
  // NOTE: the Supabase mirror (profiles.subscription_*) is now written
  // server-side by the `revenuecat-webhook` edge function — the ONLY writer,
  // since those columns are locked to service_role (a client write would be
  // spoofable and is blocked by the prevent_subscription_tampering trigger).
  // On-device entitlement stays live via this in-memory snapshot.
};

/**
 * One-shot SDK init. Safe to call repeatedly — extra calls are no-ops.
 * Registers a single global customerInfo listener that fans out to every
 * `subscribeSnapshot` consumer, and seeds the cache from the first fetch.
 */
export const configureRevenueCat = () => {
  if (!FEATURE_FLAGS.ENABLE_PAYWALL) return;
  if (configured) return;
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.warn("[revenueCat] missing API key for platform", Platform.OS);
    return;
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  configured = true;

  Purchases.addCustomerInfoUpdateListener(updateCachedSnapshot);
  Purchases.getCustomerInfo()
    .then(updateCachedSnapshot)
    .catch((err) => console.warn("[revenueCat] initial getCustomerInfo failed", err));
};

/** Link RC to a Supabase user. Call after every successful sign-in. */
export const identifyRevenueCatUser = async (userId: string) => {
  if (!FEATURE_FLAGS.ENABLE_PAYWALL) return null;
  if (!configured) configureRevenueCat();
  if (!configured) return null;
  const { customerInfo } = await Purchases.logIn(userId);
  updateCachedSnapshot(customerInfo);
  return customerInfo;
};

/** Reset RC to an anonymous app user. Call on sign-out / account delete. */
export const resetRevenueCatUser = async () => {
  if (!FEATURE_FLAGS.ENABLE_PAYWALL) return;
  if (!configured) return;
  // Logout returns the anonymous customerInfo, so the cached snapshot resets
  // to free. The server-side mirror is untouched — it stays as the webhook
  // last set it and is re-validated by RC on next sign-in.
  const customerInfo = await Purchases.logOut();
  updateCachedSnapshot(customerInfo);
};

/** Synchronous read of the currently cached snapshot. Safe to call in render. */
export const getCachedSnapshot = (): EntitlementSnapshot => cachedSnapshot;

/**
 * Subscribe to snapshot changes. Returns an unsubscribe function.
 * Fired whenever RC's customerInfo listener reports a change that affects
 * the user's active entitlements (tier, expiry, or product).
 */
export const subscribeSnapshot = (
  listener: (snapshot: EntitlementSnapshot) => void,
): (() => void) => {
  snapshotSubscribers.add(listener);
  return () => {
    snapshotSubscribers.delete(listener);
  };
};

/**
 * Present RevenueCat's Customer Center — a drop-in subscription management
 * UI that lets the user view active subscriptions, cancel, change plan,
 * request refunds, and restore purchases. Required for App Store compliance
 * (guideline 3.1.2). Returns when the user dismisses the screen.
 *
 * Falls back to opening the OS subscription settings page if Customer
 * Center fails (e.g. native module not yet loaded after a fresh pod add).
 */
export const presentCustomerCenter = async (): Promise<void> => {
  if (!FEATURE_FLAGS.ENABLE_PAYWALL) return;
  if (!configured) configureRevenueCat();
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    console.warn("[revenueCat] presentCustomerCenter failed, falling back", err);
    await openStoreSubscriptions();
  }
};

/**
 * Deep link to the user's OS subscription settings (Apple/Google). Useful
 * as a manual cancel/change path even when the Customer Center is available.
 */
export const openStoreSubscriptions = async (): Promise<void> => {
  const url =
    Platform.OS === "ios"
      ? "itms-apps://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
  try {
    await Linking.openURL(url);
  } catch (err) {
    console.warn("[revenueCat] failed to open store subscriptions", err);
  }
};

