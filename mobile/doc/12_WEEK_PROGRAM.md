# 12 Week Program — How The App Shows It

This doc explains the 12-week training program **exactly as it lives in your
Supabase DB** (`soyvnnicpkttehwjlpie`, table `workout_programs` and friends)
and how the mobile app surfaces it to the user. Read this before changing
anything in `WorkoutPlanScreen`, `PlanProgressBar`, or the schedule helpers.

Source of truth:

- **DB tables** — `workout_programs`, `program_weeks`, `program_days`,
  `program_day_sections`, `program_day_exercises`, `planned_exercise_sets`
- **Code helpers** — `app/utils/programSchedule.ts`,
  `app/utils/programWeek.ts`, `app/stores/selectors/workoutSelectors.ts`
- **Screens** — `app/screen/home/WorkoutPlanScreen.tsx`,
  `app/components/workout/PlanProgressBar.tsx`

---

## 1. The Program (from the DB)

There is **one** program seeded right now:

| Field | Value |
|---|---|
| Title (en) | `12 Week Personalized` |
| Title (nb) | `12 uker personlig` |
| `duration_weeks` | `12` |
| `days_per_week` | `6` (Mon–Sat training, Sun rest) |

All **12 weeks are fully seeded** in `program_weeks`, and every week has
**7 days** in `program_days` (6 training + 1 rest).

---

## 2. The 3 Phases (from `program_weeks.focus_translations`)

The phase for each week is stored on the row itself in
`focus_translations`. It is **not** derived only by code — the DB already
tags it:

| Phase | Weeks | `focus_translations.en` | `focus_translations.nb` |
|---|---|---|---|
| **Hypertrophy** | W1 – W4 | `Hypertrophy` | `Hypertrofi` |
| **Strength** | W5 – W8 | `Strength` | `Styrke` |
| **Peak** | W9 – W12 | `Peak` | `Topp` |

The `PlanProgressBar` selector (`buildPlanPhases` in
`workoutSelectors.ts`) computes the same split from `currentWeek /
totalWeeks` for the 3 progress bars at the top of the Progress screen, so
DB and UI agree.

---

## 3. The Weekly Split (same every week)

Every one of the 12 weeks has this identical 7-day shape (the contents are
the same template; weight/rep targets evolve over time):

| Day | Title (en) | `workout_kind` | Rest? | Mins | Target muscles |
|---|---|---|---|---|---|
| 1 (Mon) | **Push - Heavy** | `push` | – | 75 | chest, triceps, shoulders, core |
| 2 (Tue) | **Pull - Heavy** | `pull` | – | 75 | back, biceps, forearms, core |
| 3 (Wed) | **Legs - Heavy** | `legs` | – | 75 | quads, glutes, hamstrings, calves, core |
| 4 (Thu) | **Shoulders / Neck** | `shoulders` | – | 75 | shoulders, traps, neck |
| 5 (Fri) | **Cardio 4x4** | `cardio` | – | 45 | cardio |
| 6 (Sat) | **Legs - Volume** | `legs` | – | 75 | glutes, hamstrings, calves, neck |
| 7 (Sun) | **Rest + Walk** | `rest` | ✓ | 30 | recovery |

Volume per training day (planned sets across all sections) hovers around:

| Day | Sections | Exercises | Planned sets |
|---|---|---|---|
| Push - Heavy | 3 | 9 | ~75 |
| Pull - Heavy | 3 | 10 | ~84 |
| Legs - Heavy | 3 | 7 | ~57 |
| Shoulders / Neck | 2 | 7 | ~32 |
| Cardio 4x4 | 2 | 4 | ~26 |
| Legs - Volume | 2 | 7–8 | ~38 |
| Rest + Walk | 0 | 0 (W1 has 1 walk row) | 0 |

(Numbers come straight from a `COUNT(planned_exercise_sets.id)` per day.
Small differences between weeks exist — e.g. W3 D2 has an extra exercise,
W8 D6 has slightly fewer sets — but the structure is the same.)

---

## 4. What A Training Day Looks Like (example: W1 D1 Push - Heavy)

Each `program_day` is split into **sections** (`program_day_sections`).
Section kinds you'll see in the DB: `main_exercises`, `core_finisher`,
`treadmill_walk` (and similar finishers on other days).

Example pulled from W1 D1:

```
Push - Heavy (75 min)
├── Exercises (main_exercises)
│   ├── Incline Dumbbell Press
│   ├── Bench Press
│   ├── Rope Pushdown
│   ├── Skull Crushers
│   └── Overhead Press
├── Core Finisher (core_finisher)
│   ├── Leg Raises
│   ├── Cable Crunch
│   └── Plank
└── Treadmill Walk (treadmill_walk)
    └── Incline Walk
```

