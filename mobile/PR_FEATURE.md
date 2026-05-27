# PR (Personal Record) Feature — Change Log

Date locked: 2026-05-26

This doc covers every change made when wiring the PR feature end-to-end on the Progress screen. Read this before touching PR logic.

---

## 1. The Rule (Locked Spec)

A PR is detected on **ONE metric only**:

- ✅ `max_weight` — heaviest weight ever lifted on a given exercise

**Explicitly removed:**
- ❌ `max_reps` — more reps at any weight
- ❌ `estimated_one_rep_max` — Epley formula (weight × (1 + reps/30))

### What counts as a PR

| Scenario | PR? | Points |
|---|---|---|
| 145kg × 4 (prev best 140kg × 4) | ✅ Yes | +100 |
| 140kg × 5 (prev best 140kg × 4) | ❌ No | 0 |
| 140kg × 4 (same as previous) | ❌ No | 0 |
| First time doing an exercise | ✅ Yes | +100 |
| Bodyweight / 0 weight | ❌ No | 0 |
| Cardio / duration-only | ❌ No | 0 |

### Why this rule

- Simple, clean: "weight on the bar is the only PR that matters"
- Old 3-metric system inflated points (one set could break 3 PRs = +300)
- Cleaner UI — no duplicate cards for same exercise
- Matches lifter mental model (Strong / Hevy etc. all weight-first)

---

## 2. Database

### Tables (unchanged — already existed)

`personal_records`
- `user_id, exercise_id, session_id, session_exercise_id, session_set_id`
- `metric` (pr_metric enum — kept all values, only `max_weight` is written/read now)
- `value_numeric, value_unit, weight_value, weight_unit, reps, duration_seconds`
- `previous_value_numeric, previous_label` (for "↑ +5kg" delta display)
- `points_awarded, achieved_at, created_at`
- Index: `idx_personal_records_user_exercise (user_id, exercise_id, achieved_at desc)`

`era_point_events`
- One row per PR with `event_type = 'personal_record'`, `points = 100`

### Old data handling (Option A — Non-destructive)

Existing rows with `metric IN ('max_reps', 'estimated_one_rep_max')` are **kept in the DB** but **filtered out on every read** (`WHERE metric = 'max_weight'`).

The `pr_metric` enum is not dropped — leaves the door open for cardio duration PRs later.

---

## 3. Backend / Service Layer

**File:** `app/services/sessionService.ts`

### Write path

`checkAndCreateSetPRs(...)` — runs after every set log inside `useWorkoutSession.logSetResult`.

Before: ran 3 checks (max_weight + max_reps + e1RM). Now: 1 check (max_weight only).

```ts
const result = await checkAndCreatePR({
  ...params,
  metric: "max_weight",
  value: loggedWeight,
  unit: params.weightUnit,
  weight: loggedWeight,
  reps: loggedReps,
});
```

`checkAndCreatePR` (unchanged) does the actual:
1. Look up previous best for `(user_id, exercise_id, metric)`
2. If new value > previous → insert PR row + award +100 points via `awardPoints`
3. Returns `{ prId, previousBest }` or `null`

### Read functions (new)

| Function | Purpose | Used by |
|---|---|---|
| `listLatestPRs(userId, limit)` | Top N unique exercises, newest PR each | Progress screen carousel + PR History |
| `countPRsThisWeek(userId)` | Count PRs in trailing 7 days | "X PRs this week!" banner |
| `listExercisePRs({ userId, exerciseId })` | All PRs for ONE exercise, newest first | ExercisePrHistory screen |
| `countSessionPRs(sessionId)` | PR count for one session | SessionComplete screen (unchanged) |

All read functions filter `metric = 'max_weight'`. `listLatestPRs` joins `exercise_library` for name + category and dedupes by exercise_id in JS.

---

## 4. Redux

### New slice: `app/stores/slice/prSlice.ts`

Non-persisted (Supabase is source of truth across sessions).

