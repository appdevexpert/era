# CLAUDE.md

This file is the shared project guide for AI/dev work in this repository. Keep it safe to commit. Private notes, personal workflow, and machine-specific reminders belong in `claude.local.md`.

## Project Overview

ERA is an Expo React Native mobile app for onboarding, plan generation, workout viewing, and progress tracking. Shipped flows:

- Login/signup
- 7-step onboarding
- Plan generation loading flow
- Workout home/view UI
- Workout plan overview
- Exercise list view
- Workout logging (sets, exercises, sessions) with PR detection and ERA points
- Progress screen (stats, history card, PRs, weight, photos)

Admin panel is planned later.

## Feature Docs (Read Before Editing)

Each major feature has a dedicated MD with schema, services, slices, screens, and flow. Read the relevant doc before changing that area — saves a lot of rediscovery time.

All feature/reference docs live in `doc/`:

- `doc/OFFLINE_ARCHITECTURE.md` — Local-first contract for every Supabase write. Read before adding any new mutation path. Covers client UUIDs, sync queue, 23505 idempotency, persisted session slice.
- `doc/PR_FEATURE.md` — Personal Records: locked to `max_weight` only. PR detection logic, read services, prSlice, ProgressScreen / PrHistory / ExercisePrHistory wiring.
- `doc/WORKOUT_SCHEMA_EXPLAINED.md` — Supabase workout schema walkthrough.
- `doc/WORKOUT_BACKEND_CONTEXT.md` — Workout backend integration context.
- `doc/PAYMENT_FEATURE.md` — Subscription tiers (Free / Standard 99 NOK / Pro 199 NOK), RevenueCat integration, 12-week completion flow. Locked by Rami 2026-06-12.
- `doc/REVENUECAT_STATUS.md` — End-to-end RevenueCat completion tracker: what's done (client code), what's pending (webhook, dashboard, store config), the TODO checklist, and the sandbox test plan. Read this to know what's left before payments are production-ready.
- `doc/PAYMENT_TEST_PLAN.md` — iOS TestFlight sandbox test plan for RevenueCat subscriptions. Pre-flight blockers, phase-by-phase checklist (subscribe → upgrade → cancel → expiry → restore → refund → annual → gate spot-checks), SQL verification queries, and a failure-triage table. Run before production release.
- `doc/NOTIFICATIONS.md` — Local + push notification stack. First-login modal gate, daily/streak/PR locals, Phase 2 weekly summary push plan. Read before adding any notification type.
- `doc/NOTIFICATIONS_TEST_PLAN.md` — QA runbook / approval checklist for the notification feature. Permission gate, Daily Reminder, Streak Warning, PR Alerts, Profile toggles, bilingual, iOS/Android platform checks, failure-triage table. Run before sign-off.
- `doc/12_WEEK_PROGRAM.md`, `doc/12_WEEK_PROGRAM_CLIENT.md` — 12-week program structure references.
- `doc/MID_PROGRAM_SWITCH_DECISION.md` — Open product question: what happens when a user changes `goals.level` mid-cycle (root cause of Rami feedback #6). Awaiting Rami confirmation before implementation.
- `doc/CLEAN_BUILD.md` — `clean-build` branch reference. Two build-time feature flags disable paywall/RevenueCat and expo-notifications for internal builds. Includes what changes when each flag flips, and how to re-enable.

**Rule:** Every new feature/reference markdown doc MUST be created inside `mobile/doc/`. Do NOT create new `*.md` docs at the `mobile/` root. The only `.md` files allowed at `mobile/` root are `CLAUDE.md`, `claude.local.md`, and `README.md`. When you add a new doc, also add a one-line entry for it under this list so future sessions can find it.

## Core Rule

Everything added or changed in the user-facing app must work in both supported languages:

- English: `app/locales/en.ts`
- Norwegian Bokmål: `app/locales/nb.ts`

Do not hardcode user-visible UI text directly in screens/components. Fixed UI labels belong in locale files. Dynamic workout/program/exercise content comes from Supabase translation JSON and is localized through mappers/helpers at render time.

## Commands

```bash
npm run lint
npx tsc --noEmit
npm run start -- --localhost
npx expo run:ios
npx expo run:android
```

No test framework is configured yet.

## Tech Stack

- Expo React Native, Expo SDK 54
- React 19
- TypeScript strict mode
- React Navigation v7
- Redux Toolkit
- redux-persist with AsyncStorage
- Supabase Auth and database
- i18next / react-i18next
- react-native-reanimated
- react-native-gesture-handler
- @gorhom/bottom-sheet
- expo-linear-gradient
- expo-blur
- expo-glass-effect
- react-native-svg with SVG transformer

## App Entry Flow

```text
app/index.tsx
  -> app/App.tsx
  -> app/navigation/Navigation.tsx
```

`App.tsx` wraps the app with:

- Redux Provider
- PersistGate
- SafeAreaProvider
- GestureHandlerRootView
- BottomSheetModalProvider
- Toast
- i18n setup

## Navigation

Navigation lives in `app/navigation`.

Important files:

- `Navigation.tsx`: root auth/onboarding/plan/home switch
- `AuthNavigator.tsx`: login/create account/password recovery
- `OnboardingNavigator.tsx`: onboarding flow
- `PlanGenerationNavigator.tsx`: plan generation screen
- `HomeNavigator.tsx`: home stack routes
- `BottomTabNavigator.tsx`: bottom tabs
- `types.ts`: navigation param types

Current root routing:

```text
not logged in + not onboarded -> OnboardingStack
not logged in + onboarded -> AuthStack
logged in but plan/workout cache not ready -> PlanGenerationStack
logged in + plan ready -> HomeStack
```

## State Management

Redux lives in `app/stores`.

Important files:

- `app/stores/store.ts`: store setup and persisted reducers
- `app/stores/slice/authSlice.ts`: user, login state, onboarding flag, plan-generation flag
- `app/stores/slice/onboardingSlice.ts`: onboarding goal form data
- `app/stores/slice/workoutSlice.ts`: persisted raw workout bootstrap data
- `app/stores/selectors/`: shared selector helpers

Workout data is persisted in Redux as raw backend data, not localized display strings.

```text
PlanGenerationScreen
  -> dispatch(loadWorkoutBootstrap())
  -> fetch Supabase workout data
  -> store raw rows + translation JSON in Redux
  -> Home workout screens read Redux
```

## Localization

Fixed UI strings:

```text
app/locales/en.ts
app/locales/nb.ts
```

Language setup:

```text
app/locales/i18n.ts
```

Dynamic workout localization:

```text
app/utils/localization.ts
app/utils/workoutMappers.ts
```

Correct pattern:

```text
Supabase row has title_translations: { en: "...", nb: "..." }
Redux stores that raw row
Mapper selects the current language for display
```

Do not store only English or only Norwegian dynamic workout text in Redux.

## Supabase

Supabase project:

```text
project_ref=soyvnnicpkttehwjlpie
```

Local SQL files:

- `supabase/workout_schema.sql`
- `supabase/rami_week1_push_heavy_seed.sql`

Keep schema, translation columns, and RLS policy definitions in `workout_schema.sql`. Keep Rami sample data in the seed file.

Important backend rules:

- Do not recreate or modify the existing onboarding `goals` table from workout schema work.
- `profiles.role` must not be user-editable.
- `user_program_assignments` writes must be admin/server-controlled.
- Users can read allowed/template/current assigned workout data.
- Current sprint should not implement workout logging writes unless explicitly requested.

## Workout Architecture

Workout backend/UI support is split like this:

- `app/services/workoutService.ts`: Supabase read functions
- `app/types/workout.ts`: row and view-model types
- `app/utils/workoutMappers.ts`: raw DB data to UI data
- `app/utils/workoutFormatters.ts`: weights, reps, duration formatting
- `app/stores/slice/workoutSlice.ts`: persisted workout cache
- `app/components/workout/`: workout UI components
- `app/screen/home/WorkoutScreen.tsx`: workout home
- `app/screen/home/WorkoutPlanScreen.tsx`: 12-week plan overview
- `app/screen/home/ExerciseListScreen.tsx`: selected/current day exercise list

Current seeded workout data is based on Rami’s training journal and Figma workout design context.

## Folder Structure

```text
app/
  components/
    common/          all shared/reusable components (buttons, headers, layouts, icons, onboarding cards, toast config, tab bars)
    workout/         workout-specific components (cards, chips, progress, selectors, bottom sheets)
  config/            app environment/config helpers
  constants/         colors, fonts, design tokens
  hooks/             reusable hooks
  locales/           i18n setup and language files
  navigation/        root/stack/tab navigators and route types
  screen/
    auth/            login/signup/password screens
    home/            workout, profile, settings, tabs
    onboarding/      onboarding flow and steps
    planGeneration/  plan generation/loading screen
  services/          API/Supabase service functions
  stores/
    selectors/       Redux selectors
    slice/           Redux slices
  types/             app/domain TypeScript types
  utils/             helpers, formatting, auth, localization

assets/
  fonts/
  icons/
  images/

supabase/
  *.sql              schema, migrations, seed files

types/
  svg.d.ts           SVG module declarations
```

## Reusable UI Components

Prefer these shared components over inlining gradients, glass effects, or one-off button styles.

### `app/components/common/GlassFill.tsx`

Wraps `GlassView` with sensible defaults. Use this anywhere you want the iOS glass effect — buttons, sheets, tab bars, card backgrounds.

- Defaults: `effect="regular"`, `scheme="dark"`, `pointerEvents="none"`, `style={StyleSheet.absoluteFillObject}`.
- Props: `effect?: "regular" | "clear"`, `scheme?: "dark" | "light"`, `style?`.
- Pass `style` for `borderRadius` to match parent shape.

```tsx
<GlassFill />                                    // most common: regular + dark
<GlassFill effect="clear" scheme="light" />      // dashed pill backgrounds (WeekDaySelector)
<GlassFill style={{ borderRadius: 138 }} />      // matches parent's pill radius
```

**Do not** import `GlassView` directly unless you need the animated object-form `glassEffectStyle` (e.g., `WorkoutCard`'s primary card background).

### `app/components/common/PrimaryButton.tsx`

Full-width gold CTA. Use for auth and onboarding screens where the screen has one main action.

- Props: `label`, `onPress`, `disabled?`, `loading?`.
- Built-in `ActivityIndicator` when `loading={true}` — use it for async submits (login, signup, plan generation).
- Fixed height 56. No `style` override. Not for inline rows.

### `app/components/common/TintButton.tsx`

Reusable pill button for bottom sheets, modals, and inline action rows.

- Props: `label`, `onPress`, `variant: "gold" | "destructive"`, `style?`, `disabled?`.
- Pass `style={{ flex: 1 }}` for side-by-side layout (e.g. End Workout + Keep Going).
- `gold` variant matches `PrimaryButton`'s gradient visually but has flexible sizing.
- `destructive` is translucent red — use for End, Delete, Discard actions.

```tsx
<TintButton label="End Workout" variant="destructive" onPress={end} style={{ flex: 1 }} />
<TintButton label="Keep Going"  variant="gold"        onPress={keep} style={{ flex: 1 }} />
```

### When to pick which button

| Context | Use |
|---|---|
| Auth/onboarding main CTA (with loading state) | `PrimaryButton` |
| Bottom sheet / modal actions | `TintButton` |
| Inline workout action row (Complete Set bar) | `TintButton` for main + custom icon button for skip |
| Destructive confirmation (End, Delete, Discard) | `TintButton variant="destructive"` |

### Specialization rule

Keep components specialized by context — match the **visual**, not the **API**:

- `PrimaryButton` and `TintButton` look identical for the gold variant by design. Do not merge them.
- Do not add `children` or icon support to `PrimaryButton` — its API is intentionally text-only with loading.
- If a new gold-button shape appears (e.g., icon-only circle), build a small dedicated helper inside its parent component rather than overloading the shared APIs.

## Design/Implementation Rules

- Follow existing component and styling patterns.
- Use `GlassFill` instead of raw `GlassView` for the common pattern; use `PrimaryButton` or `TintButton` instead of hand-rolling gold buttons.
- Keep screens readable; move data shaping into services, slices, selectors, or mappers.
- Keep Supabase fetch code out of UI components when Redux cache should be used.
- Keep user-visible text localized.
- **Loading states use skeletons, not spinners.** Compose from `app/components/skeleton/Skeleton.tsx` (shimmering pulse primitive). Mirror the live layout — title bar, card shapes, list rows — so the screen's structure is visible while data loads. See `ExercisePrHistoryScreenSkeleton`, `ExerciseHistoryScreenSkeleton`, `WeightsScreenSkeleton`, `LeaderboardScreenSkeleton`, `ExerciseListScreenSkeleton` for examples. `ActivityIndicator` is acceptable only inside buttons (e.g. `PrimaryButton` loading state).
- Do not remove existing UI/work unless explicitly requested.
- Do not implement admin panel features unless the user asks.
- Do not commit local/private notes from `claude.local.md`.

## Locked Specs

Some product rules are explicit decisions that should NOT be undone by future refactors. Each lives in the user's memory store (`memory/*.md`) and may also have a feature doc.

- **PR detection** — `max_weight` only. No reps/e1RM PRs. (See `doc/PR_FEATURE.md` and `memory/project_pr_calculation_spec.md`.)
- **ERA points + streak** — Locked point values (50/15/100/150/25/200) and streak rules (workout-only, rest preserves, missed breaks). (See `memory/project_era_points_streak_spec.md`.)
- **Week progression** — Calendar-driven auto-shift, NOT completion-gated. (See `memory/project_week_progression_model.md`.)
- **Local-first writes** — Redux first, Supabase sync with retry queue. Never block UI on network. Never silently drop writes. (See `memory/feedback_local_first.md` and Data Write Pattern in `claude.local.md`.)
- **Session day resolution** — `useWorkoutSession` resolves the day strictly from `programDayId` arg → `session.programDayId`. It must NEVER fall back to `state.workout.currentDayDetail`, which is bootstrap-time "today" and drifts across calendar rollover + day-strip taps. Any new caller of `useWorkoutSession` must pass the explicit `programDayId` (or rely on `startSession` to set it via `initSession`). Root cause of the 2026-06-21..27 day-mixing regression. See `app/hooks/useWorkoutSession.ts` header comment.

## Validation

Before finishing meaningful code changes, run:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

Known current lint warnings may exist in unrelated files; do not hide new warnings.
