# Workout Schema Explained

This file explains `mobile/supabase/workout_schema.sql` in Hinglish so future coding work has quick context.

Core idea:

```text
Plan data = user ko kya karna hai
Log data = user ne actually kya kiya
Reward data = workout ke baad points, PR, streak
```

## Big Picture

```text
auth.users
  -> profiles
  -> user_reward_state

exercise_library
  -> workout_programs
     -> program_weeks
        -> program_days
           -> program_day_sections
              -> program_day_exercises
                 -> planned_exercise_sets

user_program_assignments
  -> scheduled_workouts
     -> workout_sessions
        -> session_exercises
           -> session_sets
        -> rest_timers
        -> session_cardio_logs

workout_sessions / session_sets
  -> user_exercise_stats
  -> personal_records
  -> era_point_events
  -> user_streak_days
  -> session_media
```

Schema ko 3 mental buckets mein samjho:

1. Planned workout tables: user ko kya workout karna hai.
2. Runtime logging tables: user workout start karke kya log karta hai.
3. Reward/progress tables: points, streak, PR, media.

## User Layer

### `auth.users`

Ye Supabase Auth ka built-in table hai. Login/signup identity yahin hoti hai. Schema is table ko create nahi karta, bas reference karta hai.

### `profiles`

App-level user profile.

Stores:

- `id`: same as `auth.users.id`
- `full_name`
- `avatar_url`
- `role`: `user`, `coach`, `admin`
- timestamps

Important:

- Auth identity `auth.users` mein hai.
- App metadata `profiles` mein hai.
- Role-based admin/coach access yahin se controlled hai.

### `user_reward_state`

User ka current points/streak summary.

Stores:

- `total_points`
- `current_streak_days`
- `longest_streak_days`
- `last_streak_date`
- `last_workout_completed_at`

Use:

- Workout home points chip
- Streak display
- Fast reward summary

New signup par `handle_new_user()` trigger automatically `profiles` aur `user_reward_state` rows create karta hai.

## Exercise Library

### `exercise_library`

Master exercise database.

Examples:

- Bench Press
- Incline Dumbbell Press
- Rope Pushdown
- Plank
- Incline Walk

Stores:

- `slug`
- `name`
- translations
- `modality`: `strength`, `cardio`, `mobility`, `core`
- `category`: `compound`, `isolation`, `core`, `cardio`, `warmup`, `cooldown`
- equipment
- muscles
- instructions/coaching cues
- video/thumbnail
- default rest
- default weight unit
- measurement config

Important:

`exercise_library` actual workout row nahi hai. Ye reusable exercise definition hai. Actual workout mein exercise use hoti hai through `program_day_exercises.exercise_id`.

## Planned Workout Tables

Ye tables answer karte hain:

```text
User ko kya karna hai?
```

They power:

- Workout home card
- 12-week workout plan
- Exercise list
- Future workout view

### `workout_programs`

Full workout program.

Example:

```text
12 Week Personalized
```

Stores:

- title/subtitle/description
- duration weeks
- days per week
- program goal
- status: `draft`, `active`, `archived`
- `is_template`
- `owner_user_id`
- `onboarding_snapshot`

Important:

- Template program: reusable program.
- User-specific program: `owner_user_id` set hota hai.
- `onboarding_snapshot` existing onboarding/goals data ka copy rakh sakta hai plan generation time par.

### `program_weeks`

Program ke andar weeks.

Example:

```text
Program: 12 Week Personalized
  Week 1
  Week 2
  Week 3
```

Connected by:

```text
program_weeks.program_id -> workout_programs.id
```

### `program_days`

Week ke andar workout days.

Examples:

```text
Week 1 Day 1: Push - Heavy
Week 1 Day 2: Pull - Heavy
Week 1 Day 3: Legs / Abs
Week 1 Day 7: Rest + Walk
```

Connected by:

```text
program_days.program_id -> workout_programs.id
program_days.week_id -> program_weeks.id
```

Stores:

- `day_number`
- `weekday`
- `workout_kind`: push/pull/legs/cardio/rest/custom
- title/subtitle
- target muscles
- estimated minutes
- points available
- `is_rest_day`
- sort order

Important:

`program_days` is still plan/template data. It does not mean user did workout on a specific calendar date.

### `program_day_sections`

Workout day ke andar UI sections.

Examples:

```text
Exercises
Core Finisher
Treadmill Walk
Warmup
Cooldown
```

Connected by:

```text
program_day_sections.program_day_id -> program_days.id
```

Use:

Exercise list screen mein section grouping.

### `program_day_exercises`

