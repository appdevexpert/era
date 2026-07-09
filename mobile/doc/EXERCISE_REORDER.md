# EXERCISE_REORDER.md

Drag-and-drop reordering of exercises inside a day, on the Exercise List screen.
Read this before touching the reorder handle, the order overlay in the mappers,
or the `user_program_day_exercise_order` table.

Locked with Tejasvi 2026-07-09.

---

## 1. What the feature does

On the Exercise List screen (`app/screen/home/ExerciseListScreen.tsx`), the user
can long-press the ≡ handle on an exercise row and drag it to a new position
**within its own section** (Exercises / Finisher / Treadmill). The chosen order:

- shows on the list immediately (optimistic),
- is used by the **actual workout** — Start Workout, Resume Workout, and Start
  Again all run the exercises in the user's saved order,
- is saved per-user, per-day and survives app kills / reinstalls / other devices.

It is a **view-time overlay**: the shared `program_day_exercises` template rows are
never mutated. The order is stored separately and applied on read by the mappers.

---

## 2. UX rules (LOCKED — do not change without asking)

### When the drag handle shows

The handle appears **only** when **all** of these are true:

1. `dayStatus === "active"` (today's current day),
2. the workout has **not started yet** (`buttonMode === "start"` — the button
   still says "Start Now", no session exists),
3. the section has **2+ exercises** (nothing to reorder with a single exercise),
4. `summaryLoaded === true` (so the handle doesn't flash in and then disappear
   once we learn a session already exists).

In every other state the handle is hidden:

| State | Handle? | Why |
|---|---|---|
| Active, not started, 2+ exercises | **Yes** | Reorder allowed (planning) |
| Active, single-exercise section | No | Nothing to reorder |
| **Resume Workout** (started, not ended) | **No** | See section 3 |
| Completed (ended) / past completed | No | History view (logged/skipped chips), no editing |
| Missed / future day | No | Not the current editable day |
| Loading / error | No | No data yet |

### What each interaction should do

| Action | Behavior |
|---|---|
| Long-press handle | Row lifts (scale/shadow) + light haptic — "picked up" |
| Drag + release on a new spot | Drops into new slot (spring settle) + medium haptic; order saved |
| Long-press + release **without moving** | Row settles back to its original spot; **no reorder**. This is correct, expected UX. |

---

## 3. Why reorder is BLOCKED once the workout has started (the important part)

Once the user starts the workout (button becomes **"Resume Workout"**), the handle
disappears and reorder is not allowed. This is a deliberate product decision, not a
missing feature. This section explains it in plain language first (for explaining to
a manager / stakeholder), then the technical detail.

### 3.1 Plain-language reason (the short version)

**Reordering is a "planning" action — it makes sense only *before* you start the
workout. Once you've started, changing the order would only rearrange the list on
screen; it would NOT change the workout you're already doing.** So the user would
*think* they changed their workout, but the actual running workout would ignore it.
That's a misleading, broken experience — so we hide the option entirely once the
workout has started.

Analogy: it's like a restaurant order. Before the kitchen starts cooking, you can
reorder your dishes freely. Once the kitchen has started cooking (some dishes are
already out, others are on the stove), re-sorting your menu on paper doesn't change
what's already being cooked — and trying to "move" a dish that's already served
makes no sense. So we only allow re-sorting before cooking begins.

### 3.2 Technical root cause

When a workout starts, the app **creates a session and freezes the exercise order
into it.** The `session_exercises` rows are written in a fixed order, and the
running workout (WorkoutLog / RestTimer / etc.) reads from the **persisted session
state** in Redux (`sessionSlice`: `exerciseMap`, `setMap`, `completedSets`,
`completedExerciseIds`, …). It does **not** rebuild the order from the mapper on
every render. Our reorder feature only changes the *display* overlay — it has no
hook into an already-built session.

### 3.3 The concrete issues if we allowed reorder during Resume

**Issue 1 — The list and the live workout desync (the dealbreaker).**
The overlay only changes what the list screen shows. The in-progress session keeps
its own frozen order. So the list would show order A while the workout actually runs
order B. The user's drag would be **cosmetic and misleading** — it would not change
the workout they're doing. This alone makes it unacceptable to ship.

**Issue 2 — Completed / skipped exercises become meaningless to move.**
Mid-workout, some exercises are already done (logged set chips) or skipped ("Skipped"
chip). There is no sensible meaning for "drag an exercise you already finished to a
new position." It would make the progress display contradict the real session data.

**Issue 3 — The "Resume" jump lands on the wrong exercise.**
Resume automatically jumps the user to their first not-yet-done exercise
(`firstIncompleteProgramDayExerciseId`). If the order changes mid-workout, "first
incomplete" points at a different exercise, so Resume could drop the user into the
wrong place.

### 3.4 Pros and cons — if we DID allow reorder during Resume

| | Allowing reorder during Resume |
|---|---|
| **Pros** | User could re-sort the *remaining* exercises mid-workout (e.g. "do Shrugs before Face Pulls now that a machine is free"). A small flexibility win. |
| **Cons / risks** | 1) It doesn't actually work with the current architecture — it would only reorder the *list*, not the running session (Issue 1). 2) To make it truly work we must reorder the **live session** (Redux + Supabase `session_exercises`) while keeping each exercise's logged sets, completion status, PR/points attribution correctly attached — high-risk write path. 3) Must recompute the resume pointer. 4) Must decide/handle what happens to already-completed exercises. 5) More surface area for the day-mixing / session-desync class of bugs we already fought hard to fix. |
| **Effort** | Large — a separate feature, not a config change (see section 4). |
| **Value** | Low-to-medium — most users set their order once at the start; changing it mid-workout is an edge case. |

