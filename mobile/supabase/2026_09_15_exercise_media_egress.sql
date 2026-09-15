-- ============================================================
-- Exercise media egress reduction  (2026-09-15)
--
-- Context: the org blew through the Free plan's 5 GB cached-egress
-- allowance. Root cause was 130 raw demo clips (278 MB, 4-11 MB each)
-- served with `max-age=3600` or `no-cache`, so every view re-downloaded
-- the full file. Fix is three-part:
--
--   1. re-encode every clip (H.264 / 720p / CRF 28 / no audio) and
--      re-upload with `cache-control: max-age=31536000`
--   2. a poster frame per clip, so the exercise info sheet can render a
--      ~15 KB JPEG instead of streaming a ~600 KB video on open
--   3. mobile only fetches the video after a deliberate tap
--
-- This migration covers the storage + schema side of (2). The re-encode
-- itself is `web/scripts/recompress-exercise-media.mjs`.
--
-- The poster columns are per gender, matching demo_video_{male,female}_path.
-- One shared poster column would be wrong: the two clips show different
-- bodies, so a single frame cannot stand in for both.
--
-- Columns are also added to the `create table` block in workout_schema.sql
-- so a fresh database gets them. This file is the migration for the live
-- project, which already has the table.
-- ============================================================

alter table public.exercise_library
  add column if not exists demo_video_male_poster_path   text,
  add column if not exists demo_video_female_poster_path text;

comment on column public.exercise_library.demo_video_male_poster_path is
  'Path inside the exercise-thumbs bucket for the male clip''s poster frame, e.g. "squats/male-1789012345678.jpg". Null = no poster (mobile falls back to the empty card surface).';
comment on column public.exercise_library.demo_video_female_poster_path is
  'Path inside the exercise-thumbs bucket for the female clip''s poster frame. Null = no poster.';

-- ============================================================
-- Poster bucket
--
-- Separate from exercise-media rather than relaxing that bucket's
-- allowed_mime_types, so a mis-typed upload still cannot put a JPEG where
-- a clip belongs (and vice versa) — the mime allowlist stays a real
-- guardrail on both sides.
--
-- Public for the same reason exercise-media is: the frames are identical
-- for every user, so the URL is CDN-cacheable and never expires, and the
-- mobile app persists raw rows in Redux where a signed URL would rot.
--
-- 512 KB cap: a 740px-wide q6 JPEG lands around 15-25 KB. Anything near
-- the cap means the encoder was handed something wrong.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-thumbs', 'exercise-thumbs', true, 524288, array['image/jpeg'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 524288,
      allowed_mime_types = array['image/jpeg'];

-- Writes are admin-only, mirroring exercise_media_admin_write. The panel
-- uploads via a signed URL minted by the service role (which bypasses RLS
-- anyway) — this policy is what stops a signed-in mobile user writing here.
drop policy if exists "exercise_thumbs_admin_write" on storage.objects;
create policy "exercise_thumbs_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'exercise-thumbs' and public.is_admin())
  with check (bucket_id = 'exercise-thumbs' and public.is_admin());

-- Deliberately NO select policy, for the same reason exercise-media has
-- none: a public bucket serves through /storage/v1/object/public/... which
-- bypasses RLS, so playback and getPublicUrl() need no policy. Adding one
-- only grants the ability to LIST the bucket, which the database linter
-- flags as 0025_public_bucket_allows_listing. Do not "restore" it.
drop policy if exists "exercise_thumbs_public_read" on storage.objects;
