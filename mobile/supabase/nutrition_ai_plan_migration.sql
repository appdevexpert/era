-- =====================================================================
-- Nutrition: switch from admin-authored meal program to per-user,
-- AI-generated weekly meal plans.
--
--  * New tables: user_meal_plans + user_meal_plan_items (per user, per week)
--  * meal_logs: drop links to admin meal tables, add link to plan items
--  * Drop all admin meal tables (programs/phases/days/items/library) and
--    the now-orphaned user_meal_program_assignments
--
-- Reuses existing enums: public.meal_phase_key, public.meal_category.
-- Run order matters: create new tables, repoint meal_logs, THEN drop.
-- =====================================================================

-- 1. New per-user weekly plan tables -----------------------------------

create table if not exists public.user_meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  phase_key public.meal_phase_key not null,
  -- snapshot of the user's targets at generation time
  kcal_target integer not null,
  protein_g_target numeric not null,
  carbs_g_target numeric not null,
  fats_g_target numeric not null,
  source text not null default 'ai',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table if not exists public.user_meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_meal_plan_id uuid not null
    references public.user_meal_plans(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 1 and 7),
  category public.meal_category not null,
  sort_order integer not null default 0,
  -- bilingual content (locked rule): { "en": "...", "nb": "..." }
  name_translations jsonb not null default '{}'::jsonb,
  note_translations jsonb not null default '{}'::jsonb,
  kcal integer not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fats_g numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists user_meal_plan_items_plan_idx
  on public.user_meal_plan_items (user_meal_plan_id);

-- 2. Repoint meal_logs from admin tables to the new plan items ----------
--    (name_snapshot + macros already live on meal_logs, so dropping the
--     old FK columns loses no nutrition data.)

alter table public.meal_logs
  drop column if exists meal_library_id,
  drop column if exists meal_program_phase_day_item_id,
  add column if not exists user_meal_plan_item_id uuid
    references public.user_meal_plan_items(id) on delete set null;

-- 3. Drop admin meal tables (dependents first) -------------------------

drop table if exists public.user_meal_program_assignments;
drop table if exists public.meal_program_phase_day_items;
drop table if exists public.meal_program_phase_days;
drop table if exists public.meal_program_phases;
drop table if exists public.meal_programs;
drop table if exists public.meal_library;

-- 4. RLS: a user can only read/write their own plan + items -------------

alter table public.user_meal_plans enable row level security;
alter table public.user_meal_plan_items enable row level security;

create policy "user_meal_plans_owner"
  on public.user_meal_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_meal_plan_items_owner"
  on public.user_meal_plan_items
  for all
  using (
    exists (
      select 1 from public.user_meal_plans p
      where p.id = user_meal_plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_meal_plans p
      where p.id = user_meal_plan_id and p.user_id = auth.uid()
    )
  );
