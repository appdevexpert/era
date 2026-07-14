-- ============================================================
-- ERA Workout Schema — mirror of live DB
-- (regenerate with the procedure in
--  ~/.claude/projects/.../memory/project_schema_mirror_preference.md)
-- ============================================================
-- This file is a faithful, self-contained reproduction of the
-- `public` schema in the live Supabase project. It is intended
-- to be runnable against a fresh empty Postgres database to
-- reconstruct the schema (extensions, enums, tables, indexes,
-- functions, triggers, RLS policies, comments).
--
-- It does NOT contain seed data.
-- It does NOT touch the `auth` or `storage` schemas, but FKs
-- to `auth.users` are emitted as-is (those rows are managed
-- by Supabase Auth on a real project).
-- ============================================================


-- ============================================================
-- 1. Extensions
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";
create extension if not exists "plpgsql";
create extension if not exists "supabase_vault";


-- ============================================================
-- 2. Custom enum types (23 types)
-- ============================================================

do $$ begin
  create type public.app_role as enum ('user', 'coach', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.distance_unit as enum ('m', 'km', 'mi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_category as enum ('compound', 'isolation', 'core', 'cardio', 'warmup', 'cooldown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_log_status as enum ('pending', 'in_progress', 'completed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_modality as enum ('strength', 'cardio', 'mobility', 'core');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.load_feedback as enum ('light_weight', 'correct_weight', 'felt_heavy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_category as enum ('breakfast', 'lunch', 'snack', 'evening_snack', 'dinner', 'pre_workout', 'post_workout', 'cheat_meal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_log_source as enum ('plan', 'library_custom', 'user_custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_phase_key as enum ('hypertrophy', 'strength', 'peak');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.planned_set_kind as enum ('warmup', 'working', 'top_set', 'backoff', 'drop_set', 'amrap', 'core', 'cardio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.point_event_type as enum ('workout_completed', 'exercise_completed', 'personal_record', 'streak_added', 'progress_photo_added', 'manual_adjustment', 'set_logged', 'cardio_completed', 'body_weight_logged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pr_metric as enum ('max_weight', 'max_reps', 'best_set', 'estimated_one_rep_max', 'duration', 'distance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_assignment_status as enum ('active', 'paused', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.set_log_status as enum ('planned', 'completed', 'skipped', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.streak_day_status as enum ('completed', 'rest_day', 'missed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timer_kind as enum ('workout_countdown', 'rest_between_sets', 'rest_between_exercises', 'cardio_timer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_gender as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.weight_unit as enum ('kg', 'lb');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_day_kind as enum ('push', 'pull', 'legs', 'shoulders', 'cardio', 'rest', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_section_kind as enum ('main_exercises', 'core_finisher', 'treadmill_walk', 'warmup', 'cooldown', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_status as enum ('scheduled', 'in_progress', 'completed', 'skipped', 'missed');
exception when duplicate_object then null; end $$;


-- ============================================================
-- 3. Tables (28) — parents first
-- ============================================================

-- ------------------------------------------------------------
-- profiles (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid not null,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user'::app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  program_start_date date,
  -- RevenueCat entitlement mirror. Source of truth = RC SDK (on device) +
  -- the revenuecat-webhook edge function (server). These columns are written
  -- ONLY by the webhook via apply_subscription_event (service_role); clients are
  -- blocked by the prevent_subscription_tampering trigger. Allowed values match
  -- the locked entitlement IDs.
  subscription_tier text not null default 'free',
  subscription_expires_at timestamptz,
  subscription_product_id text,
  -- Watermark: RC event_timestamp of the last applied webhook event
  -- (out-of-order / duplicate-delivery guard). See apply_subscription_event.
  subscription_event_at timestamptz,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_subscription_tier_check
    check (subscription_tier in ('free', 'standard', 'pro'))
);

create index if not exists idx_profiles_subscription_tier
  on public.profiles (subscription_tier);

-- ------------------------------------------------------------
-- goals (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.goals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  gender text,
  level text,
  goal text,
  focus text,
  advanced_focus text[] not null default '{}'::text[],
  friction text,
  weight numeric not null default 0,
  weight_unit text not null default 'kg'::text,
  height numeric not null default 0,
  height_unit text not null default 'cm'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  birth_year integer,
  constraint goals_pkey primary key (id),
  constraint goals_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint goals_birth_year_check check (((birth_year is null) or ((birth_year > 1900) and (birth_year < ((extract(year from now()))::integer - 11)))))
);

-- ------------------------------------------------------------
-- exercise_library
-- ------------------------------------------------------------
create table if not exists public.exercise_library (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  name text not null,
  modality public.exercise_modality not null,
  category public.exercise_category not null,
  primary_muscles text[] not null default '{}'::text[],
  default_rest_seconds integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name_translations jsonb not null default '{}'::jsonb,
  updated_by text, -- admin display name of last editor from the web panel
  constraint exercise_library_pkey primary key (id),
  constraint exercise_library_slug_key unique (slug),
  constraint exercise_library_default_rest_seconds_check check (((default_rest_seconds is null) or (default_rest_seconds >= 0)))
);

-- ------------------------------------------------------------
-- workout_programs
-- ------------------------------------------------------------
create table if not exists public.workout_programs (
  id uuid not null default gen_random_uuid(),
  title text not null,
  duration_weeks integer not null default 12,
  days_per_week integer not null default 6,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_translations jsonb not null default '{}'::jsonb,
  gender public.user_gender,
  level public.experience_level,
  kind text not null default 'standard',
  updated_by text, -- admin display name of last editor from the web panel
  constraint workout_programs_pkey primary key (id),
  constraint workout_programs_days_per_week_check check (((days_per_week >= 1) and (days_per_week <= 7))),
  constraint workout_programs_duration_weeks_check check ((duration_weeks > 0)),
  constraint workout_programs_kind_check check ((kind = ANY (ARRAY['standard'::text,'bro_split'::text])))
);

-- ------------------------------------------------------------
-- program_weeks (depends on: workout_programs)
-- ------------------------------------------------------------
create table if not exists public.program_weeks (
  id uuid not null default gen_random_uuid(),
  program_id uuid not null,
  week_number integer not null,
  title text not null,
  focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_translations jsonb not null default '{}'::jsonb,
  focus_translations jsonb not null default '{}'::jsonb,
  constraint program_weeks_pkey primary key (id),
  constraint program_weeks_program_id_week_number_key unique (program_id, week_number),
  constraint program_weeks_program_id_fkey foreign key (program_id) references public.workout_programs(id) on delete cascade,
  constraint program_weeks_week_number_check check ((week_number > 0))
);

-- ------------------------------------------------------------
-- program_days (depends on: workout_programs, program_weeks)
-- ------------------------------------------------------------
create table if not exists public.program_days (
  id uuid not null default gen_random_uuid(),
  program_id uuid not null,
  week_id uuid not null,
  day_number integer not null,
  weekday integer,
  workout_kind public.workout_day_kind not null default 'custom'::workout_day_kind,
  title text not null,
  subtitle text,
  target_muscles text[] not null default '{}'::text[],
  estimated_minutes integer,
  is_rest_day boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_translations jsonb not null default '{}'::jsonb,
  subtitle_translations jsonb not null default '{}'::jsonb,
  constraint program_days_pkey primary key (id),
  constraint program_days_week_id_day_number_key unique (week_id, day_number),
  constraint program_days_program_id_fkey foreign key (program_id) references public.workout_programs(id) on delete cascade,
  constraint program_days_week_id_fkey foreign key (week_id) references public.program_weeks(id) on delete cascade,
  constraint program_days_day_number_check check ((day_number > 0)),
  constraint program_days_estimated_minutes_check check (((estimated_minutes is null) or (estimated_minutes >= 0))),
  constraint program_days_weekday_check check (((weekday is null) or ((weekday >= 1) and (weekday <= 7))))
);

-- ------------------------------------------------------------
-- program_day_sections (depends on: program_days)
-- ------------------------------------------------------------
create table if not exists public.program_day_sections (
  id uuid not null default gen_random_uuid(),
  program_day_id uuid not null,
  section_kind public.workout_section_kind not null,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_translations jsonb not null default '{}'::jsonb,
  constraint program_day_sections_pkey primary key (id),
  constraint program_day_sections_program_day_id_sort_order_key unique (program_day_id, sort_order),
  constraint program_day_sections_program_day_id_fkey foreign key (program_day_id) references public.program_days(id) on delete cascade
);

-- ------------------------------------------------------------
-- program_day_exercises (depends on: program_days, program_day_sections, exercise_library)
-- ------------------------------------------------------------
create table if not exists public.program_day_exercises (
  id uuid not null default gen_random_uuid(),
  program_day_id uuid not null,
  section_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null default 0,
  display_name text,
  initial_weight_value numeric(7,2),
  initial_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  default_rest_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name_translations jsonb not null default '{}'::jsonb,
  superset_group integer,
  constraint program_day_exercises_pkey primary key (id),
  constraint program_day_exercises_section_id_sort_order_key unique (section_id, sort_order),
  constraint program_day_exercises_program_day_id_fkey foreign key (program_day_id) references public.program_days(id) on delete cascade,
  constraint program_day_exercises_section_id_fkey foreign key (section_id) references public.program_day_sections(id) on delete cascade,
  constraint program_day_exercises_exercise_id_fkey foreign key (exercise_id) references public.exercise_library(id) on delete restrict,
  constraint program_day_exercises_default_rest_seconds_check check (((default_rest_seconds is null) or (default_rest_seconds >= 0)))
);

-- ------------------------------------------------------------
-- planned_exercise_sets (depends on: program_day_exercises)
-- ------------------------------------------------------------
create table if not exists public.planned_exercise_sets (
  id uuid not null default gen_random_uuid(),
  program_day_exercise_id uuid not null,
  set_number integer not null,
  set_kind public.planned_set_kind not null default 'working'::planned_set_kind,
  target_weight_value numeric(7,2),
  target_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  target_reps_exact integer,
  target_reps_min integer,
  target_reps_max integer,
  target_duration_seconds integer,
  rest_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_exercise_sets_pkey primary key (id),
  constraint planned_exercise_sets_program_day_exercise_id_set_number_key unique (program_day_exercise_id, set_number),
  constraint planned_exercise_sets_program_day_exercise_id_fkey foreign key (program_day_exercise_id) references public.program_day_exercises(id) on delete cascade,
  constraint planned_exercise_sets_set_number_check check ((set_number > 0)),
  constraint planned_exercise_sets_rest_seconds_check check (((rest_seconds is null) or (rest_seconds >= 0))),
  constraint planned_exercise_sets_target_duration_seconds_check check (((target_duration_seconds is null) or (target_duration_seconds >= 0))),
  constraint planned_exercise_sets_target_reps_exact_check check (((target_reps_exact is null) or (target_reps_exact > 0))),
  constraint planned_exercise_sets_target_reps_max_check check (((target_reps_max is null) or (target_reps_max > 0))),
  constraint planned_exercise_sets_target_reps_min_check check (((target_reps_min is null) or (target_reps_min > 0)))
);

-- ------------------------------------------------------------
-- exercise_substitutions (depends on: program_day_exercises, exercise_library)
-- ------------------------------------------------------------
create table if not exists public.exercise_substitutions (
  id uuid not null default gen_random_uuid(),
  program_day_exercise_id uuid not null,
  substitute_exercise_id uuid not null,
  reason text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint exercise_substitutions_pkey primary key (id),
  constraint exercise_substitutions_program_day_exercise_id_substitute_e_key unique (program_day_exercise_id, substitute_exercise_id),
  constraint exercise_substitutions_program_day_exercise_id_fkey foreign key (program_day_exercise_id) references public.program_day_exercises(id) on delete cascade,
  constraint exercise_substitutions_substitute_exercise_id_fkey foreign key (substitute_exercise_id) references public.exercise_library(id) on delete restrict
);

-- ------------------------------------------------------------
-- user_program_assignments (depends on: auth.users, workout_programs)
-- ------------------------------------------------------------
create table if not exists public.user_program_assignments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  program_id uuid not null,
  status public.program_assignment_status not null default 'active'::program_assignment_status,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  current_week_number integer not null default 1,
  current_day_number integer not null default 1,
  cycle_number integer not null default 1,
  previous_assignment_id uuid,
  is_deload_week boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_program_assignments_pkey primary key (id),
  constraint user_program_assignments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_program_assignments_program_id_fkey foreign key (program_id) references public.workout_programs(id) on delete cascade,
  constraint user_program_assignments_previous_assignment_fkey foreign key (previous_assignment_id) references public.user_program_assignments(id) on delete set null,
  constraint user_program_assignments_current_day_number_check check ((current_day_number > 0)),
  constraint user_program_assignments_current_week_number_check check ((current_week_number > 0)),
  constraint user_program_assignments_cycle_number_check check ((cycle_number > 0))
);

-- ------------------------------------------------------------
-- scheduled_workouts (depends on: user_program_assignments, auth.users, program_days)
-- ------------------------------------------------------------
create table if not exists public.scheduled_workouts (
  id uuid not null default gen_random_uuid(),
  assignment_id uuid not null,
  user_id uuid not null,
  program_day_id uuid not null,
  scheduled_for date not null,
  status public.workout_status not null default 'scheduled'::workout_status,
  started_at timestamptz,
  completed_at timestamptz,
  skipped_reason text,
  points_available integer not null default 0,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_workouts_pkey primary key (id),
  constraint scheduled_workouts_user_id_program_day_id_scheduled_for_key unique (user_id, program_day_id, scheduled_for),
  constraint scheduled_workouts_assignment_id_fkey foreign key (assignment_id) references public.user_program_assignments(id) on delete cascade,
  constraint scheduled_workouts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint scheduled_workouts_program_day_id_fkey foreign key (program_day_id) references public.program_days(id) on delete restrict,
  constraint scheduled_workouts_points_available_check check ((points_available >= 0)),
  constraint scheduled_workouts_points_awarded_check check ((points_awarded >= 0))
);

-- ------------------------------------------------------------
-- workout_sessions (depends on: auth.users, program_days)
-- ------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  program_day_id uuid,
  status public.workout_status not null default 'in_progress'::workout_status,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  total_exercises integer not null default 0,
  exercises_completed integer not null default 0,
  sets_logged integer not null default 0,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_pkey primary key (id),
  constraint workout_sessions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint workout_sessions_program_day_id_fkey foreign key (program_day_id) references public.program_days(id) on delete set null,
  constraint workout_sessions_duration_seconds_check check (((duration_seconds is null) or (duration_seconds >= 0))),
  constraint workout_sessions_exercises_completed_check check ((exercises_completed >= 0)),
  constraint workout_sessions_points_awarded_check check ((points_awarded >= 0)),
  constraint workout_sessions_sets_logged_check check ((sets_logged >= 0)),
  constraint workout_sessions_total_exercises_check check ((total_exercises >= 0))
);

-- ------------------------------------------------------------
-- session_exercises (depends on: workout_sessions, program_day_exercises, exercise_library)
-- ------------------------------------------------------------
create table if not exists public.session_exercises (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  program_day_exercise_id uuid,
  exercise_id uuid not null,
  section_kind public.workout_section_kind,
  sort_order integer not null default 0,
  display_name_snapshot text not null,
  category_snapshot public.exercise_category,
  status public.exercise_log_status not null default 'pending'::exercise_log_status,
  completed_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_exercises_pkey primary key (id),
  constraint session_exercises_session_id_sort_order_key unique (session_id, sort_order),
  constraint session_exercises_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete cascade,
  constraint session_exercises_program_day_exercise_id_fkey foreign key (program_day_exercise_id) references public.program_day_exercises(id) on delete set null,
  constraint session_exercises_exercise_id_fkey foreign key (exercise_id) references public.exercise_library(id) on delete restrict
);

-- ------------------------------------------------------------
-- session_sets (depends on: session_exercises, planned_exercise_sets)
-- ------------------------------------------------------------
create table if not exists public.session_sets (
  id uuid not null default gen_random_uuid(),
  session_exercise_id uuid not null,
  planned_set_id uuid,
  set_number integer not null,
  set_kind public.planned_set_kind not null default 'working'::planned_set_kind,
  target_weight_value numeric(7,2),
  target_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  target_reps_exact integer,
  target_reps_min integer,
  target_reps_max integer,
  target_duration_seconds integer,
  logged_weight_value numeric(7,2),
  logged_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  logged_reps integer,
  logged_duration_seconds integer,
  logged_distance_value numeric(8,2),
  logged_distance_unit public.distance_unit,
  logged_speed_value numeric(6,2),
  logged_incline_percent numeric(5,2),
  display_label text,
  perceived_feedback public.load_feedback,
  is_best_set boolean not null default false,
  is_personal_record boolean not null default false,
  previous_best_weight_value numeric(7,2),
  previous_best_reps integer,
  rest_seconds_planned integer,
  rest_seconds_taken integer,
  status public.set_log_status not null default 'planned'::set_log_status,
  completed_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_sets_pkey primary key (id),
  constraint session_sets_session_exercise_id_set_number_key unique (session_exercise_id, set_number),
  constraint session_sets_session_exercise_id_fkey foreign key (session_exercise_id) references public.session_exercises(id) on delete cascade,
  constraint session_sets_planned_set_id_fkey foreign key (planned_set_id) references public.planned_exercise_sets(id) on delete set null,
  constraint session_sets_logged_duration_seconds_check check (((logged_duration_seconds is null) or (logged_duration_seconds >= 0))),
  constraint session_sets_logged_reps_check check (((logged_reps is null) or (logged_reps >= 0))),
  constraint session_sets_rest_seconds_planned_check check (((rest_seconds_planned is null) or (rest_seconds_planned >= 0))),
  constraint session_sets_rest_seconds_taken_check check (((rest_seconds_taken is null) or (rest_seconds_taken >= 0))),
  constraint session_sets_set_number_check check ((set_number > 0))
);

-- ------------------------------------------------------------
-- session_cardio_logs (depends on: session_exercises, planned_exercise_sets)
-- ------------------------------------------------------------
create table if not exists public.session_cardio_logs (
  id uuid not null default gen_random_uuid(),
  session_exercise_id uuid not null,
  planned_set_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  distance_value numeric(8,2),
  distance_unit public.distance_unit,
  speed_avg_value numeric(6,2),
  incline_percent numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_cardio_logs_pkey primary key (id),
  constraint session_cardio_logs_session_exercise_id_fkey foreign key (session_exercise_id) references public.session_exercises(id) on delete cascade,
  constraint session_cardio_logs_planned_set_id_fkey foreign key (planned_set_id) references public.planned_exercise_sets(id) on delete set null,
  constraint session_cardio_logs_duration_seconds_check check (((duration_seconds is null) or (duration_seconds >= 0)))
);

-- ------------------------------------------------------------
-- session_media (depends on: auth.users, workout_sessions)
-- ------------------------------------------------------------
create table if not exists public.session_media (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid,
  media_type text not null default 'progress_photo'::text,
  storage_path text not null,
  public_url text,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  constraint session_media_pkey primary key (id),
  constraint session_media_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint session_media_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete cascade,
  constraint session_media_points_awarded_check check ((points_awarded >= 0))
);

-- ------------------------------------------------------------
-- rest_timers (depends on: workout_sessions, session_exercises, session_sets)
-- ------------------------------------------------------------
create table if not exists public.rest_timers (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  session_exercise_id uuid,
  session_set_id uuid,
  timer_kind public.timer_kind not null,
  label text,
  planned_seconds integer not null,
  added_seconds integer not null default 0,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rest_timers_pkey primary key (id),
  constraint rest_timers_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete cascade,
  constraint rest_timers_session_exercise_id_fkey foreign key (session_exercise_id) references public.session_exercises(id) on delete cascade,
  constraint rest_timers_session_set_id_fkey foreign key (session_set_id) references public.session_sets(id) on delete cascade,
  constraint rest_timers_added_seconds_check check ((added_seconds >= 0)),
  constraint rest_timers_planned_seconds_check check ((planned_seconds >= 0))
);

-- ------------------------------------------------------------
-- personal_records (depends on: auth.users, exercise_library, workout_sessions, session_exercises, session_sets)
-- ------------------------------------------------------------
create table if not exists public.personal_records (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null,
  session_id uuid,
  session_exercise_id uuid,
  session_set_id uuid,
  metric public.pr_metric not null,
  value_numeric numeric(10,2) not null,
  value_unit text,
  weight_value numeric(7,2),
  weight_unit public.weight_unit,
  reps integer,
  duration_seconds integer,
  previous_value_numeric numeric(10,2),
  previous_label text,
  points_awarded integer not null default 0,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint personal_records_pkey primary key (id),
  constraint personal_records_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint personal_records_exercise_id_fkey foreign key (exercise_id) references public.exercise_library(id) on delete cascade,
  constraint personal_records_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete set null,
  constraint personal_records_session_exercise_id_fkey foreign key (session_exercise_id) references public.session_exercises(id) on delete set null,
  constraint personal_records_session_set_id_fkey foreign key (session_set_id) references public.session_sets(id) on delete set null,
  constraint personal_records_points_awarded_check check ((points_awarded >= 0))
);

-- ------------------------------------------------------------
-- user_exercise_stats (depends on: auth.users, exercise_library, session_sets)
-- ------------------------------------------------------------
create table if not exists public.user_exercise_stats (
  user_id uuid not null,
  exercise_id uuid not null,
  last_weight_value numeric(7,2),
  last_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  last_reps integer,
  last_duration_seconds integer,
  last_set_feedback public.load_feedback,
  last_set_session_set_id uuid,
  best_weight_value numeric(7,2),
  best_weight_unit public.weight_unit not null default 'kg'::weight_unit,
  best_reps integer,
  best_estimated_one_rep_max numeric(8,2),
  best_set_session_set_id uuid,
  last_logged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_exercise_stats_pkey primary key (user_id, exercise_id),
  constraint user_exercise_stats_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_exercise_stats_exercise_id_fkey foreign key (exercise_id) references public.exercise_library(id) on delete cascade,
  constraint user_exercise_stats_last_set_session_set_id_fkey foreign key (last_set_session_set_id) references public.session_sets(id) on delete set null,
  constraint user_exercise_stats_best_set_session_set_id_fkey foreign key (best_set_session_set_id) references public.session_sets(id) on delete set null
);

-- ------------------------------------------------------------
-- user_program_day_exercise_order (depends on: auth.users, program_days)
-- Per-user saved ordering of exercises within a single program day. This is a
-- view-time overlay only — the app reorders exercises on read and NEVER mutates
-- the shared program_day_exercises template. exercise_order is a JSON array of
-- program_day_exercises.id values in the user's preferred order.
-- ------------------------------------------------------------
create table if not exists public.user_program_day_exercise_order (
  user_id uuid not null,
  program_day_id uuid not null,
  exercise_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_program_day_exercise_order_pkey primary key (user_id, program_day_id),
  constraint user_program_day_exercise_order_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_program_day_exercise_order_program_day_id_fkey foreign key (program_day_id) references public.program_days(id) on delete cascade
);

-- ------------------------------------------------------------
-- user_reward_state (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.user_reward_state (
  user_id uuid not null,
  total_points integer not null default 0,
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  last_streak_date date,
  last_workout_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reward_state_pkey primary key (user_id),
  constraint user_reward_state_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_reward_state_current_streak_days_check check ((current_streak_days >= 0)),
  constraint user_reward_state_longest_streak_days_check check ((longest_streak_days >= 0)),
  constraint user_reward_state_total_points_check check ((total_points >= 0))
);

-- ------------------------------------------------------------
-- user_streak_days (depends on: auth.users, workout_sessions)
-- ------------------------------------------------------------
create table if not exists public.user_streak_days (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  streak_date date not null,
  status public.streak_day_status not null,
  session_id uuid,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_streak_days_pkey primary key (id),
  constraint user_streak_days_user_id_streak_date_key unique (user_id, streak_date),
  constraint user_streak_days_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_streak_days_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete set null,
  constraint user_streak_days_points_awarded_check check ((points_awarded >= 0))
);

-- ------------------------------------------------------------
-- era_point_events (depends on: auth.users, workout_sessions)
-- ------------------------------------------------------------
create table if not exists public.era_point_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid,
  event_type public.point_event_type not null,
  title text not null,
  points integer not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint era_point_events_pkey primary key (id),
  constraint era_point_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint era_point_events_session_id_fkey foreign key (session_id) references public.workout_sessions(id) on delete set null
);

-- ------------------------------------------------------------
-- body_weight_log (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.body_weight_log (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  weight_kg numeric(5,2) not null,
  logged_for_date date not null default current_date,
  logged_at timestamptz not null default now(),
  source text not null default 'manual'::text,
  note text,
  created_at timestamptz not null default now(),
  constraint body_weight_log_pkey primary key (id),
  constraint body_weight_log_user_id_logged_for_date_key unique (user_id, logged_for_date),
  constraint body_weight_log_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint body_weight_log_weight_kg_check check (((weight_kg > (0)::numeric) and (weight_kg < (500)::numeric)))
);

-- ------------------------------------------------------------
-- water_logs (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.water_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  log_date date not null,
  amount_ml integer not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint water_logs_pkey primary key (id),
  constraint water_logs_user_date_unique unique (user_id, log_date),
  constraint water_logs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint water_logs_amount_ml_check check ((amount_ml > 0))
);

-- ------------------------------------------------------------
-- user_meal_plans (depends on: auth.users)
-- ------------------------------------------------------------
create table if not exists public.user_meal_plans (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  week_number integer not null,
  phase_key public.meal_phase_key not null,
  kcal_target integer not null,
  protein_g_target numeric not null,
  carbs_g_target numeric not null,
  fats_g_target numeric not null,
  source text not null default 'ai'::text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_meal_plans_pkey primary key (id),
  constraint user_meal_plans_user_id_week_number_key unique (user_id, week_number),
  constraint user_meal_plans_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_meal_plans_week_number_check check ((week_number > 0))
);

-- ------------------------------------------------------------
-- user_meal_plan_items (depends on: user_meal_plans)
-- ------------------------------------------------------------
create table if not exists public.user_meal_plan_items (
  id uuid not null default gen_random_uuid(),
  user_meal_plan_id uuid not null,
  day_of_week integer not null,
  category public.meal_category not null,
  sort_order integer not null default 0,
  name_translations jsonb not null default '{}'::jsonb,
  note_translations jsonb not null default '{}'::jsonb,
  kcal integer not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fats_g numeric not null,
  created_at timestamptz not null default now(),
  constraint user_meal_plan_items_pkey primary key (id),
  constraint user_meal_plan_items_user_meal_plan_id_fkey foreign key (user_meal_plan_id) references public.user_meal_plans(id) on delete cascade,
  constraint user_meal_plan_items_day_of_week_check check (((day_of_week >= 1) and (day_of_week <= 7)))
);

-- ------------------------------------------------------------
-- meal_logs (depends on: auth.users, user_meal_plan_items)
-- ------------------------------------------------------------
create table if not exists public.meal_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  log_date date not null,
  category public.meal_category not null,
  source public.meal_log_source not null,
  name_snapshot text not null,
  kcal integer not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fats_g numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_meal_plan_item_id uuid,
  constraint meal_logs_pkey primary key (id),
  constraint meal_logs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint meal_logs_user_meal_plan_item_id_fkey foreign key (user_meal_plan_item_id) references public.user_meal_plan_items(id) on delete set null,
  constraint meal_logs_carbs_g_check check ((carbs_g >= (0)::numeric)),
  constraint meal_logs_fats_g_check check ((fats_g >= (0)::numeric)),
  constraint meal_logs_kcal_check check ((kcal >= 0)),
  constraint meal_logs_protein_g_check check ((protein_g >= (0)::numeric))
);

-- ------------------------------------------------------------
-- admin_audit_log (web admin panel accountability trail)
-- Written server-side only (service role). The acting admin comes from the
-- signed session cookie, so it cannot be spoofed. RLS is enabled with NO
-- policies, so anon/authenticated (the mobile app) can never read it.
-- ------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid not null default gen_random_uuid(),
  admin_id text not null,           -- stable account id: 'appeneure' | 'rami'
  admin_name text not null,         -- display name captured at action time
  action text not null,             -- 'create' | 'update' | 'delete'
  entity text not null,             -- friendly label, e.g. 'Program'
  table_name text not null,         -- database table affected
  record_id text,                   -- affected row id, when known
  summary text not null,            -- human-readable one-liner
  details jsonb,                    -- snapshot of the new/changed values
  created_at timestamptz not null default now(),
  constraint admin_audit_log_pkey primary key (id)
);

alter table public.admin_audit_log enable row level security;

-- ------------------------------------------------------------
-- admin_users (web admin panel allow-list)
-- Supabase Auth verifies the password; this table decides who is allowed into
-- the panel and what they can see. Server-side only (service role); RLS on with
-- no policies so the mobile app (anon key) can never read who the admins are.
-- ------------------------------------------------------------
create table if not exists public.admin_users (
  user_id           uuid not null,
  email             text not null,
  display_name      text not null,
  can_view_activity boolean not null default false,
  created_at        timestamptz not null default now(),
  constraint admin_users_pkey primary key (user_id),
  constraint admin_users_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

alter table public.admin_users enable row level security;


-- ============================================================
-- 4. Indexes (non-PK)
-- ============================================================

create index if not exists admin_audit_log_created_at_idx ON public.admin_audit_log USING btree (created_at DESC);
create index if not exists admin_audit_log_admin_id_idx ON public.admin_audit_log USING btree (admin_id);
create index if not exists admin_audit_log_table_name_idx ON public.admin_audit_log USING btree (table_name);

create unique index body_weight_log_user_id_logged_for_date_key ON public.body_weight_log USING btree (user_id, logged_for_date);
create index idx_body_weight_log_user_date ON public.body_weight_log USING btree (user_id, logged_for_date DESC);

create index idx_point_events_user_time ON public.era_point_events USING btree (user_id, occurred_at DESC);
create unique index era_point_events_session_completion_unique
  ON public.era_point_events USING btree (session_id, event_type)
  WHERE event_type IN ('workout_completed', 'cardio_completed')
    AND session_id IS NOT NULL;

create unique index exercise_library_slug_key ON public.exercise_library USING btree (slug);
create index idx_exercise_library_name ON public.exercise_library USING btree (name);

create unique index exercise_substitutions_program_day_exercise_id_substitute_e_key ON public.exercise_substitutions USING btree (program_day_exercise_id, substitute_exercise_id);

create unique index goals_user_id_idx ON public.goals USING btree (user_id);

create index meal_logs_user_date_idx ON public.meal_logs USING btree (user_id, log_date);

create index idx_personal_records_user_exercise ON public.personal_records USING btree (user_id, exercise_id, achieved_at DESC);

create index idx_planned_sets_day_exercise_order ON public.planned_exercise_sets USING btree (program_day_exercise_id, set_number);
create unique index planned_exercise_sets_program_day_exercise_id_set_number_key ON public.planned_exercise_sets USING btree (program_day_exercise_id, set_number);

create index idx_program_day_exercises_day_order ON public.program_day_exercises USING btree (program_day_id, sort_order);
create unique index program_day_exercises_section_id_sort_order_key ON public.program_day_exercises USING btree (section_id, sort_order);
create index program_day_exercises_superset_group_idx ON public.program_day_exercises USING btree (program_day_id, superset_group) WHERE (superset_group IS NOT NULL);

create index idx_program_day_sections_day_order ON public.program_day_sections USING btree (program_day_id, sort_order);
create unique index program_day_sections_program_day_id_sort_order_key ON public.program_day_sections USING btree (program_day_id, sort_order);

create index idx_program_days_program_week ON public.program_days USING btree (program_id, week_id, day_number);
create unique index program_days_week_id_day_number_key ON public.program_days USING btree (week_id, day_number);

create index idx_program_weeks_program_number ON public.program_weeks USING btree (program_id, week_number);
create unique index program_weeks_program_id_week_number_key ON public.program_weeks USING btree (program_id, week_number);

create index idx_rest_timers_session ON public.rest_timers USING btree (session_id, started_at DESC);

create index idx_scheduled_workouts_user_date ON public.scheduled_workouts USING btree (user_id, scheduled_for);
create unique index scheduled_workouts_user_id_program_day_id_scheduled_for_key ON public.scheduled_workouts USING btree (user_id, program_day_id, scheduled_for);

create index idx_cardio_logs_session_exercise ON public.session_cardio_logs USING btree (session_exercise_id);

create index idx_session_exercises_session_order ON public.session_exercises USING btree (session_id, sort_order);
create unique index session_exercises_session_id_sort_order_key ON public.session_exercises USING btree (session_id, sort_order);

create index idx_session_media_user_session ON public.session_media USING btree (user_id, session_id);

create index idx_session_sets_exercise_order ON public.session_sets USING btree (session_exercise_id, set_number);
create unique index session_sets_session_exercise_id_set_number_key ON public.session_sets USING btree (session_exercise_id, set_number);

create index user_meal_plan_items_plan_idx ON public.user_meal_plan_items USING btree (user_meal_plan_id);

create unique index user_meal_plans_user_id_week_number_key ON public.user_meal_plans USING btree (user_id, week_number);

create index idx_assignments_user_status ON public.user_program_assignments USING btree (user_id, status);
create index idx_assignments_user_cycle ON public.user_program_assignments USING btree (user_id, cycle_number DESC);
create unique index user_program_assignments_one_active_per_user_idx ON public.user_program_assignments USING btree (user_id) WHERE (status = 'active'::program_assignment_status);

create index idx_streak_days_user_date ON public.user_streak_days USING btree (user_id, streak_date DESC);
create unique index user_streak_days_user_id_streak_date_key ON public.user_streak_days USING btree (user_id, streak_date);

create unique index water_logs_user_date_unique ON public.water_logs USING btree (user_id, log_date);

create unique index workout_programs_gender_level_idx ON public.workout_programs USING btree (gender, level) WHERE ((gender IS NOT NULL) AND (level IS NOT NULL));

create index idx_workout_sessions_user_started ON public.workout_sessions USING btree (user_id, started_at DESC);
create unique index workout_sessions_one_per_user_day ON public.workout_sessions USING btree (user_id, program_day_id);


-- ============================================================
-- 5. Functions (17)
-- ============================================================

-- ------------------------------------------------------------
-- set_updated_at — generic updated_at touch trigger fn
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

grant execute on function public.set_updated_at() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- is_admin — true when caller has profile role admin/coach
-- ------------------------------------------------------------
create or replace function public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'coach')
  );
$function$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- handle_new_user — auth.users insert trigger (managed at auth schema)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_reward_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

grant execute on function public.handle_new_user() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- prevent_profile_role_escalation — trigger guard for profiles.role
-- ------------------------------------------------------------
create or replace function public.prevent_profile_role_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'user' and not public.is_admin() then
      raise exception 'Only admins can create privileged profiles.';
    end if;

    return new;
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$function$;

grant execute on function public.prevent_profile_role_escalation() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- prevent_subscription_tampering — trigger guard for profiles.subscription_*
-- Blocks any client write to the subscription mirror columns. Only the
-- RevenueCat webhook (service_role) or an admin may change them.
-- ------------------------------------------------------------
create or replace function public.prevent_subscription_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if (new.subscription_tier is distinct from 'free'
        or new.subscription_expires_at is not null
        or new.subscription_product_id is not null
        or new.subscription_event_at is not null)
       and coalesce(auth.role(), '') <> 'service_role'
       and not public.is_admin() then
      raise exception
        'subscription_* columns are managed by the RevenueCat webhook and cannot be set directly.';
    end if;
    return new;
  end if;

  if (new.subscription_tier is distinct from old.subscription_tier
      or new.subscription_expires_at is distinct from old.subscription_expires_at
      or new.subscription_product_id is distinct from old.subscription_product_id
      or new.subscription_event_at is distinct from old.subscription_event_at)
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception
      'subscription_* columns are managed by the RevenueCat webhook and cannot be set directly.';
  end if;

  return new;
end;
$function$;

-- Trigger function fires as table owner; not callable via REST (no PUBLIC grant).
revoke all on function public.prevent_subscription_tampering() from public, anon, authenticated;

-- ------------------------------------------------------------
-- apply_subscription_event — the ONLY intended writer of profiles.subscription_*.
-- Called by the revenuecat-webhook edge function (service_role only). The
-- subscription_event_at watermark makes it idempotent + out-of-order safe.
-- ------------------------------------------------------------
create or replace function public.apply_subscription_event(
  p_user_id    uuid,
  p_tier       text,
  p_expires_at timestamptz,
  p_product_id text,
  p_event_at   timestamptz
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  update public.profiles
     set subscription_tier       = p_tier,
         subscription_expires_at = p_expires_at,
         subscription_product_id = p_product_id,
         subscription_event_at   = p_event_at
   where id = p_user_id
     and (subscription_event_at is null or subscription_event_at <= p_event_at);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$function$;

revoke all on function public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz) from public;
revoke all on function public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz) from anon, authenticated;
grant execute on function public.apply_subscription_event(uuid, text, timestamptz, text, timestamptz) to service_role;

-- ------------------------------------------------------------
-- can_access_program / can_access_program_day / can_access_program_day_exercise
-- ------------------------------------------------------------
create or replace function public.can_access_program(program_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select auth.uid() is not null
    and exists (
      select 1 from public.workout_programs p where p.id = program_uuid
    );
$function$;

grant execute on function public.can_access_program(uuid) to anon, authenticated, service_role;

create or replace function public.can_access_program_day(day_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.program_days d
    where d.id = day_uuid
      and public.can_access_program(d.program_id)
  );
$function$;

grant execute on function public.can_access_program_day(uuid) to anon, authenticated, service_role;

create or replace function public.can_access_program_day_exercise(day_exercise_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.program_day_exercises e
    where e.id = day_exercise_uuid
      and public.can_access_program_day(e.program_day_id)
  );
$function$;

grant execute on function public.can_access_program_day_exercise(uuid) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- can_access_session — true when caller owns the session (or is admin)
-- ------------------------------------------------------------
create or replace function public.can_access_session(session_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workout_sessions s
    where s.id = session_uuid
      and (s.user_id = auth.uid() or public.is_admin())
  );
$function$;

grant execute on function public.can_access_session(uuid) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- get_program_version — change-signature for plan tables
-- ------------------------------------------------------------
create or replace function public.get_program_version()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT (
    GREATEST(
      COALESCE((SELECT MAX(updated_at) FROM user_program_assignments), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM workout_programs), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM program_weeks), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM program_days), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM program_day_sections), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM program_day_exercises), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM planned_exercise_sets), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM exercise_library), 'epoch'::timestamptz)
    )::text
  ) || ':' || (
    (SELECT COUNT(*) FROM user_program_assignments) +
    (SELECT COUNT(*) FROM workout_programs) +
    (SELECT COUNT(*) FROM program_weeks) +
    (SELECT COUNT(*) FROM program_days) +
    (SELECT COUNT(*) FROM program_day_sections) +
    (SELECT COUNT(*) FROM program_day_exercises) +
    (SELECT COUNT(*) FROM planned_exercise_sets) +
    (SELECT COUNT(*) FROM exercise_library)
  )::text;
