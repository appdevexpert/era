import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  deleteMealLog,
  deleteWaterLog,
  getMealLogsForRange,
  getUserMealPlan,
  getWaterLogsForRange,
  insertMealLog,
  insertWaterLog,
  saveUserMealPlan,
  updateWaterAmount,
  type MealLogInsertPayload,
} from "@/app/services/nutritionService";
import { generateWeeklyMealPlan } from "@/app/services/aiMealPlanService";
import { signOutThunk } from "./authSlice";
import { enqueue } from "./syncSlice";
import type {
  MealCategoryEnum,
  MealLogRow,
  MealLogSource,
  WaterLogRow,
  WeeklyMealPlan,
} from "@/app/types/nutrition";
import type { LoadingState } from "@/app/types";
import type { RootState } from "@/app/stores/store";
import { phaseForWeek } from "@/app/utils/nutritionMappers";
import {
  calculateDailyTargets,
  type GoalInputs,
} from "@/app/utils/nutritionTargets";
import {
  addDays,
  isoDatesForWeek,
  parseIsoDate,
  startOfWeek,
  todayIso,
  toIsoDate,
} from "@/app/utils/nutritionDates";

// =====================================================================
// Nutrition Redux slice — caches the per-user AI meal plans (keyed by
// program week) and the user's logs (keyed by date). Persisted to
// AsyncStorage so the screen renders instantly on cold-start.
// =====================================================================

interface NutritionState {
  status: LoadingState;
  error: string | null;
  /** AI-generated meal plans, keyed by program week number. */
  planByWeek: Record<number, WeeklyMealPlan>;
  /** Per-week flag while a plan is being generated (drives the skeleton). */
  generatingWeeks: Record<number, boolean>;
  planError: string | null;
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
  planByWeek: {},
  generatingWeeks: {},
  planError: null,
  logsByDate: {},
  waterByDate: {},
  mutatingWaterByDate: {},
  selectedDate: todayIso(),
  loadedAt: null,
};

// -------- helpers ----------------------------------------------------

const MEALS_PER_DAY = 4;

/** Build the macro-calc inputs from the persisted onboarding goal data. */
function goalInputsFromState(state: RootState): GoalInputs {
  const g = state.onboarding.goalData;
  return {
    birth_year: typeof g.birthYear === "number" ? g.birthYear : null,
    gender: g.gender ?? null,
    weight: typeof g.weight === "number" ? g.weight : 70,
    weight_unit: g.weightUnit === "lb" ? "lb" : "kg",
    height: typeof g.height === "number" ? g.height : 175,
    height_unit: g.heightUnit === "ft" ? "ft" : "cm",
    level: g.level ?? null,
    goal: g.goal ?? null,
  };
}

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

// -------- thunks: load logs / water for the selected week ------------

interface LoadNutritionBootstrapResult {
  logsForWeek: Record<string, MealLogRow[]>;
  waterForWeek: Record<string, WaterLogRow>;
  selectedDate: string;
  loadedAt: string;
}

/**
 * Load the meal + water logs for the currently selected week. The plan
 * itself is loaded/generated separately by ensureWeekPlan.
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

    const [mealLogs, waterLogs] = await Promise.all([
      userId
        ? getMealLogsForRange(userId, startIso, endIso)
        : Promise.resolve([] as MealLogRow[]),
      userId
        ? getWaterLogsForRange(userId, startIso, endIso)
        : Promise.resolve([] as WaterLogRow[]),
    ]);

    return {
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
 * Ensure a program week has a plan: use the cached one, else load it from
 * Supabase, else generate it via AI and persist it. Generated once and
 * fixed — the user cannot regenerate.
 */
export const ensureWeekPlan = createAsyncThunk<
  { weekNumber: number; plan: WeeklyMealPlan | null },
  number,
  { rejectValue: string; state: RootState }
>("nutrition/ensureWeekPlan", async (weekNumber, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const userId = state.auth.user?.id ?? null;
    if (!userId) return { weekNumber, plan: null };
    if (state.nutrition.planByWeek[weekNumber]) {
      return { weekNumber, plan: null }; // already cached
    }

    const existing = await getUserMealPlan(userId, weekNumber);
    if (existing) return { weekNumber, plan: existing };

    const phase = phaseForWeek(weekNumber);
    const targets = calculateDailyTargets(goalInputsFromState(state), phase);
    const items = await generateWeeklyMealPlan({
      weekNumber,
      phase,
      mealsPerDay: MEALS_PER_DAY,
      kcal: targets.kcal,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fats_g: targets.fats_g,
    });
    const saved = await saveUserMealPlan({
      userId,
      weekNumber,
      phase,
      targets,
      items,
    });
    return { weekNumber, plan: saved };
  } catch (error) {
    console.warn("[ensureWeekPlan] failed:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Unable to build your meal plan.",
    );
  }
}, {
  // Skip if this week is already cached or currently generating — prevents
  // two screens (PlanGeneration + Nutrition) generating the same week twice
  // (which caused a duplicate user_meal_plans row).
  condition: (weekNumber, { getState }) => {
    const { planByWeek, generatingWeeks } = getState().nutrition;
    return !planByWeek[weekNumber] && !generatingWeeks[weekNumber];
  },
});

