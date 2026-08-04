# Exercise Info Sheet

Read-only bottom sheet opened by tapping any planned exercise row on the Exercise
List screen. Shows the name, target muscle, demo clip, the day's prescription and
the admin-written form cues. Nothing here starts or edits a workout.

Figma: file `qiiPbtgLA1bZ3YJl5dieiB`, node `7134-35297`.

## Flow

```text
ExerciseListScreen row tap (PressableScale)
  -> ExerciseRow builds an ExerciseInfoPayload
       (name, muscleCategory, video, sets/target, weight label+value, formDetail)
  -> infoSheetRef.current.show(payload)
  -> ExerciseInfoBottomSheet renders it
       -> ExerciseAnimationCard streams the gender-resolved clip
```

The payload is assembled by the **row**, not the sheet. The weight tile must show
exactly what the row shows (Initial WT. vs the Smart-Weight suggestion), so the
row passes its already-computed `weightLabel` / `weightValue` down instead of the
sheet re-deriving them and drifting.

## Which rows open it

| Row variant | Opens sheet? | Why |
|---|---|---|
| `ExerciseRow` (active / future / missed) | Yes | The planned-exercise case this was built for. |
| `ReorderableExerciseRow` (active, not started) | Yes | Tap opens; the drag handle keeps its own `Pressable`, so long-press-to-drag is unaffected. |
| `CompletedExerciseRow` | No | Already navigates to `ExerciseDetail` (logged-set history). |
| `SkippedExerciseRow` | No | Left as-is. |

## Data added for it

`ExerciseListExerciseView` (`app/types/workout.ts`) gained:

| Field | Source |
|---|---|
| `muscleCategory` | `formatMuscleCategory()` — localized `"Back • Compound"` |
| `setCount` | `exerciseSets.length` |
| `targetLabel` / `targetKind` | `deriveTargetLabel()` — `"12-18"` reps, or `"45 SEC"` for timed work |
| `formDetail` | `exercise_library.description_translations` for the current language |
| `demoVideoUrl` / `demoVideoLoop` | `resolveExerciseDemoVideo(lib, gender)` |

`mapExerciseList(data, language, orderOverride?, gender?)` — the 4th arg is new.
Gender comes from `state.onboarding.goalData.gender`, **not** the assigned
program's gender, matching the locked rule in `EXERCISE_DEMO_VIDEOS.md`.

`getLibraryExercises` now also selects `description_translations`.

Locale keys added: `workout.ui.repsLabel`, `timeLabel`, `formDetail`. Reuses the
existing `setsLabel`, `initialWeight`, `suggestedWeight`.

## Form detail content

All **67** exercises have `description_translations` in both `en` and `nb`,
written 2026-07-30 (162-226 chars each). Tone is deliberate and worth keeping:

> setup → execution → the one mistake to avoid

```text
Bar on your upper back, feet shoulder-width, weight through the middle of your
foot. Sit down and slightly back until your hips pass your knees, then drive up
— keep your knees tracking over your toes.
```

Applied straight to the DB via MCP, guarded with
`where description_translations::text = '{}'` so nothing could be overwritten.

**This copy is not in version control.** Rebuilding from `workout_schema.sql`
would lose all 134 strings. There is also **no admin field** for editing it yet —
`web/components/exercises/exercise-form.tsx` has no Form-detail textarea, so Rami
cannot change this copy without a dev.

## Gotchas

These each cost real debugging time. Read before touching the sheet.

### 1. Bottom sheet content has NO navigation context

`BottomSheetModalProvider` sits **outside** `NavigationContainer` in `App.tsx`:

```text
App.tsx
  BottomSheetModalProvider   <- modal portal host
    Navigation
      NavigationContainer    <- navigation context starts here
```

`@gorhom/bottom-sheet` portals modal children up to that host, so **anything
inside a `BottomSheetModal` is above the navigator** and `useNavigation()` /
`useIsFocused()` throw *"Couldn't find a navigation object."*

This broke `ExerciseAnimationCard` the moment it was reused in the sheet. Fixed
with `useIsScreenFocused()` in that file, which reads `NavigationContext` via
`useContext` — it returns `undefined` outside a navigator instead of throwing,
and "no navigator" is treated as focused (sheet content is only mounted while the
sheet is open, so mounted already means visible).

Note the component **body** of a sheet component still runs at its normal tree
position, so hooks there are fine. Only what you pass as `BottomSheetModal`
children moves.

### 2. Never put horizontal margin on `ExerciseAnimationCard`

The card is `width: "100%"`. Margins do not shrink a `100%` width — they add to
it, so `marginHorizontal: 16` made the tile 32pt wider than the sheet and offset
it right, clipping the video off the right edge. Gutters go on a **wrapper** with
`paddingHorizontal`, matching the Figma structure.

