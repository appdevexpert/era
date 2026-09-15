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
| `description_translations` | `{ en, nb }`. Rendered as "Form detail" in the exercise info sheet — see `doc/EXERCISE_INFO_SHEET.md`. No admin field for it yet. |

Paths, not URLs — the bucket/CDN host can change without a data migration.

## Storage

Two public buckets:

| Bucket | Holds | Mime | Cache-Control |
|---|---|---|---|
| `exercise-media` | the clips | `video/mp4` | `max-age=31536000` |
| `exercise-thumbs` | one poster frame per clip | `image/jpeg` | `max-age=31536000` |

Split rather than allowing both mime types in one bucket, so the allowlist stays
a real guardrail on each side. Poster paths live in
`demo_video_{male,female}_poster_path` — per gender, because the two clips show
different bodies and one frame cannot stand in for both.

Bucket `exercise-media`, **public**, 50 MB limit, `video/mp4` only.

The limit was 10 MB until 2026-07-30. Raised to 50 MB for the bulk import of the
ERA review-sheet masters, which run 1-11 MB each. An oversized upload fails with a
bare **HTTP 400** and no useful message, so check the cap first when an upload
mysteriously refuses.

Public rather than signed on purpose: the clips are byte-identical for every
user, so the URL is CDN-cacheable and never expires. A signed URL would rot —
mobile keeps raw rows in persisted Redux, so a cached URL would go dead and
break the video mid-workout.

Uploaded filenames carry a timestamp. The bucket is CDN-cached, so re-uploading
over a stable path like `bench-press/male.mp4` would keep serving the *old* clip
to every client that already cached that URL.

### Egress (2026-09-15)

The org went over the Supabase Free plan's **5 GB cached-egress** allowance;
grace period ends **3 Oct 2026**, after which requests return **402**. Cause was
130 raw clips totalling 278 MB (4-11 MB each) served with `max-age=3600` or
`no-cache`, so the same clip was re-downloaded hourly per user. Three fixes:

1. **Re-encode the back-catalogue** — `web/scripts/recompress-exercise-media.mjs`.
   H.264, capped at 720p, CRF 28, audio stripped, `+faststart`. Measured ~94% off
   a representative clip.
2. **One-year cache headers** on every object, old and new.
3. **Poster frames** — shown while a clip buffers, so the card is never a blank
   black rectangle. (A tap-to-play gate was tried here and reverted; see locked
   rule 7. Compression alone did the work.)

**Result, run 2026-09-15:** 124 referenced clips re-encoded, **253.65 MB → 9.08 MB
(−96%)**, plus 787 KB of posters. A full library pull went from 278 MB to ~10 MB —
roughly 18 → 500+ full pulls inside the 5 GB allowance, before counting the
repeat views that are now free for a year. Verified over HTTP: public GETs return
`cache-control: public, max-age=31536000` with `cf-cache-status: HIT`.

The 130 pre-migration objects were left in the bucket. List them with
`--list-superseded`; delete only once no install can still hold an old path.

**The 720p is a ceiling, not a target.** The filter never upscales, so the
~740x412 ERA masters stay at native size — CRF 28 and the dropped audio track do
the work.

**Never overwrite a path that has been served with `max-age=31536000`.** Clients
will not re-check it for a year, and Supabase purging its own edge does nothing
about the copy in a device's URLCache. A replacement always writes a NEW path and
updates the row — safe because nothing hardcodes these URLs; `exerciseMedia.ts`
builds them from the stored path at render time. The re-encode script works this
way and leaves the old objects in place, because installs that have not refreshed
their bootstrap still hold the old paths in persisted Redux.

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
7. **Never gate playback behind a tap.** `demo_video_loop` is already the switch
   for this and it belongs to the admin: on = loop forever with no control, off =
   play once then offer replay. A tap-to-play gate was briefly added to the info
   sheet on 2026-09-15 to save egress and **reverted the same day** — it overrode
   the admin's per-exercise choice and broke rule 4 for looping clips. The
   compression alone took clips to ~75 KB, so the gate was not worth the cost.
   The poster is a buffering placeholder only.