$function$;

grant execute on function public.get_program_version() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- award_points
-- ------------------------------------------------------------
create or replace function public.award_points(p_user_id uuid, p_event_type point_event_type, p_points integer, p_title text, p_session_id uuid DEFAULT NULL::uuid, p_occurred_at timestamp with time zone DEFAULT now())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_total integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_points is null or p_points < 0 then
    raise exception 'p_points must be >= 0';
  end if;

  begin
    insert into public.era_point_events (user_id, session_id, event_type, title, points, occurred_at)
    values (p_user_id, p_session_id, p_event_type, p_title, p_points, p_occurred_at)
    returning id into v_event_id;
  exception when unique_violation then
    -- Guarded event types (workout_completed / cardio_completed) already
    -- awarded for this session; return the existing row + current total
    -- without bumping total_points again.
    select id into v_event_id
      from public.era_point_events
     where session_id = p_session_id
       and event_type = p_event_type
     order by occurred_at asc
     limit 1;

    select total_points into v_total
      from public.user_reward_state
     where user_id = p_user_id;

    return json_build_object(
      'event_id',     v_event_id,
      'total_points', coalesce(v_total, 0),
      'duplicate',    true
    );
  end;

  update public.user_reward_state
    set total_points = total_points + p_points,
        updated_at   = now()
    where user_id = p_user_id
  returning total_points into v_total;

  if v_total is null then
    -- Reward state row missing — create it so future writes have a target.
    insert into public.user_reward_state (user_id, total_points)
      values (p_user_id, p_points)
      on conflict (user_id) do update set total_points = user_reward_state.total_points + excluded.total_points
      returning total_points into v_total;
  end if;

  return json_build_object(
    'event_id',     v_event_id,
    'total_points', v_total,
    'duplicate',    false
  );