### 3.5 Decision

**We block reorder once the workout starts.** The value is low (edge case), the cost
is high (live-session rewrite + real regression risk), and the naive version is
actively misleading (Issue 1). Reorder stays a *pre-workout* planning action, which
keeps the list, the session, and the resume pointer always in agreement. If demand
for mid-workout reordering appears later, we do it properly as the feature scoped in
section 4 — never as a quick "just show the handle" flip.

---

## 4. What it would take to allow reorder during Resume (deferred)

If we ever want this, it is a **separate, larger feature** — not a config flip:

1. Only allow reordering the **pending** (not-yet-done) exercises; freeze the
   completed/skipped ones in place.
2. On drop, reorder the **live session** too — update the `session_exercises`
   ordering in Redux **and** Supabase, keeping logged sets + completion status
   attached to the right exercise.
3. Recompute the resume pointer after the reorder.

This is risky (touches live session writes, PR/points attribution, sync queue),
so it was intentionally skipped for v1. Do not attempt it as a quick tweak.

---

## 5. Architecture

### 5.1 Supabase — `user_program_day_exercise_order`

New table (in `supabase/workout_schema.sql`, applied as migration
`create_user_program_day_exercise_order`):

```sql
create table public.user_program_day_exercise_order (
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_order jsonb not null default '[]'::jsonb,   -- string[] of program_day_exercise ids
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),        -- set_updated_at() trigger
  primary key (user_id, program_day_id)
);
```

- RLS: `..._admin_all` (is_admin) + `..._own_all` (`user_id = auth.uid()`, `for all`
  → covers INSERT/UPDATE/DELETE).
- Row-level upsert keyed by `(user_id, program_day_id)` → last-write-wins via
  `updated_at`. Two-device edits just keep the newest order (order is a
  preference, not accounting data — no conflict resolution needed).
- Separate table (not a JSON column on `user_program_assignments`) so each day is
  a small independent row: no blob rewrite, clean per-day reset, safe concurrency.

### 5.2 Redux — `workoutSlice`

- State: `userExerciseOrderByDay: Record<programDayId, string[]>` (ordered
  `program_day_exercise` ids per day).
- Reducer: `setExerciseOrder({ programDayId, orderedIds })` — optimistic, fired on
  drop.
- Hydration: `loadWorkoutBootstrap` fetches all of the user's orders once
  (`fetchUserExerciseOrders`) and merges **local-first** (`{ ...server, ...local }`)
  so an in-flight reorder still in the sync queue isn't clobbered by a stale
  server view — same rule as `completedDayDurations`.
