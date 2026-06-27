# OFFLINE_ARCHITECTURE.md

Local-first contract for every Supabase write in the mobile app. Read this before adding a new write path (workout, nutrition, photo, profile, anything that hits Supabase).

**Status:** Shipped 2026-06-27 for workout session + set logging + nutrition. Future write paths must follow the same contract.

---

## 1. Why local-first?

Two failure modes drove this design:

1. **Network is unreliable.** Users train in gyms with bad signal. A failed `INSERT` should never lose the set they just logged or break their session.
2. **App can be killed mid-workout.** OS memory pressure, force-quit, crash. The user must be able to reopen and resume exactly where they were — even offline.

Direct Supabase calls with synchronous IDs solve neither. The local-first contract solves both.

---

## 2. The contract — five rules

**Rule 1 — Generate IDs on the client.**
Every insert that needs a stable id (workout_sessions, session_exercises, session_sets, session_media, meal_logs, point_events that need lookup) generates a UUID v4 client-side via `app/utils/uuid.ts`. Never wait for the server to mint an id.

**Rule 2 — Redux is the source of truth during the session.**
Optimistic Redux dispatch goes first. UI reads from Redux. Server is consulted only on cold-start hydration or background reconciliation. Active session slices are persisted to AsyncStorage so a kill doesn't erase the state.

**Rule 3 — Writes flow through the sync queue.**
Use `syncWrite(op, params, serviceCall)` from `useSyncQueue` instead of awaiting Supabase directly. On network failure the write is queued; on success it returns immediately and triggers a backlog flush.

**Rule 4 — Inserts are idempotent.**
Service-layer insert functions treat Postgres error `23505` (unique-violation) as success. A queued write that actually landed but lost its response can retry safely.

**Rule 5 — FIFO order matters.**
Writes are enqueued in dependency order (session before exercises before sets before logs). The queue processes sequentially and stops on the first non-retryable failure so FK constraints can't be violated.

---

## 3. Architecture layers

```
┌──────────────────────────────────────────────────────────────┐
│  UI                                                          │
│  Reads from Redux selectors. Never awaits the network.       │
└──────────────────────────────────────────────────────────────┘
                            ↓ dispatch
┌──────────────────────────────────────────────────────────────┐
│  Local-first mutation (hook / thunk)                         │
│  1. uuidv4()           (only for inserts that need an id)    │
│  2. Optimistic Redux dispatch                                │
│  3. syncWrite / enqueueWrite                                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Persisted sync queue (Redux + AsyncStorage)                 │
│  - FIFO, retry-aware (max 5)                                 │
│  - Survives app kill                                         │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Sync engine triggers:                                       │
│  - App mount (queue rehydrates from storage)                 │
│  - AppState → "active"                                       │
│  - Queue length increases                                    │
│  - Any successful syncWrite ("network is up" signal)         │
│                                                              │
│  Per item:                                                   │
│  - Try service call                                          │
│  - 23505 → service treats as success → dequeue               │
│  - Network/other error → incrementRetry, stop loop           │
│  - retryCount ≥ 5 → drop with warning                        │
└──────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌──────────────────────────────────────────────────────────────┐
│  Supabase                                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Workout session walkthrough

This is the canonical example. Replicate this shape for new features.

**Start of workout (online OR offline):**

```ts
// app/hooks/useWorkoutSession.ts → insertFresh()
const sessionId = uuidv4();
const exerciseMap = { [pdeId]: uuidv4(), ... };       // one UUID per exercise
const setMap = { [seId]: [uuidv4(), uuidv4(), ...] }; // one UUID per planned set

dispatch(initSession({ sessionId, programDayId, exerciseMap, setMap }));

enqueueWrite("createWorkoutSession", { id: sessionId, ... });
enqueueWrite("createSessionExercises", { sessionId, exercises, prebuiltIds });
enqueueWrite("createSessionSets", { sessionExerciseId, sets, prebuiltIds });
```

**Log a set:**

```ts
const ssId = setMap[seId][setNumber];                 // always available — pre-generated
dispatch(logCompletedSet({ ... }));
await syncWrite("logSet", { sessionSetId: ssId, ... },
  () => sessionService.logSet({ sessionSetId: ssId, ... }));
