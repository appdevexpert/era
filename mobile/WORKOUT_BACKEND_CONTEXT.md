# ERA Workout Backend Context

This file captures the current workout-system plan, the Supabase schema that was created, what has already been applied, and what should happen next. It is meant as a handoff/reference file for continuing the work without losing context.

## Current State - 2026-05-09

The workout backend and frontend are now past the initial schema-only stage.

Implemented locally:

- Full workout Supabase schema exists in `supabase/workout_schema.sql`.
- Dynamic workout localization columns are included directly in `supabase/workout_schema.sql`.
- Rami Week 1 / Push - Heavy seed exists in `supabase/rami_week1_push_heavy_seed.sql`.
- Mobile workout fetch service exists in `app/services/workoutService.ts`.
- Workout row/data types exist in `app/types/workout.ts`.
- DB localization helper exists in `app/utils/localization.ts`.
- Workout display formatters exist in `app/utils/workoutFormatters.ts`.
- Workout DB-to-UI mappers exist in `app/utils/workoutMappers.ts`.
- Persisted Redux workout cache exists in `app/stores/slice/workoutSlice.ts`.
- Workout Redux selectors exist in `app/stores/selectors/workoutSelectors.ts`.
- `app/stores/store.ts` now persists the workout cache using `redux-persist` and AsyncStorage.
- `PlanGenerationStackParamList` and `PlanGenerationStack` have been added.
- Plan generation now loads workout bootstrap data before allowing the user into Home.
- Workout home, workout plan, and exercise list screens now read from Redux cache instead of calling Supabase directly.
- English/Norsk conversion is still done at render/map time, not stored as converted text in Redux.

Important current behavior:

```text
Login/onboarding complete
  -> PlanGenerationStack
  -> loadWorkoutBootstrap()
  -> Redux workout cache persisted to AsyncStorage
  -> completePlanGeneration()
  -> HomeStack
  -> Workout screens read persisted Redux data
```

Redux stores raw backend data, including translation JSON fields:

```text
title_translations: { en: "...", nb: "..." }
```

The app maps this raw data to English/Norsk display text using the current app language. This is intentional. Do not store already-localized workout strings as the main Redux source.

Verification after the Redux implementation:

- `npx tsc --noEmit` passes.
- `git diff --check` passes.
- `npm run lint` passes with existing unrelated warnings in:
  - `app/locales/i18n.ts`
  - `app/screen/auth/CreateAccount.tsx`

Expo dev server note:

- `npm run start -- --localhost` was attempted.
- Expo started a node process on `8081`, but Metro did not become reachable.
- The stuck node process was stopped.
- No dev server was left running.

## Review Issues Fixed

These were found by review and have now been patched locally.

### 1. `profiles.role` privilege escalation

File:

```text
supabase/workout_schema.sql
```

Original problem:

- Current profile update policy allows a user to update their own `profiles` row.
- Because `role` is on the same row, a normal user could set their role to `admin`.
- `public.is_admin()` trusts `profiles.role`, so this would unlock admin policies.

Fix:

- Added `public.prevent_profile_role_escalation()`.
- Added `prevent_profile_role_escalation` trigger on `public.profiles`.
- Self insert is limited to `role = 'user'`.
- Self update still allows user profile edits, but role changes are blocked unless the actor is already admin.
- Admin-only insert/update policies were added separately.

### 2. User program assignment self-grant

File:

```text
supabase/workout_schema.sql
```

Original problem:

- A generic self-owned `for all` policy applies to `user_program_assignments`.
- A user could insert an assignment for themselves to a private `program_id` if they know the UUID.
- `can_access_program()` trusts assignment rows, so this grants access to private programs.

Fix:

- Removed `user_program_assignments` from the generic self-owned `for all` policy loop.
- Users can read their own assignments.
- Assignment insert/update/delete is admin-only.

### 3. Plan generation failed-load retry loop

File:

```text
app/screen/planGeneration/PlanGeneration.tsx
```

Original problem:

- The auto-load effect dispatches when status is anything except `loading`.
- If the request fails, status becomes `failed`, and the effect immediately dispatches again.
- This creates repeated Supabase calls and makes the explicit Retry state less useful.

Fix:

- Auto-load now runs only when workout status is `idle`.
- Failed state waits for the explicit Retry button.

Patch files:

```text
app/screen/planGeneration/PlanGeneration.tsx
supabase/workout_schema.sql
```

Supabase live project status:

- Migration `workout_rls_hardening_20260509` was applied successfully through Supabase MCP.
- Migration `workout_rls_policy_name_cleanup_20260509` was applied successfully through Supabase MCP.
- Verified `public.profiles` has the role-escalation trigger for insert/update.
- Verified `public.user_program_assignments` no longer has the broad self-owned write policy.
- Verified users can only select their own assignments while assignment writes are admin-only.
- A follow-up policy-name cleanup migration removed the misleading old `profiles_update_self_or_admin` policy name and replaced it with `profiles_update_self`.

## Current Sprint Scope

The sprint scope from the client is:

- Login/signup
- 7-step onboarding
- Workout view UI
- Admin panel later, not now

