/**
 * Reward state — current total points, streak counters, recent events.
 *
 * Non-persisted slice: Supabase is the source of truth across sessions, and
 * Redux just holds the most recent fetched snapshot + lets writes update it
 * optimistically so the UI feels instant.
 */

import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchRecentPointEvents,
  fetchRewardState,
  fetchStreakDays,
  type PointEventRow,
  type StreakDayRow,
} from "@/app/services/sessionService";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import type { LoadingState } from "@/app/types";

export interface RewardState {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  /** isoDate → "completed" | "rest_day" | "missed". Used by the streak sheet's 7-day pills. */
  weekByDate: Record<string, "completed" | "rest_day" | "missed">;
  recentEvents: PointEventRow[];
  status: LoadingState;
  error: string | null;
}

const initialState: RewardState = {
  totalPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStreakDate: null,
  weekByDate: {},
  recentEvents: [],
  status: "idle",
  error: null,
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
};

/**
 * Bootstrap the reward slice: latest reward_state, last 30 streak days, last
 * 50 point events. Called once on app start (or first Workout-tab focus).
 */
export const loadRewardBootstrap = createAsyncThunk<
  {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: string | null;
    streakDays: StreakDayRow[];
    recentEvents: PointEventRow[];
  },
  string,
  { rejectValue: string }
>("reward/loadBootstrap", async (userId, { rejectWithValue }) => {
  try {
    const today = isoDate(new Date());
    const fromDate = addDays(today, -30);

    const [state, streakDays, recentEvents] = await Promise.all([
      fetchRewardState(userId),
      fetchStreakDays({ userId, fromDate, toDate: today }),
      fetchRecentPointEvents({ userId, limit: 50 }),
    ]);

    return {
      totalPoints: state?.total_points ?? 0,
      currentStreak: state?.current_streak_days ?? 0,
      longestStreak: state?.longest_streak_days ?? 0,
      lastStreakDate: state?.last_streak_date ?? null,
      streakDays,
      recentEvents,
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load rewards.",
    );
  }
});

const rewardSlice = createSlice({
  name: "reward",
  initialState,
  reducers: {
    clearRewardCache: () => initialState,

    /**
     * Optimistic local update fired from useWorkoutSession when a point event
     * is appended to the ledger. The remote write happens in parallel via
     * sessionService.awardPoints; this just keeps the UI snappy.
     */
    appendPointEvent: (state, action: PayloadAction<PointEventRow>) => {
      state.totalPoints += action.payload.points;
      state.recentEvents = [action.payload, ...state.recentEvents].slice(0, 50);
    },

    /**
     * Optimistic streak update fired after record_workout_completion. The
     * RPC has already applied the 7-day bonus to total_points server-side;
     * the +200 lands in Redux when bonusEvent flows in via appendPointEvent
     * separately, or when bootstrap re-runs.
     */
    setStreak: (
      state,
      action: PayloadAction<{
        currentStreak: number;
        longestStreak: number;
        lastStreakDate: string;
      }>,
    ) => {
      state.currentStreak = action.payload.currentStreak;
      state.longestStreak = action.payload.longestStreak;
      state.lastStreakDate = action.payload.lastStreakDate;
      state.weekByDate[action.payload.lastStreakDate] = "completed";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadRewardBootstrap.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(loadRewardBootstrap.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.totalPoints = action.payload.totalPoints;
      state.currentStreak = action.payload.currentStreak;
      state.longestStreak = action.payload.longestStreak;
      state.lastStreakDate = action.payload.lastStreakDate;
      state.recentEvents = action.payload.recentEvents;
      state.weekByDate = action.payload.streakDays.reduce<RewardState["weekByDate"]>(
        (acc, d) => {
          acc[d.streak_date] = d.status;
          return acc;
        },
        {},
      );
    });
    builder.addCase(loadRewardBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load rewards.";
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearRewardCache, appendPointEvent, setStreak } = rewardSlice.actions;
export default rewardSlice.reducer;
