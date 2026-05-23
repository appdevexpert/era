import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  deleteMealLog,
  deleteWaterLog,
  getActiveMealProgram,
  getMealLogsForRange,
  getWaterLogsForRange,
  insertMealLog,
  insertWaterLog,
  updateWaterAmount,
  type MealLogInsertPayload,
} from "@/app/services/nutritionService";
import { signOutThunk } from "./authSlice";
import { enqueue } from "./syncSlice";
import type {
  MealCategoryEnum,
  MealLogRow,
  MealLogSource,
  MealProgramBootstrapData,
  WaterLogRow,
} from "@/app/types/nutrition";
import type { LoadingState } from "@/app/types";
import type { RootState } from "@/app/stores/store";
import {
  addDays,
  isoDatesForWeek,
  parseIsoDate,
  startOfWeek,
  todayIso,
  toIsoDate,
} from "@/app/utils/nutritionDates";

// =====================================================================
// Nutrition Redux slice — caches the meal program bootstrap and the
// user's logs keyed by date. Persisted to AsyncStorage so the screen
// renders instantly on cold-start; the bootstrap thunk reconciles with
// Supabase in the background.
// =====================================================================

interface NutritionState {
  status: LoadingState;
  error: string | null;
  bootstrap: MealProgramBootstrapData | null;
  /** Logs grouped by 'YYYY-MM-DD'. Missing key = not yet fetched. */
  logsByDate: Record<string, MealLogRow[]>;
  /** At most one water row per date — UNIQUE (user_id, log_date) at the DB. */
  waterByDate: Record<string, WaterLogRow>;
  /** Per-date flag set true while a +/− is in flight so the UI can block double-taps. */
  mutatingWaterByDate: Record<string, boolean>;
  /** The date currently selected in the week selector. */
  selectedDate: string;
  loadedAt: string | null;
}

const initialState: NutritionState = {
  status: "idle",
  error: null,
  bootstrap: null,
  logsByDate: {},
  waterByDate: {},
  mutatingWaterByDate: {},
  selectedDate: todayIso(),
  loadedAt: null,
};

// -------- thunks -----------------------------------------------------

interface LoadNutritionBootstrapResult {
  bootstrap: MealProgramBootstrapData | null;
  logsForWeek: Record<string, MealLogRow[]>;
  waterForWeek: Record<string, WaterLogRow>;
  selectedDate: string;
  loadedAt: string;
}

/**
 * One-shot bootstrap: fetch the active meal program AND the logs (meal +
 * water) for the currently selected week. Safe to dispatch on every
 * Nutrition tab mount — it overwrites the cache instead of merging.
 */
export const loadNutritionBootstrap = createAsyncThunk<
  LoadNutritionBootstrapResult,
  void,
  { rejectValue: string; state: RootState }
>("nutrition/loadBootstrap", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const userId = state.auth.user?.id ?? null;
    const selectedDate = state.nutrition.selectedDate || todayIso();

    const weekStart = startOfWeek(parseIsoDate(selectedDate));
    const startIso = toIsoDate(weekStart);
    const endIso = addDays(startIso, 6);

    const [bootstrap, mealLogs, waterLogs] = await Promise.all([
      getActiveMealProgram(),
      userId
        ? getMealLogsForRange(userId, startIso, endIso)
        : Promise.resolve([] as MealLogRow[]),
      userId
        ? getWaterLogsForRange(userId, startIso, endIso)
        : Promise.resolve([] as WaterLogRow[]),
    ]);

    return {
      bootstrap,
      logsForWeek: groupByDate(mealLogs),
      waterForWeek: indexWaterByDate(waterLogs),
      selectedDate,
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to load nutrition.",
    );
  }
});

/**
 * Move the selected date and fetch logs for the new week if we don't
 * already have them. UI updates optimistically — Redux already swapped
 * selectedDate by the time the network call returns.
 */
