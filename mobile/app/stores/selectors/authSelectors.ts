import { RootState } from "../store";

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsLoggedIn = (state: RootState) => state.auth.isLoggedIn;
export const selectIsOnboarded = (state: RootState) => state.auth.isOnboarded;
export const selectIsPlanGenerated = (state: RootState) => state.auth.isPlanGenerated;
export const selectAuthLoading = (state: RootState) => state.auth.loadingStatus;
export const selectAuthError = (state: RootState) => state.auth.error;
