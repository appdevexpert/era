-- 2026-07-06 — Make Sunday a trainable workout day (not a rest day)
--
-- Why:
--   Sunday (weekday = 7) was flagged is_rest_day = true across all programs even
--   though every Sunday row carries real exercises (e.g. "Rest + Outdoor Walk"
--   with Outdoor Walk + Incline Walk). The Workout Plan mapper marks a day
--   "missed" only when `isPast && !day.is_rest_day` (workoutMappers.ts:653), so a
--   past, un-completed Sunday fell through to "future" and rendered grey instead
--   of red/skipped. Product decision (2026-07-06): Sunday should behave like any
--   other workout day and be marked skipped when not completed.
--
-- Scope / safety:
--   Only flips Sundays that actually contain at least one exercise, so a genuinely
--   empty rest day (should one exist) is never turned into an empty "skipped"
--   workout. Idempotent — re-running is a no-op once flipped.
--
-- Client impact:
--   Pure data change, no app code change required. `updated_at` is bumped so
--   get_program_version() (MAX(updated_at) across the plan tables) moves and every
--   client's checkAndRefreshIfStale() silently refetches the bootstrap on next
--   foreground, picking up the new flag.
--
--   NOT changed here (left for a separate product decision):
--     - day title_translations still read "Rest + Outdoor Walk" / "Active Rest" / "Rest"
--     - workout_kind is still 'rest', so completing Sunday awards no +150 cardio bonus
--
-- Rollback:
--   update public.program_days set is_rest_day = true, updated_at = now()
--    where weekday = 7 and workout_kind = 'rest';

update public.program_days d
   set is_rest_day = false,
       updated_at  = now()
 where d.weekday = 7
   and d.is_rest_day = true
   and exists (
     select 1
       from public.program_day_sections s
       join public.program_day_exercises e on e.section_id = s.id
      where s.program_day_id = d.id
   );
