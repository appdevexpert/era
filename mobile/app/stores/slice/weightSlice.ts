/**
 * Body weight + height (BMI) state.
 *
 * Non-persisted slice: Supabase is the source of truth. Bootstrap loads the
 * latest log rows + goals metrics + program start date. Writes go through
 * thunks that dispatch optimistically before awaiting the network so the
 * Progress chart updates instantly.
 */

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import i18n from "@/app/locales/i18n";
import { updateUserGoalData } from "@/app/services/onboardingService";
import { EVENTS, logEvent } from "@/app/services/analyticsService";
import {
  awardPoints,
  type PointEventRow,
} from "@/app/services/sessionService";
import {
  fetchUserMetrics,
  fetchWeightLog,
  upsertWeightLog,
  type WeightLogRow,
} from "@/app/services/weightService";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import { appendPointEvent } from "@/app/stores/slice/rewardSlice";
import type { LoadingState } from "@/app/types";

export type HeightUnit = "cm" | "ft";

export interface WeightState {
  /** Newest entry first (sorted by logged_for_date desc). */
  entries: WeightLogRow[];
  /** Onboarding weight, already converted to kg. */
  goalsWeightKg: number | null;
  /** Stored in active unit (cm or total inches when unit === 'ft'). */
  goalsHeight: number | null;
  goalsHeightUnit: HeightUnit;
  status: LoadingState;
  error: string | null;
}

const initialState: WeightState = {
  entries: [],
  goalsWeightKg: null,
  goalsHeight: null,
  goalsHeightUnit: "cm",
  status: "idle",
  error: null,
};

const LB_TO_KG = 0.45359237;
const normalizeKg = (weight: number, unit: "kg" | "lb"): number =>
  unit === "lb" ? weight * LB_TO_KG : weight;

const sortEntriesDesc = (entries: WeightLogRow[]): WeightLogRow[] =>
  [...entries].sort((a, b) =>
    a.logged_for_date < b.logged_for_date ? 1 : -1,
  );

const upsertEntry = (
  entries: WeightLogRow[],
  row: WeightLogRow,
): WeightLogRow[] => {
  const idx = entries.findIndex(
    (e) => e.logged_for_date === row.logged_for_date,
  );
  const next = [...entries];
  if (idx >= 0) next[idx] = row;
  else next.unshift(row);
  return sortEntriesDesc(next);
};

export const loadWeightBootstrap = createAsyncThunk<
  {
    entries: WeightLogRow[];
    goalsWeightKg: number | null;
    goalsHeight: number | null;
    goalsHeightUnit: HeightUnit;
  },
  string,
  { rejectValue: string }
>("weight/loadBootstrap", async (userId, { rejectWithValue }) => {
  try {
    const [entries, metrics] = await Promise.all([
      fetchWeightLog(userId),
      fetchUserMetrics(userId),
    ]);
    return {
      entries,
      goalsWeightKg: metrics
        ? normalizeKg(metrics.weight, metrics.weight_unit)
        : null,
      goalsHeight: metrics?.height ?? null,
      goalsHeightUnit: metrics?.height_unit ?? "cm",
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load weight data.",
    );
  }
});

export const logWeightThunk = createAsyncThunk<
  WeightLogRow,
  { userId: string; weightKg: number; loggedForDate?: string },
  { rejectValue: string }
>(
  "weight/log",
  async ({ userId, weightKg, loggedForDate }, { dispatch, rejectWithValue }) => {
    const today = new Date().toISOString().slice(0, 10);
    const loggedDate = loggedForDate ?? today;

    // Optimistic — UI updates instantly before the network round-trip.
    const optimistic: WeightLogRow = {
      id: `temp-${Date.now()}`,
      weight_kg: Number(weightKg.toFixed(2)),
      logged_for_date: loggedDate,
      logged_at: new Date().toISOString(),
      source: "manual",
      note: null,
    };
    dispatch(appendWeightEntry(optimistic));

    try {
      const { row, wasNew } = await upsertWeightLog({
        userId,
        weightKg,
        loggedForDate: loggedDate,
      });

      void logEvent(EVENTS.WEIGHT_LOGGED, { was_new: wasNew });

      // +10 ERA points only fire once per (user, day) — re-logging the same
      // day updates the row but does NOT award additional points.
      if (wasNew) {
        try {
          const title = i18n.t("workout.ui.bodyWeightLogged", {
            defaultValue: "Weight Logged",
          });
          const result = await awardPoints({
            userId,
            eventType: "body_weight_logged",
            points: 10,
            title,
          });
          const pointEvent: PointEventRow = {
            id: result.eventId,
            event_type: "body_weight_logged",
            title,
            points: 10,
            occurred_at: new Date().toISOString(),
            session_id: null,
          };
          dispatch(appendPointEvent(pointEvent));
        } catch (pointsError) {
          if (__DEV__) {
            console.warn("Weight log points award failed:", pointsError);
          }
        }
      }

      return row;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to log weight.",
      );
    }
  },
);

export const updateHeightThunk = createAsyncThunk<
  { height: number; heightUnit: HeightUnit },
  { userId: string; height: number; heightUnit: HeightUnit },
  { rejectValue: string }
>(
  "weight/updateHeight",
  async ({ userId, height, heightUnit }, { dispatch, rejectWithValue }) => {
    // Optimistic local update
    dispatch(setHeightLocal({ height, heightUnit }));
    try {
      const { error } = await updateUserGoalData(userId, {
        height,
        height_unit: heightUnit,
      });
      if (error) {
        throw new Error(
          typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "Unknown error",
        );
      }
      return { height, heightUnit };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update height.",
      );
    }
  },
);

const weightSlice = createSlice({
  name: "weight",
  initialState,
  reducers: {
    clearWeightCache: () => initialState,
    appendWeightEntry: (state, action: PayloadAction<WeightLogRow>) => {
      state.entries = upsertEntry(state.entries, action.payload);
    },
    setHeightLocal: (
      state,
      action: PayloadAction<{ height: number; heightUnit: HeightUnit }>,
    ) => {
      state.goalsHeight = action.payload.height;
      state.goalsHeightUnit = action.payload.heightUnit;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWeightBootstrap.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(loadWeightBootstrap.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.entries = sortEntriesDesc(action.payload.entries);
      state.goalsWeightKg = action.payload.goalsWeightKg;
      state.goalsHeight = action.payload.goalsHeight;
      state.goalsHeightUnit = action.payload.goalsHeightUnit;
    });
    builder.addCase(loadWeightBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load weight data.";
    });
    builder.addCase(logWeightThunk.fulfilled, (state, action) => {
      // Replace the optimistic temp row with the canonical one.
      state.entries = upsertEntry(state.entries, action.payload);
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearWeightCache, appendWeightEntry, setHeightLocal } =
  weightSlice.actions;
export default weightSlice.reducer;
