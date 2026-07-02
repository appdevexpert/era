/**
 * Build-time feature flags.
 *
 * Flip these to false to ship a "clean" build with paywall/subscription and
 * notification flows fully bypassed — used for early testing and internal
 * TestFlight builds before monetization/push are ready.
 *
 * When flipped back on, the underlying RevenueCat + expo-notifications code
 * paths are already wired and will resume working without further changes.
 */
export const FEATURE_FLAGS = {
  /**
   * Master switch for RevenueCat + all tier gating.
   * When false:
   *   - RevenueCat SDK is never configured (no purchases network calls)
   *   - useEntitlement() reports every user as "pro" (all features unlocked)
   *   - useRequireEntitlement()/EntitlementGate short-circuit to allow
   *   - Paywall screen is never navigated to
   *   - Manage Subscription button in Profile becomes a no-op
   */
  ENABLE_PAYWALL: false,

  /**
   * Master switch for expo-notifications.
   * When false:
   *   - First-login permission modal is skipped
   *   - No OS permission prompt is ever triggered
   *   - Scheduling / cancelling / firing helpers become no-ops
   *   - Android notification channel is not registered
   *   - Notification section in Profile is hidden
   */
  ENABLE_NOTIFICATIONS: false,
} as const;
