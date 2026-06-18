/**
 * Progress photo cache + upload thunk.
 *
 * Local-first optimistic pattern (per CLAUDE.local.md):
 *   1. User picks photo → uploadProgressPhotoThunk runs.
 *   2. Compress + Supabase upload + record_progress_photo RPC happen on
 *      the network side.
 *   3. On success: append the new row to `photos`, bump rewardSlice's
 *      totalPoints via appendPointEvent (only when DB awarded a point).
 *   4. On failure: surface error to the caller; the row is NOT persisted
 *      so retry is the caller's responsibility (no sync queue yet — file
 *      uploads are inherently large and we don't want them piling up
 *      offline without explicit user intent).
 *
 * Non-persisted slice — Supabase is the source of truth across sessions.
 */

import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  deleteProgressPhoto,
  fetchMyProgressPhotos,
  uploadProgressPhoto,
  type ProgressPhotoRow,
} from "@/app/services/progressPhotoService";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import { appendPointEvent } from "@/app/stores/slice/rewardSlice";
import type { LoadingState } from "@/app/types";

export interface PhotoState {
  photos: ProgressPhotoRow[];
  status: LoadingState;
  uploadStatus: "idle" | "uploading" | "succeeded" | "failed";
  uploadError: string | null;
  /** True when the most recent upload was a paid one (25 pts awarded). */
  lastUploadAwardedPoints: boolean;
  /** Rows held aside during optimistic delete so we can restore on failure. */
  pendingDeletes: Record<string, { row: ProgressPhotoRow; index: number }>;
}

const initialState: PhotoState = {
  photos: [],
  status: "idle",
  uploadStatus: "idle",
  uploadError: null,
  lastUploadAwardedPoints: false,
  pendingDeletes: {},
};

export const loadProgressPhotos = createAsyncThunk<
  ProgressPhotoRow[],
  void,
  { rejectValue: string }
>("photo/load", async (_, { rejectWithValue }) => {
  try {
    return await fetchMyProgressPhotos(50);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Unable to load photos.",
    );
  }
});

/**
 * Local-first delete:
 *   pending → splice the row out of state.photos (UI updates instantly).
 *   rejected → restore the row at its original index + surface error.
 *   fulfilled → no-op (already removed).
 */
export const deleteProgressPhotoThunk = createAsyncThunk<
  string,
  { mediaId: string; storagePath: string },
  { rejectValue: string }
>("photo/delete", async (args, { rejectWithValue }) => {
  try {
    await deleteProgressPhoto({
      mediaId: args.mediaId,
      storagePath: args.storagePath,
    });
    return args.mediaId;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Delete failed.",
    );
  }
});

export const uploadProgressPhotoThunk = createAsyncThunk<
  { row: ProgressPhotoRow; pointsAwarded: number },
  { localUri: string; sessionId?: string | null },
  { rejectValue: string }
>("photo/upload", async (args, { dispatch, rejectWithValue }) => {
  try {
    const result = await uploadProgressPhoto({
      localUri: args.localUri,
      sessionId: args.sessionId ?? null,
    });

    const row: ProgressPhotoRow = {
      id: result.mediaId,
      sessionId: args.sessionId ?? null,
      storagePath: result.storagePath,
      pointsAwarded: result.pointsAwarded,
      createdAt: new Date().toISOString(),
      signedUrl: result.signedUrl,
    };

    // Only fire the optimistic point bump when the server actually awarded
    // points (record_progress_photo enforces "one paid photo per day" — a
    // 2nd photo on the same day legitimately returns 0).
    if (result.pointsAwarded > 0) {
      dispatch(
        appendPointEvent({
          id: `local-${result.mediaId}`,
          event_type: "progress_photo_added",
          points: result.pointsAwarded,
          title: "Progress photo",
          occurred_at: row.createdAt,
          session_id: args.sessionId ?? null,
        }),
      );
    }

    return { row, pointsAwarded: result.pointsAwarded };
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Upload failed.",
    );
  }
});

const photoSlice = createSlice({
  name: "photo",
  initialState,
  reducers: {
    clearPhotoCache: () => initialState,
    clearUploadError: (state) => {
      state.uploadStatus = "idle";
      state.uploadError = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadProgressPhotos.pending, (state) => {
      state.status = "loading";
    });
    builder.addCase(loadProgressPhotos.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.photos = action.payload;
    });
    builder.addCase(loadProgressPhotos.rejected, (state) => {
      state.status = "failed";
    });

    builder.addCase(uploadProgressPhotoThunk.pending, (state) => {
      state.uploadStatus = "uploading";
      state.uploadError = null;
    });
    builder.addCase(
      uploadProgressPhotoThunk.fulfilled,
      (
        state,
        action: PayloadAction<{ row: ProgressPhotoRow; pointsAwarded: number }>,
      ) => {
        state.uploadStatus = "succeeded";
        state.photos = [action.payload.row, ...state.photos];
        state.lastUploadAwardedPoints = action.payload.pointsAwarded > 0;
      },
    );
    builder.addCase(uploadProgressPhotoThunk.rejected, (state, action) => {
      state.uploadStatus = "failed";
      state.uploadError = action.payload ?? "Upload failed.";
    });

    // Optimistic delete — splice now, restore if the network call fails.
    builder.addCase(deleteProgressPhotoThunk.pending, (state, action) => {
      const { mediaId } = action.meta.arg;
      const index = state.photos.findIndex((p) => p.id === mediaId);
      if (index < 0) return;
      state.pendingDeletes[mediaId] = { row: state.photos[index], index };
      state.photos.splice(index, 1);
    });
    builder.addCase(deleteProgressPhotoThunk.fulfilled, (state, action) => {
      delete state.pendingDeletes[action.payload];
    });
    builder.addCase(deleteProgressPhotoThunk.rejected, (state, action) => {
      const { mediaId } = action.meta.arg;
      const pending = state.pendingDeletes[mediaId];
      if (pending) {
        const restoreIndex = Math.min(pending.index, state.photos.length);
        state.photos.splice(restoreIndex, 0, pending.row);
        delete state.pendingDeletes[mediaId];
      }
    });

    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearPhotoCache, clearUploadError } = photoSlice.actions;
export default photoSlice.reducer;
