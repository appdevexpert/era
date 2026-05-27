/**
 * Sync queue hook — retries failed Supabase writes.
 * Provides enqueueWrite() for the session hook and flushQueue() for app mount.
 */

import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import {
  enqueue,
  dequeue,
  incrementRetry,
  setFlushing,
} from "@/app/stores/slice/syncSlice";
import * as sessionService from "@/app/services/sessionService";
import {
  deleteMealLog,
  deleteWaterLog,
  insertMealLog,
  insertWaterLog,
  updateWaterAmount,
} from "@/app/services/nutritionService";
import type {
  AdjustWaterArgs,
  ToggleMealLogArgs,
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
      logSet: (p) => sessionService.logSet(p),
      completeExercise: (p) => sessionService.completeExercise(p.id, p.comment),
      completeSession: (p) => sessionService.completeSession(p),
      upsertUserExerciseStat: (p) => sessionService.upsertUserExerciseStat(p),
      logCardio: (p) => sessionService.logCardio(p),
      createPointEvent: (p) => sessionService.createPointEvent(p),
      recordWorkoutCompletion: (p) => sessionService.recordWorkoutCompletion(p),

      // -------- nutrition --------------------------------------------
      // These mirror the thunks' write paths but go directly through the
      // service layer, so a failed retry just bumps retryCount instead of
      // re-enqueueing a fresh queue item.
      "nutrition.insertMealLog": async (params: ToggleMealLogArgs) => {
        if (params.action !== "insert") return;
        if (!userId) throw new Error("Cannot retry meal insert — not authenticated");
        await insertMealLog({
          user_id: userId,
          log_date: params.date,
          meal_library_id: params.insert.libraryId ?? null,
          meal_program_phase_day_item_id: params.insert.planItemId ?? null,
          category: params.insert.category,
          source: params.insert.source,
          name_snapshot: params.insert.name,
          kcal: params.insert.kcal,
          protein_g: params.insert.protein_g,
          carbs_g: params.insert.carbs_g,
          fats_g: params.insert.fats_g,
          notes: null,
        });
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
    [userId],
  );

  /** Queue a failed write for retry */
  const enqueueWrite = useCallback(
    (operation: string, params: Record<string, unknown>) => {
      const id = `${operation}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      dispatch(enqueue({ id, operation, params, createdAt: Date.now() }));
    },
    [dispatch],
  );

  /** Try a Supabase write — if it fails, queue it for retry */
  const syncWrite = useCallback(
    async (
      operation: string,
      params: Record<string, unknown>,
      serviceCall: () => Promise<unknown>,
    ) => {
      try {
        await serviceCall();
      } catch (err) {
        console.warn(`[SyncQueue] ${operation} failed, queuing for retry:`, err);
        enqueueWrite(operation, params);
      }
    },
    [enqueueWrite],
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

  return { syncWrite, enqueueWrite, flushQueue, queueLength: queue.length, flushing };
};
