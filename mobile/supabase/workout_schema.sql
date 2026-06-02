-- ERA workout system schema
-- Purpose: one backend schema for the full workout flow shown in the Figma design.
--
-- Design coverage:
-- - Workout home/list: programs, weeks, days, day summaries, planned exercises.
-- - Exercise list: sections such as Exercises, Core Finisher, Treadmill Walk.
-- - Start timer: workout session countdown and status.
-- - Workout started: active exercise, active set, weight, reps, feedback, comments.
-- - Rest timer: rest countdown, added seconds, up-next exercise/set.
-- - Exercise completed: set summary and exercise comments.
-- - Past workout: no-log state, logged set chips, exercise set detail comments.
-- - Future workout: planned workout day without session logs.
-- - Treadmill/cardio screens: duration, speed, incline, distance.
-- - Skip controls: skip rest, skip set/exercise, cancel timer.
-- - PR screen: personal records and previous best values.
-- - Session complete: session duration, sets logged, points, PR count.
-- - Points/streak screens: ERA point history, reward balance, streak days.
-- - Future admin panel: exercise library and program builder tables.
--
-- Onboarding note:
-- This file intentionally does not create or alter the existing public.goals
-- onboarding table. Workout programs can store an onboarding_snapshot JSON value
-- copied from your existing goals row at plan-generation time.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('user', 'coach', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.weight_unit as enum ('kg', 'lb');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.distance_unit as enum ('m', 'km', 'mi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_assignment_status as enum ('active', 'paused', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_day_kind as enum ('push', 'pull', 'legs', 'shoulders', 'cardio', 'rest', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_section_kind as enum ('main_exercises', 'core_finisher', 'treadmill_walk', 'warmup', 'cooldown', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_modality as enum ('strength', 'cardio', 'mobility', 'core');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_category as enum ('compound', 'isolation', 'core', 'cardio', 'warmup', 'cooldown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.planned_set_kind as enum ('warmup', 'working', 'top_set', 'backoff', 'drop_set', 'amrap', 'core', 'cardio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_status as enum ('scheduled', 'in_progress', 'completed', 'skipped', 'missed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_log_status as enum ('pending', 'in_progress', 'completed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.set_log_status as enum ('planned', 'completed', 'skipped', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.load_feedback as enum ('light_weight', 'correct_weight', 'felt_heavy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timer_kind as enum ('workout_countdown', 'rest_between_sets', 'rest_between_exercises', 'cardio_timer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pr_metric as enum ('max_weight', 'max_reps', 'best_set', 'estimated_one_rep_max', 'duration', 'distance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.point_event_type as enum ('workout_completed', 'exercise_completed', 'personal_record', 'streak_added', 'progress_photo_added', 'manual_adjustment');
exception when duplicate_object then null; end $$;

-- Late additions to the enum (idempotent so re-runs are safe).
alter type public.point_event_type add value if not exists 'set_logged';
alter type public.point_event_type add value if not exists 'cardio_completed';
alter type public.point_event_type add value if not exists 'body_weight_logged';

do $$ begin
  create type public.streak_day_status as enum ('completed', 'rest_day', 'missed');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- App users. Supabase Auth remains the source of login/signup identity.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  program_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists program_start_date date;

create table if not exists public.user_reward_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  longest_streak_days integer not null default 0 check (longest_streak_days >= 0),
  last_streak_date date,
  last_workout_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before insert or update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

-- Admin-managed exercise library. This feeds the admin panel later and the
-- workout list/logging screens now.
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_translations jsonb not null default '{}'::jsonb,
  modality public.exercise_modality not null,
  category public.exercise_category not null,
  primary_muscles text[] not null default '{}',
  default_rest_seconds integer check (default_rest_seconds is null or default_rest_seconds >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Program template, e.g. "12 Week Personalized".
create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_translations jsonb not null default '{}'::jsonb,
  duration_weeks integer not null default 12 check (duration_weeks > 0),
  days_per_week integer not null default 6 check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  title text not null,
  title_translations jsonb not null default '{}'::jsonb,
  focus text,
  focus_translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, week_number)
);

-- Planned workout day, e.g. "Week 1 - Monday - Push - Heavy".
create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  week_id uuid not null references public.program_weeks(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  weekday integer check (weekday is null or weekday between 1 and 7),
  workout_kind public.workout_day_kind not null default 'custom',
  title text not null,
  title_translations jsonb not null default '{}'::jsonb,
  subtitle text,
  subtitle_translations jsonb not null default '{}'::jsonb,
  target_muscles text[] not null default '{}',
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  is_rest_day boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, day_number)
);

-- Sections on the exercise list screen.
create table if not exists public.program_day_sections (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  section_kind public.workout_section_kind not null,
  title text not null,
  title_translations jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_day_id, sort_order)
);

-- Exercise row inside a section, including Figma fields such as initial weight.
create table if not exists public.program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  section_id uuid not null references public.program_day_sections(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete restrict,
  sort_order integer not null default 0,
  display_name text,
  display_name_translations jsonb not null default '{}'::jsonb,
  initial_weight_value numeric(7,2),
  initial_weight_unit public.weight_unit not null default 'kg',
  default_rest_seconds integer check (default_rest_seconds is null or default_rest_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, sort_order)
);

-- Planned sets support normal sets, top set/back-off, core sets, and cardio blocks.
create table if not exists public.planned_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  program_day_exercise_id uuid not null references public.program_day_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  set_kind public.planned_set_kind not null default 'working',
  target_weight_value numeric(7,2),
  target_weight_unit public.weight_unit not null default 'kg',
  target_reps_exact integer check (target_reps_exact is null or target_reps_exact > 0),
  target_reps_min integer check (target_reps_min is null or target_reps_min > 0),
  target_reps_max integer check (target_reps_max is null or target_reps_max > 0),
  target_duration_seconds integer check (target_duration_seconds is null or target_duration_seconds >= 0),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_day_exercise_id, set_number)
);

