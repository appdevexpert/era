# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npx expo start              # Start dev server (press i/a for iOS/Android)
npx expo run:ios            # Build and run on iOS
npx expo run:android        # Build and run on Android
npx expo start --web        # Start web dev server
npx expo lint               # Run ESLint
```

No test framework is configured yet.

## Architecture

**Expo React Native app** (SDK 53, React 19, New Architecture enabled, React Compiler enabled) with Supabase backend.

### Entry Flow
`app/index.tsx` → `app/App.tsx` (providers: Redux, SafeArea, GestureHandler, BottomSheet, i18n) → `app/navigation/Navigation.tsx` (conditional root navigator)

### Navigation (React Navigation v7)
Auth-state gated navigation in `Navigation.tsx`:
1. `!isOnboarded` → OnboardingStack (GetStarted → Onboarding)
2. `!isLoggedIn` → AuthStack (Login → ForgotPassword)
3. `!isPlanGenerated` → PlanGenerationStack
4. Otherwise → HomeStack (HomeTabs with 4 bottom tabs + Settings/Notifications)

Navigation param types defined in `app/navigation/types.ts`.

### State Management (Redux Toolkit + redux-persist)
- `app/stores/store.ts` — store config with AsyncStorage persistence
- `app/stores/slice/authSlice.ts` — user, isLoggedIn, isOnboarded, isPlanGenerated
- `app/stores/slice/onboardingSlice.ts` — goalData, form state
- `app/stores/selectors/` — typed selector functions

### Internationalization (i18next)
- Two languages: English (`app/locales/en.ts`), Norwegian Bokmål (`app/locales/nb.ts`)
- Auto-detects device language, persists choice in AsyncStorage (`user_language` key)
- Config in `app/locales/i18n.ts`

### Design Tokens
- Colors: `app/constants/colors.ts` (neutrals, primary gold/yellow, semantic, gradients)
- Fonts: `app/constants/fonts.ts` (system fonts + Italiana-Regular display font)
- Responsive: `app/utils/responsive.ts` (horizontalScale, verticalScale, moderateScale)

### Environment Variables
Defined in `app/config/env.ts`, sourced from `.env.local` with `EXPO_PUBLIC_` prefix:
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_EDGE_FUNCTION_URL`

### Key Libraries
- **UI**: react-native-reanimated, react-native-gesture-handler, @gorhom/bottom-sheet, expo-linear-gradient, expo-blur, expo-glass-effect
- **Icons**: SVG components via react-native-svg + react-native-svg-transformer (custom duotone icons in `app/components/icons/`)
- **Monitoring**: @sentry/react-native (currently commented out)

## TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to project root
- SVG type declarations in `types/svg.d.ts`

## Metro Config
Custom SVG transformer configured in `metro.config.js` — SVGs are imported as React components, not assets.
