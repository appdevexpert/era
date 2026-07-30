# Exercise Demo Videos

Admin-managed demo clips shown on the Workout Log screen, one per gender per
exercise. Locked with Tejasvi 2026-07-29.

## Flow

```text
Admin panel (web/exercises → Edit exercise)
  -> browser uploads MP4 straight to Supabase Storage (signed upload URL)
  -> storage path saved on exercise_library
Mobile: loadWorkoutBootstrap / getProgramDayDetail
  -> getLibraryExercises selects the 3 media columns
  -> raw rows into persisted Redux (paths only — no video bytes)
  -> mapSessionWorkout resolves gender -> public URL, carries the loop flag
  -> ExerciseAnimationCard streams it in the 370x206 tile
```

## Schema

`public.exercise_library` (migration `supabase/2026_07_29_exercise_demo_videos.sql`):

| Column | Notes |
|---|---|
| `demo_video_male_path` | Path inside the bucket, e.g. `bench-press/male-1753800000000.mp4`. Null = not uploaded. |
| `demo_video_female_path` | Same, female variant. |
| `demo_video_loop` | **One flag per exercise**, not per gender. |
| `description_translations` | `{ en, nb }`. Admin writes it; **mobile does not render it yet.** |

Paths, not URLs — the bucket/CDN host can change without a data migration.

## Storage

Bucket `exercise-media`, **public**, 10 MB limit, `video/mp4` only.

Public rather than signed on purpose: the clips are byte-identical for every
user, so the URL is CDN-cacheable and never expires. A signed URL would rot —
mobile keeps raw rows in persisted Redux, so a cached URL would go dead and
break the video mid-workout.

Uploaded filenames carry a timestamp. The bucket is CDN-cached, so re-uploading
over a stable path like `bench-press/male.mp4` would keep serving the *old* clip
to every client that already cached that URL.

**There is deliberately no SELECT policy on `storage.objects` for this bucket.**
Public objects are served via `/storage/v1/object/public/...`, which bypasses
RLS, so playback and `getPublicUrl()` need no policy. Adding one only grants the
ability to *list every file in the bucket* — the database linter flags it as
`0025_public_bucket_allows_listing`. The only policy is `exercise_media_admin_write`.

## Locked rules

1. **Gender pick** — `female` → female clip; everything else (including a null
   `goals.gender`) → male clip. Source is the user's own onboarding gender, not
   the assigned program's, because an admin can assign either program.
2. **Cross-gender fallback** — if the matching gender has no clip but the other
   does, show the other. A demo of the movement beats an empty tile.
3. **Neither uploaded** — `demoVideoUrl` is null and the card renders `null`. No
   empty box in the layout.
4. **Loop off** — the clip plays once, then the tile shows a tap-to-play button.
   Looping clips never show any control.
5. **Always muted** — must never interrupt the user's music mid-set.
6. Playback pauses on screen blur; `WorkoutLogScreen` stays mounted during the
   rest timer, so without that the clip would loop off-screen all session.

## Key files

- `supabase/2026_07_29_exercise_demo_videos.sql` — columns, bucket, storage policies
- `app/utils/exerciseMedia.ts` — gender pick + public URL construction
- `app/utils/workoutMappers.ts` — `mapSessionWorkout({ gender })`
- `app/components/workout/ExerciseAnimationCard.tsx` — the tile
- `web/components/exercises/exercise-video-field.tsx` — upload widget
- `web/lib/admin/actions.ts` — `createExerciseVideoUploadUrl`, `saveExercise`

## Gotchas

- **Server Actions cap request bodies at 1 MB**, so the file must go browser →
  Storage directly. Do not "simplify" this into a normal form upload.
- **Clips are streamed mid-workout.** Ask for 3-5 second loops, no audio track,
  ~740x412 — target under 500 KB. A 7 MB clip makes the tile feel broken on
  mobile data.
- **Uploads only appear on an existing exercise.** The storage folder is named
  after the slug, which does not exist until the row is saved.
- Metro silently drops bundled assets whose filenames contain spaces — relevant
  if you ever add a local fallback clip. Keep names lowercase-hyphenated.

## Not done yet

- `description_translations` is stored but not shown anywhere in the app.
  Placement was deferred; wiring it is a mapper field plus a UI block.