-- Optional exercise substitutions for future admin/user swap flows.
create table if not exists public.exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  program_day_exercise_id uuid not null references public.program_day_exercises(id) on delete cascade,
  substitute_exercise_id uuid not null references public.exercise_library(id) on delete restrict,
  reason text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (program_day_exercise_id, substitute_exercise_id)
);

-- User assignment makes a template or generated program active for a user.
create table if not exists public.user_program_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  status public.program_assignment_status not null default 'active',
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  current_week_number integer not null default 1 check (current_week_number > 0),
  current_day_number integer not null default 1 check (current_day_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Calendar instance of a workout day. This is what powers today/past/future lists.
create table if not exists public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.user_program_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid not null references public.program_days(id) on delete restrict,
  scheduled_for date not null,
  status public.workout_status not null default 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  skipped_reason text,
  points_available integer not null default 0 check (points_available >= 0),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, program_day_id, scheduled_for)
);

-- Runtime session. One row starts when user taps Start Now.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid references public.program_days(id) on delete set null,
  status public.workout_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  total_exercises integer not null default 0 check (total_exercises >= 0),
  exercises_completed integer not null default 0 check (exercises_completed >= 0),
  sets_logged integer not null default 0 check (sets_logged >= 0),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces one session row per (user, program_day). Resume-or-create handled at app layer.
create unique index if not exists workout_sessions_one_per_user_day
  on public.workout_sessions (user_id, program_day_id);

-- Runtime exercise inside a session, e.g. "1/5 EXERCISES - Deadlift".
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  program_day_exercise_id uuid references public.program_day_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercise_library(id) on delete restrict,
  section_kind public.workout_section_kind,
  sort_order integer not null default 0,
  display_name_snapshot text not null,
  category_snapshot public.exercise_category,
  status public.exercise_log_status not null default 'pending',
  completed_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, sort_order)
);

