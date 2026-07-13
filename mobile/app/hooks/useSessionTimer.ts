/**
 * Shared session timer that reads the start timestamp from Redux.
 * Returns elapsed seconds since the session started.
 * Works across all workout screens without resetting on navigation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useSelector } from "react-redux";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import { bankElapsed } from "@/app/stores/slice/sessionSlice";

// How often the live segment is folded into the persisted total. On a hard
// kill we lose at most this many seconds of the current segment — a fine
// trade for not writing to disk every second.
const BANK_EVERY_SECONDS = 10;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const useSessionTimer = () => {
  const sessionStartedAt = useSelector(
    (state: RootState) => state.session.sessionStartedAt,
  );
  // Seconds banked from prior sittings (including time before a Pause). The
  // displayed timer is the TOTAL: banked + the live current sitting. When
  // paused, sessionStartedAt is null so the current sitting is 0 → the clock
  // freezes on the banked total.
  const accumulatedSeconds = useSelector(
    (state: RootState) => state.session.accumulatedSeconds,
  );

  const dispatch = useAppDispatch();
  const tickCountRef = useRef(0);

  const getElapsed = useCallback(() => {
    const current = sessionStartedAt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000),
        )
      : 0;
    return accumulatedSeconds + current;
  }, [sessionStartedAt, accumulatedSeconds]);

  const [elapsed, setElapsed] = useState(getElapsed);

  useEffect(() => {
    // Sync immediately on mount / when the clock changes.
    setElapsed(getElapsed());
    // Paused (no live sitting) → freeze on the banked total, don't tick.
    if (!sessionStartedAt) {
      tickCountRef.current = 0;
      return;
    }

    const id = setInterval(() => {
      setElapsed(getElapsed());
      // Heartbeat: every ~10s, fold the live segment into the persisted total
      // so a hard kill can't count time the app was closed (see bankElapsed).
      tickCountRef.current += 1;
      if (tickCountRef.current >= BANK_EVERY_SECONDS) {
        tickCountRef.current = 0;
        dispatch(bankElapsed());
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt, getElapsed, dispatch]);

  // AppState snap — when the app comes back to foreground, the next interval
  // tick is still up to a second away. Recompute immediately so the header
  // doesn't briefly show a stale value.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") setElapsed(getElapsed());
    });
    return () => sub.remove();
  }, [getElapsed]);

  return { elapsed, formatted: formatTime(elapsed) };
};