export const selectNutritionDate = createAsyncThunk<
  {
    date: string;
    logsForWeek: Record<string, MealLogRow[]>;
    waterForWeek: Record<string, WaterLogRow>;
  },
  string,
  { rejectValue: string; state: RootState }
>(
  "nutrition/selectDate",
  async (date, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.id ?? null;
      const weekStart = startOfWeek(parseIsoDate(date));
      const weekDates = isoDatesForWeek(weekStart);
      const cachedMeals = state.nutrition.logsByDate;

      // Meal logs use `undefined` to mean "not fetched"; water doesn't store
      // empty rows, so cache freshness keys off the meal map only. If meals
      // are cached for the whole week, water for that week was fetched in
      // the same round trip, so we can skip.
      const everyDateCached = weekDates.every((d) => cachedMeals[d] !== undefined);
      if (everyDateCached || !userId) {
        return { date, logsForWeek: {}, waterForWeek: {} };
      }

      const startIso = weekDates[0];
      const endIso = weekDates[6];
      const [mealLogs, waterLogs] = await Promise.all([
        getMealLogsForRange(userId, startIso, endIso),
        getWaterLogsForRange(userId, startIso, endIso),
      ]);
      return {
        date,
        logsForWeek: groupByDate(mealLogs),
        waterForWeek: indexWaterByDate(waterLogs),
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unable to load that week.",
      );
    }
  },
);

// -------- helpers ----------------------------------------------------

function groupByDate(logs: MealLogRow[]): Record<string, MealLogRow[]> {
  const map: Record<string, MealLogRow[]> = {};
  for (const log of logs) {
    (map[log.log_date] ??= []).push(log);
  }
  return map;
}

function indexWaterByDate(rows: WaterLogRow[]): Record<string, WaterLogRow> {
  const map: Record<string, WaterLogRow> = {};
  for (const row of rows) {
    map[row.log_date] = row;
  }
  return map;
}

function removeRow(list: MealLogRow[] | undefined, id: string): MealLogRow[] {
  return (list ?? []).filter((row) => row.id !== id);
}

// -------- writes: +/− on the water row for a date --------------------

export interface AdjustWaterArgs {
  date: string;
  /** Signed delta in ml (+250 or -250 in normal taps). */
  deltaMl: number;
  /** Synthetic id used for the optimistic row when none exists yet. */
  tempId: string;
  /** State at dispatch time — used to roll back on failure. */
  previousRow: WaterLogRow | null;
}

interface AdjustWaterResult {
  date: string;
  /** Server-persisted row, or null when the running total hit 0 and the row was deleted. */
  row: WaterLogRow | null;
}

/**
 * Single thunk for both +/− taps on the water card.
 *
 * Each (user_id, log_date) has at most one row (DB-level UNIQUE), so
 * every tap either inserts that row, updates its amount, or deletes it
 * when the running total would hit 0.
 *
 * Optimistic flow:
 *   pending   → reducer patches waterByDate immediately
 *   fulfilled → swap the optimistic row with the server row (or remove)
 *   rejected  → restore the previous row + enqueue a retry
 */
export const adjustWaterAmount = createAsyncThunk<
  AdjustWaterResult,
  AdjustWaterArgs,
  { rejectValue: string; state: RootState }
>(
  "nutrition/adjustWater",
  async (args, { dispatch, getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("Not authenticated");

    const previousRow = args.previousRow;
    const newAmount = (previousRow?.amount_ml ?? 0) + args.deltaMl;

    try {
      if (previousRow) {
        if (newAmount <= 0) {
          await deleteWaterLog(previousRow.id);
          return { date: args.date, row: null };
        }
        const updated = await updateWaterAmount(previousRow.id, newAmount);
        return { date: args.date, row: updated };
      }

      // No existing row → a − tap is a no-op (amount_ml CHECK > 0).
      if (newAmount <= 0) return { date: args.date, row: null };

      const inserted = await insertWaterLog(userId, args.date, newAmount);
      return { date: args.date, row: inserted };
    } catch (error) {
      dispatch(
        enqueue({
          id: `water-adjust-${args.date}-${Date.now()}`,
          operation: "nutrition.adjustWater",
          params: args as unknown as Record<string, unknown>,
          createdAt: Date.now(),
        }),
      );
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to sync water.",
      );
    }
  },
);