Section ke andar actual planned exercise rows.

Example:

```text
Push - Heavy
  Exercises
    Incline Dumbbell Press
    Bench Press
    Rope Pushdown
  Core Finisher
    Leg Raises
    Cable Crunch
    Plank
  Treadmill Walk
    Incline Walk
```

Connected by:

```text
program_day_exercises.program_day_id -> program_days.id
program_day_exercises.section_id -> program_day_sections.id
program_day_exercises.exercise_id -> exercise_library.id
```

Stores:

- display name override
- target summary
- initial weight
- default rest seconds
- superset group key
- coach notes
- optional flag
- sort order

Important:

This is the planned exercise row for a specific workout day. It references master exercise from `exercise_library`.

### `planned_exercise_sets`

Exercise ke planned sets/reps/weight/duration.

Example:

```text
Bench Press
  Set 1: 30 kg x 10
  Set 2: 25 kg x 10
  Set 3: 25 kg x 10
```

Connected by:

```text
planned_exercise_sets.program_day_exercise_id -> program_day_exercises.id
```

Supports:

- strength sets
- top set/backoff set
- AMRAP
- core sets
- cardio blocks

Stores:

- `set_number`
- `set_kind`
- target weight/unit
- exact reps or rep range
- duration
- distance
- speed
- incline
- rest seconds
- RPE/RIR target
- tempo
- notes

Important:

This is planned target only. Actual user result goes into `session_sets`.

### `exercise_substitutions`

Optional replacement exercises.

Example:

```text
Bench Press can be substituted with Dumbbell Press
```

Connected by:

```text
exercise_substitutions.program_day_exercise_id -> program_day_exercises.id
exercise_substitutions.substitute_exercise_id -> exercise_library.id
```

Use:

Future admin/user exercise swap flow.

## Assignment And Calendar

### `user_program_assignments`

User ko program assign karta hai.

Example:

```text
Rami -> 12 Week Personalized -> active
```

Connected by:

```text
user_program_assignments.user_id -> auth.users.id
user_program_assignments.program_id -> workout_programs.id
```

Stores:

- status: active/paused/completed/cancelled
- assigned/started/completed timestamps
- current week/day pointers

Important:

This table says user follows this program.

### `scheduled_workouts`

Calendar-level workout instance.

Example:

```text
Rami -> Push - Heavy -> 2026-05-10 -> scheduled
```

Connected by:

```text
scheduled_workouts.assignment_id -> user_program_assignments.id
scheduled_workouts.user_id -> auth.users.id
scheduled_workouts.program_day_id -> program_days.id
```

Stores:

- scheduled date
- status: scheduled/in_progress/completed/skipped/missed
- started/completed timestamps
- skipped reason
- points available/awarded

Important difference:

```text
program_days = plan/template day
scheduled_workouts = specific date par user ka workout
```

Use:

- Today's workout
- Past workout
- Future workout
- Missed/skipped workout

## Runtime Logging Tables

Ye tables answer karte hain:

```text
User ne actually kya kiya?
```

These rows are created when user starts/logs workout.

### `workout_sessions`

One actual workout session.

Created when user taps Start Now.

Connected by:

```text
workout_sessions.user_id -> auth.users.id
workout_sessions.scheduled_workout_id -> scheduled_workouts.id
workout_sessions.program_day_id -> program_days.id
```

Stores:

- status
- started/completed timestamps
- duration
- current exercise index
- total exercises
- exercises completed
- sets logged
- points awarded
- session notes

Important:

`scheduled_workouts` is calendar plan. `workout_sessions` is actual started workout.

### `session_exercises`

Actual exercise inside a workout session.

Example:

```text
session_1 -> Bench Press -> in_progress
```

Connected by:

```text
session_exercises.session_id -> workout_sessions.id
session_exercises.program_day_exercise_id -> program_day_exercises.id
session_exercises.exercise_id -> exercise_library.id
```

Stores:

- planned exercise reference
- exercise library reference
- section kind
- sort order
- snapshot fields:
  - display name
  - category
  - muscles
- status
- started/completed timestamps
- skipped reason
- comment

Why snapshots exist:

If admin changes exercise name/program later, old workout history should still show what user actually saw at that time.

### `session_sets`

Actual logged set data.

This stores active set logging screen fields.

Connected by:

```text
session_sets.session_exercise_id -> session_exercises.id
session_sets.planned_set_id -> planned_exercise_sets.id
```

Example:

```text
Bench Press Set 1
planned: 30 kg x 10
actual: 32.5 kg x 10
feedback: correct_weight
comment: Felt good
```

