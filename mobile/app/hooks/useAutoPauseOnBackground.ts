/**
 * Auto-freezes the session timer whenever the app leaves the foreground during
 * an active (running) session. Time spent while the app is backgrounded or
 * killed is therefore never counted. On return the session stays PAUSED — the
 * user taps ▶ (play) in the header to resume (Option 1, locked 2026-07-11).
 *
 * Call this on every screen where the session clock runs (WorkoutLog, RestTimer,
 * TimerLog, CardioTimer). Only one of those is mounted at a time, so only one
 * listener is ever active. No-op if the session is already paused
 * (sessionStartedAt is null) or there is no active session.
 *
 * See mobile/doc/PAUSE_WORKOUT.md.
 */

import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useSelector } from "react-redux";

import { useAppDispatch, type RootState } from "@/app/stores/store";
import { pauseSessionTimer } from "@/app/stores/slice/sessionSlice";

export function useAutoPauseOnBackground() {
  const dispatch = useAppDispatch();
  const sessionStartedAt = useSelector(
    (state: RootState) => state.session.sessionStartedAt,
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      // Only "background" — not the transient "inactive" (notification centre,
      // control centre, incoming-call banner) which would pause too eagerly.
      if (state === "background" && sessionStartedAt) {
        dispatch(pauseSessionTimer());
      }
    });
    return () => sub.remove();
  }, [dispatch, sessionStartedAt]);
}
