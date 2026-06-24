# Mid-Program Switch — Decision Pending

> **Status:** PENDING product owner (Rami) confirmation.
> **Date raised:** 2026-06-21 (Tejasvi to discuss with manager + Rami next office day)
> **Related:** Rami's feedback point #6 (advanced shows "Nybegynner - Menn"), `feedback_6_program_design_locked` memory, 12-week completion flow.

---

## The Question

What should happen when a user changes their `goals.level` (Beginner / Intermediate / Advanced) **mid-cycle** — i.e. before their current 12-week program is complete?

Concrete example:
1. New user signs up on Phone 1, selects **Beginner**, does 4 weeks (24 sessions, 8 PRs, 1200 points, 28-day streak).
2. Gets a new phone. Logs in on Phone 2 (same Supabase account).
3. Onboarding screen appears again. User selects **Advanced**.
4. **What now?**

The locked spec (`feedback_6_program_design_locked`) only covers the *4-program design* (Male/Female × Beginner/Advanced) and the Intermediate→Beginner RPC mapping. **Mid-program switching is not specified.**

---

## What Is Saved Where (Background)

Everything below is on Supabase, tied to `user_id` — surviving phone changes, app uninstalls, and re-onboarding:

| Data | Table | Survives switch? |
|---|---|---|
| Onboarding answers (level, gender, weight) | `goals` | Yes |
| Active program assignment | `user_program_assignments` | Yes |
| Sessions logged | `workout_sessions`, `session_sets` | Yes |
| PRs | `personal_records` | Yes |
| Points + streak | `user_reward_state`, `user_streak_days` | Yes |
| Weight log, photos | `body_weight_log`, `session_media` | Yes |

So **history is never lost**. The only question is what happens to the *active program*.

---

## Current (Buggy) Behavior

The `ensure_my_program_assignment()` RPC short-circuits as soon as any active assignment exists:

```sql
SELECT program_id INTO v_existing_id
FROM user_program_assignments
WHERE user_id = v_user_id AND status = 'active'
ORDER BY assigned_at DESC LIMIT 1;

IF v_existing_id IS NOT NULL THEN
  RETURN v_existing_id;   -- ← returns OLD program without checking if level changed
END IF;
```

So when the Beginner-then-Advanced user opens the app, the RPC silently returns their old Beginner assignment. The UI shows "Nybegynner - Menn" even though they selected Advanced.

This is exactly Rami's bug report **#6** and what user `c4434a72-0424-450d-91ab-ad4153aa4354` is experiencing in production today.

---

## Three Options (Pick One)

### Option A — Reset Cycle on Switch (recommended)

User confirms via modal, then:

- Old assignment → `status = 'switched'`
- New assignment → `cycle_number = 1`, `current_week = 1`, fresh start
- All achievements (PRs, points, streak, history) preserved at the account level
- New program's `completed_day_ids` starts empty

**Pros:** Clean break. Smart Weight Engine starts from safe Advanced baseline (no carry-over from Beginner). Aligns with how cycle transitions already work after Week 12.
**Cons:** User loses their "Week 5 in Beginner" position. (But it's preserved as history.)

### Option B — Continue Position

Switch program, but keep the user at the same week number (Beginner W5 → Advanced W5).

**Pros:** Continuity feels less punishing.
**Cons:** Advanced W5 weights are far heavier than what a Beginner user can lift. Smart Weight Engine has no Advanced data yet. **Injury risk.** Streak/points unaffected either way.

### Option C — Block Mid-Cycle Switch

UI prevents switching until Week 12 is complete (matches the locked 12-week completion flow exactly).

**Pros:** No ambiguity. Forces engagement with the chosen program.
**Cons:** User-hostile. Someone who legitimately picked the wrong tier (e.g. accidentally Beginner) is stuck for 12 weeks. May need a separate "support email to switch" escape valve.

---

## Recommendation

**Option A with a confirmation modal:**

```
You're currently in Male Beginner — Week 5.

Switching to Advanced will start a fresh program from Week 1.
Your PRs, points, and streak will be preserved.

[Cancel]   [Switch to Advanced]
```

This is consistent with how the 12-week completion flow already works (old assignment marked done, new one started at W1). It just generalises that mechanism to handle mid-cycle switches too.

---

## Implementation Sketch (If Option A Approved)

### 1. RPC change — replace stale assignment automatically

Modify `ensure_my_program_assignment()` so that, if the existing active assignment doesn't match `(current goals.gender, intermediate→beginner mapped level, kind='standard')`:
1. Mark the old assignment `status = 'switched'`, set `ended_at = now()`.
2. Insert a fresh assignment at `cycle_number = 1, current_week = 1, current_day = 1`.
3. Return the new assignment's `program_id`.

If it *does* match, keep current behaviour (return existing — fast path, no change for existing users).

### 2. Client change — confirmation modal

When the onboarding "level" step submit detects that the user already has an active assignment with a different level, show the modal **before** calling the RPC. Only call the RPC after explicit user confirmation.

### 3. Data fix — affected users today

Two existing users have mismatched assignments (verified via Supabase MCP, 2026-06-21):

- `c4434a72-0424-450d-91ab-ad4153aa4354` — chose Advanced, assigned to Beginner. Should be on Male Advanced.
- `66a032a0-f25f-4a75-bf64-2f081b799b25` — chose Intermediate, assigned to Advanced. Should be on Male Beginner (per Intermediate→Beginner spec).

Both need a one-time `UPDATE` to set the correct `program_id` on their active assignment. Run this *after* the RPC fix is in place, otherwise the next app open could revert them.

---

## Open Questions for Rami

1. **Approve Option A?** Or prefer B / C?
2. **Streak behaviour on switch** — keep counter as-is (treating it as an account-level streak), or reset on program switch?
3. **Is there a daily / hourly limit on switches?** (E.g. should we prevent a user toggling Advanced ↔ Beginner repeatedly?)
4. **Should the modal mention the locked 12-week completion flow as an alternative?** (i.e. soft-nudge the user to finish the current cycle first.)

---

## TL;DR

- Bug **#6** is caused by an RPC that returns stale assignments after `goals.level` changes.
- Fix needs a *product decision* on what "switch mid-cycle" should mean.
- Recommendation: **Option A** (reset cycle, preserve achievements).
- Two production users (`c4434a72…`, `66a032a0…`) are stuck in wrong programs today and need a data fix as part of the rollout.