Stores planned snapshot:

- target weight
- target reps
- target duration
- set kind
- display label
- rest planned

Stores actual logged data:

- logged weight
- logged reps
- logged duration
- logged distance
- speed/incline
- feedback: light/correct/heavy
- best set flag
- PR flag
- previous best fields
- status: planned/completed/skipped/failed
- comment

Important:

Planned target and actual logged result dono same row mein hain. This makes history stable even if future plan changes.

### `rest_timers`

Rest countdown tracking.

Connected by:

```text
rest_timers.session_id -> workout_sessions.id
rest_timers.session_exercise_id -> session_exercises.id
rest_timers.session_set_id -> session_sets.id
```

Stores:

- timer kind
- planned seconds
- added seconds
- started/ends/completed/skipped timestamps

Use:

- Rest between sets
- Rest between exercises
- Skip rest
- Add 30 seconds

### `session_cardio_logs`

Dedicated cardio/treadmill logging.

Connected by:

```text
session_cardio_logs.session_exercise_id -> session_exercises.id
session_cardio_logs.planned_set_id -> planned_exercise_sets.id
```

Stores:

- duration
- distance
- average/max speed
- incline
- calories
- notes

Important:

Strength-style cardio can also use `session_sets`, but richer treadmill/cardio data can go here.

## Stats, PR, Rewards

### `user_exercise_stats`

Fast lookup table for user's last/best exercise stats.

Connected by:

```text
user_exercise_stats.user_id -> auth.users.id
user_exercise_stats.exercise_id -> exercise_library.id
```

Stores:

- last weight/reps/duration/distance
- last feedback
- best weight/reps
- best estimated one rep max
- references to last/best session set

Use:

- Last Set card
- Best Set card
- Previous Best card

### `personal_records`

PR history.

Example:

```text
Deadlift -> 120 kg x 4 reps
Previous Best -> 114 kg
```

Connected by:

```text
personal_records.user_id -> auth.users.id
personal_records.exercise_id -> exercise_library.id
personal_records.session_id -> workout_sessions.id
personal_records.session_exercise_id -> session_exercises.id
personal_records.session_set_id -> session_sets.id
```

Stores:

- metric: max weight, max reps, best set, estimated 1RM, duration, distance
- value
- previous value
- points awarded
- achieved timestamp

### `era_point_events`

Points ledger/history.

Examples:

```text
Workout Completed +25
Exercise Completed +5
Personal Record +100
Progress Photo Added +25
Manual Adjustment -10
```

Connected by:

```text
era_point_events.user_id -> auth.users.id
era_point_events.session_id -> workout_sessions.id
era_point_events.session_exercise_id -> session_exercises.id
era_point_events.personal_record_id -> personal_records.id
```

Important:

`user_reward_state.total_points` is current balance/summary.
`era_point_events` is transaction history.

### `user_streak_days`

Daily streak calendar.

Example:

```text
2026-05-10 completed
2026-05-11 rest_day
2026-05-12 missed
```

Connected by:

```text
user_streak_days.user_id -> auth.users.id
user_streak_days.session_id -> workout_sessions.id
```

Use:

- Streak UI
- Monthly calendar
- Recovery/rest day tracking

### `session_media`

Progress photo/media for completed sessions.

Connected by:

```text
session_media.user_id -> auth.users.id
session_media.session_id -> workout_sessions.id
```

Stores:

- media type
- storage path
- public URL
- points awarded

Use:

- Capture Progress screen
- Progress photo reward

## End-To-End Flow

### 1. User signs up

```text
auth.users row created
trigger creates profiles row
trigger creates user_reward_state row
```

### 2. User completes onboarding

Existing onboarding/goals table stores answers.

Workout schema does not create or alter `public.goals`.

At plan-generation time, relevant onboarding values can be copied into:

```text
workout_programs.onboarding_snapshot
```

### 3. Backend/admin/plan generation creates program

```text
workout_programs
program_weeks
program_days
program_day_sections
program_day_exercises
planned_exercise_sets
```

### 4. Program assigned to user

```text
user_program_assignments
scheduled_workouts
```

### 5. User opens Workout Home

Current app reads mostly planned data:

```text
workout_programs
program_weeks
program_days
program_day_sections
program_day_exercises count
```

In full production flow it should also read:

```text
scheduled_workouts
user_reward_state
```

### 6. User opens Exercise List

Current app reads:

```text
program_days
program_weeks
program_day_sections
program_day_exercises
planned_exercise_sets
exercise_library
```

This builds the screen:

```text
Exercises
  Incline Dumbbell Press
  Bench Press
  Rope Pushdown
Core Finisher
  Leg Raises
  Plank
Treadmill Walk
  Incline Walk
```

### 7. User taps Start Now

Expected future write flow:

```text
create workout_sessions
update scheduled_workouts.status = in_progress
copy planned exercises into session_exercises
copy planned sets into session_sets
```

Copying planned data into session rows is useful because session history should not change if admin edits the future plan.

### 8. User logs workout

For each exercise:

```text
update session_exercises.status
```

For each set:

```text
update session_sets.logged_weight_value
update session_sets.logged_reps
update session_sets.perceived_feedback
update session_sets.status = completed
```

After a set:

```text
create rest_timers
```

For cardio:

```text
update session_sets
or create session_cardio_logs
```

### 9. User completes workout

Expected future write flow:

```text
update workout_sessions.status = completed
update workout_sessions.completed_at
update workout_sessions.duration_seconds

update scheduled_workouts.status = completed
update scheduled_workouts.completed_at

update user_exercise_stats
create personal_records if needed
create era_point_events
create/update user_streak_days
update user_reward_state
optionally create session_media
```

## Current App Implementation Notes

Current mobile service is `mobile/app/services/workoutService.ts`.

Right now it mostly reads planned workout data:

- `workout_programs`
- `program_weeks`
- `program_days`
- `program_day_sections`
- `program_day_exercises`
- `planned_exercise_sets`
- `exercise_library`

The runtime/logging tables are designed in schema but full app write flow appears not yet implemented:

- `scheduled_workouts`
- `workout_sessions`
- `session_exercises`
- `session_sets`
- `rest_timers`
- `personal_records`
- `era_point_events`
- `user_streak_days`

## Security / RLS

Schema enables Row Level Security on almost all tables.

Basic idea:

```text
User apna data access kar sakta hai.
Admin/coach broader access rakhte hain.
Accessible active templates can be read.
Assigned programs can be read by assigned user.
```

Important helper functions:

- `is_admin()`
- `can_access_program(program_uuid)`
- `can_access_program_day(day_uuid)`
- `can_access_program_day_exercise(day_exercise_uuid)`
- `can_access_session(session_uuid)`

Plan tables are not simply `user_id = auth.uid()` tables, so helper functions check access through program ownership, template status, or assignment.

Session child tables also check parent session ownership:

```text
session_sets -> session_exercises -> workout_sessions -> user_id
```

## Delete Behavior

Important foreign key behavior:

- User deleted -> user-owned rows cascade delete.
- Program deleted -> weeks/days/sections/exercises/planned sets mostly cascade.
- Exercise library referenced by plans/logs uses restrict in important places, so used exercises are not accidentally deleted.
- If planned set/program exercise is deleted after a session exists, some session references become null but snapshot data remains.

## Mental Model For Coding

Use this rule when adding features:

```text
If feature displays what user should do:
  use planned tables.

If feature displays what user actually did:
  use session/log tables.

If feature displays progress/rewards:
  use stats, PR, point, streak tables.
```

Common screen mapping:

```text
Workout Home:
  scheduled_workouts + program_days + user_reward_state

Workout Plan:
  workout_programs + program_weeks + program_days

Exercise List:
  program_day_sections + program_day_exercises + planned_exercise_sets + exercise_library

Active Workout:
  workout_sessions + session_exercises + session_sets + rest_timers

Past Workout:
  workout_sessions + session_exercises + session_sets + session_cardio_logs

PR Screen:
  personal_records + exercise_library

Points/Streak:
  user_reward_state + era_point_events + user_streak_days
```

## Most Important Distinctions

```text
exercise_library
  = master exercise definition

program_day_exercises
  = exercise placed inside a planned workout day

planned_exercise_sets
  = target sets for that planned exercise

session_exercises
  = actual exercise row after user starts workout

session_sets
  = actual logged sets/results
```

```text
workout_programs
  = full program

program_days
  = planned workout day inside program

scheduled_workouts
  = that planned day scheduled on a date for a user

workout_sessions
  = actual started/completed workout session
```

## Admin Adds Exercise: How It Becomes Visible In App

Very important distinction:

```text
exercise_library mein add hua
  = exercise database/catalog mein aa gaya

program_day_exercises mein attach hua
  = workout screen mein dikhne laga

planned_exercise_sets mein sets add hue
  = reps/weight/duration prescription dikhne laga
```

Admin adding an exercise and user seeing it inside a workout are not the same thing.

### Step 1: Admin Adds Exercise To Library

Example admin adds:

```text
Lateral Raise
```

This creates a row in:

