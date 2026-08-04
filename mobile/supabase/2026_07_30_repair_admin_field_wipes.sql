-- ===========================================================================
-- Repair: admin panel partial-form writes
-- Drafted 2026-07-30. REVIEW BEFORE RUNNING.
-- ===========================================================================
--
-- Two admin actions wrote columns their dialogs never rendered, because the
-- FormData helpers treated "field absent from the form" the same as "field
-- cleared by the operator":
--
--   1. updatePlannedSet wrote all 8 set columns while the "Edit set" dialog
--      rendered 4 of them. Every save nulled target_reps_min, target_reps_max,
--      target_duration_seconds and rest_seconds on that set.
--
--   2. updateDaySection wrote sort_order with a fallback of 0 while the "Edit
--      section" dialog never rendered it. Fixing a section title moved that
--      section to the top of its day.
--
-- Both are fixed in code (web/lib/admin/actions.ts, patch helpers + defined()).
-- This script repairs the rows they already damaged.
--
-- Nothing here deletes or overwrites a non-null value. Part 1 only fills NULLs,
-- and only where every sibling set on the same exercise agrees on one value —
-- unanimity is the guard, so mixed-value exercises are skipped rather than
-- guessed at. Part 2 renumbers one day's sections without changing the order
-- the mobile app renders.
--
-- Blast radius re-measured 2026-08-03, immediately before running: 10 sets
-- carry the signature. Every one of them is set_number 4 and was written on
-- 2026-07-15 or 2026-07-29 — the two evenings the client spent adding a fourth
-- set through the old dialogs. Zero rows created by the replacement set grid
-- (2026-08-03) are affected, which is the check that says the code fix holds.
--
-- The original draft counted 12 and also repaired a section order; both numbers
-- moved before this was run. See PART 2 for why it is now a no-op.
--
-- ---------------------------------------------------------------------------
-- Decisions taken before running
-- ---------------------------------------------------------------------------
--
-- * 3 of the 10 sets have a non-null target_reps_exact (Squats ×2, Leg Curl).
--   Part 1b deliberately does NOT re-add a rep range to those: the operator
--   expressed reps as an exact count, and a range alongside it would be
--   contradictory. They get only their rest_seconds back.
--
-- * 1 set (Bulgarian Split Squat, Legs - Volume) holds a half-filled range.
--   Part 1c converts the surviving number to target_reps_exact rather than
--   completing the range from its siblings — see the comment there.
--
-- * target_duration_seconds needs no repair — 0 sets are missing it relative
--   to their siblings.


-- ===========================================================================
-- PREVIEW — run these SELECTs first, they change nothing
-- ===========================================================================

-- P1: every set that will be touched, and what it will become. The two CTEs are
-- the same unanimity filters the UPDATEs below use, so the preview and the
-- writes agree by construction. A NULL in an *_after column means "not touched".
with rest_u as (
  select program_day_exercise_id as ex, min(rest_seconds) as rest
  from planned_exercise_sets
  where rest_seconds is not null
  group by 1
  having min(rest_seconds) = max(rest_seconds)
),
reps_u as (
  select program_day_exercise_id as ex,
         min(target_reps_min) as r_min,
         min(target_reps_max) as r_max
  from planned_exercise_sets
  where target_reps_min is not null and target_reps_max is not null
  group by 1
  having min(target_reps_min) = max(target_reps_min)
     and min(target_reps_max) = max(target_reps_max)
)
select coalesce(pde.display_name, el.name)  as exercise,
       pd.title                             as day,
       pes.set_number,
       pes.target_reps_exact                as exact_now,
       pes.target_reps_min                  as min_now,
       pes.target_reps_max                  as max_now,
       pes.rest_seconds                     as rest_now,
       case when pes.rest_seconds is null then ru.rest end                as rest_after,
       case when pes.target_reps_exact is null and pes.target_reps_min is null
            then pu.r_min end                                             as min_after,
       case when pes.target_reps_exact is null and pes.target_reps_max is null
            then pu.r_max end                                             as max_after,
       pes.updated_at::date                 as last_touched
from planned_exercise_sets pes
left join rest_u ru            on ru.ex = pes.program_day_exercise_id
left join reps_u pu            on pu.ex = pes.program_day_exercise_id
join program_day_exercises pde on pde.id = pes.program_day_exercise_id
join program_days pd           on pd.id  = pde.program_day_id
left join exercise_library el  on el.id  = pde.exercise_id
where (pes.rest_seconds is null and ru.rest is not null)
   or (pes.target_reps_exact is null and pes.target_reps_min is null and pu.r_min is not null)
   or (pes.target_reps_exact is null and pes.target_reps_max is null and pu.r_max is not null)
