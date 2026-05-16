/**
 * Sync queue hook — retries failed Supabase writes.
 * Provides enqueueWrite() for the session hook and flushQueue() for app mount.
 */

import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import {
  enqueue,
  dequeue,
  incrementRetry,
  setFlushing,
} from "@/app/stores/slice/syncSlice";
import * as sessionService from "@/app/services/sessionService";

const MAX_RETRIES = 5;

/** Maps operation names to sessionService calls */
const serviceMap: Record<string, (params: any) => Promise<unknown>> = {
  logSet: (p) => sessionService.logSet(p),
  completeExercise: (p) => sessionService.completeExercise(p.id, p.comment),
  completeSession: (p) => sessionService.completeSession(p),
  upsertUserExerciseStat: (p) => sessionService.upsertUserExerciseStat(p),
  logCardio: (p) => sessionService.logCardio(p),
  createPointEvent: (p) => sessionService.createPointEvent(p),
};

export const useSyncQueue = () => {
  const dispatch = useAppDispatch();
  const queue = useSelector((state: RootState) => state.sync.queue);
  const flushing = useSelector((state: RootState) => state.sync.flushing);

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
  }, [queue, flushing, dispatch]);

  return { syncWrite, flushQueue, queueLength: queue.length, flushing };
};
