# Analytics, Error Tracking, and Session Replay

ERA mobile ships three observability SDKs:

| Tool | Purpose | Package |
|---|---|---|
| Firebase Analytics | Product analytics (events + user properties + screen views) | `@react-native-firebase/analytics` |
| Sentry | Crash + error tracking with breadcrumbs | `@sentry/react-native` |
| Microsoft Clarity | Session recording + heatmaps | `@microsoft/react-native-clarity` |

## Where things live

| File | Role |
|---|---|
| `app/utils/sentry.ts` | Sentry init, `setSentryUser`, `clearSentryUser`, `reportBackgroundError`, `navigationIntegration` |
| `app/services/analyticsService.ts` | Firebase wrapper: `EVENTS` map, `logEvent`, `logScreenView`, `identifyUser`, `resetUser` |
| `app/services/clarityService.ts` | Clarity wrapper: `initializeClarity`, `setClarityUserId`, `setClarityScreenName`, `setClarityTag` |
| `app/index.tsx` | Calls `initSentry()` before `registerRootComponent` |
| `app/App.tsx` | Calls `initializeClarity()` inside a `useEffect` on mount |
| `app/navigation/Navigation.tsx` | (a) fan out user identity on SIGNED_IN / getSession, (b) screen tracking via `onStateChange` / `onReady` |

Firebase Analytics has no explicit `initialize()` call — the `@react-native-firebase/app` config plugin auto-inits from `GoogleService-Info.plist` / `google-services.json`.

## Config

### `app.json` plugins

Ordering matters. `./plugins/withRemoveAndroidSplashIcon` must stay at index 0 (see `memory/project_splash_workaround.md`). New analytics plugins slot in right after:

```json
"plugins": [
  "./plugins/withRemoveAndroidSplashIcon",
  "@react-native-firebase/app",
  ["@sentry/react-native/expo", {
    "url": "https://sentry.io/",
    "organization": "REPLACE_WITH_SENTRY_ORG",
    "project": "era-mobile"
  }],
  ...
]
```

Clarity has no Expo config plugin — it's runtime-only.

### Native files required at repo root

- `mobile/GoogleService-Info.plist` (iOS) — download from Firebase console
- `mobile/google-services.json` (Android) — download from Firebase console

Both are already referenced from `app.json` (`ios.googleServicesFile`, `android.googleServicesFile`).

### Env vars (`.env.local`)

```
EXPO_PUBLIC_SENTRY_DSN=            # public DSN from Sentry project settings
SENTRY_AUTH_TOKEN=                 # build-time only (source map upload) — NOT EXPO_PUBLIC_
EXPO_PUBLIC_CLARITY_PROJECT_ID=    # short ID from clarity.microsoft.com
```

Read via `app/config/env.ts` (`ENV.SENTRY_DSN`, `ENV.CLARITY_PROJECT_ID`). Both fall back to `""` — every SDK is coded to no-op gracefully when its key is missing, so a fresh clone builds without secrets.

### Sentry source map upload (optional, do once)

Create `mobile/ios/sentry.properties` and `mobile/android/sentry.properties`:

```
defaults.url=https://sentry.io/
defaults.org=REPLACE_WITH_SENTRY_ORG
defaults.project=era-mobile
auth.token=  # inherit from SENTRY_AUTH_TOKEN env at build time
```

The `@sentry/react-native/expo` config plugin auto-wires the EAS build to upload symbols.

## After changing env or plugins

Three package additions include native code, so a JS-only reload will not pick them up:

```bash
cd mobile
npx expo prebuild --clean
npx expo run:ios       # or run:android
```

## What's wired today

**Passive / SDK-level:**
- Sentry crash capture (all uncaught JS errors)
- Sentry navigation integration (breadcrumbs on every route change)
- Firebase auto-events (`session_start`, `first_open`, `app_open`, `app_update`)
- Screen view tracking to Firebase + Clarity on every navigation change
- User identity fan-out to all three SDKs on login / cold-start session restore
- Identity reset on logout

**Custom events fired:**

