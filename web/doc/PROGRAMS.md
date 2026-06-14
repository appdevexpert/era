# Programs — Admin Reference

How the four launch programs work in the admin panel and mobile app, why Intermediate doesn't have its own program row today, and the playbook for diverging Intermediate when the time comes.

---

## 1. The four launch programs

Hardcoded UUIDs in `web/lib/admin/constants.ts → MAIN_PROGRAM_IDS`:

| UUID | Program | gender | level |
| --- | --- | --- | --- |
| `11111111-1111-1111-1111-111111111111` | Male Beginner | `male` | `beginner` |
| `33333333-3333-3333-3333-333333333333` | Male Advanced | `male` | `advanced` |
| `44444444-4444-4444-4444-444444444444` | Female Beginner | `female` | `beginner` |
| `66666666-6666-6666-6666-666666666666` | Female Golden Era | `female` | `advanced` |

There are intentionally **no Intermediate rows**. Intermediate users are routed to the Beginner program of their gender by `ensure_my_program_assignment`.

---

## 2. Mobile assignment flow

`app/services/workoutService.ts` calls `ensure_my_program_assignment()` RPC. The RPC:

1. Reuses the user's existing active assignment if one exists.
2. Otherwise reads the user's most recent `goals.gender` + `goals.level`.
3. Maps the level: `intermediate → beginner` (all other levels pass through unchanged).
4. Finds the `workout_programs` row matching `(gender, target_level)`.
5. Inserts a `user_program_assignments` row, returns the program_id.

Onboarding still records `goals.level = 'intermediate'` — UX is unchanged. The mapping is purely a backend concern.

---

## 3. Admin UI

Two-step navigation:

```
/programs                  → 2 gender entry cards (Male / Female)
/programs?gender=male      → 2 program cards (Male Beginner, Male Advanced)
/programs?gender=female    → 2 program cards (Female Beginner, Female Advanced)
/programs/<programId>      → builder (full edit, no special read-only mode)
```

The Beginner cards show a small subtitle "Used by Beginner & Intermediate users" so the admin understands the mapping. The Advanced cards do not.

Every program is fully editable — no banner, no sync button, no read-only state. Each program has independent rows for weeks / days / sections / exercises / sets; editing one program never touches another.

---

## 4. Server-side guards (still in place)

`web/lib/admin/actions.ts` still enforces two rules on the four main programs:

- **`deleteProgram`** throws if the program ID is one of the four launch UUIDs. Rami can't accidentally delete Male Beginner.
- **`saveProgram`** throws if a save attempt would change the `gender` or `level` on one of the four launch programs. This prevents silently re-cohorting users.

`isMainProgramId(id)` is the helper that backs both checks.

---

## 5. Mobile cache invalidation

Mobile caches the workout bootstrap (`workoutSlice`) and only refetches when the server's change signature moves. The signature is provided by the `get_program_version()` RPC, which hashes `MAX(updated_at)` + row count across the 8 workout tables.

Any admin edit bumps `updated_at` on the affected row → signature changes → on next foreground, `checkAndRefreshIfStale` notices the diff and refetches. The user sees the new weights / exercises automatically, no app restart needed.

---

## 6. Future divergence — when Rami wants Intermediate to differ

Suppose Rami later decides that Intermediate users need heavier starting weights, an extra accessory, or a different rep scheme. The path is:

### Step 1 — Create the Intermediate program row

```sql
INSERT INTO public.workout_programs
  (id, title, title_translations, gender, level, duration_weeks, days_per_week)
VALUES
  ('22222222-2222-2222-2222-222222222222',
   'Male Intermediate',
   '{"en":"Male Intermediate","nb":"Mannlig mellom"}'::jsonb,
   'male', 'intermediate', 12, 6);
-- Or, for female:
-- ('55555555-5555-5555-5555-555555555555', 'Female Intermediate', ..., 'female', 'intermediate', ...)
```

### Step 2 — Seed the tree from the Beginner program

A one-time deep copy. Roughly 50 lines of SQL across five tables (weeks → days → sections → exercises → planned sets). Use temp tables to map old IDs to new IDs, then insert children referencing the new parents. This is exactly what the old `sync_program_from_source` RPC did before we removed it — if you need a reference, check git history for that function definition.

### Step 3 — Update `ensure_my_program_assignment`

Remove the `intermediate → beginner` mapping. Once the Intermediate row exists with `(gender, level) = (..., 'intermediate')`, the RPC's natural lookup will find it on its own.

```sql
-- Inside ensure_my_program_assignment, change:
v_target_level := case v_level when 'intermediate' then 'beginner' else v_level end;
-- to:
v_target_level := v_level;
```

### Step 4 — Add the Intermediate UUID to `MAIN_PROGRAM_IDS`