## Key files

- `supabase/2026_07_29_exercise_demo_videos.sql` — columns, bucket, storage policies
- `supabase/2026_09_15_exercise_media_egress.sql` — poster columns + `exercise-thumbs` bucket
- `web/scripts/recompress-exercise-media.mjs` — resumable back-catalogue re-encode
- `app/utils/exerciseMedia.ts` — `resolveExerciseDemoMedia`: gender pick + public URLs
- `app/utils/workoutMappers.ts` — `mapSessionWorkout({ gender })`
- `app/components/workout/ExerciseAnimationCard.tsx` — the tile
- `web/components/exercises/exercise-video-field.tsx` — upload widget
- `web/lib/admin/actions.ts` — `createExerciseVideoUploadUrl`, `saveExercise`

## Gotchas

- **Server Actions cap request bodies at 1 MB**, so the file must go browser →
  Storage directly. Do not "simplify" this into a normal form upload.
- **Clips are streamed mid-workout.** Ask for 3-5 second loops, no audio track,
  ~740x412 — target under 500 KB. A 7 MB clip makes the tile feel broken on
  mobile data. The admin panel no longer relies on this being followed: uploads
  are cached for a year and the info sheet is poster-gated, but the Workout Log
  tile still streams the clip on open, so the size guidance stands.
- **If you ever do gate playback, withholding the source is the only way.**
  Handing `VideoView` a URL and simply not calling `play()` still buffers it —
  expo-video starts loading the moment it has a source. Worth knowing, but read
  locked rule 7 first: gating was tried and reverted.
- **Re-running the re-encode script must be a no-op, and that is not free.** The
  state file keys on the *old* path, so once a run finishes, the objects it
  created are referenced by `exercise_library`, absent from the state, and look
  exactly like fresh input. The guard is the cache header: an object already
  serving `max-age=31536000` is this script's own output and is skipped. Without
  it a second run stacks a second CRF 28 pass on an already-compressed file and,
  because the target path is deterministic per stamp, upserts the degraded copy
  over the good one — at a path pinned for a year. This actually happened during
  the 2026-09-15 run and cost 3 clips, repaired from their originals onto fresh
  paths.
- **The state file is written temp-then-rename.** A plain overwrite is not
  atomic; a crash mid-write truncates it to zero bytes and takes the whole run's
  progress with it. Also observed on 2026-09-15 — a `| head` on the command line
  SIGPIPE'd node mid-save and wiped 124 entries.
- **The poster must come from the same gender branch as the clip.** Resolving
  them separately lets the cross-gender fallback disagree — a female poster over
  a male clip — and the poster is exactly what the user stares at before tapping.
  `resolveExerciseDemoMedia` returns both from one pass for this reason.
- **Uploads only appear on an existing exercise.** The storage folder is named
  after the slug, which does not exist until the row is saved.
- Metro silently drops bundled assets whose filenames contain spaces — relevant
  if you ever add a local fallback clip. Keep names lowercase-hyphenated.

- **The card is now used in two places** — the Workout Log tile and the exercise
  info sheet. The sheet portals it outside `NavigationContainer`, which is why the
  card reads `NavigationContext` directly instead of calling `useIsFocused()`.
  See gotcha 1 in `doc/EXERCISE_INFO_SHEET.md` before changing that hook.
- **Never add horizontal margin to the card** — it is `width: "100%"`, so margins
  add to the width instead of insetting it and the video gets clipped. Put gutters
  on a parent with padding.

## Not done yet

- No admin field for `description_translations`, so Rami cannot edit the form-detail
  copy from the panel.
- 20 of 67 exercises still have no clip — list and coverage query in
  `doc/EXERCISE_INFO_SHEET.md`.