| Event | Fired from | Params |
|---|---|---|
| `login_completed` | `Navigation.tsx` auth listener (SIGNED_IN) | — |
| `logout` | `Navigation.tsx` auth listener (SIGNED_OUT) | — |
| `sign_up` | `authSlice.ts` `signUpThunk` after user mapping | — |
| `onboarding_completed` | `onboardingSlice.ts` `submitGoalData` on success (also backfills `gender`/`level` user props) | — |
| `plan_gen_started` | `PlanGeneration.tsx` at start of `startWorkoutBootstrap` | — |
| `plan_gen_completed` | `PlanGeneration.tsx` when `isReady` flips true | — |
| `plan_gen_failed` | `PlanGeneration.tsx` when workout status → failed | `reason` |
| `workout_started` | `useWorkoutSession.ts` `startSession` (started / resumed / edit_mode outcomes) | `outcome`, `week`, `day` |
| `set_completed` | `useWorkoutSession.ts` `logSetResult` (skipped in edit mode + on re-log of same set) | `category`, `set_number`, `has_weight`, `has_reps`, `has_duration`, `feedback` |
| `pr_unlocked` | `useWorkoutSession.ts` `completeExerciseResult` when a new max-weight PR row is created | `exercise_category`, `weight_kg`, `reps`, `previous_best_kg`, `points` |
| `workout_completed` | `useWorkoutSession.ts` `finishSession` (fires once per End Workout — filter partial vs full via `exercises_completed`) | `duration_seconds`, `sets_logged`, `exercises_completed`, `new_prs`, `cardio_bonus`, `new_streak`, `seven_day_bonus` |
| `weight_logged` | `weightSlice.ts` `logWeightThunk` after upsert | `was_new` (false = re-log of same day) |
| `paywall_viewed` | `PaywallScreen.tsx` on mount | `source` (`onboarding` / `profile` / etc.) |
| `paywall_dismissed` | `PaywallScreen.tsx` `onDismiss` (skipped when a purchase or restore just fired) | `source` |
| `purchase_completed` | `PaywallScreen.tsx` `onPurchaseCompleted` | `source`, `tier`, `product` |
| `purchase_restored` | `PaywallScreen.tsx` `onRestoreCompleted` (skipped when no active entitlement) | `source`, `tier` |

Clarity is disabled in `__DEV__` to protect quota — you'll only see recordings from production/TestFlight builds.

## Not fired (by design)

- `onboarding_step_completed` — ERA's onboarding submits all fields in a single `submitGoalData` call, not per-screen, so a per-step event would just be `updateGoalData` field-change noise. If per-screen analytics become useful later, add a `void logEvent(...)` inside each onboarding screen's Continue handler.
- `workout_abandoned` — currently rolled into `workout_completed` with `exercises_completed < total`. Filter in Firebase / BigQuery if the distinction is needed; splitting into its own event would double-count End Workout paths.

## Rules for adding events

1. **Never put PII in event names or param keys.** User IDs go via `identifyUser`, not as event params.
2. **Event name ≤ 40 chars, snake_case.** Firebase enforces this.
3. **Add the constant to `EVENTS` in `analyticsService.ts`** — don't hand-type event strings at call sites.
4. **Update the table above** so the next dev can see what's fired.
5. **Wrap in `void`** at the call site — `logEvent` returns a promise but should never block UI. It also never throws.
6. **Params should be scalars.** Firebase rejects nested objects; the wrapper only accepts `string | number | boolean | undefined`.

## User properties

Set once at identify time via the `props` arg to `identifyUser`. Useful properties:

- `isPro`, `isInTrial` — subscription state (from RevenueCat / entitlements)
- `gender`, `level`, `program`, `trainingDaysPerWeek` — from `goals` table

These become segmentation dimensions in Firebase, custom tags in Clarity, and Sentry user context.

## Privacy / consent

No opt-out toggle in v1 — decision locked 2026-07-20. Revisit before EU launch. Clarity is dev-disabled to reduce accidental recording of test flows.

## Testing the integration

1. **Sentry** — throw a test error from any button: `throw new Error("sentry smoke test")`. Check the Sentry dashboard within 60s.
2. **Firebase** — with `EXPO_PUBLIC_SENTRY_DSN` and the Google Services files in place, run a production build. In Firebase console → Analytics → DebugView (or Realtime), you should see `screen_view` events as you navigate.
3. **Clarity** — install a TestFlight build (Clarity is disabled in `__DEV__`), record a short session, wait ~5 min, check clarity.microsoft.com for the recording.
