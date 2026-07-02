# Clean Build (no paywall / no notifications)

Reference for the `clean-build` branch. Used to ship internal / TestFlight
builds before monetization and push notifications are ready. Everything is
gated behind two build-time feature flags — flip both back to `true` when
you're ready to re-enable the real flows.

## Branch

```
git checkout clean-build
```

Based off `main`. No behavioral change on `main` — all edits live only on
this branch.

## Feature Flags

Source of truth: `mobile/app/config/featureFlags.ts`

```ts
export const FEATURE_FLAGS = {
  ENABLE_PAYWALL: false,
  ENABLE_NOTIFICATIONS: false,
} as const;
```

### `ENABLE_PAYWALL = false` does what

- RevenueCat SDK is never configured (no `Purchases.configure`, no network
  calls to RevenueCat).
- `identifyRevenueCatUser` / `resetRevenueCatUser` / `presentCustomerCenter`
  become no-ops.
- `useEntitlement()` returns a fixed "pro" snapshot for every user:
  ```
  { tier: "pro", isFree: false, hasStandard: true, hasPro: true,
    expiresAt: null, productId: null, daysRemaining: null }
  ```
- Because every downstream gate (`useRequireEntitlement`, `EntitlementGate`)
  keys off `hasPro` / `hasStandard`, this single override unlocks every
  Pro/Standard feature app-wide (progress photos, meal logging, bro split,
  last-weight suggestions, exercise progression chart, cardio timer, etc.).
- Paywall screen is never navigated to.
- Profile screen's subscription footer (tier chip, manage button, billing
  progress bar) is hidden via `showSubscription={false}` on `ProfileCard`.

### `ENABLE_NOTIFICATIONS = false` does what

- No OS permission prompt is ever shown (`requestNotificationPermission`
  returns `"granted"` without calling the OS).
- First-login notification permission modal is skipped in
  `Navigation.tsx`.
- Foreground handler is not registered.
- `scheduleDailyReminder`, `scheduleStreakWarning`, `firePRAlert`, the
  matching cancel helpers, and `ensureAndroidChannel` all no-op.
- Notification section in Profile screen is hidden entirely.

## Files Changed

| File | Change |
|---|---|
| `app/config/featureFlags.ts` | **new** — the two flags |
| `app/hooks/useEntitlement.ts` | short-circuits to "pro" snapshot when paywall off |
| `app/services/revenueCatService.ts` | `configure`, `identify`, `reset`, `presentCustomerCenter` no-op when off |
| `app/utils/notifications.ts` | all helpers no-op; foreground handler + permission calls guarded |
| `app/navigation/Navigation.tsx` | permission modal skipped when off |
| `app/screen/home/ProfileScreen.tsx` | notification section hidden; passes `showSubscription` to `ProfileCard` |
| `app/components/common/ProfileCard.tsx` | new optional `showSubscription` prop; when false, hides subscription/progress footer + drops the divider under the avatar row |

## Re-enable Later

Two ways to bring it back:

1. **On this branch** — set both flags to `true` in `featureFlags.ts` and
   rebuild. Every code path resumes working. Zero other edits needed.
2. **Merge back to main** — this branch's only substantive addition is the
   feature-flag file and its call sites. If you want the flags to survive
   on `main`, merge; if you don't, just drop this branch after the build
   ships and future work happens on `main` directly.

## Building

Standard Expo build commands (unchanged):

```bash
cd mobile
npx expo run:ios      # or run:android
```

RevenueCat and expo-notifications packages are still installed — we only
skip the runtime init/register calls, so the native modules stay in the
binary. This means flipping the flags back on requires **no** re-pod /
re-gradle step.

## Validation

Before shipping the build, run:

```bash
cd mobile
npx tsc --noEmit
npm run lint
```

Both pass clean on this branch (only pre-existing warnings from unrelated
files remain).

## Known Cosmetic Notes

- ProfileCard on this branch shows only the top row (avatar + name + meta)
  — the subscription/progress footer is hidden. This is intentional.
- The Paywall screen (`app/screen/home/PaywallScreen.tsx`) file still exists
  but is unreachable — no navigation path can hit it while `ENABLE_PAYWALL`
  is `false`.
- `ManageSubscriptionBottomSheet` still mounts (as a hidden ref) inside
  Profile but has no trigger to open it while paywall is off.