// -------- writes: +/− toggle on a meal row ---------------------------

export interface ToggleInsertArgs {
  /** Pre-generated temp id used by the optimistic row. */
  tempId: string;
  category: MealCategoryEnum;
  source: MealLogSource;
  planItemId?: string | null;
  libraryId?: string | null;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface ToggleDeleteArgs {
  logId: string;
  /** Full snapshot kept around so a rejected delete can be rolled back. */
  snapshot: MealLogRow;
}

export type ToggleMealLogArgs =
  | { date: string; action: "insert"; insert: ToggleInsertArgs }
  | { date: string; action: "delete"; delete: ToggleDeleteArgs };

interface ToggleMealLogResult {
  /** Real DB row returned by the server on insert. */
  inserted?: MealLogRow;
  /** Echoed-back id of the row that was deleted. */
  deletedId?: string;
}

/**
 * Single thunk for both +/− interactions.
 *
 * Optimistic flow:
 *   pending   → reducer patches logsByDate immediately
 *   fulfilled → swap temp id with the real server id
 *   rejected  → reverse the patch + enqueue a retry on the syncSlice
 */
export const toggleMealLog = createAsyncThunk<
  ToggleMealLogResult,
  ToggleMealLogArgs,
  { rejectValue: string; state: RootState }
>("nutrition/toggleMealLog", async (args, { dispatch, getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) {
    return rejectWithValue("Not authenticated");
  }

  try {
    if (args.action === "insert") {
      const payload: MealLogInsertPayload = {
        user_id: userId,
        log_date: args.date,
        meal_library_id: args.insert.libraryId ?? null,
        meal_program_phase_day_item_id: args.insert.planItemId ?? null,
        category: args.insert.category,
        source: args.insert.source,
        name_snapshot: args.insert.name,
        kcal: args.insert.kcal,
        protein_g: args.insert.protein_g,
        carbs_g: args.insert.carbs_g,
        fats_g: args.insert.fats_g,
        notes: null,
      };
      const row = await insertMealLog(payload);
      return { inserted: row };
    }

    await deleteMealLog(args.delete.logId);
    return { deletedId: args.delete.logId };
  } catch (error) {
    // Queue for retry — never silently drop a user write.
    dispatch(
      enqueue({
        id: `meal-log-${args.action}-${Date.now()}`,
        operation:
          args.action === "insert"
            ? "nutrition.insertMealLog"
            : "nutrition.deleteMealLog",
        params: args as unknown as Record<string, unknown>,
        createdAt: Date.now(),
      }),
    );
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to sync meal log.",
    );
  }
});

// -------- slice ------------------------------------------------------