- Persisted: `userExerciseOrderByDay` is in the `store.ts` workout persist
  whitelist, so a reorder survives an app kill (needed for the resume flow and
  offline).

### 5.3 Service — `workoutService`

- `fetchUserExerciseOrders(userId)` → `Record<programDayId, string[]>` (bootstrap).
- `upsertExerciseOrder({ userId, programDayId, orderedIds })` → upsert with
  `onConflict: "user_id,program_day_id"`. Idempotent → safe for sync-queue retries.

### 5.4 Sync queue — `useSyncQueue`

- Handler `upsertExerciseOrder` added to the service map. On drop the screen calls
  `syncWrite("upsertExerciseOrder", params, () => upsertExerciseOrder(params))`:
  Redux updates instantly, Supabase upsert runs in the background, failures retry
  via the existing queue. This is the standard local-first write pattern.

### 5.5 Mappers — the order overlay (`workoutMappers`)

`applyExerciseOrder(exercises, orderOverride)` sorts a section's exercises:

- No / empty override → plain `sort_order` (identical to the plan's default; the
  fetch already returns rows in `sort_order`, so this is a no-op for users who
  never reorder).
- Override present → ids in the saved order first, in that order; any exercise the
  override doesn't mention (e.g. an admin added a new one after the user last
  reordered) keeps its `sort_order` and lands after the known ones. **Drift-safe:
  never hides, drops, or duplicates an exercise.**

Applied in **both**:

- `mapExerciseList` (list screen), and
- `mapSessionWorkout` (the actual workout) — so the reorder carries into the
  session. `orderOverride` is passed via the options object.

Callers thread the override:

- `buildSessionWorkout` (selector) — reads
  `state.workout.userExerciseOrderByDay[detail.day.id]`.
- `useWorkoutSession` — reads it keyed by the **resolved** `targetDayId`
  (programDayId arg → session.programDayId), never `currentDayDetail`. This
  respects the locked "Session day resolution" rule.
- `ExerciseListScreen` — reads it for the resolved `activeDayDetail.day.id`.

### 5.6 Screen — `ExerciseListScreen`

- Uses `react-native-reorderable-list` (pure-JS, Reanimated/gesture-handler based;
  no native rebuild).
- **One `NestedReorderableList` per section** inside a `ScrollViewContainer` →
  cross-section drag is structurally impossible (the whole reason each section is
  its own list).
- The active + not-started render is a dedicated branch using
  `ScrollViewContainer` + `ReorderableExerciseSection`. Every other state
  (resume, completed, missed, future, loading, error) falls through to the
  original `ScrollView` render, unchanged.
- The nested list uses `scrollEnabled={false}` — the outer `ScrollViewContainer`
  owns scrolling (and drag auto-scroll targets the container). This is also why
  RN's "VirtualizedList nested in ScrollView" console error does **not** fire:
  that guard only triggers when the inner list's `scrollEnabled !== false`. It is
  a correct config, not a suppressed warning.

---

## 6. Data flow (local-first)

```
user drags an exercise and drops
  -> 1. Redux updates instantly (setExerciseOrder) — list already settled
  -> 2. background upsert to Supabase (syncWrite -> upsertExerciseOrder)
  -> 3. on failure -> syncQueue retries (idempotent upsert)
  -> next app open / bootstrap -> fetchUserExerciseOrders hydrates Redux
                                  (local-first merge protects in-flight writes)
render:
  Redux override -> applyExerciseOrder in mapExerciseList / mapSessionWorkout
  -> both the list and the workout show the user's order
```

---

## 7. Edge cases handled

| Case | Handling |
|---|---|
| Schema drift (exercise added/removed after save) | `applyExerciseOrder` reconciles on every render: known ids in order, new ones appended, missing ones dropped |
| Cross-section drag | Impossible — one list per section |
| Mid-session reorder | Blocked — handle hidden once started (section 3) |
| Two-device race | Last-write-wins via `updated_at` |
| Cold-start hydration race | DB seeds Redux; local values win on conflict (in-flight write protected) |
| Write ultimately fails | Keep Redux state, don't roll back (order isn't critical) |
| Program restart (Week 12 → 1) | Old rows orphaned (private, unread, trivial); optional cleanup later |
| Single-exercise section | No handle |
| Language | No impact — stores ids only |