Each `program_day_exercises` row has `display_name_translations` (en/nb) +
links to `exercise_library`. Each linked exercise has its own
`planned_exercise_sets` rows with `target_weight_value`, `target_reps_*`,
`target_duration_seconds`, `rest_seconds`, and a `set_kind` enum
(warmup / working / drop / amrap / etc.).

`ExerciseListScreen` reads the section → exercise → set hierarchy and
renders it day-by-day.

---

## 5. How "Today's Week" Is Decided

**Locked rule:** weeks advance by the **calendar**, not by completing
workouts. (See `memory/project_week_progression_model.md`.)

Each user has `profiles.program_start_date`. From that anchor:

```
Week 1  = days  0 –  6  from program_start_date
Week 2  = days  7 – 13
...
Week 12 = days 77 – 83
```

`computeCurrentPosition()` in `programSchedule.ts` returns
`{ weekNumber, dayNumber, isAdjustedDay }` for today.

### Week 1 is a partial week

Most users don't sign up on a Monday. So Week 1 only contains
**signup-weekday → Sunday**. Example, user signs up on Wednesday:

```
Week 1: Wed Thu Fri Sat Sun     (5 days)
Week 2: Mon – Sun                (full 7 days)
```

### Week 4 has makeup days

The days skipped at the start of Week 1 are appended to the **end of Week
4**, marked `isAdjustedDay: true`. Continuing the Wednesday example:

```
Week 4 normal: Mon Tue Wed Thu Fri Sat Sun
Week 4 makeup: Mon Tue                       (+2 days)
```

So Week 4 can hold up to **9 days**. From Week 5 onwards it goes back to a
clean 7-day cadence.

---

## 6. Where Each Piece Shows In The App

| Screen / Component | What it renders |
|---|---|
| `WorkoutScreen` (home) | Today's workout card — `currentDayDetail` from Redux |
| `WorkoutPlanScreen` | Full 12-week plan: week selector + day list per week |
| `PlanProgressBar` | 3-segment bar (Hypertrophy / Strength / Peak) on Progress |
| `WeekDaySelector` | Mon–Sun day pills inside a week with `active / completed / future / rest / missed` states |
| `ExerciseListScreen` | Sections → exercises → planned sets for the selected day |
| Progress weight chart | 12-week chart anchored at W1 goal weight (`weightSelectors.ts`) |
| Progress history strip | Sun–Sat completion strip for the current week |

Day pill states come from `computeDayStatus()` in `programSchedule.ts`:

- `future` — date is after today
- `active` — date is today and not yet completed
- `completed` — session was finished
- `rest` — past + rest day + nothing logged
- `missed` — past + workout day + nothing logged

---

## 7. Localization

Fixed labels (phase names, "Week", "Plan complete", etc.) live in
`app/locales/en.ts` and `app/locales/nb.ts`. Phase keys:

```ts
t("progress.phaseHypertrophy")   // Hypertrophy / Hypertrofi
t("progress.phaseStrength")      // Strength    / Styrke
t("progress.phasePeak")          // Peak        / Topp
```

Dynamic content (week title, day title/subtitle, section title, exercise
name) comes from `*_translations` JSON columns on each table and is
selected by the current language inside `app/utils/workoutMappers.ts`.

---

## 8. Things That Will Surprise You

1. **All 12 weeks are the same template.** Mon=Push, Tue=Pull, Wed=Legs,
   Thu=Shoulders/Neck, Fri=Cardio, Sat=Legs Volume, Sun=Rest. What changes
   week-to-week is the loading (weights/reps) and the phase tag, not the
   structure.
2. **Phase is stored in the DB.** `program_weeks.focus_translations` already
   says Hypertrophy / Strength / Peak. Don't recompute or override it from
   the screen — read it.
3. **Sun is always a rest day** but `program_days` row still exists with
   `is_rest_day = true` and a 30-min walk slot. UI should treat the row as
   present, not missing.
4. **Skipping does not push weeks back.** If the user skips every workout
   in W3, on day 22 they are on W4 D1. Skipped sessions become `missed`.
5. **Week 1 is shorter, Week 4 can be longer.** Anything assuming a fixed
   7-pill week strip must handle this — see how `WeekDaySelector` renders
   W1 and the W4 makeup days.
6. **`programStartDate` is the only anchor.** Changing it (e.g. for a
   paused user) shifts every week and every day everywhere in the app.

---

## 9. Related Locked Specs

Don't undo these without explicit discussion:

- **Week progression** — calendar-driven (this doc).
- **PR detection** — `max_weight` only, see `PR_FEATURE.md`.
- **ERA points + streak** — fixed values (50/15/100/150/25/200),
  see `memory/project_era_points_streak_spec.md`.
- **Local-first writes** — Redux first, Supabase background sync,
  see `memory/feedback_local_first.md`.
