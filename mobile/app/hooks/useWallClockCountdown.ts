/**
 * Wall-clock backed countdown timer.
 *
 * Why: JS-driven setInterval/setTimeout pause when the app goes to background
 * on iOS (and is throttled on Android). A counter-style timer (`set(r => r-1)`)
 * effectively freezes — the user comes back and the rest timer is still
 * counting down from where it left off, ignoring real elapsed time.
 *
 * This hook stores an absolute `endsAt` timestamp and derives `remaining`
 * from `Date.now()` on every interval tick AND on every AppState "active"
 * transition. Background → resume snaps the timer to the correct value.
 *
 * onComplete fires exactly once per run (guarded by completionTriggeredRef).
 *
 * Pause / resume is supported via the `running` boolean. When paused we bank
 * the current remaining and rebuild `endsAt` on resume.
 *
 * `reset()` returns the timer to `totalSeconds` (used by Cancel).
 * `addSeconds(n)` extends the run (used by Rest's "+30s").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

interface UseWallClockCountdownOptions {
  /** Initial duration in seconds. Resetting `totalSeconds` reloads the timer. */
  totalSeconds: number;
  /** Pause/resume gate. When false the displayed value is frozen. */
  running: boolean;
  /** Called once when remaining hits 0. Idempotent per run. */
  onComplete?: () => void;
  /** Defaults to 1000ms. Use smaller (e.g. 250) for smoother ring animations. */
  tickIntervalMs?: number;
}

export interface UseWallClockCountdownResult {
  /** Seconds left, ceil-rounded so the UI shows "5" until ~4.0s elapsed. */
  remaining: number;
  /** Extend or shorten the countdown by `n` seconds. */
  addSeconds: (n: number) => void;
  /** Restart from `totalSeconds`. Honors current `running` state. */
  reset: () => void;
}

export function useWallClockCountdown({
  totalSeconds,
  running,
  onComplete,
  tickIntervalMs = 1000,
}: UseWallClockCountdownOptions): UseWallClockCountdownResult {
  // endsAtRef is the absolute Date.now() value at which remaining hits 0.
  const endsAtRef = useRef<number>(Date.now() + totalSeconds * 1000);
  // When paused, we remember the seconds left so resume can rebuild endsAt.
  const remainingOnPauseRef = useRef<number>(totalSeconds);
  // Idempotent completion: tick + AppState resume can race; we only fire once.
  const completionTriggeredRef = useRef(false);
  const [remaining, setRemaining] = useState(totalSeconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const compute = useCallback(() => {
    const diffMs = endsAtRef.current - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }, []);

  const fireIfDue = useCallback((next: number) => {
    if (next <= 0 && !completionTriggeredRef.current) {
      completionTriggeredRef.current = true;
      onCompleteRef.current?.();
    }
  }, []);

  // Reset when the caller hands us a new duration. Treat this as a brand-new
  // run regardless of `running` — completion guard clears too. We deliberately
  // re-read `running` from a ref so toggling play/pause doesn't re-trigger
  // this "duration changed" reset.
  const runningRef = useRef(running);
  runningRef.current = running;
  useEffect(() => {
    remainingOnPauseRef.current = totalSeconds;
    completionTriggeredRef.current = false;
    if (runningRef.current) {
      endsAtRef.current = Date.now() + totalSeconds * 1000;
    }
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  // Pause/resume sync. Resume rebuilds endsAt from the banked remaining.
  useEffect(() => {
    if (running) {
      const banked = remainingOnPauseRef.current;
      if (banked <= 0) {
        endsAtRef.current = Date.now();
        return;
      }
      endsAtRef.current = Date.now() + banked * 1000;
      completionTriggeredRef.current = false;
      setRemaining(banked);
    } else {
      // Snapshot what's left so we can resume there later.
      remainingOnPauseRef.current = compute();
      setRemaining(remainingOnPauseRef.current);
    }
  }, [running, compute]);

  // UI tick (only while running). The tick reads the wall clock — it doesn't
  // increment a counter, so app-background → resume self-corrects.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = compute();
      setRemaining(next);
      fireIfDue(next);
    };
    tick();
    const id = setInterval(tick, tickIntervalMs);
    return () => clearInterval(id);
  }, [running, compute, fireIfDue, tickIntervalMs]);

  // AppState snap — catch foreground transitions without waiting for the
  // next interval tick. Also fires completion if the timer ran out in the bg.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active" || !running) return;
      const next = compute();
      setRemaining(next);
      fireIfDue(next);
    });
    return () => sub.remove();
  }, [running, compute, fireIfDue]);

  const addSeconds = useCallback(
    (n: number) => {
      if (running) {
        endsAtRef.current += n * 1000;
        const next = compute();
        setRemaining(next);
        // Extending past zero un-arms completion so it can fire again later.
        if (next > 0) completionTriggeredRef.current = false;
      } else {
        remainingOnPauseRef.current = Math.max(
          0,
          remainingOnPauseRef.current + n,
        );
        setRemaining(remainingOnPauseRef.current);
      }
    },
    [running, compute],
  );

  const reset = useCallback(() => {
    completionTriggeredRef.current = false;
    remainingOnPauseRef.current = totalSeconds;
    if (running) {
      endsAtRef.current = Date.now() + totalSeconds * 1000;
    }
    setRemaining(totalSeconds);
  }, [totalSeconds, running]);

  return { remaining, addSeconds, reset };
}