/**
 * Move the selected date and fetch logs for the new week if we don't
 * already have them. UI updates optimistically.
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
  row: WaterLogRow | null;
}

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
  /**
   * Client-generated UUID used as BOTH the optimistic row's id and the
   * Supabase row's primary key. Sending the same id on a retry makes the
   * insert idempotent — the second attempt hits the PK unique constraint
   * and is treated as success by `insertMealLog`.
   */
  id: string;
  category: MealCategoryEnum;
  source: MealLogSource;
  /** The plan item this log fulfils, when toggling a planned meal. */
  planItemId?: string | null;
  name: string;
  /** Optional free-text note/comment stored on the log. */
  notes?: string | null;
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
  inserted?: MealLogRow;
  deletedId?: string;
}

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
        id: args.insert.id,
        user_id: userId,
        log_date: args.date,
        user_meal_plan_item_id: args.insert.planItemId ?? null,
        category: args.insert.category,
        source: args.insert.source,
        name_snapshot: args.insert.name,
        kcal: args.insert.kcal,
        protein_g: args.insert.protein_g,
        carbs_g: args.insert.carbs_g,
        fats_g: args.insert.fats_g,
        notes: args.insert.notes ?? null,
      };
      const row = await insertMealLog(payload);
      return { inserted: row };
    }

    await deleteMealLog(args.delete.logId);
    return { deletedId: args.delete.logId };
  } catch (error) {
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
    /**
     * Idempotently add a server row into logsByDate, keyed by `id`. Used
     * by the sync queue when an insertMealLog retry succeeds AFTER the
     * thunk's rejected handler already rolled back the optimistic row —
     * without this, Redux would stay empty even though the server has the
     * row, and the user would re-tap and create a true duplicate.
     */
    upsertMealLog(state, action: PayloadAction<{ date: string; row: MealLogRow }>) {
      const { date, row } = action.payload;
      const list = state.logsByDate[date] ??= [];
      const idx = list.findIndex((r) => r.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.push(row);
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
      state.logsByDate = action.payload.logsForWeek;
      state.waterByDate = action.payload.waterForWeek;
      state.selectedDate = action.payload.selectedDate;
      state.loadedAt = action.payload.loadedAt;
    });
    builder.addCase(loadNutritionBootstrap.rejected, (state, action) => {
      state.status = "failed";
      state.error = action.payload ?? "Unable to load nutrition.";
    });

    // --- ensureWeekPlan: load-or-generate the week's plan -----------
    builder.addCase(ensureWeekPlan.pending, (state, action) => {
      state.generatingWeeks[action.meta.arg] = true;
      state.planError = null;
    });
    builder.addCase(ensureWeekPlan.fulfilled, (state, action) => {
      const { weekNumber, plan } = action.payload;
      if (plan) state.planByWeek[weekNumber] = plan;
      delete state.generatingWeeks[weekNumber];
    });
    builder.addCase(ensureWeekPlan.rejected, (state, action) => {
      delete state.generatingWeeks[action.meta.arg];
      state.planError = action.payload ?? "Unable to build your meal plan.";
    });

    builder.addCase(selectNutritionDate.pending, (state, action) => {
      state.selectedDate = action.meta.arg;
    });
    builder.addCase(selectNutritionDate.fulfilled, (state, action) => {
      state.selectedDate = action.payload.date;
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
          id: args.insert.id,
          user_id: "",
          log_date: args.date,
          user_meal_plan_item_id: args.insert.planItemId ?? null,
          category: args.insert.category,
          source: args.insert.source,
          name_snapshot: args.insert.name,
          kcal: args.insert.kcal,
          protein_g: args.insert.protein_g,
          carbs_g: args.insert.carbs_g,
          fats_g: args.insert.fats_g,
          notes: args.insert.notes ?? null,
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
        // Optimistic row's id == server row's id (client-supplied UUID),
        // so this just refreshes the row with the canonical server values
        // (e.g. user_id, which we left blank optimistically).
        const list = state.logsByDate[args.date] ?? [];
        const idx = list.findIndex((row) => row.id === args.insert.id);
        if (idx >= 0) list[idx] = action.payload.inserted;
        else list.push(action.payload.inserted);
        state.logsByDate[args.date] = list;
      }
    });
    builder.addCase(toggleMealLog.rejected, (state, action) => {
      const args = action.meta.arg;
      if (args.action === "insert") {
        state.logsByDate[args.date] = removeRow(
          state.logsByDate[args.date],
          args.insert.id,
        );
      } else {
        (state.logsByDate[args.date] ??= []).push(args.delete.snapshot);
      }
      state.error = action.payload ?? "Sync failed; queued for retry.";
    });

    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { clearNutritionCache, setSelectedDate, upsertMealLog } = nutritionSlice.actions;
export default nutritionSlice.reducer;