`web/lib/admin/constants.ts`:

```ts
export const MAIN_PROGRAM_IDS = [
  "11111111-1111-1111-1111-111111111111", // Male Beginner
  "22222222-2222-2222-2222-222222222222", // Male Intermediate  ← new
  "33333333-3333-3333-3333-333333333333", // Male Advanced
  // ...
] as const;
```

### Step 5 — Surface it in the admin grid

`web/components/programs/program-grid.tsx`:

```ts
const VISIBLE_LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
```

Drop the "Used by Beginner & Intermediate users" subtitle on the Beginner card since it's no longer accurate.

### What happens to existing users on the Beginner program

They keep their assignment. Their workout sessions, PRs, points, and streaks all stay intact (referenced by user_id, not by program). Only **newly-onboarding intermediate users** route to the new Intermediate program from that point on.

If Rami later wants to migrate existing Intermediate-level users from the Beginner program to the new Intermediate program, that's a separate (and dangerous) migration — touches FKs in `workout_sessions`, `personal_records`, `user_program_assignments`. Worth a dedicated migration with a backup.

**Total effort for steps 1–5: about an hour.**

---

## 7. What was removed (history note)

Earlier we had six program rows with a mirror system: `workout_programs.source_program_id`, `workout_programs.last_synced_at`, `sync_program_from_source(uuid)` RPC, `ProgramSourceBanner` component, `assertProgramEditable` guard, and a read-only mode in the builder. All of that was removed on 2026-06-14.

Reason: storing identical content in two program rows created a cascade of secondary problems (FK SET NULL on sync, broken completion checkmarks, auto-sync proposals piling on more complexity). The simpler design — one Beginner row, mobile mapping handles Intermediate users — eliminates the whole mirror category of bugs.

See memory `feedback-6-program-design-locked` for the decision context.

---

## 8. SQL cheatsheet

### Check current program rows

```sql
SELECT id, title, gender, level, duration_weeks, days_per_week
FROM   public.workout_programs
ORDER  BY gender, level;
```

### Check current assignment for a user

```sql
SELECT upa.program_id, p.title, upa.status, upa.assigned_at,
       upa.current_week_number, upa.current_day_number
FROM   public.user_program_assignments upa
JOIN   public.workout_programs p ON p.id = upa.program_id
WHERE  upa.user_id = '<USER_UUID>'
ORDER  BY upa.assigned_at DESC;
```

### Count rows in a program's tree (sanity)

```sql
WITH p AS (SELECT '11111111-1111-1111-1111-111111111111'::uuid AS pid)
SELECT
  (SELECT count(*) FROM program_weeks WHERE program_id = p.pid)                                                                        AS weeks,
  (SELECT count(*) FROM program_days  WHERE program_id = p.pid)                                                                        AS days,
  (SELECT count(*) FROM program_day_sections s JOIN program_days d ON d.id = s.program_day_id WHERE d.program_id = p.pid)              AS sections,
  (SELECT count(*) FROM program_day_exercises e JOIN program_days d ON d.id = e.program_day_id WHERE d.program_id = p.pid)             AS exercises,
  (SELECT count(*) FROM planned_exercise_sets ps
     JOIN program_day_exercises e ON e.id = ps.program_day_exercise_id
     JOIN program_days          d ON d.id = e.program_day_id
   WHERE d.program_id = p.pid)                                                                                                         AS planned_sets
FROM p;
```

### Force every mobile client to refetch (rare)

Bump `updated_at` on any one row in the workout tree — `get_program_version` will return a new signature.

```sql
UPDATE public.workout_programs
   SET updated_at = now()
 WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## 9. Files involved

Admin web:

- `web/lib/admin/constants.ts` — `MAIN_PROGRAM_IDS`, `isMainProgramId`
- `web/lib/admin/actions.ts` — `saveProgram`/`deleteProgram` guards, tree-mutation actions
- `web/lib/admin/data.ts` — `getProgramDetail`, `getPrograms`
- `web/lib/admin/types.ts` — `ProgramRow`, `ProgramDetail`
- `web/app/programs/page.tsx` — 2-step nav header
- `web/app/programs/[programId]/page.tsx` — builder host
- `web/components/programs/program-grid.tsx` — gender + program cards
- `web/components/programs/program-builder.tsx` — week / day / section / exercise / set editor

Mobile:

- `app/services/workoutService.ts:26` — calls `ensure_my_program_assignment`
- `app/stores/slice/workoutSlice.ts` — bootstrap + `checkAndRefreshIfStale`

Supabase RPCs:

- `public.ensure_my_program_assignment()` — gender × level → program_id (with intermediate → beginner mapping)
- `public.get_program_version()` — cache-invalidation signature
