-- ============================================================================
-- 2026-07-03 — Dedupe session-level ERA point awards
--
-- Bug: `useWorkoutSession.finishSession()` re-awarded +50 workout_completed
-- and +150 cardio_completed every time a user resumed a session that was
-- already ended early and hit End Workout again. There was no dedup at the
-- ledger level, so era_point_events kept getting duplicate rows per session
-- and user_reward_state.total_points drifted upward.
--
-- Fix (layer B): partial unique index on
--   era_point_events (session_id, event_type)
-- for the two guarded event types, plus an award_points RPC that swallows
-- 23505 and returns the pre-existing event instead of double-adding points.
--
-- Client-side dedup (layer C) lives in useWorkoutSession.finishSession —
-- this migration is the durable defense-in-depth backstop.
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE, and the dedupe
-- CTE is a no-op once duplicates are removed.
-- ============================================================================

begin;

-- ------------------------------------------------------------
-- 1. Delete duplicate rows for the two guarded event types
--    (keep the oldest row per (session_id, event_type)).
-- ------------------------------------------------------------
with ranked as (
  select
    id,
    user_id,
    points,
    row_number() over (
      partition by session_id, event_type
      order by occurred_at asc, created_at asc, id asc
    ) as rn
  from public.era_point_events
  where event_type in ('workout_completed', 'cardio_completed')
    and session_id is not null
),
victims as (
  select id, user_id, points from ranked where rn > 1
),
refund as (
  select user_id, sum(points)::int as removed
  from victims
  group by user_id
),
del as (
  delete from public.era_point_events
  where id in (select id from victims)
  returning 1
)
update public.user_reward_state urs
set
  total_points = greatest(0, urs.total_points - r.removed),
  updated_at   = now()
from refund r
where urs.user_id = r.user_id
  and (select count(*) from del) >= 0;  -- force del CTE evaluation

-- ------------------------------------------------------------
-- 2. Partial unique index — future duplicates fail at DB layer.
-- ------------------------------------------------------------
create unique index if not exists era_point_events_session_completion_unique
  on public.era_point_events (session_id, event_type)
  where event_type in ('workout_completed', 'cardio_completed')
    and session_id is not null;

-- ------------------------------------------------------------
-- 3. award_points — swallow 23505 for the guarded event types.
--    Returns the existing event_id and current total_points so
--    the caller sees a successful "award" without any change.
-- ------------------------------------------------------------
create or replace function public.award_points(
  p_user_id     uuid,
  p_event_type  public.point_event_type,
  p_points      integer,
  p_title       text,
  p_session_id  uuid       DEFAULT NULL::uuid,
  p_occurred_at timestamptz DEFAULT now()
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_total    integer;
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
    -- Guarded event type already awarded for this session. Return the
    -- existing row + current total so the caller stays happy, but do
    -- NOT bump total_points a second time.
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
    insert into public.user_reward_state (user_id, total_points)
    values (p_user_id, p_points)
    on conflict (user_id) do update
      set total_points = user_reward_state.total_points + excluded.total_points
    returning total_points into v_total;
  end if;

  return json_build_object(
    'event_id',     v_event_id,
    'total_points', v_total,
    'duplicate',    false
  );
end;
$function$;

grant execute on function public.award_points(uuid, public.point_event_type, integer, text, uuid, timestamptz) to anon, authenticated, service_role;

commit;