end;
$function$;

grant execute on function public.award_points(uuid, point_event_type, integer, text, uuid, timestamptz) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- ensure_my_program_assignment
-- ------------------------------------------------------------
create or replace function public.ensure_my_program_assignment()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id      uuid := auth.uid();
  v_program_id   uuid;
  v_existing_id  uuid;
  v_gender       text;
  v_level        text;
  v_target_level text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already have an active assignment? Reuse it.
  select program_id into v_existing_id
  from   public.user_program_assignments
  where  user_id = v_user_id and status = 'active'
  order  by assigned_at desc
  limit  1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- Pull the user's onboarding (gender, level).
  select g.gender, g.level into v_gender, v_level
  from   public.goals g
  where  g.user_id = v_user_id
  order  by g.created_at desc
  limit  1;
  if v_gender is null or v_level is null then
    return null;
  end if;

  -- Map: intermediate users share the Beginner program (same content today).
  v_target_level := case v_level when 'intermediate' then 'beginner' else v_level end;

  select p.id into v_program_id
  from   public.workout_programs p
  where  p.gender::text = v_gender
    and  p.level::text  = v_target_level
    and  p.kind = 'standard'
  limit  1;
  if v_program_id is null then
    return null;
  end if;

  insert into public.user_program_assignments
    (user_id, program_id, status, started_at, current_week_number, current_day_number, cycle_number)
  values
    (v_user_id, v_program_id, 'active', now(), 1, 1, 1)
  on conflict do nothing;

  return v_program_id;
