-- Program demographics migration
-- Adds gender + level to workout_programs so the app can route a user to their
-- matching program based on the onboarding values already saved in `goals`.
--
-- Source of truth for the user's gender + experience level stays on the
-- existing `goals` table (see app/services/onboardingService.ts). We do NOT
-- duplicate those onto `profiles`.
--
-- Six launch programs are seeded at the bottom: Male/Female x Beginner/Intermediate/Advanced.
-- Each program owns its own content rows (weeks/days/exercises/sets) — same exercises
-- shared across levels within a gender, only starting weights differ.

-- 1. Enums --------------------------------------------------------------------

do $$ begin
  create type public.user_gender as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;


-- 2. workout_programs columns ------------------------------------------------

alter table public.workout_programs
  add column if not exists gender public.user_gender,
  add column if not exists level public.experience_level;

-- Only one program per (gender, level) combo; legacy rows with NULL are allowed
-- so existing programs can be classified later via admin UI.
create unique index if not exists workout_programs_gender_level_idx
  on public.workout_programs (gender, level)
  where gender is not null and level is not null;


-- 3. Seed the 6 launch programs ----------------------------------------------
-- Stable UUIDs make it safe to rerun this seed and reference the programs from
-- other migration files (week/day/exercise seeds).

insert into public.workout_programs (id, title, title_translations, gender, level, duration_weeks, days_per_week)
values
  ('11111111-1111-1111-1111-111111111111',
   'Male Beginner',
   '{"en":"Male Beginner","nb":"Nybegynner - Menn"}'::jsonb,
   'male', 'beginner', 12, 6),

  ('22222222-2222-2222-2222-222222222222',
   'Male Intermediate',
   '{"en":"Male Intermediate","nb":"Mellomnivå - Menn"}'::jsonb,
   'male', 'intermediate', 12, 6),

  ('33333333-3333-3333-3333-333333333333',
   'Male Advanced',
   '{"en":"Male Advanced","nb":"Erfaren - Menn"}'::jsonb,
   'male', 'advanced', 12, 6),

  ('44444444-4444-4444-4444-444444444444',
   'Female Beginner',
   '{"en":"Female Beginner","nb":"Nybegynner - Kvinner"}'::jsonb,
   'female', 'beginner', 12, 6),

  ('55555555-5555-5555-5555-555555555555',
   'Female Intermediate',
   '{"en":"Female Intermediate","nb":"Mellomnivå - Kvinner"}'::jsonb,
   'female', 'intermediate', 12, 6),

  ('66666666-6666-6666-6666-666666666666',
   'Female Golden Era',
   '{"en":"Female Golden Era","nb":"Erfaren - Kvinner"}'::jsonb,
   'female', 'advanced', 12, 6)
on conflict (id) do update
  set gender = excluded.gender,
      level = excluded.level,
      title_translations = excluded.title_translations,
      updated_at = now();
