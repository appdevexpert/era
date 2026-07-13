# PAUSE_WORKOUT.md

Pause / Resume / End workout flow. Locked with the client 2026-07-11. Read this
before touching the active-session leave flow, the session timer, or the
Resume/Start-Again logic.

## Goal

Give the user a real **Pause** that saves the session completely and resumes
**exactly where they left off**, distinct from **End** (finish now). Example:
10 exercises, user does 5, pauses during a rest, closes the app, reopens →
sees Resume → lands back on the exact next set.

## Locked decisions

1. **Resume = exact set.** Resume lands on the **first unlogged set of the first
   incomplete exercise**, directly on that set's logging screen (leftover rest is
   skipped — after a pause the countdown is meaningless).
2. **Pause vs End.**
   - **Pause Workout** → session saved & resumable → next time shows **"Resume Workout"**.
   - **End Workout** → session finished, remaining marked **skipped** → next time shows **"Start Again"** (NOT Resume).
3. **Skip is a real status**, written to the DB (`session_exercises.status='skipped'`,
   `session_sets.status='skipped'`). Optimistic / local-first: flips instantly in
   Redux, DB write happens in the background via the sync queue (no loading wait).
4. **Paused day = "In Progress"** (NOT complete; only End completes a day).
   UI = **Option A** (minimal): day stays `active`, the Resume button + a small
   "In progress" label are the signal. No new `DayStatus` value.
5. **One pause concept** — "Pause Workout" (whole session), available on every
   active-workout screen. No separate rest-countdown pause.
6. **Leave bottom sheet = 2 buttons**: **Pause Workout** (gold) + **End Workout**
   (red). No "Keep Going" — dismissing the sheet (swipe / backdrop) = stay in workout.

## Header ⏸/▶ (in-place pause) + app-background auto-freeze — added 2026-07-12

Two more pause surfaces on top of the leave-flow above:

- **Header ⏸/▶ button** (WorkoutLogHeader, always visible in the nav row): an
  *in-place* freeze/resume of the session clock — the user stays on the screen
  (a break), the **Complete Set bar dims and is disabled** (no logging), and the
  timer freezes. Tap ▶ to resume. Reuses `pauseSessionTimer` / `startSessionTimer`.
- **App-background auto-freeze (Option 1):** `useAutoPauseOnBackground` (called
  once inside `useWorkoutSession`, which only the active-workout screens use)
  freezes the clock whenever the app goes to **background** (not the transient
  "inactive"). So time while the app is closed/killed/switched-away is never
  counted. On return the session stays **paused** — the user taps ▶ to resume.
  This unifies manual pause, app-switch, and full kill → all freeze → tap ▶.

Note: the header ⏸ (freeze in place) is distinct from the bottom-sheet **Pause
Workout** (freeze **and leave** to the day). Both use the same underlying freeze.

## Kill-safe session timer (heartbeat + cold-start freeze) — 2026-07-12

