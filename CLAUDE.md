# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Monorepo with two independent projects sharing a Supabase backend:

- **`mobile/`** — Expo React Native fitness app (user-facing)
- **`web/`** — Next.js 16 admin dashboard (owner-only)
- **`mobile/supabase/`** — Shared database schema and seed SQL

Each sub-project has its own `node_modules`, `package.json`, and build tooling. Run `npm install` inside the respective directory. See `mobile/CLAUDE.md` for detailed mobile architecture and `web/AGENTS.md` for Next.js 16 caveats.

## Commands

### Mobile (`cd mobile`)

```bash
npm run start -- --localhost    # Expo dev server
npx expo run:ios                # iOS build
npx expo run:android            # Android build
npm run lint                    # ESLint
npx tsc --noEmit                # Type check
```

### Web (`cd web`)

```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run lint        # ESLint
npx tsc --noEmit    # Type check
```

No test framework is configured in either project.

## Tech Stack

**Mobile:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, React Navigation v7, Redux Toolkit + redux-persist, Supabase, i18next (English + Norwegian Bokmal), react-native-reanimated, @gorhom/bottom-sheet, react-native-svg with SVG transformer.

**Web:** Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, shadcn/base-ui components, Supabase SSR + service role key, Lucide icons. Server components by default, mutations via server actions.

## Architecture

### Mobile Data Flow

```
Login/Onboarding -> PlanGenerationScreen
  -> loadWorkoutBootstrap() fetches Supabase
  -> Raw rows + translation JSON stored in Redux (persisted)
  -> Home screens read from Redux
  -> Mappers in utils/workoutMappers.ts localize at render time
```

Redux stores raw database data, never pre-localized strings. UI mappers decide which language to display based on i18next current language.

### Web Data Flow

```
Server components fetch via lib/admin/data.ts (Supabase queries)
  -> Data passed to client components as props
  -> Mutations go through lib/admin/actions.ts (server actions)
  -> Service role key used only server-side
```

### Shared Supabase Schema

Database schema lives in `mobile/supabase/workout_schema.sql`. Key tables: `exercise_library`, `workout_programs`, `program_weeks`, `program_days`, `program_day_sections`, `program_day_exercises`, `planned_exercise_sets`, `user_program_assignments`, `profiles`.

All exercise/program content uses translation JSON columns (e.g., `title_translations: { en: "...", nb: "..." }`).

## Critical Rules

1. **Bilingual requirement (mobile):** Every user-facing text must exist in English and Norwegian Bokmal. Fixed UI text goes in `mobile/app/locales/en.ts` and `nb.ts`. Dynamic content uses Supabase translation JSON.

2. **Next.js 16 (web):** This uses Next.js 16 with breaking changes from prior versions. Read `node_modules/next/dist/docs/` before writing web code. Do not assume Next.js 14/15 patterns apply.

3. **Schema safety:** Do not modify the existing `goals` table. `profiles.role` must not be user-editable. `user_program_assignments` writes are admin/server-controlled only.

4. **No premature features:** Do not implement admin panel features in mobile or workout logging writes unless explicitly requested.

## Design Tokens

Both projects share the ERA brand palette:
- Primary gold: `#D4AF37` family
- Backgrounds: black (`#000000`, `#1A1A1A`)
- Fonts: PlayfairDisplay (display), Italiana (accent), system sans (body)

## Validation

Before finishing code changes, run in the relevant project directory:

```bash
npx tsc --noEmit
npm run lint
```