### 3. Gate the media wrapper on `video`

`ExerciseAnimationCard` returns `null` when there is no clip, but a wrapper `View`
still occupies a slot in the `gap: 24` column. Render the wrapper conditionally or
clip-less exercises get a phantom 24pt gap.

### 4. Muscle labels are admin free text

`primary_muscles` casing drifts (`"Forearms"` vs `"forearms"`) and keys appear
that no one added to `MUSCLE_LABELS` — `lower_back`, `rear_delts`, `obliques` were
all missing and rendered raw as `lower_back • Isolation`. `localizeMuscle()` now
lower-cases before lookup. **Any new muscle key needs an en + nb entry.**

### 5. Empty string is not null

`rear-delt-flyes` has `demo_video_male_path = ''`, not `null`. `?? null` does not
catch it — `resolveExerciseDemoVideo` survives only because its final check is
`path ? publicUrl(path) : null`. Use `coalesce(col,'') <> ''` in SQL, not
`is not null`, or your coverage counts will be wrong.

### 6. Cache invalidation is automatic

`get_program_version()` includes `MAX(updated_at) FROM exercise_library`, so any
write to that table shifts the signature → `checkAndRefreshIfStale` fires
`loadWorkoutBootstrap` → `dayDetailsById` resets → new columns arrive. **Always
set `updated_at = now()`** when bulk-editing the library, or persisted Redux will
serve stale rows forever.

## Key files

- `app/components/workout/ExerciseInfoBottomSheet.tsx` — the sheet
- `app/components/workout/ExerciseAnimationCard.tsx` — media tile + `useIsScreenFocused`
- `app/screen/home/ExerciseListScreen.tsx` — row press wiring, sheet ref
- `app/utils/workoutMappers.ts` — `formatMuscleCategory`, `deriveTargetLabel`, `MUSCLE_LABELS`
- `app/types/workout.ts` — `ExerciseListExerciseView`, `ExerciseLibraryRow`
- `app/services/workoutService.ts` — `getLibraryExercises` select list

## Clip coverage

Snapshot **2026-07-31**: 47 / 67 exercises have clips (both genders each, 94
paths, 0 broken references). Re-check with:

```sql
select name, slug,
       coalesce(demo_video_male_path,'')   <> '' as male,
       coalesce(demo_video_female_path,'') <> '' as female
from public.exercise_library
order by 3, 4, name;
```

Still missing (20): `barbell_row`, `behind_neck_press`, `bulgarian_split_squat`,
`incline_dumbbell_press`, `outdoor-workout`, `pull_ups`, `romanian_deadlift`,
`smith_machine_incline_bench`, `sumo_squat`, `walking_lunges_barbell`,
`wide_grip_pulldown`, `cable_crossover`, `cable_lateral_raise`, `hammer_curl`,
`neck_headband`, `rear-delt-flyes`, `wrist-curl`, `outdoor_walk`,
`treadmill_4x4`, `side_crunches`.

Exercises with no clip render the sheet with no media tile — the intended
fallback, nothing breaks.

## Bulk clip import (2026-07-30)

83 clips were imported from the ERA/Appeneure review sheet (Zoho WorkDrive public
share links) into the `exercise-media` bucket. Notes for the next batch:

- Zoho share pages are HTML. The real file is at
  `files-accl.zohoexternal.com/public/workdrive-external/download/<id>?x-cli-msg=null`,
  discoverable in the viewer page source. `workdrive.zoho.com/file/<id>` 302s to
  `zohoexternal`, so both link styles work without auth.
- **Validate the download** — check `ftyp` at byte 4. A failed share link returns
  an HTML error page, which would otherwise upload happily as a `.mp4`.
- **The bucket cap was 10 MB and silently 400s oversized uploads.** Raised to
  **50 MB** for these masters. Two `squats` files failed on this before anyone
  noticed the pattern.
- **Storage paths are independent of `slug`.** Renaming an exercise's slug in the
  admin panel does not break its clip, because the path column holds the literal
  folder name from upload time. Do not "fix" old folder names to match new slugs.
- Generate the `demo_video_*_path` update **from actual upload results**, never
  from the intended mapping — a failed upload then leaves the old value alone
  instead of blanking a working clip.
- Sheet names do not match slugs. Five were too ambiguous to map and are still
  unimported: *Weighted Squats*, *Incline Press*, *Incline Machine chest Press*,
  *Over Head Dumbbell*, *One leg Squat*. The sheet also reuses one female link
  for both *Cable crunches* and *Cable pushdown* — `cable_crunch` female was
  skipped as a result.

## Not done yet

- No admin field for `description_translations` (see Form detail content above).
- Form-detail copy is not in a `supabase/*.sql` file, so it is not reproducible
  from the repo.
- `rear-delt-flyes` has approved clips in the review sheet but empty paths in the DB.