---

## 8. Files

- `supabase/workout_schema.sql` — table + RLS + trigger
- `app/services/workoutService.ts` — `fetchUserExerciseOrders`, `upsertExerciseOrder`
- `app/stores/slice/workoutSlice.ts` — `userExerciseOrderByDay`, `setExerciseOrder`, bootstrap fetch + merge
- `app/stores/store.ts` — persist whitelist entry
- `app/hooks/useSyncQueue.ts` — `upsertExerciseOrder` retry handler
- `app/utils/workoutMappers.ts` — `applyExerciseOrder` + overlay in both mappers
- `app/stores/selectors/workoutSelectors.ts`, `app/hooks/useWorkoutSession.ts` — override threaded to `mapSessionWorkout`
- `app/screen/home/ExerciseListScreen.tsx` — reorderable sections, handle gating, haptics
- `app/types/workout.ts` — (removed the now-unused `showHandle` view-model field)
- `package.json` — `react-native-reorderable-list`

---

## 9. If you need to change this later

- **Want the handle in a new state?** Change the `reorderEnabled` gate in
  `ExerciseListScreen`. Re-read section 3 first — showing it during Resume needs
  the deferred feature in section 4, not just a gate change.
- **Change the lift animation?** The dragged row style is `exerciseRowActive`;
  the library's default cell fade can be overridden via the `cellAnimations` prop
  on `NestedReorderableList`.
- **Change section isolation?** It's enforced structurally (one list per section).
  Don't move to a single flat list unless you re-add runtime cross-section guards.
- **After any schema change**, regenerate `supabase/workout_schema.sql` to keep it
  mirrored with the live DB.


Icon yahan kyun hide kiya — asli reason
Jab workout start hota hai, tab ek session ban jaata hai jisme exercises ka order fix ho jaata hai (session_exercises rows us order mein save ho jaate hain). Ab agar resume state mein reorder allow karein, to 3 problem aayengi:

1. List aur actual workout ka order alag ho jaayega (desync)

Reorder sirf list screen ka order badlega.
Lekin jo session already chal raha hai, wo apne purane order se hi chalega (kyunki session Redux/DB mein already bana hua hai — WorkoutLog usi se padhता hai, dobara build nahi karta).
Result: list pe ek order dikhega, workout mein doosra chalega. Confusing + pointless.
2. Complete/skip ho chuke exercises ka kya?

Kuch exercises done/skipped ho chuke hote hain. Unhe reorder karna weird hai — done exercise ko beech mein drag karoge to progress/chips mismatch ho jaayenge.
3. Resume pointer toot jaayega

Resume "pehle incomplete exercise" pe jump karta hai (firstIncompleteProgramDayExerciseId). Order badla to "pehla incomplete" ka matlab hi badal jaayega — resume galat exercise pe le jaa sakta hai.
Isi liye rule bana tha: reorder = planning activity, workout shuru hone se pehle. Ek baar shuru → order lock. (Ye aapne khud pichli baar "Resume Workout" screenshot dikha ke confirm bhi kiya tha — "we don't have to show that icon.")

Agar phir bhi resume mein reorder chahiye?
Uske liye proper tarika ye hoga: sirf pending (baaki bache) exercises ko reorder karna, aur us naye order ko live session mein bhi sync karna (session_exercises update). Ye ek bada, alag feature hai — maine pehle isse "v1 ke liye skip" kar diya tha kyunki ye risky hai (logged sets, completion status sab handle karna padega).

Meri salah
Resume state mein icon hide hi rakho (abhi jaisa hai) — clean aur bug-free.
Reorder tabhi jab workout shuru na hua ho (Start Now state) — jaha wo poori tarah kaam karta hai.
Agar aap fir bhi resume mein reorder-pending feature chahte ho, to bata do — main uska alag plan bana ke risks samjha dunga. Par mera strong recommendation: abhi ke liye Start Now tak hi rakho.

Aap kya chahte ho — waise hi rakhein, ya resume-pending reorder ka bada feature explore karein?