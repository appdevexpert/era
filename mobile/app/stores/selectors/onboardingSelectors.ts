import { RootState } from "../store";

export const selectGoalData = (state: RootState) => state.onboarding.goalData;
export const selectOnboardingLoading = (state: RootState) => state.onboarding.isLoading;
export const selectOnboardingError = (state: RootState) => state.onboarding.error;