**Root cause fixed:** `useSessionTimer` is wall-clock (`accumulatedSeconds +
(now − sessionStartedAt)`), and `sessionStartedAt` is persisted. After a hard
kill + cold start the stale `sessionStartedAt` made the timer count all the time
the app was closed. (The rest timer never had this — `useWallClockCountdown`
keeps `endsAt` in an in-memory ref, so a kill just discards it. Leave the rest
timer as-is; it's correct.)

The auto-freeze on "background" only fires on a clean background event, so it
missed iOS app-switcher swipes / abrupt kills. The reliable fix, both in the
timer layer:
1. **Heartbeat** — `useSessionTimer` folds the live segment into the persisted
   `accumulatedSeconds` every ~10s (`bankElapsed`), reusing the existing 1s
   tick (no new interval). So the saved total is always current to ~10s.
2. **Cold-start freeze** — `PersistGate onBeforeLift` dispatches
   `freezeSessionOnColdStart` once on launch: if a running session was
   rehydrated (`sessionStartedAt` set), it nulls the stale start so the timer
   shows the saved total (≈ close time), not the dead gap. Resume then restarts
   the clock and keeps `accumulatedSeconds`.

Net: close the app any way (background, app-switcher, hard kill) → reopen →
timer sits at ~where you left off (worst case ≤10s lost), never the closed time.
Compatible with the "duration accumulates across End→Resume→End" rule.

**Points / PR:** awarded **once per exercise, on its first real completion**.
A skipped exercise completed later (Resume or Start Again) earns points/PR (first
time). Re-editing an already-completed exercise earns nothing (no double-count).

## States & transitions

```
Not started ──Start──▶ IN PROGRESS (timer running)
                          │
   back / edge-swipe ─────┤──▶ Sheet: [Pause Workout] [End Workout]   (dismiss = stay)
                          │
        ┌── Pause ────────┘                     └──── End ────┐
        ▼                                                      ▼
   PAUSED                                               COMPLETED
   • timer FROZEN (elapsed banked into                 • remaining pending → skipped (bg sync)
     accumulatedSeconds, clock stops)                  • day = "Complete"
   • exercises stay "pending"                          • next time → "Start Again" (editable)
   • navigate away, day = "In Progress"                       │
   • next time → "Resume Workout"                             ▼
        │                                              Start Again (edit mode)
        └─ Resume ─▶ exact set's logging screen        • skip→complete updates status + logs
           (timer = accumulated + new sitting)         • points/PR only on first completion
```

**Resumability rule:** any session with a **pending** exercise (not completed,
not skipped) is resumable — whether the user tapped Pause *or* just killed the
app. Pause additionally **freezes the timer** and marks the day **In Progress**.

## Data model

**Redux `sessionSlice`** (persisted → survives app kill):
- add `isPaused: boolean`.
- `pauseSession` reducer: bank `accumulatedSeconds += now - sessionStartedAt`,
  set `sessionStartedAt = null`, `isPaused = true`.
- `resumeSession` reducer: `sessionStartedAt = now`, `isPaused = false`.
- No new set-level pointer needed — the exact set is **derived** from set statuses
  (first `session_sets` row not `completed`/`skipped` within the first incomplete
  exercise).

**`useSessionTimer`** → display **total** = `accumulatedSeconds + (isPaused ? 0 :
now - sessionStartedAt)`; stops ticking while `isPaused`.

**DB (existing, no migration):** `session_exercises.status` and
`session_sets.status` already include `'skipped'` (see `workout_schema.sql`).
Duration is finalized on `completeSession` as today (`accumulatedSeconds + segment`).

## Screen / component changes

- **`sessionSlice.ts`** — `isPaused`, `pauseSession`, `resumeSession`.
- **`useSessionTimer.ts`** — total + freeze.
- **`sessionService.ts`** — real `skipExercise` / `skipSet` writes (batch mark
  remaining on End); wire the currently-dead `skipExercise`.
- **`useWorkoutSession.ts`**
  - `pauseSession()` — bank timer, keep pending, navigate out.
  - `finishSession()` (End) — mark remaining pending exercises + sets `skipped`
    (optimistic + bg) before completing.
  - Edit mode — allow `skipped → completed`; award points/PR only if that exercise
    hadn't already been awarded.
- **`EndWorkoutBottomSheet.tsx`** — 2 buttons (Pause gold / End red), remove Keep
  Going, add `onPause`. Dismiss = stay.
- **`WorkoutLogScreen` / `RestTimerScreen` / `TimerLogScreen` / `CardioTimerScreen`**
  — sheet shows both actions; Pause banks timer + navigates to the day.
- **`ExerciseListScreen.tsx`** — `buttonMode`: pending → **Resume** (compute exact
  set); all completed-or-skipped → **Start Again**; none → **Start**. Add the small
  "In progress" label when a pending session exists for today.
- **`WorkoutCountdownScreen` / resume nav** — carry `startExerciseIndex` +
  `startSetIndex` for exact-set resume.
- **Locales** — `pauseWorkout` + subtext, updated leave-sheet copy, "In progress"
  label, in `en.ts` and `nb.ts`.

## Edge cases

- Pause during a rest → resume skips the leftover rest, lands on the next set.
- Kill app without pausing → still resumable (pending exercises remain); the timer
  just wasn't frozen (existing behavior via `accumulatedSeconds`).
- End with everything already logged → normal completion (no "skipped").
- Start Again on a past day stays locked to today only (existing rule).
