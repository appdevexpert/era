/**
 * Shared session timer that reads the start timestamp from Redux.
 * Returns elapsed seconds since the session started.
 * Works across all workout screens without resetting on navigation.
 */

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/stores/store";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const useSessionTimer = () => {
  const sessionStartedAt = useSelector(
    (state: RootState) => state.session.sessionStartedAt,
  );

  const getElapsed = () => {
    if (!sessionStartedAt) return 0;
    return Math.max(
      0,
      Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000),
    );
  };

  const [elapsed, setElapsed] = useState(getElapsed);

  useEffect(() => {
    if (!sessionStartedAt) {
      setElapsed(0);
      return;
    }
    // Sync immediately on mount / when startedAt changes
    setElapsed(getElapsed());

    const id = setInterval(() => setElapsed(getElapsed()), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt]);

  return { elapsed, formatted: formatTime(elapsed) };
};
