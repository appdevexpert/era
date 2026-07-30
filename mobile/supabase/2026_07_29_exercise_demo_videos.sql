-- ============================================================
-- Exercise demo videos + description  (2026-07-29)
--
-- Adds the columns the admin panel writes and the mobile Workout Log
-- screen reads, plus the storage bucket the clips live in.
--
-- Design notes:
--   * Male and female are separate clips because the demo shows body
--     mechanics. `user_gender` is only ('male','female'), so two columns
--     cover every case — no child table needed.
--   * `demo_video_loop` is ONE flag per exercise, not per gender. Loop
--     off means the mobile tile plays once and shows a tap-to-play button.
--   * `description_translations` follows the same shape as
--     `name_translations` ({ en, nb }). The admin panel writes it now;
--     mobile does not render it yet.
--
-- Columns are also added to the `create table` block in
-- workout_schema.sql so a fresh database gets them. This file is the
-- migration for the live project, which already has the table.
-- ============================================================

alter table public.exercise_library
  add column if not exists demo_video_male_path     text,
  add column if not exists demo_video_female_path   text,
  add column if not exists demo_video_loop          boolean not null default true,
  add column if not exists description_translations jsonb   not null default '{}'::jsonb;

comment on column public.exercise_library.demo_video_male_path is
  'Path inside the exercise-media storage bucket, e.g. "bench-press/male.mp4". Null = not uploaded yet.';
comment on column public.exercise_library.demo_video_female_path is
  'Path inside the exercise-media storage bucket, e.g. "bench-press/female.mp4". Null = not uploaded yet.';
comment on column public.exercise_library.demo_video_loop is
  'True = clip loops forever on the Workout Log tile. False = plays once, then the tile shows a tap-to-play button.';
comment on column public.exercise_library.description_translations is
  'Coaching description per language: { "en": "...", "nb": "..." }. Admin-managed; not rendered in the app yet.';

-- ============================================================
-- Storage bucket
--
-- Public on purpose. The clips are byte-identical for every user, so a
-- public URL is CDN-cacheable and never expires. Signed URLs would rot:
-- the mobile app keeps raw rows in persisted Redux, so a URL cached
-- there would go dead and break the video mid-workout.
--
-- The size/mime limits are a guardrail against someone uploading a
-- 200 MB master file through the panel by accident.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 10485760, array['video/mp4'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 10485760,
      allowed_mime_types = array['video/mp4'];

-- Writes are admin-only. The admin panel uploads via a signed upload URL
-- minted by the service role, which bypasses RLS anyway — this policy is
-- what stops a signed-in mobile user from pushing files into the bucket.
drop policy if exists "exercise_media_admin_write" on storage.objects;
create policy "exercise_media_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'exercise-media' and public.is_admin())
  with check (bucket_id = 'exercise-media' and public.is_admin());

-- Deliberately NO select policy. A public bucket serves objects through
-- /storage/v1/object/public/... which bypasses RLS, so playback and
-- `getPublicUrl()` need no policy at all. Adding one only grants the ability
-- to LIST every file in the bucket — the database linter flags exactly that
-- (0025_public_bucket_allows_listing). Do not "restore" it.
drop policy if exists "exercise_media_public_read" on storage.objects;
