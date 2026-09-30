-- 2026-09-29 — Leaderboard shows the top 10 only
--
-- Why:
--   The owner doesn't want every user to be able to scroll through the whole
--   user base. The leaderboard now shows the top 10, plus the caller's own rank
--   underneath when they're outside it.
--
-- Behaviour:
--   - get_leaderboard_page never returns more than the top 10 rows, whatever
--     p_limit / p_offset say. Capping it here (not just in the app) is what
--     makes it private: the RPC is callable directly with the anon key.
--     Older app builds that page with offset 10, 20, … simply get an empty
--     page, which their "hasMore" logic already treats as the end.
--   - get_my_leaderboard_rank drops total_users (it leaked the user count) and
--     now returns the caller's display_name / avatar_url so the app can draw
--     the "your rank" row without another query. Older builds read total_users
--     with a `?? 0` fallback, so removing it is harmless for them.
--   - Both functions are no longer executable by anon.
--
-- Safety: functions only — no table/column changes. Mirrored into
--   workout_schema.sql.

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
      rank() over (order by r.total_points desc, r.user_id)::int as rank,
      row_number() over (order by r.total_points desc, r.user_id) as pos
    from public.user_reward_state r
    join public.profiles p on p.id = r.user_id
    where p.role = 'user'
  )
  select rank, user_id, display_name, avatar_url, total_points, current_streak_days
  from ranked
  where pos <= 10
  order by pos
  limit least(greatest(p_limit, 0), 10)
  offset greatest(p_offset, 0);
$function$;

revoke execute on function public.get_leaderboard_page(integer, integer) from public, anon;
grant execute on function public.get_leaderboard_page(integer, integer) to authenticated, service_role;

-- Return type changes, so it has to be dropped rather than replaced.
drop function if exists public.get_my_leaderboard_rank();

create function public.get_my_leaderboard_rank()
 RETURNS TABLE(rank integer, total_points integer, display_name text, avatar_url text)
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
    coalesce(ranked.rank, 0) as rank,
    coalesce(ranked.total_points, 0) as total_points,
    p.full_name as display_name,
    p.avatar_url
  from public.profiles p
  left join ranked on ranked.user_id = p.id
  where p.id = auth.uid();
$function$;

revoke execute on function public.get_my_leaderboard_rank() from public, anon;
grant execute on function public.get_my_leaderboard_rank() to authenticated, service_role;