```

**Complete an exercise / session:**
Same pattern. The IDs Redux holds are stable through the whole flow because they were generated client-side.

**Cold start after app kill:**
1. PersistGate rehydrates `session` slice from AsyncStorage.
2. User opens WorkoutScreen for the same `programDayId`.
3. `startSession()` detects `session.programDayId === currentDay` → branch 0 → returns "resumed" without touching the network.
4. Pending queue items (if any) flush in the background.

---

## 5. Service-layer contract — accepting client IDs

Every insert function takes a client-supplied id (`id: string`) and returns it back, even when 23505 fires. Example:

```ts
export async function createWorkoutSession(params: {
  id: string;
  userId: string;
  programDayId: string;
  totalExercises: number;
}): Promise<{ id: string }> {
  const { error } = await supabase.from("workout_sessions").insert({
    id: params.id, ...
  });
  if (isDuplicateKeyError(error)) return { id: params.id };
  throwIfError(error, "Failed to create workout session");
  return { id: params.id };
}
```

`isDuplicateKeyError` in `sessionService.ts` matches on `code === '23505'` or message text "duplicate key" / "23505".

---

## 6. Persisted vs. ephemeral Redux slices

| Slice | Persisted? | Why |
|---|---|---|
| `auth` | yes | user identity across restarts |
| `workout` | yes | program bootstrap (refreshes via `get_program_version`) |
| `nutrition` | yes | meal logs survive restart |
| `session` | **yes (new 2026-06-27)** | active workout survives app kill |
| `sync` | yes (queue only) | pending writes must survive restart |
| `preferences` | yes | unit + language prefs |
| `onboarding` | yes | partial onboarding survives |
| `reward` | no | refetch on Progress mount |
| `weight` | no | refetch on mount |
| `photo` | no | refetch on mount |
| `pr` | no | refetch on mount |

When adding state that drives an in-progress write flow → persist it. When adding state that's purely a server cache → leave it ephemeral and refetch on mount.

---

## 7. How to add a new offline-safe write

Six-step checklist for any new feature (e.g. "add favorites" or "save a custom split"):

1. **Add the slice (or extend existing) with `id` fields.** Persist if it drives in-flight writes.
2. **Write the service function** with a `client-supplied id` param. Insert it explicitly. On `23505`, return the same id (success).
3. **In the mutation hook/thunk:** `uuidv4()` first → `dispatch(optimisticUpdate)` → `syncWrite(op, params, serviceCall)`.
4. **Register the op in `useSyncQueue.serviceMap`.** Without this, the queue logs "Unknown operation" and drops the item silently.
5. **Verify FIFO order.** If your write depends on another row existing, that row's insert must be queued before yours. The sync engine processes FIFO and stops on first failure, so dependencies stay intact.
6. **Document the new op in this file.**

---

## 8. Operations currently registered

`useSyncQueue.serviceMap` (as of 2026-06-27):

**Workout session bootstrap (offline-safe inserts):**
- `createWorkoutSession`
- `createSessionExercises`
- `createSessionSets`
- `createSingleSessionSet` (dynamic-add-set during workout)

**Workout session writes:**
- `logSet`
- `completeExercise`
- `completeSession`
- `upsertUserExerciseStat`
- `logCardio`
- `createPointEvent`
- `recordWorkoutCompletion`
- `awardSetPoints` / `awardWorkoutPoints` / `awardCardioPoints`

**Nutrition:**
- `nutrition.insertMealLog`
- `nutrition.deleteMealLog`
- `nutrition.adjustWater`

---

## 9. Known limitations and follow-ups

**a) Point events are not yet idempotent on retry.**
`awardPoints` calls `award_points` RPC which inserts a fresh `era_point_events` row each time. If a queued retry of a write that actually succeeded runs again, the user gets double points temporarily. The `loadRewardBootstrap` call inside `finishSession` re-reads authoritative state from server within seconds and reconciles.

**Fix:** add a `client_event_id` column to `era_point_events` with a unique constraint, generate the id in the hook, pass it through to `award_points` RPC, ON CONFLICT DO NOTHING.

**b) `record_workout_completion` RPC must guard against double-counting streak.**
Currently the RPC checks for "already completed today" on the streak side. Verify by reading `mobile/supabase/workout_schema.sql` before changing the RPC.

**c) Multi-device session conflicts.**
If two devices both start an offline session for the same `(user_id, program_day_id)`, both generate different UUIDs. When the second device flushes, the unique constraint `workout_sessions_one_per_user_day` fires 23505. We currently treat 23505 as success — so the queue dequeues and the local UUID is now orphaned (no row on server for it). All subsequent `logSet` writes (UPDATE on the orphan setId) silently no-op.

**Fix:** on `createWorkoutSession` 23505, query for the actual server row and reconcile the Redux session with the server's IDs. Out of scope for the initial ship.

**d) No proactive network-restore flush.**
NetInfo (`@react-native-community/netinfo`) would let us flush the instant network comes back. Today we rely on three triggers (mount, foreground, successful write). For the typical user this is fast enough — they tap their phone, foreground fires, queue drains within a second.

**Fix when needed:** install NetInfo, subscribe in Navigation.tsx, call `flushQueue()` on `isConnected: false → true` transitions. Native install + rebuild required.

**e) The "Workout session is out of sync. Please restart this workout." toast in `useWorkoutSession.ts:397` and `:515`.**
With this architecture in place, that toast should never fire in practice. If it does fire, something has gone very wrong (corrupt Redux state, exercise IDs that don't match the current program). Treat any sighting as a bug, not a UI message to refine.

---

## 10. Test scenarios (manual)

Run these on a real device before changing the offline architecture:

1. **Offline session start:** Airplane mode ON → Start workout → log 3 sets → complete exercise → finish session. Airplane mode OFF → check Supabase `workout_sessions`, `session_exercises`, `session_sets` for the full tree.
2. **Mid-workout app kill:** Start session, log 2 sets, force-quit the app, reopen, navigate back to the same day → user lands on WorkoutLog with the 2 sets pre-filled, can continue logging set 3.
3. **Network drop during set log:** Network ON, start session, log set 1, airplane mode ON, log sets 2-3 (queued), airplane mode OFF → backlog drains automatically without user action.
4. **Long offline + re-online:** Stay offline for 10 minutes, log a whole workout, come back online → all writes apply in correct order; PRs/streak update normally.
5. **Two-device race:** Start session on device A, then start on device B for same day. Verify one device's session wins via the unique constraint and the other gracefully reconciles (see limitation 9c above).

---

## 11. Files

**Core architecture:**
- `app/utils/uuid.ts` — `uuidv4()`
- `app/hooks/useSyncQueue.ts` — `syncWrite`, `enqueueWrite`, `flushQueue`, `serviceMap`
- `app/stores/slice/syncSlice.ts` — queue state shape
- `app/stores/store.ts` — `sessionPersistConfig`, `syncPersistConfig`

**Workout flow:**
- `app/hooks/useWorkoutSession.ts` — `insertFresh`, `startSession`, `logSetResult`, `addSet`
- `app/services/sessionService.ts` — `createWorkoutSession`, `createSessionExercises`, `createSessionSets`, `createSingleSessionSet`, `isDuplicateKeyError`
- `app/stores/slice/sessionSlice.ts` — `initSession`, `resetSession`

**Nutrition (already followed the contract since ~2026-05):**
- `app/services/nutritionService.ts` — `insertMealLog`
- `app/stores/slice/nutritionSlice.ts` — meal log thunks
- Memory: `feedback_idempotent_inserts.md`