The workout UI that needs to be delivered in this sprint is the workout view/list side, not the full workout logging flow yet.

## Important Product Decision

The database schema should support the full future workout system, even though this sprint only uses part of it.

Reason:

- The Figma workout flow includes workout plan, exercise list, start timer, set logging, feedback, comments, rest timers, exercise completion, core finisher, treadmill, session completion, PRs, points, streaks, past/future workout states.
- If the schema is only made for the current workout list UI, it will need a redesign later.
- The app should use only the planned workout tables for this sprint, but the backend can already support the full flow.

## Existing Onboarding

The app already has an onboarding `goals` table.

Rule:

- Do not recreate or modify `public.goals` from the workout schema.
- Onboarding data stays in `goals`.
- Workout plan generation can copy a snapshot of onboarding data into `workout_programs.onboarding_snapshot`.

## What Was Created

Created local SQL files:

```text
supabase/workout_schema.sql
supabase/rami_week1_push_heavy_seed.sql
```

Schema-related patch SQL was consolidated into `supabase/workout_schema.sql` so the Supabase folder keeps one schema file and one seed file.

Applied to Supabase project:

```text
project_ref=soyvnnicpkttehwjlpie
project_url=https://soyvnnicpkttehwjlpie.supabase.co
migration_name=workout_schema_full_20260509
migration_name=workout_translation_columns_20260509
migration_name=rami_week1_push_heavy_seed_20260509
migration_name=workout_rls_hardening_20260509
migration_name=workout_rls_policy_name_cleanup_20260509
```

Supabase apply result:

- Migration applied successfully through Supabase MCP.
- Existing `public.goals` was not created or modified by the workout schema.
- Required workout tables were verified after migration.
- Rami template program and Week 1 / Push - Heavy seed were verified.

Verified tables include:

- `exercise_library`
- `workout_programs`
- `program_days`
- `planned_exercise_sets`
- `workout_sessions`
- `session_sets`
- `personal_records`
- `era_point_events`
- `user_streak_days`

Verified seed data includes:

- Template program id: `2a87094c-260a-4a1b-95f6-7de8d5300001`
- Current seeded day id: `2a87094c-260a-4a1b-95f6-7de8d5300201`
- 12 program weeks
- Week 1 has 7 program days
- Day 1 Push - Heavy has 9 exercise rows
- Day 1 Push - Heavy has 25 planned set rows

## Schema Groups

The schema has four main groups:

```text
1. User/support tables
2. Planned workout tables
3. Logged workout tables
4. Reward/progress tables
```

## User/Support Tables

### `profiles`

Purpose:

- App-level user profile.
- Useful later for admin dashboard user list.

Important columns:

- `id`
- `full_name`
- `avatar_url`
- `role`
- `created_at`
- `updated_at`

Note:

- `auth.users` is still the login/signup identity source.
- `profiles` is app metadata.
- `goals` is onboarding answers.

### `user_reward_state`

Purpose:

- Stores current total points and streak summary for a user.

Useful for:

- Workout home points chip
- Streak modal
- Admin/user overview later

## Planned Workout Tables

These tables answer:

```text
What should the user do?
```

They power:

- Workout home card
- 12-week workout plan
- Exercise list
- Future workout view

### `exercise_library`

Master exercise list.

Examples:

- Bench Press
- Rope Pushdown
- Plank
- Incline Walk

Stores:

- name
- modality: strength, cardio, mobility, core
- category: compound, isolation, core, cardio
- muscles
- equipment
- default rest
- media/instructions fields for future admin panel

### `workout_programs`

Full workout program.

Example:

```text
12 Week Personalized
```

Stores:

- title
- subtitle
- duration weeks
- days per week
- program goal
- status
- `onboarding_snapshot`

### `program_weeks`

Weeks inside a program.

Examples:

- Week 1 - Hypertrophy
- Week 5 - Strength
- Week 9 - Peak

### `program_days`

Workout days inside a week.

Examples:

- Week 1, Day 1, Push - Heavy
- Week 1, Day 2, Pull - Heavy
- Week 1, Day 3, Legs / Abs

Stores:

- day title
- workout type
- target muscles
- estimated minutes
- points available
- rest day flag

### `program_day_sections`

Sections shown in the exercise list screen.

Examples:

- Exercises
- Core Finisher
- Treadmill Walk

### `program_day_exercises`

Exercise rows inside a section.

Examples:

- Incline Dumbbell Press, 60 kg
- Bench Press, 30 kg
- Rope Pushdown, 40 kg
- Leg Raises
- Plank
- Incline Walk

### `planned_exercise_sets`

Planned sets/reps/weight/duration.

Examples:

- Bench Press set 1: 30 kg x 10 reps
- Bench Press set 2: 30 kg x 10 reps
- Plank set 1: 60 sec
- Incline Walk: 20 min

Supports:

- weight/reps
- rep ranges
- duration
- distance
- speed
- incline
- rest seconds
- labels like ideal set, top set, backoff set

## User Plan/Schedule Tables

### `user_program_assignments`