-- Runtime set log. This stores the active logging screen fields:
-- weight, reps, feedback, comments, best-set/PR flags, and rest data.
create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  planned_set_id uuid references public.planned_exercise_sets(id) on delete set null,
  set_number integer not null check (set_number > 0),
  set_kind public.planned_set_kind not null default 'working',
  target_weight_value numeric(7,2),
  target_weight_unit public.weight_unit not null default 'kg',
  target_reps_exact integer,
  target_reps_min integer,
  target_reps_max integer,
  target_duration_seconds integer,
  logged_weight_value numeric(7,2),
  logged_weight_unit public.weight_unit not null default 'kg',
  logged_reps integer check (logged_reps is null or logged_reps >= 0),
  logged_duration_seconds integer check (logged_duration_seconds is null or logged_duration_seconds >= 0),
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
  rest_seconds_planned integer check (rest_seconds_planned is null or rest_seconds_planned >= 0),
  rest_seconds_taken integer check (rest_seconds_taken is null or rest_seconds_taken >= 0),
  status public.set_log_status not null default 'planned',
  completed_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

-- Rest countdown screen, including "+30 sec".
create table if not exists public.rest_timers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  session_exercise_id uuid references public.session_exercises(id) on delete cascade,
  session_set_id uuid references public.session_sets(id) on delete cascade,
  timer_kind public.timer_kind not null,
  label text,
  planned_seconds integer not null check (planned_seconds >= 0),
  added_seconds integer not null default 0 check (added_seconds >= 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dedicated cardio/treadmill data. Strength-style cardio blocks can also use session_sets.
create table if not exists public.session_cardio_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  planned_set_id uuid references public.planned_exercise_sets(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_value numeric(8,2),
  distance_unit public.distance_unit,
  speed_avg_value numeric(6,2),
  incline_percent numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User's best-known exercise stats for the "BEST SET" card before logging.
create table if not exists public.user_exercise_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  last_weight_value numeric(7,2),
  last_weight_unit public.weight_unit not null default 'kg',
  last_reps integer,
  last_duration_seconds integer,
  last_set_feedback public.load_feedback,
  last_set_session_set_id uuid references public.session_sets(id) on delete set null,
  best_weight_value numeric(7,2),
  best_weight_unit public.weight_unit not null default 'kg',
  best_reps integer,
  best_estimated_one_rep_max numeric(8,2),
  best_set_session_set_id uuid references public.session_sets(id) on delete set null,
  last_logged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- PR screen, e.g. "New Personal Record - Deadlift - 120 kg x 4 reps".
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  session_exercise_id uuid references public.session_exercises(id) on delete set null,
  session_set_id uuid references public.session_sets(id) on delete set null,
  metric public.pr_metric not null,
  value_numeric numeric(10,2) not null,
  value_unit text,
  weight_value numeric(7,2),
  weight_unit public.weight_unit,
  reps integer,
  duration_seconds integer,
  previous_value_numeric numeric(10,2),
  previous_label text,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.era_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  event_type public.point_event_type not null,
  title text not null,
  points integer not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_streak_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  streak_date date not null,
  status public.streak_day_status not null,
  session_id uuid references public.workout_sessions(id) on delete set null,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, streak_date)
);

-- "Capture Progress" on session complete + standalone progress photos from
-- the Progress screen. `session_id` is nullable because uploads from the
-- Progress screen aren't tied to an active session.
create table if not exists public.session_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete cascade,
  media_type text not null default 'progress_photo',
  storage_path text not null,
  public_url text,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now()
);

-- Idempotent: existing deployments may have created session_id NOT NULL.
alter table public.session_media
  alter column session_id drop not null;

comment on column public.exercise_library.name_translations is
  'Localized exercise names, e.g. {"en":"Bench Press","nb":"Benkpress"}.';
comment on column public.workout_programs.title_translations is
  'Localized program titles, e.g. {"en":"12 Week Personalized","nb":"12 uker personlig"}.';
