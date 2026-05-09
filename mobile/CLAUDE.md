# CLAUDE.md

This file is the shared project guide for AI/dev work in this repository. Keep it safe to commit. Private notes, personal workflow, and machine-specific reminders belong in `claude.local.md`.

## Project Overview

ERA is an Expo React Native mobile app for onboarding, plan generation, and workout viewing. The current sprint focuses on:

- Login/signup
- 7-step onboarding
- Plan generation loading flow
- Workout home/view UI
- Workout plan overview
- Exercise list view

Admin panel and workout logging are planned later.

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
    common/          shared app components
    icons/           custom icon wrappers/components
    layout/          layout/background components
    navigation/      headers, tab bar, navigation UI
    onboarding/      onboarding shared UI
    ui/              general reusable UI
    workout/         workout cards, chips, progress, selectors
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

## Design/Implementation Rules

- Follow existing component and styling patterns.
- Keep screens readable; move data shaping into services, slices, selectors, or mappers.
- Keep Supabase fetch code out of UI components when Redux cache should be used.
- Keep user-visible text localized.
- Do not remove existing UI/work unless explicitly requested.
- Do not implement admin panel or workout logging unless the user asks.
- Do not commit local/private notes from `claude.local.md`.

## Validation

Before finishing meaningful code changes, run:

```bash
npx tsc --noEmit
npm run lint
git diff --check
```

Known current lint warnings may exist in unrelated files; do not hide new warnings.
