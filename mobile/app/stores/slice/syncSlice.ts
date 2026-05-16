/**
 * Ephemeral sync queue for failed Supabase writes.
 * NOT persisted — on app restart, session state is gone anyway.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { signOutThunk } from "./authSlice";

export interface SyncItem {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

interface SyncState {
  queue: SyncItem[];
  flushing: boolean;
}

const initialState: SyncState = {
  queue: [],
  flushing: false,
};

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    enqueue(state, action: PayloadAction<Omit<SyncItem, "retryCount">>) {
      state.queue.push({ ...action.payload, retryCount: 0 });
    },
    dequeue(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter((item) => item.id !== action.payload);
    },
    incrementRetry(state, action: PayloadAction<string>) {
      const item = state.queue.find((i) => i.id === action.payload);
      if (item) item.retryCount += 1;
    },
    setFlushing(state, action: PayloadAction<boolean>) {
      state.flushing = action.payload;
    },
    clearQueue: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { enqueue, dequeue, incrementRetry, setFlushing, clearQueue } =
  syncSlice.actions;

export default syncSlice.reducer;
