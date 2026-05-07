import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
});

export const { updateGoalData, setGoalData, resetOnboarding, clearError } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;
