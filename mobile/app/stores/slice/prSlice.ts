/**
 * Personal records cache for the Progress screen.
 *
 * Non-persisted slice — Supabase is the source of truth across sessions, and
 * Redux just holds the latest fetched snapshot. PR rows are written by
 * `sessionService.checkAndCreateSetPRs` during a workout; this slice only
 * reads them back for display.
 *
 * Locked spec: only `max_weight` PRs are read (see
 * project_pr_calculation_spec memory).
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  countPRsThisWeek,
  listLatestPRs,
  type LatestPRRow,
} from "@/app/services/sessionService";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import type { LoadingState } from "@/app/types";

export interface PRState {
  latestPRs: LatestPRRow[];
  weeklyCount: number;
  status: LoadingState;
  error: string | null;
}

const initialState: PRState = {
  latestPRs: [],
  weeklyCount: 0,
  status: "idle",
  error: null,
};

export const loadPRBootstrap = createAsyncThunk<
  { latestPRs: LatestPRRow[]; weeklyCount: number },
  string,
  { rejectValue: string }
>("pr/loadBootstrap", async (userId, { rejectWithValue }) => {
  try {
    const [latestPRs, weeklyCount] = await Promise.all([
      listLatestPRs(userId, 50),
      countPRsThisWeek(userId),
    ]);
    return { latestPRs, weeklyCount };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load PRs.",
    );
  }
});

const prSlice = createSlice({
  name: "pr",
  initialState,
  reducers: {
    clearPRCache: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(loadPRBootstrap.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(loadPRBootstrap.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.latestPRs = action.payload.latestPRs;
      state.weeklyCount = action.payload.weeklyCount;
    });
    builder.addCase(loadPRBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load PRs.";
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearPRCache } = prSlice.actions;
export default prSlice.reducer;