Connects a user to a workout program.

Example:

```text
Rami -> 12 Week Personalized -> active
```

### `scheduled_workouts`

Calendar-level workout instances.

Used to know:

- today's workout
- past workout
- future workout
- missed workout
- skipped workout

Example:

```text
Rami -> Push - Heavy -> 2026-05-09 -> scheduled
```

## Logged Workout Tables

These tables answer:

```text
What did the user actually do?
```

They are created only when the user starts/logs a workout.

Do not build this feature in the current sprint unless the client expands scope.

### `workout_sessions`

One actual workout session after user taps Start Now.

Stores:

- user
- scheduled workout
- program day
- status
- started/completed time
- duration
- exercises completed
- sets logged
- points awarded

### `session_exercises`

Actual exercise inside a workout session.

Example:

```text
session_1 -> Bench Press -> in_progress
```

Stores:

- exercise snapshot name/category/muscles
- status
- exercise-level comment
- skipped reason

### `session_sets`

Actual logged set data.

This stores the Figma set logging screen:

- actual weight
- actual reps
- duration for timed work
- feedback: light weight, correct weight, felt heavy
- set comment
- completed time
- best set flag
- PR flag
- planned/rest info

Example:

```text
Bench Press Set 1
planned: 30 kg x 10
actual: 32.5 kg x 10
feedback: correct_weight
comment: Felt good
```

### `rest_timers`

Rest timer events after sets/exercises.

Supports:

- planned seconds
- added seconds
- skipped rest
- completed rest

### `session_cardio_logs`

Treadmill/cardio logging.

Stores:

- duration
- distance
- speed
- incline
- calories
- notes

## Stats/Reward Tables

### `user_exercise_stats`

Fast lookup for last/best set cards.

Used for Figma cards like:

- Last Set
- Best Set
- Top Set

### `personal_records`

Stores PR screen data.

Example:

```text
Deadlift -> 120 kg x 4 reps
Previous Best -> 114 kg
```

### `era_point_events`

Point history screen.

Examples:

- Workout Completed +25
- Personal Record +100
- Photo Added +25
- Streak Added +25

### `user_streak_days`

Streak calendar days.

Examples:

- Monday completed
- Tuesday completed
- Friday completed
- Saturday missed

### `session_media`

Progress photo after workout.

Used by:

- Capture Progress button on session completed screen

## Full Data Flow

```text
1. User signs up/logs in
   auth.users stores identity
   profiles stores app profile

2. User completes onboarding
   existing goals table stores onboarding data

3. Backend/admin/plan-generation creates program
   workout_programs
   program_weeks
   program_days
   program_day_sections
   program_day_exercises
   planned_exercise_sets

4. Program is assigned to user
   user_program_assignments
   scheduled_workouts

5. User opens workout home
   read scheduled_workouts
   read program_days
   read user_reward_state

6. User opens exercise list
   read program_day_sections
   read program_day_exercises
   read planned_exercise_sets

7. User taps Start Now later
   create workout_sessions

8. User logs exercises later
   create session_exercises
   create session_sets
   create rest_timers

9. User completes workout later
   update workout_sessions
   create personal_records if needed
   create era_point_events
   create user_streak_days
   update user_reward_state
```

## What To Do Next

Do these in order.

### 1. Test Sprint Scope

Verify:

- login/signup works
- onboarding saves to existing `goals`
- plan generation loads workout bootstrap data into persisted Redux
- app can restart and still show workout screens from persisted Redux
- workout screens show English/Norsk using DB translation JSON
- no logging flow is required for this sprint

### 2. Decide Current-User Program Strategy

Current mobile code loads the Rami template program constants.

Next backend decision:

```text
Should the app keep using the template program for this sprint,
or should plan generation create a user-specific assignment/program row?
```

Recommended for sprint:

- Use the template program for demo/current sprint.
- Move to user-specific `user_program_assignments` when admin/real plan generation is built.

### 3. Leave Full Logging For Later

Do not build yet:

- start workout
- set logging
- feedback/comments save
- rest timer
- PR screen
- points/streak logic
- progress photo

## Local Code Note

Earlier, a guided workout UI route/screen was added locally before the clarification that Figma was only for schema understanding. The user asked not to remove it. It is separate from the schema work.

Relevant local files changed earlier:

- `app/screen/home/WorkoutSessionScreen.tsx`
- `app/navigation/HomeNavigator.tsx`
- `app/navigation/types.ts`
- `app/screen/home/ExerciseListScreen.tsx`
- `app/stores/slice/authSlice.ts`

If cleanup is desired later, do it deliberately in a separate task.

## Open Questions

No blocking question is needed right now.

Optional decisions before the next implementation step:

1. Should seed data include only Week 1 / Push - Heavy, or all 12 weeks?
2. Should generated workout plans be user-specific immediately, or should we seed one template program first?
3. Should the current sprint UI show real past/future workout states, or only today's planned workout?

Recommended answer for sprint:

```text
Seed one template/current user program enough for the screens being delivered.
Connect only planned workout reads.
Do not implement logging until next sprint.
```