comment on column public.program_days.title_translations is
  'Localized workout day titles, e.g. {"en":"Push - Heavy","nb":"Push - tung"}.';
comment on column public.program_day_sections.title_translations is
  'Localized section titles, e.g. {"en":"Core Finisher","nb":"Kjerneavslutning"}.';

-- Indexes for the screens that need fast reads.
create index if not exists idx_exercise_library_name on public.exercise_library(name);
create index if not exists idx_program_weeks_program_number on public.program_weeks(program_id, week_number);
create index if not exists idx_program_days_program_week on public.program_days(program_id, week_id, day_number);
create index if not exists idx_program_day_sections_day_order on public.program_day_sections(program_day_id, sort_order);
create index if not exists idx_program_day_exercises_day_order on public.program_day_exercises(program_day_id, sort_order);
create index if not exists idx_planned_sets_day_exercise_order on public.planned_exercise_sets(program_day_exercise_id, set_number);
create index if not exists idx_assignments_user_status on public.user_program_assignments(user_id, status);
create index if not exists idx_scheduled_workouts_user_date on public.scheduled_workouts(user_id, scheduled_for);
create index if not exists idx_workout_sessions_user_started on public.workout_sessions(user_id, started_at desc);
create index if not exists idx_session_exercises_session_order on public.session_exercises(session_id, sort_order);
create index if not exists idx_session_sets_exercise_order on public.session_sets(session_exercise_id, set_number);
create index if not exists idx_rest_timers_session on public.rest_timers(session_id, started_at desc);
create index if not exists idx_cardio_logs_session_exercise on public.session_cardio_logs(session_exercise_id);
create index if not exists idx_personal_records_user_exercise on public.personal_records(user_id, exercise_id, achieved_at desc);
create index if not exists idx_point_events_user_time on public.era_point_events(user_id, occurred_at desc);
create index if not exists idx_streak_days_user_date on public.user_streak_days(user_id, streak_date desc);
create index if not exists idx_session_media_user_session on public.session_media(user_id, session_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_reward_state',
    'exercise_library',
    'workout_programs',
    'program_weeks',
    'program_days',
    'program_day_sections',
    'program_day_exercises',
    'planned_exercise_sets',
    'user_program_assignments',
    'scheduled_workouts',
    'workout_sessions',
    'session_exercises',
    'session_sets',
    'session_cardio_logs',
    'user_exercise_stats',
    'user_streak_days'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'trg_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end;
$$;

-- Security helpers.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'coach')
  );
$$;

create or replace function public.can_access_program(program_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.workout_programs p where p.id = program_uuid
    );
$$;

create or replace function public.can_access_program_day(day_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_days d
    where d.id = day_uuid
      and public.can_access_program(d.program_id)
  );
$$;

create or replace function public.can_access_program_day_exercise(day_exercise_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_day_exercises e
    where e.id = day_exercise_uuid
      and public.can_access_program_day(e.program_day_id)
  );
$$;

create or replace function public.can_access_session(session_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_sessions s
    where s.id = session_uuid
      and (s.user_id = auth.uid() or public.is_admin())
  );
$$;

-- Row level security.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_reward_state',
    'exercise_library',
    'workout_programs',
    'program_weeks',
    'program_days',
    'program_day_sections',
    'program_day_exercises',
    'planned_exercise_sets',
    'exercise_substitutions',
    'user_program_assignments',
    'scheduled_workouts',
    'workout_sessions',
    'session_exercises',
    'session_sets',
    'rest_timers',
    'session_cardio_logs',
    'user_exercise_stats',
    'personal_records',
    'era_point_events',
    'user_streak_days',
    'session_media'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles for insert to authenticated
with check (public.is_admin());

drop policy if exists exercise_library_read_active on public.exercise_library;
create policy exercise_library_read_active
on public.exercise_library for select to authenticated
using (is_active = true or public.is_admin());

