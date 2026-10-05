-- 2026-10-05 — Tie every workout session to the cycle (assignment) it belongs to
--
-- Why:
--   A new cycle ("heavier" / "deload") reuses the same program, so its
--   program_day_ids are identical to the previous cycle's. Sessions were keyed
--   only by (user_id, program_day_id), which caused two bugs in cycle 2:
--     1. Days done in cycle 1 showed as completed in the cycle 2 plan.
--     2. The unique index allowed one session per day *ever*, so opening a
--        day done in cycle 1 resumed the old session instead of starting a
--        fresh one (and a re-log would overwrite cycle 1 history).
--
-- Behaviour:
--   - workout_sessions.assignment_id → user_program_assignments(id).
--   - Backfill: each existing session goes to the latest assignment that had
--     started by the session's started_at.
--   - BEFORE INSERT trigger: if the client sends no assignment_id
--     (older app builds) or one that isn't theirs, the user's active
--     assignment is filled in.
--   - Uniqueness moves from (user_id, program_day_id) to
--     (user_id, assignment_id, program_day_id): one session per day per cycle.
--
-- Safety: additive column + backfill. No rows deleted. Mirrored into
--   workout_schema.sql.

alter table public.workout_sessions
  add column if not exists assignment_id uuid
  references public.user_program_assignments(id) on delete set null;

update public.workout_sessions s
   set assignment_id = (
     select a.id
       from public.user_program_assignments a
      where a.user_id = s.user_id
        and a.started_at <= s.started_at
      order by a.started_at desc
      limit 1
   )
 where s.assignment_id is null;

-- Sessions older than every assignment (none today) go to the first one.
update public.workout_sessions s
   set assignment_id = (
     select a.id
       from public.user_program_assignments a
      where a.user_id = s.user_id
      order by a.started_at asc
      limit 1
   )
 where s.assignment_id is null;

create or replace function public.set_workout_session_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- A missing id, or one that isn't this user's (deleted / foreign), falls
  -- back to the active assignment instead of raising, so a queued offline
  -- write can never get stuck retrying forever.
  IF NEW.assignment_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_program_assignments a
     WHERE a.id = NEW.assignment_id AND a.user_id = NEW.user_id
  ) THEN
    SELECT a.id INTO NEW.assignment_id
      FROM public.user_program_assignments a
     WHERE a.user_id = NEW.user_id AND a.status = 'active'
     ORDER BY a.assigned_at DESC
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

drop trigger if exists trg_workout_sessions_assignment on public.workout_sessions;
create trigger trg_workout_sessions_assignment
  BEFORE INSERT ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION set_workout_session_assignment();

create unique index if not exists workout_sessions_one_per_user_cycle_day
  ON public.workout_sessions USING btree (user_id, assignment_id, program_day_id) NULLS NOT DISTINCT;

drop index if exists public.workout_sessions_one_per_user_day;
