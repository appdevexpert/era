-- 2026-07-14 — Server-side lifetime training volume (get_my_lifetime_volume_kg)
--
-- Why:
--   The Progress screen's "Your Progress" card shows a Lifetime Volume stat
--   (Σ weight × reps over every completed set). Computing it on the client meant
--   downloading every session_sets row and summing locally — slow for heavy
--   users, and it rode along on the reward bootstrap that the Points screen
--   refetches on every open. This RPC does the aggregate in Postgres and returns
--   a single number, so the payload is one value instead of thousands of rows.
--
-- Behaviour:
--   - Scoped to auth.uid() (a user only ever gets their own volume).
--   - lb weights converted to kg (× 0.45359237) so the total is unit-consistent.
--   - Counts only completed sets that have a positive weight and reps.
--
-- Safety: additive only — creates one read-only function. No table/column
--   changes. Mirrored into workout_schema.sql.

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