drop policy if exists exercise_library_admin_all on public.exercise_library;
create policy exercise_library_admin_all
on public.exercise_library for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists workout_programs_select_accessible on public.workout_programs;
create policy workout_programs_select_accessible
on public.workout_programs for select to authenticated
using (public.can_access_program(id));

drop policy if exists workout_programs_admin_all on public.workout_programs;
create policy workout_programs_admin_all
on public.workout_programs for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists program_weeks_select_accessible on public.program_weeks;
create policy program_weeks_select_accessible
on public.program_weeks for select to authenticated
using (public.can_access_program(program_id));

drop policy if exists program_weeks_admin_all on public.program_weeks;
create policy program_weeks_admin_all
on public.program_weeks for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists program_days_select_accessible on public.program_days;
create policy program_days_select_accessible
on public.program_days for select to authenticated
using (public.can_access_program(program_id));

drop policy if exists program_days_admin_all on public.program_days;
create policy program_days_admin_all
on public.program_days for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists program_day_sections_select_accessible on public.program_day_sections;
create policy program_day_sections_select_accessible
on public.program_day_sections for select to authenticated
using (public.can_access_program_day(program_day_id));

drop policy if exists program_day_sections_admin_all on public.program_day_sections;
create policy program_day_sections_admin_all
on public.program_day_sections for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists program_day_exercises_select_accessible on public.program_day_exercises;
create policy program_day_exercises_select_accessible
on public.program_day_exercises for select to authenticated
using (public.can_access_program_day(program_day_id));

drop policy if exists program_day_exercises_admin_all on public.program_day_exercises;
create policy program_day_exercises_admin_all
on public.program_day_exercises for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists planned_exercise_sets_select_accessible on public.planned_exercise_sets;
create policy planned_exercise_sets_select_accessible
on public.planned_exercise_sets for select to authenticated
using (public.can_access_program_day_exercise(program_day_exercise_id));

drop policy if exists planned_exercise_sets_admin_all on public.planned_exercise_sets;
create policy planned_exercise_sets_admin_all
on public.planned_exercise_sets for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists exercise_substitutions_select_accessible on public.exercise_substitutions;
create policy exercise_substitutions_select_accessible
on public.exercise_substitutions for select to authenticated
using (public.can_access_program_day_exercise(program_day_exercise_id));

drop policy if exists exercise_substitutions_admin_all on public.exercise_substitutions;
create policy exercise_substitutions_admin_all
on public.exercise_substitutions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists user_program_assignments_select_self_or_admin on public.user_program_assignments;
create policy user_program_assignments_select_self_or_admin
on public.user_program_assignments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_program_assignments_admin_all on public.user_program_assignments;
create policy user_program_assignments_admin_all
on public.user_program_assignments for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Direct user-owned tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_reward_state',
    'scheduled_workouts',
    'workout_sessions',
    'user_exercise_stats',
    'personal_records',
    'era_point_events',
    'user_streak_days',
    'session_media'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_own_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name || '_own_all',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      table_name || '_admin_all',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists session_exercises_user_session_all on public.session_exercises;