order by exercise, pes.set_number;

-- P2: the one day whose sections need renumbering.
select id, section_kind, title, sort_order
from program_day_sections
where program_day_id = '644d4261-7331-522d-8e6e-ec68323e6821'
order by sort_order;


-- ===========================================================================
-- PART 1 — restore the wiped set columns
-- ===========================================================================

begin;

-- 1a. rest_seconds. Restored only where every sibling set on the exercise that
--     has a rest value agrees on the same one.
with unanimous as (
  select program_day_exercise_id as ex, min(rest_seconds) as rest
  from planned_exercise_sets
  where rest_seconds is not null
  group by 1
  having min(rest_seconds) = max(rest_seconds)
)
update planned_exercise_sets pes
   set rest_seconds = u.rest
  from unanimous u
 where pes.program_day_exercise_id = u.ex
   and pes.rest_seconds is null;

-- 1b. Rep range, for sets left with NO rep target at all. Sets that carry a
--     target_reps_exact are skipped on purpose (see caveats above).
with unanimous as (
  select program_day_exercise_id as ex,
         min(target_reps_min) as r_min,
         min(target_reps_max) as r_max
  from planned_exercise_sets
  where target_reps_min is not null and target_reps_max is not null
  group by 1
  having min(target_reps_min) = max(target_reps_min)
     and min(target_reps_max) = max(target_reps_max)
)
update planned_exercise_sets pes
   set target_reps_min = u.r_min,
       target_reps_max = u.r_max
  from unanimous u
 where pes.program_day_exercise_id = u.ex
   and pes.target_reps_exact is null
   and pes.target_reps_min is null
   and pes.target_reps_max is null;

-- 1c. Half-filled range: one set kept a number and lost the other half of its
--     range. Filling the missing half from the siblings would invent a
--     degenerate range — Bulgarian Split Squat set 4 holds min 12 with no max,
--     and "12-12 reps" is not what anybody typed. The number that survived IS
--     the rep target, so it moves to target_reps_exact.
--
--     This also matches what the operator did to the other exercises the same
--     evening: Squats set 4 and Leg Curl set 4 both carry target_reps_exact 12.
--     The audit log for 2026-07-29 18:37 shows a bulk add with 12 typed into
--     "Reps min" and "Reps max" left blank.
--
--     One row qualifies as of 2026-08-03. No unanimity guard is needed here:
--     the surviving number is the operator's own value, not a guess.
update planned_exercise_sets
   set target_reps_exact = coalesce(target_reps_min, target_reps_max),
       target_reps_min   = null,
       target_reps_max   = null
 where target_reps_exact is null
   and (target_reps_min is null) <> (target_reps_max is null);


-- ===========================================================================
-- PART 2 — DROPPED, no longer applicable
-- ===========================================================================
--
-- This used to renumber the "Push - Heavy" sections off the 0 slot that a title
-- edit had introduced (main_exercises 0, treadmill_walk 1, core_finisher 2).
--
-- Re-checked 2026-08-03: that day now reads main_exercises 1, core_finisher 2,
-- treadmill_walk 3 — the 0 is gone and the order matches what
-- addDefaultSections seeds, so the swap noted in the original draft is gone
-- too. Nothing left to repair, and running the renumber would be a no-op.
--
-- The bug that caused it (updateDaySection writing sort_order with a fallback
-- of 0 from a dialog that never rendered the field) is fixed in
-- web/lib/admin/actions.ts via the patch helpers.


-- ===========================================================================
-- VERIFY before committing
-- ===========================================================================

-- V1: expect 0 rows.
with sib as (
  select pes.*,
         max(rest_seconds)    over w as rest_hi,
         max(target_reps_min) over w as min_hi,
         max(target_reps_max) over w as max_hi
  from planned_exercise_sets pes
  window w as (partition by program_day_exercise_id)
)
select count(*) as still_wiped
from sib
where (rest_seconds is null and rest_hi is not null)
   or (target_reps_exact is null and target_reps_min is null and min_hi is not null)
   or (target_reps_exact is null and target_reps_max is null and max_hi is not null);

-- V2: expect 0 rows — no multi-section day parked at 0.
select count(*) as days_with_a_zero_section
from (
  select program_day_id
  from program_day_sections
  group by 1
  having count(*) > 1 and count(*) filter (where sort_order = 0) > 0
) x;

-- V3: expect every exercise contiguous from set 1 — 0 rows.
select count(*) as noncontiguous_exercises
from (
  select program_day_exercise_id
  from planned_exercise_sets
  group by 1
  having min(set_number) <> 1 or count(*) <> max(set_number)
) x;

commit;
-- rollback;  -- use this instead if the verify counts aren't all 0
