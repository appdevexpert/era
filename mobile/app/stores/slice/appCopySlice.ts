/**
 * Remote-editable UI copy strings.
 *
 * Non-persisted: we want copy edits (made in Supabase) to show up on next app
 * open, not stay frozen in AsyncStorage. `loadAllAppCopy` hydrates every key
 * in a single round-trip at boot; `loadAppCopy(key)` remains as a per-key
 * fallback when a screen wants to refresh just one string.
 *
 * Callers should always fall back to i18n.t() if the desired string is not
 * yet in the cache (fetch pending / failed / row missing).
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import i18n from "@/app/locales/i18n";
import {
  fetchAllAppCopy,
  fetchAppCopy,
  type CopyKey,
} from "@/app/services/appCopyService";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import type { RootState } from "@/app/stores/store";
import type { LoadingState } from "@/app/types";

interface CopyEntry {
  translations: Record<string, string>;
  status: LoadingState;
}

export interface AppCopyState {
  byKey: Partial<Record<CopyKey, CopyEntry>>;
  bootstrapStatus: LoadingState;
}

const initialState: AppCopyState = {
  byKey: {},
  bootstrapStatus: "idle",
};

export const loadAppCopy = createAsyncThunk<
  { key: CopyKey; translations: Record<string, string> },
  CopyKey,
  { rejectValue: { key: CopyKey; message: string } }
>("appCopy/load", async (key, { rejectWithValue }) => {
  try {
    const row = await fetchAppCopy(key);
    return { key, translations: row?.translations ?? {} };
  } catch (error) {
    return rejectWithValue({
      key,
      message: error instanceof Error ? error.message : "Failed to load copy.",
    });
  }
});

export const loadAllAppCopy = createAsyncThunk<
  { key: CopyKey; translations: Record<string, string> }[],
  void,
  { rejectValue: string }
>("appCopy/loadAll", async (_, { rejectWithValue }) => {
  try {
    const rows = await fetchAllAppCopy();
    return rows.map((row) => ({
      key: row.key,
      translations: row.translations,
    }));
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to load copy.",
    );
  }
});

const appCopySlice = createSlice({
  name: "appCopy",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadAppCopy.pending, (state, action) => {
      const key = action.meta.arg;
      state.byKey[key] = {
        translations: state.byKey[key]?.translations ?? {},
        status: "loading",
      };
    });
    builder.addCase(loadAppCopy.fulfilled, (state, action) => {
      state.byKey[action.payload.key] = {
        translations: action.payload.translations,
        status: "succeeded",
      };
    });
    builder.addCase(loadAppCopy.rejected, (state, action) => {
      const key = action.meta.arg;
      state.byKey[key] = {
        translations: state.byKey[key]?.translations ?? {},
        status: "failed",
      };
    });
    builder.addCase(loadAllAppCopy.pending, (state) => {
      state.bootstrapStatus = "loading";
    });
    builder.addCase(loadAllAppCopy.fulfilled, (state, action) => {
      state.bootstrapStatus = "succeeded";
      for (const row of action.payload) {
        state.byKey[row.key] = {
          translations: row.translations,
          status: "succeeded",
        };
      }
    });
    builder.addCase(loadAllAppCopy.rejected, (state) => {
      state.bootstrapStatus = "failed";
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export default appCopySlice.reducer;

/**
 * Reads a copy string from the given store state, falling back to i18n.t()
 * if the key hasn't been hydrated yet (fetch pending / failed / row missing).
 *
 * Callable from anywhere — hook or plain module — because it takes an
 * explicit state snapshot. Safe for background contexts like scheduled
 * notifications where React hooks aren't available.
 *
 * @param fallbackI18nKey - The i18next key to fall back on. Must exist in
 *   the locale files so a missing DB row degrades to the shipped default
 *   instead of an empty string.
 * @param params - Interpolation params. `{{placeholder}}` tokens in the
 *   remote string are replaced verbatim; the i18n fallback uses i18next's
 *   own interpolation.
 */
export function getCopyString(
  state: RootState,
  key: CopyKey,
  fallbackI18nKey: string,
  params?: Record<string, string | number>,
): string {
  const template = state.appCopy.byKey[key]?.translations?.[i18n.language]
    ?? state.appCopy.byKey[key]?.translations?.en
    ?? null;

  if (!template) {
    return i18n.t(fallbackI18nKey, params ?? {});
  }

  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}
