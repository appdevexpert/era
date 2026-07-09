/**
 * Sync queue hook — retries failed Supabase writes.
 * Provides enqueueWrite() for the session hook and flushQueue() for app mount.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import {
  enqueue,
  dequeue,
  incrementRetry,
  setFlushing,
} from "@/app/stores/slice/syncSlice";
import * as sessionService from "@/app/services/sessionService";
import * as workoutService from "@/app/services/workoutService";
import type { SessionExercise, SessionExerciseSet } from "@/app/types/workout";
import {
  deleteMealLog,
  deleteWaterLog,
  insertMealLog,
  insertWaterLog,
  updateWaterAmount,
} from "@/app/services/nutritionService";
import {
  upsertMealLog,
  type AdjustWaterArgs,
  type ToggleMealLogArgs,
} from "@/app/stores/slice/nutritionSlice";

const MAX_RETRIES = 5;

type Handler = (params: any) => Promise<unknown>;

export const useSyncQueue = () => {
  const dispatch = useAppDispatch();
  const queue = useSelector((state: RootState) => state.sync.queue);
  const flushing = useSelector((state: RootState) => state.sync.flushing);
  // Nutrition retries need the current user — meal_log / water_log rows
  // both carry user_id. Workout handlers don't (they get it from params).
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? null);

  // Map operation names → service calls. Memoised so the handler closure
  // captures the latest userId.
  const serviceMap = useMemo<Record<string, Handler>>(
    () => ({
      // -------- workout session ---------------------------------------
      // Session bootstrap (offline-safe via client-generated UUIDs). The
      // service layer treats PG 23505 duplicate-key as success, so a queued
      // retry of a write that actually landed will dequeue cleanly.
      createWorkoutSession: (p) =>
        sessionService.createWorkoutSession(p as {
          id: string;
          userId: string;
          programDayId: string;
          totalExercises: number;
          startedAt?: string;
        }),
      createSessionExercises: (p) => {
        const params = p as {
          sessionId: string;
          exercises: {
            id: string;
            exerciseLibraryId: string;
            sectionKind: string;
            name: string;
            exerciseCategory: string;
          }[];
          prebuiltIds: Record<string, string>;
        };
        // SessionExercise has many fields, but createSessionExercises only
        // reads (id, exerciseLibraryId, sectionKind, name, exerciseCategory).
        // Cast through unknown since the queue stores a serialized subset.
        return sessionService.createSessionExercises(
          params.sessionId,
          params.exercises as unknown as SessionExercise[],
          params.prebuiltIds,
        );
      },
      createSessionSets: (p) => {
        const params = p as {
          sessionExerciseId: string;
          sets: (Partial<SessionExerciseSet> & { setNumber: number })[];
          prebuiltIds: Record<number, string>;
        };
        return sessionService.createSessionSets(
          params.sessionExerciseId,
          params.sets as unknown as SessionExerciseSet[],
          params.prebuiltIds,
        );
      },
      createSingleSessionSet: (p) => {
        const params = p as {
          sessionExerciseId: string;
          setNumber: number;
          template: Partial<SessionExerciseSet>;
          id: string;
        };
        return sessionService.createSingleSessionSet(
          params.sessionExerciseId,
          params.setNumber,
          params.template,
          params.id,
        );
      },
      logSet: (p) => sessionService.logSet(p),
      completeExercise: (p) => sessionService.completeExercise(p.id, p.comment),
      completeSession: (p) => sessionService.completeSession(p),
      upsertUserExerciseStat: (p) => sessionService.upsertUserExerciseStat(p),
      logCardio: (p) => sessionService.logCardio(p),
      createPointEvent: (p) => sessionService.createPointEvent(p),
      recordWorkoutCompletion: (p) => sessionService.recordWorkoutCompletion(p),
      awardSetPoints: (p) => sessionService.awardPoints(p),
      awardWorkoutPoints: (p) => sessionService.awardPoints(p),
      awardCardioPoints: (p) => sessionService.awardPoints(p),

      // -------- exercise reorder --------------------------------------
      // Idempotent upsert keyed by (user_id, program_day_id) — a queued retry
      // just re-writes the same order, so replaying is always safe.
      upsertExerciseOrder: (p) =>
        workoutService.upsertExerciseOrder(p as {
          userId: string;
          programDayId: string;
          orderedIds: string[];
        }),

      // -------- nutrition --------------------------------------------
      // These mirror the thunks' write paths but go directly through the
      // service layer, so a failed retry just bumps retryCount instead of
      // re-enqueueing a fresh queue item.
      "nutrition.insertMealLog": async (params: ToggleMealLogArgs) => {
        if (params.action !== "insert") return;
        if (!userId) throw new Error("Cannot retry meal insert — not authenticated");
        // Same client-supplied id from the original attempt. If the row
        // already exists on Supabase (the previous attempt actually won),
        // insertMealLog's unique-violation branch returns the existing row.
        const row = await insertMealLog({
          id: params.insert.id,
          user_id: userId,
          log_date: params.date,
          user_meal_plan_item_id: params.insert.planItemId ?? null,
          category: params.insert.category,
          source: params.insert.source,
          name_snapshot: params.insert.name,
          kcal: params.insert.kcal,
          protein_g: params.insert.protein_g,
          carbs_g: params.insert.carbs_g,
          fats_g: params.insert.fats_g,
          notes: params.insert.notes ?? null,
        });
        // Bring the row back into Redux. The original thunk's rejected
        // handler removed the optimistic row when the first attempt failed,
        // so without this dispatch Redux would stay empty even though the
        // server has the row — and the user would re-tap, creating a true
        // duplicate with a different UUID that the PK constraint can't catch.
        dispatch(upsertMealLog({ date: params.date, row }));
      },
      "nutrition.deleteMealLog": async (params: ToggleMealLogArgs) => {
        if (params.action !== "delete") return;
        await deleteMealLog(params.delete.logId);
      },
      "nutrition.adjustWater": async (params: AdjustWaterArgs) => {
        if (!userId) throw new Error("Cannot retry water adjust — not authenticated");
        const previous = params.previousRow;
        const newAmount = (previous?.amount_ml ?? 0) + params.deltaMl;
        if (previous) {
          if (newAmount <= 0) {
            await deleteWaterLog(previous.id);
          } else {
            await updateWaterAmount(previous.id, newAmount);
          }
        } else if (newAmount > 0) {
          await insertWaterLog(userId, params.date, newAmount);
        }
      },
    }),
    [userId, dispatch],
  );

  /**
   * Ref to the latest `flushQueue` so `syncWrite` (defined above flushQueue,
   * to keep the file readable) can call it after a successful write without
   * creating a circular useCallback dependency cycle.
   */
  const flushQueueRef = useRef<(() => Promise<void>) | null>(null);

  /** Queue a failed write for retry */
  const enqueueWrite = useCallback(
    (operation: string, params: Record<string, unknown>) => {
      const id = `${operation}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      dispatch(enqueue({ id, operation, params, createdAt: Date.now() }));
    },
    [dispatch],
  );

  /**
   * Try a Supabase write — if it fails, queue it for retry. On success this
   * is also a strong "network is up" signal, so we kick off a queue flush as
   * a side-effect: any items left over from an earlier offline window drain
   * immediately rather than waiting for the next app foreground.
   */
  const syncWrite = useCallback(
    async (
      operation: string,
      params: Record<string, unknown>,
      serviceCall: () => Promise<unknown>,
    ) => {
      try {
        await serviceCall();
        // Fire-and-forget — flushQueue is a no-op if the queue is empty or
        // already flushing, so this is safe to call on every successful write.
        if (queue.length > 0 && !flushing) {
          flushQueueRef.current?.();
        }
      } catch (err) {
        console.warn(`[SyncQueue] ${operation} failed, queuing for retry:`, err);
        enqueueWrite(operation, params);
      }
    },
    [enqueueWrite, queue.length, flushing],
  );

  /** Process all queued items sequentially */
  const flushQueue = useCallback(async () => {
    if (flushing || queue.length === 0) return;

    dispatch(setFlushing(true));

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        console.warn(`[SyncQueue] Giving up on ${item.operation} after ${MAX_RETRIES} retries`);
        dispatch(dequeue(item.id));
        continue;
      }

      const handler = serviceMap[item.operation];
      if (!handler) {
        console.warn(`[SyncQueue] Unknown operation: ${item.operation}`);
        dispatch(dequeue(item.id));
        continue;
      }

      try {
        await handler(item.params);
        dispatch(dequeue(item.id));
      } catch {
        dispatch(incrementRetry(item.id));
        break; // Stop on first failure — later items may depend on this one
      }
    }

    dispatch(setFlushing(false));
  }, [queue, flushing, dispatch, serviceMap]);

  // Keep the ref pointing at the latest flushQueue so syncWrite can call it.
  useEffect(() => {
    flushQueueRef.current = flushQueue;
  }, [flushQueue]);

  return { syncWrite, enqueueWrite, flushQueue, queueLength: queue.length, flushing };
};
