import type { ReactNode } from "react";

import { useEntitlement } from "@/app/hooks/useEntitlement";

type RequiredTier = "standard" | "pro";

interface EntitlementGateProps {
  /** Minimum tier the user needs for `children` to render. */
  requires: RequiredTier;
  /** Rendered when the user has the required tier. */
  children: ReactNode;
  /** Optional UI for users who don't meet the gate (e.g. a "Pro feature"
   *  placeholder card). Defaults to rendering nothing. */
  fallback?: ReactNode;
}

/**
 * UI-section gate for tier-locked features.
 *
 * Use this when an entire piece of UI should disappear (or be replaced by a
 * placeholder) for users who don't have the required entitlement — e.g. a
 * Pro-only nutrition chart on the Progress screen.
 *
 * For click/tap handlers that should redirect to the paywall instead of
 * hiding, use the `useRequireEntitlement()` hook.
 *
 * Tier hierarchy applies — `pro` users always pass a `standard` gate.
 */
const EntitlementGate = ({
  requires,
  children,
  fallback = null,
}: EntitlementGateProps) => {
  const { hasStandard, hasPro } = useEntitlement();
  const allowed = requires === "pro" ? hasPro : hasStandard;
  return <>{allowed ? children : fallback}</>;
};

export default EntitlementGate;