end;
$function$;

-- ------------------------------------------------------------
-- start_next_cycle (cycle 1 → cycle 2 transition RPC)
-- ------------------------------------------------------------
create or replace function public.start_next_cycle(p_choice text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user_id        uuid := auth.uid();
  v_old_assignment public.user_program_assignments;
  v_user_gender    text;
  v_new_program_id uuid;
  v_new_id         uuid;
  v_is_deload      boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_choice not in ('heavier','deload','bro_split') then
    raise exception 'Invalid p_choice: %. Must be heavier|deload|bro_split', p_choice;
  end if;

  select g.gender::text into v_user_gender
  from   public.goals g
  where  g.user_id = v_user_id
  order  by g.created_at desc
  limit  1;

  if v_user_gender is null then
    raise exception 'User gender unknown — onboarding goals row missing';
  end if;

  if p_choice = 'bro_split' and v_user_gender <> 'male' then
    raise exception 'bro_split is not available for non-male users';
  end if;

  select * into v_old_assignment
  from   public.user_program_assignments
  where  user_id = v_user_id and status = 'active'
  order  by assigned_at desc
  limit  1;

  if v_old_assignment.id is null then
    raise exception 'No active program assignment found for user';
  end if;

  if p_choice = 'bro_split' then
    select id into v_new_program_id
    from   public.workout_programs
    where  gender::text = 'male' and kind = 'bro_split'
    limit  1;
    if v_new_program_id is null then
      raise exception 'Bro Split program not seeded';
    end if;
  else
    v_new_program_id := v_old_assignment.program_id;
    if p_choice = 'deload' then
      v_is_deload := true;
    end if;
  end if;

  update public.user_program_assignments
     set status              = 'completed',
         completed_at        = now(),
         current_week_number = 12,
         current_day_number  = 7,
         updated_at          = now()
   where id = v_old_assignment.id;

  insert into public.user_program_assignments
    (user_id, program_id, status, started_at, current_week_number, current_day_number,
     cycle_number, previous_assignment_id, is_deload_week)
  values
    (v_user_id, v_new_program_id, 'active', now(), 1, 1,
     v_old_assignment.cycle_number + 1, v_old_assignment.id, v_is_deload)
  returning id into v_new_id;

  update public.profiles
     set program_start_date = current_date
   where id = v_user_id;

  return jsonb_build_object(
    'assignment_id', v_new_id,
    'program_id',    v_new_program_id,
    'choice',        p_choice,
    'is_deload',     v_is_deload,
    'cycle_number',  v_old_assignment.cycle_number + 1,
    'previous_assignment_id', v_old_assignment.id
  );
end;
$function$;

grant execute on function public.start_next_cycle(text) to authenticated, service_role;

grant execute on function public.ensure_my_program_assignment() to authenticated, service_role;

-- ------------------------------------------------------------
-- get_leaderboard_page
-- ------------------------------------------------------------
create or replace function public.get_leaderboard_page(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(rank integer, user_id uuid, display_name text, avatar_url text, total_points integer, current_streak_days integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with ranked as (
    select
      r.user_id,
      p.full_name as display_name,
      p.avatar_url,
      r.total_points,
      r.current_streak_days,
      rank() over (order by r.total_points desc, r.user_id)::int as rank
    from public.user_reward_state r
    join public.profiles p on p.id = r.user_id
    where p.role = 'user'
  )
  select rank, user_id, display_name, avatar_url, total_points, current_streak_days
  from ranked
  order by rank, user_id
  limit greatest(p_limit, 0)
  offset greatest(p_offset, 0);
$function$;

grant execute on function public.get_leaderboard_page(integer, integer) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- get_my_leaderboard_rank
-- ------------------------------------------------------------
create or replace function public.get_my_leaderboard_rank()
 RETURNS TABLE(rank integer, total_points integer, total_users integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with ranked as (
    select
      r.user_id,
      r.total_points,
      rank() over (order by r.total_points desc, r.user_id)::int as rank
    from public.user_reward_state r
    join public.profiles p on p.id = r.user_id
    where p.role = 'user'
  )
  select
    coalesce((select rank from ranked where user_id = auth.uid()), 0) as rank,
    coalesce((select total_points from ranked where user_id = auth.uid()), 0) as total_points,
    (select count(*)::int from ranked) as total_users;
$function$;

grant execute on function public.get_my_leaderboard_rank() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- get_my_progress_photos
-- ------------------------------------------------------------
create or replace function public.get_my_progress_photos(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, session_id uuid, storage_path text, points_awarded integer, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, session_id, storage_path, points_awarded, created_at
  from public.session_media
  where user_id = auth.uid()
    and media_type = 'progress_photo'
  order by created_at desc
  limit greatest(p_limit, 0);
$function$;

grant execute on function public.get_my_progress_photos(integer) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- get_my_lifetime_volume_kg
--   Lifetime training volume in kg = Σ (weight in kg × reps) across every
--   completed set the caller has logged. lb weights are converted to kg so the
--   total is unit-consistent. Server-side aggregate — returns a single number
--   instead of shipping every set row to the client (keeps the Progress/Points
--   reward load fast for heavy users). Scoped to auth.uid().
-- ------------------------------------------------------------
create or replace function public.get_my_lifetime_volume_kg()
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(
    (case
       when ss.logged_weight_unit = 'lb' then ss.logged_weight_value * 0.45359237
       else ss.logged_weight_value
     end) * ss.logged_reps
  ), 0)
  from public.session_sets ss
  join public.session_exercises se on se.id = ss.session_exercise_id
  join public.workout_sessions ws on ws.id = se.session_id
  where ws.user_id = auth.uid()
    and ss.status = 'completed'
    and ss.logged_weight_value is not null
    and ss.logged_weight_value > 0
    and ss.logged_reps is not null
    and ss.logged_reps > 0;
$function$;

grant execute on function public.get_my_lifetime_volume_kg() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- record_progress_photo
-- ------------------------------------------------------------
create or replace function public.record_progress_photo(p_storage_path text, p_session_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(media_id uuid, points_awarded integer, total_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_already_awarded boolean;
  v_points int := 0;
  v_media_id uuid;
  v_total_points int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Aliases avoid ambiguity with the RPC's return-column names
  -- (`points_awarded`, `total_points`).
  select exists(
    select 1
    from public.session_media sm
    where sm.user_id = v_user_id
      and sm.media_type = 'progress_photo'
      and sm.points_awarded > 0
      and sm.created_at::date = current_date
  ) into v_already_awarded;

  if not v_already_awarded then
    v_points := 25;
  end if;

  insert into public.session_media (user_id, session_id, media_type, storage_path, points_awarded)
  values (v_user_id, p_session_id, 'progress_photo', p_storage_path, v_points)
  returning id into v_media_id;

  if v_points > 0 then
    insert into public.era_point_events (user_id, session_id, event_type, points, title, occurred_at)
    values (v_user_id, p_session_id, 'progress_photo_added', v_points, 'Progress photo', now());

    update public.user_reward_state urs
       set total_points = urs.total_points + v_points,
           updated_at = now()
     where urs.user_id = v_user_id
    returning urs.total_points into v_total_points;
  else
    select urs.total_points into v_total_points
    from public.user_reward_state urs
    where urs.user_id = v_user_id;
  end if;

  return query select v_media_id, v_points, coalesce(v_total_points, 0);
end;
$function$;

grant execute on function public.record_progress_photo(text, uuid) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- record_rest_day
-- ------------------------------------------------------------
create or replace function public.record_rest_day(p_user_id uuid, p_streak_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_streak_days (user_id, streak_date, status)
    values (p_user_id, p_streak_date, 'rest_day')
    on conflict (user_id, streak_date) do update
      set status = 'rest_day', updated_at = now()
      where user_streak_days.status <> 'completed';  -- never downgrade a completed day
end;
$function$;

grant execute on function public.record_rest_day(uuid, date) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- record_workout_completion
-- ------------------------------------------------------------
create or replace function public.record_workout_completion(p_user_id uuid, p_session_id uuid, p_streak_date date DEFAULT CURRENT_DATE, p_completed_at timestamp with time zone DEFAULT now())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prev_last_date  date;
  v_prev_streak     integer;
  v_prev_longest    integer;
  v_new_streak      integer;
  v_new_longest     integer;
  v_was_extended    boolean := false;
  v_seven_day_bonus integer := 0;
  v_bonus_event_id  uuid;
begin
  if p_user_id is null or p_session_id is null then
    raise exception 'p_user_id and p_session_id are required';
  end if;

  -- 1) Read previous reward state. Insert a default row if missing.
  select last_streak_date, current_streak_days, longest_streak_days
    into v_prev_last_date, v_prev_streak, v_prev_longest
    from public.user_reward_state
    where user_id = p_user_id;

  if v_prev_streak is null then
    insert into public.user_reward_state (user_id) values (p_user_id);
    v_prev_streak  := 0;
    v_prev_longest := 0;
  end if;

  -- 2) Decide the new streak.
  --    same day → idempotent, no change
  --    yesterday → extend +1
  --    older / null → reset to 1
  if v_prev_last_date = p_streak_date then
    v_new_streak  := v_prev_streak;
    v_was_extended := false;
  elsif v_prev_last_date = (p_streak_date - 1) then
    v_new_streak  := v_prev_streak + 1;
    v_was_extended := true;
  else
    v_new_streak  := 1;
    v_was_extended := (v_prev_streak <> 1);
  end if;

  v_new_longest := greatest(v_prev_longest, v_new_streak);

  -- 3) UPSERT today's streak day row.
  insert into public.user_streak_days (user_id, streak_date, status, session_id)
    values (p_user_id, p_streak_date, 'completed', p_session_id)
    on conflict (user_id, streak_date) do update
      set status      = 'completed',
          session_id  = excluded.session_id,
          updated_at  = now();

  -- 4) Update the scoreboard.
  update public.user_reward_state
    set current_streak_days = v_new_streak,
        longest_streak_days = v_new_longest,
        last_streak_date    = p_streak_date,
        last_workout_completed_at = p_completed_at,
        updated_at = now()
    where user_id = p_user_id;

  -- 5) 7-day milestone bonus: 200 points whenever new_streak hits a multiple of 7.
  --    Only awards on the extension that crossed the boundary, never repeats for same streak length.
  if v_was_extended and v_new_streak > 0 and (v_new_streak % 7 = 0) then
    v_seven_day_bonus := 200;
    insert into public.era_point_events (user_id, session_id, event_type, title, points)
      values (
        p_user_id,
        p_session_id,
        'streak_added',
        format('%s-day streak bonus', v_new_streak),
        v_seven_day_bonus
      )
      returning id into v_bonus_event_id;

    update public.user_reward_state
      set total_points = total_points + v_seven_day_bonus,
          updated_at   = now()
      where user_id = p_user_id;
  end if;

  return json_build_object(
    'previous_streak', v_prev_streak,
    'new_streak',      v_new_streak,
    'longest_streak',  v_new_longest,
    'was_extended',    v_was_extended,
    'seven_day_bonus_points', v_seven_day_bonus,
    'bonus_event_id',  v_bonus_event_id
  );
end;
$function$;

grant execute on function public.record_workout_completion(uuid, uuid, date, timestamptz) to anon, authenticated, service_role;


-- ============================================================
-- 6. Triggers (non-internal, in public schema)
-- ============================================================

create trigger trg_exercise_library_updated_at BEFORE UPDATE ON public.exercise_library FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_planned_exercise_sets_updated_at BEFORE UPDATE ON public.planned_exercise_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger prevent_profile_role_escalation BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_escalation();
create trigger prevent_subscription_tampering BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_subscription_tampering();
create trigger trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_program_day_exercises_updated_at BEFORE UPDATE ON public.program_day_exercises FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_program_day_sections_updated_at BEFORE UPDATE ON public.program_day_sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_program_days_updated_at BEFORE UPDATE ON public.program_days FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_program_weeks_updated_at BEFORE UPDATE ON public.program_weeks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_scheduled_workouts_updated_at BEFORE UPDATE ON public.scheduled_workouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_session_cardio_logs_updated_at BEFORE UPDATE ON public.session_cardio_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_session_exercises_updated_at BEFORE UPDATE ON public.session_exercises FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_session_sets_updated_at BEFORE UPDATE ON public.session_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_user_exercise_stats_updated_at BEFORE UPDATE ON public.user_exercise_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_user_program_day_exercise_order_updated_at BEFORE UPDATE ON public.user_program_day_exercise_order FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_user_program_assignments_updated_at BEFORE UPDATE ON public.user_program_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_user_reward_state_updated_at BEFORE UPDATE ON public.user_reward_state FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_user_streak_days_updated_at BEFORE UPDATE ON public.user_streak_days FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_workout_programs_updated_at BEFORE UPDATE ON public.workout_programs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
create trigger trg_workout_sessions_updated_at BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 7. Row Level Security
-- ============================================================

-- enable RLS on every table
alter table public.body_weight_log enable row level security;
alter table public.era_point_events enable row level security;
alter table public.exercise_library enable row level security;
alter table public.exercise_substitutions enable row level security;
alter table public.goals enable row level security;
alter table public.meal_logs enable row level security;
alter table public.personal_records enable row level security;
alter table public.planned_exercise_sets enable row level security;
alter table public.profiles enable row level security;
alter table public.program_day_exercises enable row level security;
alter table public.program_day_sections enable row level security;
alter table public.program_days enable row level security;
alter table public.program_weeks enable row level security;
alter table public.rest_timers enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.session_cardio_logs enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_media enable row level security;
alter table public.session_sets enable row level security;
alter table public.user_exercise_stats enable row level security;
alter table public.user_meal_plan_items enable row level security;
alter table public.user_meal_plans enable row level security;
alter table public.user_program_assignments enable row level security;
alter table public.user_program_day_exercise_order enable row level security;
alter table public.user_reward_state enable row level security;
alter table public.user_streak_days enable row level security;
alter table public.water_logs enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workout_sessions enable row level security;

-- ------------------------------------------------------------
-- Policies (ordered by table name)
-- ------------------------------------------------------------

-- body_weight_log
create policy "body_weight_log_delete_self" on public.body_weight_log
  for delete to authenticated
  using (auth.uid() = user_id);
create policy "users insert own body weight log" on public.body_weight_log
  for insert to public
  with check (auth.uid() = user_id);
create policy "users read own body weight log" on public.body_weight_log
  for select to public
  using (auth.uid() = user_id);
create policy "users update own body weight log" on public.body_weight_log
  for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- era_point_events
create policy "era_point_events_admin_all" on public.era_point_events
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "era_point_events_own_all" on public.era_point_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- exercise_library
create policy "exercise_library_admin_all" on public.exercise_library
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "exercise_library_read_active" on public.exercise_library
  for select to authenticated
  using ((is_active = true) or is_admin());

-- exercise_substitutions
create policy "exercise_substitutions_admin_all" on public.exercise_substitutions
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "exercise_substitutions_select_accessible" on public.exercise_substitutions
  for select to authenticated
  using (can_access_program_day_exercise(program_day_exercise_id));

-- goals
create policy "Users can insert their own goal" on public.goals
  for insert to public
  with check (auth.uid() = user_id);
create policy "Users can read their own goal" on public.goals
  for select to public
  using (auth.uid() = user_id);
create policy "Users can update their own goal" on public.goals
  for update to public
  using (auth.uid() = user_id);
create policy "goals_delete_self" on public.goals
  for delete to authenticated
  using (auth.uid() = user_id);

-- meal_logs
create policy "meal_logs_own_delete" on public.meal_logs
  for delete to public
  using (user_id = auth.uid());
create policy "meal_logs_own_insert" on public.meal_logs
  for insert to public
  with check (user_id = auth.uid());
create policy "meal_logs_own_select" on public.meal_logs
  for select to public
  using (user_id = auth.uid());
create policy "meal_logs_own_update" on public.meal_logs
  for update to public
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- personal_records
create policy "personal_records_admin_all" on public.personal_records
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "personal_records_own_all" on public.personal_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- planned_exercise_sets
create policy "planned_exercise_sets_admin_all" on public.planned_exercise_sets
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "planned_exercise_sets_select_accessible" on public.planned_exercise_sets
  for select to authenticated
  using (can_access_program_day_exercise(program_day_exercise_id));

-- profiles
create policy "profiles_delete_self" on public.profiles
  for delete to authenticated
  using (id = auth.uid());
create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated
  with check (is_admin());
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check ((id = auth.uid()) and (role = 'user'::app_role));
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using ((id = auth.uid()) or is_admin());
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- program_day_exercises
create policy "program_day_exercises_admin_all" on public.program_day_exercises
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "program_day_exercises_select_accessible" on public.program_day_exercises
  for select to authenticated
  using (can_access_program_day(program_day_id));

-- program_day_sections
create policy "program_day_sections_admin_all" on public.program_day_sections
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "program_day_sections_select_accessible" on public.program_day_sections
  for select to authenticated
  using (can_access_program_day(program_day_id));

-- program_days
create policy "program_days_admin_all" on public.program_days
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "program_days_select_accessible" on public.program_days
  for select to authenticated
  using (can_access_program(program_id));

-- program_weeks
create policy "program_weeks_admin_all" on public.program_weeks
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "program_weeks_select_accessible" on public.program_weeks
  for select to authenticated
  using (can_access_program(program_id));

-- rest_timers
create policy "rest_timers_user_session_all" on public.rest_timers
  for all to authenticated
  using (can_access_session(session_id))
  with check (can_access_session(session_id));

-- scheduled_workouts
create policy "scheduled_workouts_admin_all" on public.scheduled_workouts
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "scheduled_workouts_own_all" on public.scheduled_workouts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- session_cardio_logs
create policy "session_cardio_logs_user_session_all" on public.session_cardio_logs
  for all to authenticated
  using (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = session_cardio_logs.session_exercise_id
      and (s.user_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = session_cardio_logs.session_exercise_id
      and (s.user_id = auth.uid() or is_admin())
  ));

-- session_exercises
create policy "session_exercises_user_session_all" on public.session_exercises
  for all to authenticated
  using (exists (
    select 1 from workout_sessions s
    where s.id = session_exercises.session_id
      and (s.user_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from workout_sessions s
    where s.id = session_exercises.session_id
      and (s.user_id = auth.uid() or is_admin())
  ));

-- session_media
create policy "session_media_admin_all" on public.session_media
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "session_media_own_all" on public.session_media
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- session_sets
create policy "session_sets_user_session_all" on public.session_sets
  for all to authenticated
  using (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = session_sets.session_exercise_id
      and (s.user_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1
    from session_exercises se
    join workout_sessions s on s.id = se.session_id
    where se.id = session_sets.session_exercise_id
      and (s.user_id = auth.uid() or is_admin())
  ));

-- user_exercise_stats
create policy "user_exercise_stats_admin_all" on public.user_exercise_stats
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "user_exercise_stats_own_all" on public.user_exercise_stats
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user_program_day_exercise_order
create policy "user_program_day_exercise_order_admin_all" on public.user_program_day_exercise_order
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "user_program_day_exercise_order_own_all" on public.user_program_day_exercise_order
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user_meal_plan_items
create policy "user_meal_plan_items_owner" on public.user_meal_plan_items
  for all to public
  using (exists (
    select 1 from user_meal_plans p
    where p.id = user_meal_plan_items.user_meal_plan_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from user_meal_plans p
    where p.id = user_meal_plan_items.user_meal_plan_id
      and p.user_id = auth.uid()
  ));

-- user_meal_plans
create policy "user_meal_plans_owner" on public.user_meal_plans
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_program_assignments
create policy "user_program_assignments_admin_all" on public.user_program_assignments
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "user_program_assignments_delete_self" on public.user_program_assignments
  for delete to authenticated
  using (user_id = auth.uid());
create policy "user_program_assignments_select_self_or_admin" on public.user_program_assignments
  for select to authenticated
  using ((user_id = auth.uid()) or is_admin());

-- user_reward_state
create policy "user_reward_state_admin_all" on public.user_reward_state
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "user_reward_state_own_all" on public.user_reward_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user_streak_days
create policy "user_streak_days_admin_all" on public.user_streak_days
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "user_streak_days_own_all" on public.user_streak_days
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- water_logs
create policy "water_logs_own_delete" on public.water_logs
  for delete to public
  using (user_id = auth.uid());
create policy "water_logs_own_insert" on public.water_logs
  for insert to public
  with check (user_id = auth.uid());
create policy "water_logs_own_select" on public.water_logs
  for select to public
  using (user_id = auth.uid());
create policy "water_logs_own_update" on public.water_logs
  for update to public
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- workout_programs
create policy "workout_programs_admin_all" on public.workout_programs
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "workout_programs_select_accessible" on public.workout_programs
  for select to authenticated
  using (can_access_program(id));

-- workout_sessions
create policy "workout_sessions_admin_all" on public.workout_sessions
  for all to authenticated
  using (is_admin())
  with check (is_admin());
create policy "workout_sessions_own_all" on public.workout_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- 8. Comments
-- ============================================================

comment on column public.exercise_library.name_translations
  is 'Localized exercise names, e.g. {"en":"Bench Press","nb":"Benkpress"}.';
comment on column public.goals.birth_year
  is 'Year of birth (e.g. 2001). Used to compute age for BMR/macro targets.';
comment on column public.program_day_exercises.superset_group
  is 'Optional pairing key. Exercises in the same program_day with the same superset_group are performed back-to-back as a superset. NULL = standalone exercise. Empty in v1; v2 supersets will populate this on Advanced programs.';
comment on column public.program_day_sections.title_translations
  is 'Localized section titles, e.g. {"en":"Core Finisher","nb":"Kjerneavslutning"}.';
comment on column public.program_days.title_translations
  is 'Localized workout day titles, e.g. {"en":"Push - Heavy","nb":"Push - tung"}.';
comment on column public.workout_programs.title_translations
  is 'Localized program titles, e.g. {"en":"12 Week Personalized","nb":"12 uker personlig"}.';

comment on function public.get_program_version()
  is 'Returns a change-signature "<MAX(updated_at)>:<total row count>" across the 8 workout-plan tables. Mobile clients compare string equality; any insert/update/delete will move the signature.';