const nutritionSlice = createSlice({
  name: "nutrition",
  initialState,
  reducers: {
    clearNutritionCache: () => initialState,
    /** Set the selected date without fetching. Used by tests / dev tools. */
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadNutritionBootstrap.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    builder.addCase(loadNutritionBootstrap.fulfilled, (state, action) => {
      state.status = "succeeded";
      state.error = null;
      state.bootstrap = action.payload.bootstrap;
      state.logsByDate = action.payload.logsForWeek;
      state.waterByDate = action.payload.waterForWeek;
      state.selectedDate = action.payload.selectedDate;
      state.loadedAt = action.payload.loadedAt;
    });
    builder.addCase(loadNutritionBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load nutrition.";
    });

    builder.addCase(selectNutritionDate.pending, (state, action) => {
      // Optimistic — flip selectedDate immediately for snappy UI.
      state.selectedDate = action.meta.arg;
    });
    builder.addCase(selectNutritionDate.fulfilled, (state, action) => {
      state.selectedDate = action.payload.date;
      // Merge — don't overwrite existing cached dates.
      Object.assign(state.logsByDate, action.payload.logsForWeek);
      Object.assign(state.waterByDate, action.payload.waterForWeek);
    });
    builder.addCase(selectNutritionDate.rejected, (state, action) => {
      state.error = action.payload ?? "Unable to load that week.";
    });

    // --- adjustWaterAmount: optimistic insert / update / delete -----
    builder.addCase(adjustWaterAmount.pending, (state, action) => {
      const args = action.meta.arg;
      const current = state.waterByDate[args.date];
      const newAmount = (current?.amount_ml ?? 0) + args.deltaMl;

      if (newAmount <= 0) {
        delete state.waterByDate[args.date];
      } else if (current) {
        state.waterByDate[args.date] = { ...current, amount_ml: newAmount };
      } else {
        // Synthetic row — id/timestamps overwritten when the server responds.
        state.waterByDate[args.date] = {
          id: args.tempId,
          user_id: "",
          log_date: args.date,
          amount_ml: newAmount,
          logged_at: "",
          created_at: "",
        };
      }
      state.mutatingWaterByDate[args.date] = true;
    });
    builder.addCase(adjustWaterAmount.fulfilled, (state, action) => {
      const { date, row } = action.payload;
      if (row) state.waterByDate[date] = row;
      else delete state.waterByDate[date];
      delete state.mutatingWaterByDate[date];
    });
    builder.addCase(adjustWaterAmount.rejected, (state, action) => {
      const args = action.meta.arg;
      // Rollback to the snapshot the caller passed in.
      if (args.previousRow) state.waterByDate[args.date] = args.previousRow;
      else delete state.waterByDate[args.date];
      delete state.mutatingWaterByDate[args.date];
      state.error = action.payload ?? "Sync failed; queued for retry.";
    });

    // --- toggleMealLog: optimistic insert / delete ------------------
    builder.addCase(toggleMealLog.pending, (state, action) => {
      const args = action.meta.arg;
      if (args.action === "insert") {
        const optimistic: MealLogRow = {
          id: args.insert.tempId,
          user_id: "",
          log_date: args.date,
          meal_library_id: args.insert.libraryId ?? null,
          meal_program_phase_day_item_id: args.insert.planItemId ?? null,
          category: args.insert.category,
          source: args.insert.source,
          name_snapshot: args.insert.name,
          kcal: args.insert.kcal,
          protein_g: args.insert.protein_g,
          carbs_g: args.insert.carbs_g,
          fats_g: args.insert.fats_g,
          notes: null,
        };
        (state.logsByDate[args.date] ??= []).push(optimistic);
      } else {
        state.logsByDate[args.date] = removeRow(
          state.logsByDate[args.date],
          args.delete.logId,
        );
      }
    });
    builder.addCase(toggleMealLog.fulfilled, (state, action) => {
      const args = action.meta.arg;
      if (args.action === "insert" && action.payload.inserted) {
        const list = state.logsByDate[args.date] ?? [];
        const idx = list.findIndex((row) => row.id === args.insert.tempId);
        if (idx >= 0) list[idx] = action.payload.inserted;
        else list.push(action.payload.inserted);
        state.logsByDate[args.date] = list;
      }
    });
    builder.addCase(toggleMealLog.rejected, (state, action) => {
      const args = action.meta.arg;
      // Rollback — exact inverse of the optimistic step.
      if (args.action === "insert") {
        state.logsByDate[args.date] = removeRow(
          state.logsByDate[args.date],
          args.insert.tempId,
        );
      } else {
        (state.logsByDate[args.date] ??= []).push(args.delete.snapshot);
      }
      state.error = action.payload ?? "Sync failed; queued for retry.";
    });

    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearNutritionCache, setSelectedDate } = nutritionSlice.actions;
export default nutritionSlice.reducer;
