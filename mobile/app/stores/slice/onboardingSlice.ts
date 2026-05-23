import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchUserGoalData,
  insertGoal,
  type GoalData,
} from "@/app/services/onboardingService";
import { signOutThunk } from "./authSlice";
import type { RootState } from "@/app/stores/store";

interface OnboardingState {
  goalData: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  isSubmitted: boolean;
}

const initialState: OnboardingState = {
  goalData: {},
  isLoading: false,
  error: null,
  isSubmitted: false,
};

export const submitGoalData = createAsyncThunk(
  "onboarding/submitGoalData",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const userId = state.auth.user?.id;
    if (!userId) return rejectWithValue("User not authenticated");

    const g = state.onboarding.goalData;

    // Skip the upsert when Redux is empty (returning user signing back in
    // after a sign-out reset). Pushing the defaults would overwrite the
    // real row sitting in Supabase. `loadGoalDataFromSupabase` will pull
    // the existing row into Redux instead.
    const hasMeaningfulData =
      (typeof g.weight === "number" && g.weight > 0) ||
      (typeof g.height === "number" && g.height > 0) ||
      !!g.gender ||
      !!g.level ||
      !!g.goal;
    if (!hasMeaningfulData) return;

    const goalData: GoalData = {
      user_id: userId,
      gender: g.gender ?? null,
      birth_year: typeof g.birthYear === "number" ? g.birthYear : null,
      level: g.level ?? null,
      goal: g.goal ?? null,
      focus: g.focus ?? null,
      advanced_focus: g.advancedFocus ?? [],
      friction: g.friction ?? null,
      weight: g.weight ?? 0,
      weight_unit: g.weightUnit ?? "kg",
      height: g.height ?? 0,
      height_unit: g.heightUnit ?? "cm",
    };

    const { error } = await insertGoal(goalData);
    if (error) return rejectWithValue(error.message ?? "Failed to save goal data");
  },
);

/**
 * Pull the user's body data from Supabase into Redux.
 *
 * Existing users (signed in via a fresh app install or PersistGate) won't
 * have `goalData` populated locally — without this, the nutrition daily
 * targets fall back to placeholder defaults instead of the real Mifflin-
 * St Jeor numbers.
 *
 * Safe to dispatch on every auth restore: no-ops when nothing has changed.
 */
export const loadGoalDataFromSupabase = createAsyncThunk<
  Record<string, unknown> | null,
  void,
  { rejectValue: string; state: RootState }
>("onboarding/loadGoalData", async (_, { getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) return null;

  const { data, error } = await fetchUserGoalData(userId);
  if (error) {
    return rejectWithValue(error.message ?? "Failed to load goal data");
  }
  if (!data) return null;

  return {
    gender: data.gender ?? null,
    birthYear: data.birth_year ?? null,
    level: data.level ?? null,
    goal: data.goal ?? null,
    focus: data.focus ?? null,
    advancedFocus: data.advanced_focus ?? [],
    friction: data.friction ?? null,
    weight: data.weight ?? 0,
    weightUnit: data.weight_unit ?? "kg",
    height: data.height ?? 0,
    heightUnit: data.height_unit ?? "cm",
  };
});

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    updateGoalData: (state, action: PayloadAction<Record<string, any>>) => {
      state.goalData = { ...state.goalData, ...action.payload };
    },
    setGoalData: (state, action: PayloadAction<Record<string, any>>) => {
      state.goalData = action.payload;
    },
    resetOnboarding: () => initialState,
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder.addCase(submitGoalData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(submitGoalData.fulfilled, (state) => {
      state.isLoading = false;
      state.isSubmitted = true;
    });
    builder.addCase(submitGoalData.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    builder.addCase(loadGoalDataFromSupabase.fulfilled, (state, action) => {
      if (action.payload) {
        // Merge so any in-flight onboarding edits survive a rehydrate.
        state.goalData = { ...action.payload, ...state.goalData };
      }
    });
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { updateGoalData, setGoalData, resetOnboarding, clearError } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;
