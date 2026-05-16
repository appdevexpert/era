import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { insertGoal, type GoalData } from "@/app/services/onboardingService";
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
    const goalData: GoalData = {
      user_id: userId,
      gender: g.gender ?? null,
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
    builder.addCase(signOutThunk.fulfilled, () => initialState);
  },
});

export const { updateGoalData, setGoalData, resetOnboarding, clearError } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;
