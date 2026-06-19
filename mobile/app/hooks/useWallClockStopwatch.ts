/**
 * Wall-clock backed stopwatch.
 *
 * Counts up from 0 (or the last paused value). Like useWallClockCountdown,
 * elapsed time is derived from Date.now() rather than counter increments,
 * so iOS background suspension doesn't lose seconds.
 *
 * `running=false` banks the current elapsed; resume picks up from there.
 * `reset()` returns to 0.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

interface UseWallClockStopwatchOptions {
  /** Toggle to start/pause. Initial mount with running=true starts immediately. */
  running: boolean;
  /** Defaults to 30ms (~33fps) for smooth centisecond display. */
  tickIntervalMs?: number;
}

export interface UseWallClockStopwatchResult {
  /** Milliseconds elapsed across all run segments since the last reset. */
  elapsedMs: number;
  /** Zero out elapsed without changing `running`. */
  reset: () => void;
}

export function useWallClockStopwatch({
  running,
  tickIntervalMs = 30,
}: UseWallClockStopwatchOptions): UseWallClockStopwatchResult {
  // When running, startedAtRef is the Date.now() of the current run segment.
  // When paused, it's null and accumulatedMsRef holds everything banked so far.
  const startedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const compute = useCallback(() => {
    if (startedAtRef.current == null) return accumulatedMsRef.current;
    return accumulatedMsRef.current + (Date.now() - startedAtRef.current);
  }, []);

  // Pause/resume sync.
  useEffect(() => {
    if (running) {
      startedAtRef.current = Date.now();
      return;
    }
    if (startedAtRef.current != null) {
      // Bank what just elapsed so display matches the wall clock exactly.
      accumulatedMsRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
      setElapsedMs(accumulatedMsRef.current);
    }
  }, [running]);

  // UI tick while running.
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsedMs(compute());
    tick();
    const id = setInterval(tick, tickIntervalMs);
    return () => clearInterval(id);
  }, [running, compute, tickIntervalMs]);

  // AppState snap — recompute immediately on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && running) {
        setElapsedMs(compute());
      }
    });
    return () => sub.remove();
  }, [running, compute]);

  const reset = useCallback(() => {
    accumulatedMsRef.current = 0;
    startedAtRef.current = running ? Date.now() : null;
    setElapsedMs(0);
  }, [running]);

  return { elapsedMs, reset };
}