create policy session_exercises_user_session_all
on public.session_exercises for all to authenticated
using (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_exercises.session_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_exercises.session_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists session_sets_user_session_all on public.session_sets;
create policy session_sets_user_session_all
on public.session_sets for all to authenticated
using (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_sets.session_exercise_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_sets.session_exercise_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists rest_timers_user_session_all on public.rest_timers;
create policy rest_timers_user_session_all
on public.rest_timers for all to authenticated
using (public.can_access_session(session_id))
with check (public.can_access_session(session_id));

drop policy if exists session_cardio_logs_user_session_all on public.session_cardio_logs;
create policy session_cardio_logs_user_session_all
on public.session_cardio_logs for all to authenticated
using (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_cardio_logs.session_exercise_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = session_cardio_logs.session_exercise_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Body weight log — one entry per user per day, stored in kg.
-- Heaviest/lightest are computed from raw rows; the weekly chart averages
-- per program_week and anchors W1 to goals.weight when no W1 entry exists.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.body_weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  logged_for_date date not null default current_date,
  logged_at timestamptz not null default now(),
  source text not null default 'manual',
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_for_date)
);

create index if not exists idx_body_weight_log_user_date
  on public.body_weight_log(user_id, logged_for_date desc);

alter table public.body_weight_log enable row level security;

create policy "users read own body weight log"
  on public.body_weight_log for select
  using (auth.uid() = user_id);

create policy "users insert own body weight log"
  on public.body_weight_log for insert
  with check (auth.uid() = user_id);

create policy "users update own body weight log"
  on public.body_weight_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Leaderboard RPCs.
-- profiles + user_reward_state both have self-only RLS, so a direct join from
-- the client returns just the caller's row. These security-definer functions
-- expose only the columns a leaderboard needs (display name, avatar, points,
-- streak) and never leak the rest of profiles.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_leaderboard_page(
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  rank int,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points int,
  current_streak_days int
)
language sql
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.get_leaderboard_page(int, int) to authenticated;

create or replace function public.get_my_leaderboard_rank()
returns table (
  rank int,
  total_points int,
  total_users int
)
language sql
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.get_my_leaderboard_rank() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Progress photos. Private bucket + RLS + atomic record-and-award RPC.
-- Enforces "one paid photo per day" at the DB so two simultaneous uploads
-- can't both win the 25-point bonus.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress_photos_owner_select" on storage.objects;
create policy "progress_photos_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "progress_photos_owner_insert" on storage.objects;
create policy "progress_photos_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "progress_photos_owner_update" on storage.objects;
create policy "progress_photos_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "progress_photos_owner_delete" on storage.objects;
create policy "progress_photos_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create or replace function public.record_progress_photo(
  p_storage_path text,
  p_session_id uuid default null
)
returns table (
  media_id uuid,
  points_awarded int,
  total_points int
)
language plpgsql
security definer
set search_path = public
as $$
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

  -- Aliases (`sm.`, `urs.`) avoid ambiguity with the RPC's return-column
  -- names (`points_awarded`, `total_points`).
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
$$;

grant execute on function public.record_progress_photo(text, uuid) to authenticated;

create or replace function public.get_my_progress_photos(p_limit int default 50)
returns table (
  id uuid,
  session_id uuid,
  storage_path text,
  points_awarded int,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, session_id, storage_path, points_awarded, created_at
  from public.session_media
  where user_id = auth.uid()
    and media_type = 'progress_photo'
  order by created_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_my_progress_photos(int) to authenticated;

-- Returns a single fingerprint string the mobile client compares against its
-- cached copy on app foreground. Shape: "<MAX(updated_at)>:<total row count>"
-- across every table that holds program / exercise content. Any admin insert,
-- update, or delete moves the fingerprint forward, so the client knows to
-- refetch the workout bootstrap. STABLE + SECURITY INVOKER so it respects
-- each caller's RLS view of the tables.
create or replace function public.get_program_version()
returns text
language sql
stable
set search_path = public
as $$
  select (
    greatest(
      coalesce((select max(updated_at) from public.user_program_assignments), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.workout_programs), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.program_weeks), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.program_days), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.program_day_sections), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.program_day_exercises), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.planned_exercise_sets), 'epoch'::timestamptz),
      coalesce((select max(updated_at) from public.exercise_library), 'epoch'::timestamptz)
    )::text
  ) || ':' || (
    (select count(*) from public.user_program_assignments) +
    (select count(*) from public.workout_programs) +
    (select count(*) from public.program_weeks) +
    (select count(*) from public.program_days) +
    (select count(*) from public.program_day_sections) +
    (select count(*) from public.program_day_exercises) +
    (select count(*) from public.planned_exercise_sets) +
    (select count(*) from public.exercise_library)
  )::text;
$$;

grant execute on function public.get_program_version() to authenticated;
