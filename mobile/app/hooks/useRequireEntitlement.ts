import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";

import { useEntitlement } from "@/app/hooks/useEntitlement";
import type {
  HomeStackParamList,
  OnboardingStackParamList,
} from "@/app/navigation/types";

type RequiredTier = "standard" | "pro";

/**
 * Action-gate hook for feature flags tied to RevenueCat entitlements.
 *
 * Returns a single function — call it inside an event handler before doing
 * the gated work. If the user has the required tier the call returns `true`
 * and the caller proceeds normally. Otherwise it pushes the user to the
 * shared Paywall screen and returns `false`, so the caller can early-out.
 *
 * Use this for click/tap handlers (e.g. "Add photo", "Open advanced meal
 * suggestions"). For UI sections that should disappear entirely when locked
 * (e.g. a Pro-only chart card), prefer the `<EntitlementGate>` component.
 *
 * Tier hierarchy is enforced — `pro` users always pass a `standard` check.
 */
export const useRequireEntitlement = () => {
  const { hasStandard, hasPro } = useEntitlement();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<HomeStackParamList | OnboardingStackParamList>
    >();

  return useCallback(
    (required: RequiredTier): boolean => {
      const allowed = required === "pro" ? hasPro : hasStandard;
      if (allowed) return true;
      navigation.navigate("Paywall");
      return false;
    },
    [hasPro, hasStandard, navigation],
  );
};