```text
exercise_library
```

Example data:

```text
name: Lateral Raise
modality: strength
category: isolation
equipment: dumbbells
primary_muscles: shoulders
is_active: true
```

Now the exercise exists in the master library.

At this point it can appear in:

- admin exercise library
- exercise search
- substitution picker
- future program builder picker

But it will not automatically appear inside a user's workout day.

Reason:

```text
App does not show all exercise_library rows on workout screen.
App shows exercises attached to selected program day.
```

### Step 2: Admin Attaches Exercise To A Workout Day

To show `Lateral Raise` in an actual workout, admin/program builder must attach it to:

```text
program -> week -> day -> section
```

Example target:

```text
Program: 12 Week Personalized
Week: Week 1
Day: Day 4 - Shoulders / Neck
Section: Exercises
Exercise: Lateral Raise
```

This creates a row in:

```text
program_day_exercises
```

Example data:

```text
program_day_id: Shoulders / Neck day
section_id: Exercises section
exercise_id: Lateral Raise exercise_library id
sort_order: 3
display_name: Lateral Raise
initial_weight_value: 7.5
initial_weight_unit: kg
default_rest_seconds: 60
```

This is the main link:

```text
program_day_exercises.exercise_id -> exercise_library.id
```

Once this link exists, the app can show the exercise in that workout day.

### Step 3: Admin Adds Planned Sets

If sets are not added, app may show exercise name but prescription will be incomplete.

Admin should add rows in:

```text
planned_exercise_sets
```

Example:

```text
program_day_exercise_id: Lateral Raise row id
set_number: 1
set_kind: working
target_weight_value: 7.5
target_weight_unit: kg
target_reps_min: 12
target_reps_max: 15
rest_seconds: 60
```

For 3 sets, create 3 rows:

```text
Set 1: 7.5 kg x 12-15
Set 2: 7.5 kg x 12-15
Set 3: 7.5 kg x 12-15
```

Then app can display:

```text
Lateral Raise
3 sets x 12-15 reps
7.5 kg
```

### What App Reads To Show Exercise List

Current app flow in `mobile/app/services/workoutService.ts` is planned-data based.

For exercise list, app roughly reads:

```text
program_days
program_weeks
program_day_sections
program_day_exercises
planned_exercise_sets
exercise_library
```

The important query idea:

```text
Get selected program_day
-> get sections for that day
-> get exercises attached to that day
-> get planned sets for those exercises
-> get exercise library details
-> map to UI
```

So app visibility depends on:

```text
program_day_exercises.program_day_id = selected workout day id
```

Not simply:

```text
exercise_library.is_active = true
```

### Complete Admin-To-App Visibility Flow

```text
Admin creates exercise
  -> exercise_library row created

Admin opens program builder
  -> selects program/week/day/section

Admin adds exercise to that section
  -> program_day_exercises row created

Admin adds sets/reps/weight/duration
  -> planned_exercise_sets rows created

Program is active or assigned to user
  -> user app can access program/day

User opens workout day
  -> app reads program_day_exercises + planned_exercise_sets
  -> exercise appears in UI
```

### For Specific User Visibility

A user sees a workout only if the program/day is accessible to that user.

Access can happen through:

```text
workout_programs.owner_user_id = user id
```

or through assignment:

```text
user_program_assignments.user_id = user id
user_program_assignments.program_id = workout_programs.id
```

For calendar-based flow, production should also use:

```text
scheduled_workouts.user_id = user id
scheduled_workouts.program_day_id = program_days.id
scheduled_workouts.scheduled_for = date
```

Then home screen can say:

```text
Today user has Shoulders / Neck
-> fetch that program_day
-> show exercises attached to that day
```

### Different Visibility Cases

Case 1:

```text
Exercise exists only in exercise_library
```

Visible in:

- admin exercise catalog
- exercise picker/search

Not visible in:

- user workout day

Case 2:

```text
Exercise exists in exercise_library
and attached through program_day_exercises
but no planned_exercise_sets
```

Visible in:

- user workout day exercise list

But prescription may be missing/incomplete:

```text
no sets/reps/weight
```

Case 3:

```text
Exercise exists in exercise_library
attached through program_day_exercises
has planned_exercise_sets
program is assigned/accesssible to user
```

Visible properly in app:

```text
Exercise name
section
weight
sets
reps/duration
rest
```

### One-Line Mental Model

```text
Admin exercise library = available exercises
Program builder = chooses which exercises appear in workouts
Planned sets = tells app what weight/reps/duration to show
Assignment/schedule = tells app which user sees which workout and when
```
