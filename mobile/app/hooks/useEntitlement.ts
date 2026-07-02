import { useEffect, useMemo, useState } from "react";

import { FEATURE_FLAGS } from "@/app/config/featureFlags";
import {
  type EntitlementSnapshot,
  type EntitlementTier,
  getCachedSnapshot,
  subscribeSnapshot,
} from "@/app/services/revenueCatService";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// When paywall is disabled at build time, unlock everything by pretending
// the user is on the highest tier. Downstream gates (useRequireEntitlement,
// EntitlementGate) all key off hasPro/hasStandard so this single override
// bypasses the entire tier system.
const UNLOCKED_RESULT: UseEntitlementResult = {
  tier: "pro",
  isFree: false,
  hasStandard: true,
  hasPro: true,
  expiresAt: null,
  productId: null,
  daysRemaining: null,
};

export interface UseEntitlementResult {
  tier: EntitlementTier;
  isFree: boolean;
  hasStandard: boolean;
  hasPro: boolean;
  /** ISO timestamp when current subscription expires. Null for free. */
  expiresAt: string | null;
  /** Product identifier of the active subscription (e.g. era_pro_monthly). */
  productId: string | null;
  /** Whole days until expiry, rounded up. Null for free or unknown. */
  daysRemaining: number | null;
}

/**
 * Read-only access to the user's active subscription state. State is owned
 * by the RevenueCat service — this hook just mirrors its cache and re-renders
 * when RC reports a change.
 *
 * `hasPro` and `hasStandard` follow the entitlement hierarchy locked in
 * doc/PAYMENT_FEATURE.md: Pro unlocks Standard features as well.
 */
export const useEntitlement = (): UseEntitlementResult => {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(getCachedSnapshot);

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_PAYWALL) return;
    return subscribeSnapshot(setSnapshot);
  }, []);

  return useMemo(() => {
    if (!FEATURE_FLAGS.ENABLE_PAYWALL) return UNLOCKED_RESULT;
    const { tier, expiresAt, productId } = snapshot;
    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY))
      : null;
    return {
      tier,
      isFree: tier === "free",
      hasStandard: tier === "standard" || tier === "pro",
      hasPro: tier === "pro",
      expiresAt,
      productId,
      daysRemaining,
    };
  }, [snapshot]);
};