```ts
state.pr = {
  latestPRs: LatestPRRow[],
  weeklyCount: number,
  status: "idle" | "loading" | "succeeded" | "failed",
  error: string | null,
}
```

Thunk: `loadPRBootstrap(userId)` — fetches `listLatestPRs(userId, 50)` + `countPRsThisWeek(userId)` in parallel.

Reset on `signOutThunk.fulfilled`.

### Selectors: `app/stores/selectors/prSelectors.ts`

- `selectLatestPRs`
- `selectWeeklyPRCount`
- `selectPRStatus`

### Store registration

`app/stores/store.ts` — added `pr: prReducer` (non-persisted).

---

## 5. UI

### Progress screen — `app/screen/home/ProgressScreen.tsx`

**Before:** Hardcoded `PR_ENTRIES` with 3 fake rows.

**Now:**
- Safety-net `useEffect` dispatches `loadPRBootstrap` when `prStatus === "idle"`
- `prEntries` derived via `useMemo` from `latestPRs.slice(0, 3).map(...)` — **only top 3 cards in carousel** (3 dots)
- Each entry: localized exercise name (via `getLocalizedText`) + localized category + formatted date + delta from previous best
- Banner: `progress.prsBanner` with real `weeklyCount` — hidden when count is 0
- "View All" action: shown only when there are PRs
- Empty state: "No PRs yet — Lift heavier than last time..." card

### PR History screen — `app/screen/home/PrHistoryScreen.tsx`

**Before:** Hardcoded `PR_ROWS`.

**Now:**
- Safety-net `useEffect` (in case user deep-links before bootstrap)
- Reads full `selectLatestPRs` (up to 50 from bootstrap)
- Maps to `ExerciseSummaryCard` rows with localized name/category + `"1 Set • {reps} Reps"` meta + delta
- Tap row → navigates to `ExercisePrHistory` with **`exerciseId`** in params (route type changed — see §6)
- Empty state when no PRs

### ExercisePrHistory screen — `app/screen/home/ExercisePrHistoryScreen.tsx`

**Before:** Hardcoded `PR_SESSIONS`.

**Now:**
- Reads `exerciseId` from route params
- Local state + `useEffect` fetches `listExercisePRs({ userId, exerciseId })` with cancellation flag
- Maps rows to `SessionHistoryCard` shape
- Date label format: `"Week N • Apr 20"` when `programStartDate` available (uses `computeCurrentPosition` from `programSchedule.ts`), else `"Apr 20"`
- Latest PR (idx 0) = gold gradient + medal badge
- Past PRs = 60% opacity
- **Loading state: skeleton** (`ExercisePrHistoryScreenSkeleton`) — NOT spinner
- Empty state card

### Skeleton — `app/components/skeleton/ExercisePrHistoryScreenSkeleton.tsx`

Built on the shared `Skeleton` primitive. Mirrors the live composition: title bar + highlight card + divider + 4 dimmed past cards. Pulses via reanimated on UI thread.

---

## 6. Navigation

**File:** `app/navigation/types.ts`

Changed:
```ts
ExercisePrHistory: WorkoutPlanParams | undefined
↓
ExercisePrHistory: ExerciseHistoryParams | undefined
```

`ExerciseHistoryParams` already had `exerciseId, title, subtitle, muscles` — reused.

`PrHistoryScreen` now passes:
```ts
navigation.navigate("ExercisePrHistory", {
  exerciseId: row.exerciseId,
  title: row.name,
  subtitle: row.category,
});
```

---

## 7. Localization

Added to **both** `app/locales/en.ts` and `app/locales/nb.ts` under `progress`:

| Key | en | nb |
|---|---|---|
| `categoryCompound` | Compound | Sammensatt |
| `categoryIsolation` | Isolation | Isolasjon |
| `categoryCore` | Core | Kjerne |
| `categoryCardio` | Cardio | Kondisjon |
| `categoryWarmup` | Warm-up | Oppvarming |
| `categoryCooldown` | Cool-down | Nedtrapping |
| `prsEmptyTitle` | No PRs yet | Ingen PR-er enda |
| `prsEmptySubtitle` | Lift heavier than last time to set your first record. | Løft tyngre enn forrige gang for å sette din første rekord. |
| `weekLabel` | Week {{week}} • {{date}} | Uke {{week}} • {{date}} |
| `prHistory.meta` | {{sets}} Set • {{reps}} Reps | {{sets}} sett • {{reps}} reps |
| `prHistory.emptyTitle` | No PRs yet | Ingen PR-er enda |
| `prHistory.emptySubtitle` | Lift heavier than last time to set your first record. | Løft tyngre enn forrige gang for å sette din første rekord. |

Exercise names come from `exercise_library.name_translations` JSONB and are localized via `getLocalizedText(translations, language, fallback)` at render time.

---

## 8. Full Flow (End-to-End)

```
1. User logs a set in WorkoutLog screen
   ↓ logSetResult(exIdx, setIdx, weight, reps, ...)
2. useWorkoutSession:
   - Insert session_sets row
   - Upsert user_exercise_stats (best ever per exercise)
   - Call sessionService.checkAndCreateSetPRs(...)
     ↓ if weight > previous max → INSERT personal_records (metric='max_weight')
     ↓ awardPoints (+100) → INSERT era_point_events
3. Session ends:
   - countSessionPRs → SessionComplete shows "X new PRs"
4. User opens Progress screen:
   - loadPRBootstrap dispatched (if idle)
   - Top 3 PRs render in carousel
   - "X PRs this week" banner if count > 0
5. User taps "View All":
   - PrHistory screen shows up to 50 exercises (one row each)
6. User taps a row:
   - ExercisePrHistory screen fetches all PRs for that exercise
   - Latest = gold highlight; past = 60% opacity
```

---

## 9. Files Touched (Quick Reference)

### Created
- `app/stores/slice/prSlice.ts`
- `app/stores/selectors/prSelectors.ts`
- `app/components/skeleton/ExercisePrHistoryScreenSkeleton.tsx`

### Modified
- `app/services/sessionService.ts` — simplified `checkAndCreateSetPRs`, added `listLatestPRs`, `countPRsThisWeek`, `listExercisePRs`
- `app/stores/store.ts` — registered `pr` reducer
- `app/navigation/types.ts` — `ExercisePrHistory` now uses `ExerciseHistoryParams`
- `app/screen/home/ProgressScreen.tsx` — wired PR section + History card (separately)
- `app/screen/home/PrHistoryScreen.tsx` — wired with live data
- `app/screen/home/ExercisePrHistoryScreen.tsx` — full rewrite with skeleton loader
- `app/locales/en.ts` + `app/locales/nb.ts` — category + PR-related keys

### Not modified (intentionally)
- `personal_records` table schema — no migration needed
- `pr_metric` enum — keeping `max_reps`/`e1RM` values for future use
- `PrCard.tsx`, `PrCarousel.tsx`, `SessionHistoryCard.tsx`, `ExerciseSummaryCard.tsx` — UI components reused as-is

---

## 10. Open Items (Not Done Yet)

- **PR toast immediately on set log** — currently PR is only celebrated at SessionComplete. If user wants in-the-moment "🏆 NEW PR!" toast right after the set, that's a separate task.
- **"This week" definition** — current code uses trailing 7 days (rolling). If product wants Mon-Sun calendar week, change `countPRsThisWeek`.
- **PR detection for cardio** — duration-based PRs are out of scope. If added later, do NOT re-enable in `checkAndCreateSetPRs` — add a separate `checkAndCreateCardioPR` path so weight-PR logic stays clean.

---

## 11. Reference (Memory Files)

- `memory/project_pr_calculation_spec.md` — the locked rule
- `memory/project_era_points_streak_spec.md` — +100 per PR is part of the points spec
- `memory/project_workout_sprint.md` — Progress screen was the remaining sprint scope
