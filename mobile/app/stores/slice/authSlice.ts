import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  type AuthUser,
  mapSupabaseUser,
  signUp,
  signIn,
  resetPassword,
  signOut,
  signOutLocal,
} from "@/app/utils/auth";
import { deleteAccount } from "@/app/services/accountService";
import { fetchUserGoalData } from "@/app/services/onboardingService";
import { saveProgramStartDate } from "@/app/services/profileService";
import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from "@/app/services/revenueCatService";
import { reportBackgroundError } from "@/app/utils/sentry";
import type { LoadingState } from "@/app/types";
import { RESET_ALL } from "@/app/stores/resetAction";
import type { RootState } from "@/app/stores/store";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isOnboarded: boolean;
  isPlanGenerated: boolean;
  /** YYYY-MM-DD when the user first completed plan generation */
  programStartDate: string | null;
  /**
   * Server-side onboarding status. true = goals row exists in Supabase,
   * false = no row, null = not yet checked (cold-start before getSession
   * resolves, or before social login finishes its goal lookup).
   */
  hasGoals: boolean | null;
  /**
   * True once the user has slid through the GetStarted screen at least
   * once on this install. Persists across logout (logout returns the user
   * to Login, not GetStarted) and only resets on account delete (RESET_ALL
   * wipes the whole slice back to initialState).
   */
  hasSeenGetStarted: boolean;
  /**
   * True while the user is in the middle of a password-recovery deep link
   * flow. Persisted so an app crash mid-recovery doesn't bounce the user
   * back to the wrong stack — they reopen the app, the flag is still set,
   * Navigation pins them on AuthStack/ForgotPassword.
   */
  isRecovery: boolean;

  loadingStatus: LoadingState;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isOnboarded: false,
  isPlanGenerated: false,
  programStartDate: null,
  hasGoals: null,
  hasSeenGetStarted: false,
  isRecovery: false,

  loadingStatus: "idle",
  error: null,
};

const PERSISTED_REDUX_KEYS = [
  "persist:auth",
  "persist:onboarding",
  "persist:workout",
  "persist:nutrition",
  "persist:preferences",
] as const;

// --- Async thunks ---

export const signUpThunk = createAsyncThunk(
  "auth/signUp",
  async (
    { email, password, name }: { email: string; password: string; name: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await signUp(email, password, name);
    if (error) return rejectWithValue(error.message);
    if (!data.user) return rejectWithValue("Sign up failed");
    const user = mapSupabaseUser(data.user);
    // Link this device's RC anonymous id to the Supabase user so any future
    // purchases attach to the right account. Failures shouldn't block signup.
    identifyRevenueCatUser(user.id).catch((err) =>
      reportBackgroundError("auth.identifyRevenueCatUser.signUp", err, {
        userId: user.id,
      }),
    );
    return user;
  },
);

export const signInThunk = createAsyncThunk<
  { user: AuthUser; hasGoals: boolean },
  { email: string; password: string },
  { rejectValue: string }
>(
  "auth/signIn",
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await signIn(email, password);
    if (error) return rejectWithValue(error.message);
    if (!data.user) return rejectWithValue("Sign in failed");
    const user = mapSupabaseUser(data.user);
    // Decide auth-first onboarding routing atomically with the login. If the
    // goals lookup itself errors we conservatively treat it as "unknown but
    // probably exists" (true) so we don't push a returning user back into
    // onboarding because of a transient network blip; the next bootstrap
    // attempt will surface real issues.
    const { data: goalRow } = await fetchUserGoalData(user.id);
    identifyRevenueCatUser(user.id).catch((err) =>
      reportBackgroundError("auth.identifyRevenueCatUser.signIn", err, {
        userId: user.id,
      }),
    );
    return { user, hasGoals: goalRow !== null };
  },
);

export const resetPasswordThunk = createAsyncThunk(
  "auth/resetPassword",
  async ({ email }: { email: string }, { rejectWithValue }) => {
    const { error } = await resetPassword(email);
    if (error) return rejectWithValue(error.message);
  },
);

export const signOutThunk = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    const { error } = await signOut();
    if (error) return rejectWithValue(error.message);
    resetRevenueCatUser().catch((err) =>
      reportBackgroundError("auth.resetRevenueCatUser", err),
    );
  },
);

/** Deletes the Supabase Auth user through the server-side Edge Function,
 * signs out, then wipes the entire Redux tree. The RESET_ALL action sends
 * every slice back to initialState (including hasSeenGetStarted = false);
 * redux-persist's middleware auto-writes that empty state to AsyncStorage
 * on the next tick. After this resolves, Navigation routes to AuthStack
 * and AuthNavigator's initialRoute lands on GetStarted again. */
export const deleteAccountThunk = createAsyncThunk(
  "auth/deleteAccount",
  async (_, { getState, dispatch, rejectWithValue }) => {
    const userId = (getState() as RootState).auth.user?.id;
    if (!userId) return rejectWithValue("Not signed in.");

    try {
      await deleteAccount();
      const { error: signOutError } = await signOutLocal();
      if (signOutError) {
        console.warn(
          "[auth] local signOut after account deletion failed",
          signOutError,
        );
      }
      resetRevenueCatUser().catch((err) =>
        reportBackgroundError("auth.resetRevenueCatUser.deleteAccount", err),
      );
      dispatch({ type: RESET_ALL });
      await AsyncStorage.multiRemove(PERSISTED_REDUX_KEYS);
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Account deletion failed.",
      );
    }
  },
);

/**
 * Marks plan generation complete and persists programStartDate to Supabase
 * so it follows the user across devices. Local-first: Redux update is
 * synchronous via setPlanGenerationLocal; the remote push runs after and
 * never blocks the UI. Push failures are retried on the next loadWorkoutBootstrap.
 */
export const completePlanGeneration = createAsyncThunk(
  "auth/completePlanGeneration",
  async (_, { getState, dispatch }) => {
    dispatch(setPlanGenerationLocal());
    const { user, programStartDate } = (getState() as RootState).auth;
    if (user?.id && programStartDate) {
      try {
        await saveProgramStartDate(user.id, programStartDate);
      } catch (error) {
        reportBackgroundError("auth.pushProgramStartDate", error, { userId: user.id });
      }
    }
  },
);

// --- Slice ---

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isLoggedIn = true;
      state.loadingStatus = "idle";
      state.error = null;
    },
    logout: () => initialState,
    clearSession: (state) => {
      state.user = null;
      state.isLoggedIn = false;
      state.isPlanGenerated = false;
      state.isRecovery = false;
      state.isOnboarded = false;
      state.hasGoals = null;
      state.loadingStatus = "idle";
      state.error = null;
    },
    setRecovery: (state, action: PayloadAction<boolean>) => {
      state.isRecovery = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    setHasGoals: (state, action: PayloadAction<boolean | null>) => {
      state.hasGoals = action.payload;
    },
    setHasSeenGetStarted: (state, action: PayloadAction<boolean>) => {
      state.hasSeenGetStarted = action.payload;
    },
    completeOnboarding: (state) => { state.isOnboarded = true; },
    setPlanGenerationLocal: (state) => {
      state.isPlanGenerated = true;
      if (!state.programStartDate) {
        state.programStartDate = new Date().toISOString().split("T")[0];
      }
    },
    setProgramStartDate: (state, action: PayloadAction<string | null>) => {
      state.programStartDate = action.payload;
    },
    resetPlanGeneration: (state) => { state.isPlanGenerated = false; },

    clearError: (state) => {
      state.error = null;
      state.loadingStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    // Sign Up
    builder.addCase(signUpThunk.pending, (state) => {
      state.loadingStatus = "loading";
      state.error = null;
    });
    builder.addCase(signUpThunk.fulfilled, (state, action) => {
      state.loadingStatus = "succeeded";
      state.user = action.payload;
      state.isLoggedIn = true;
      // Fresh signup → no goals row yet, route to onboarding next.
      state.hasGoals = false;
      state.isOnboarded = false;
      state.error = null;
    });
    builder.addCase(signUpThunk.rejected, (state, action) => {
      state.loadingStatus = "failed";
      state.error = action.payload as string;
    });

    // Sign In
    builder.addCase(signInThunk.pending, (state) => {
      state.loadingStatus = "loading";
      state.error = null;
    });
    builder.addCase(signInThunk.fulfilled, (state, action) => {
      state.loadingStatus = "succeeded";
      state.user = action.payload.user;
      state.isLoggedIn = true;
      state.hasGoals = action.payload.hasGoals;
      state.isOnboarded = action.payload.hasGoals;
      state.error = null;
    });
    builder.addCase(signInThunk.rejected, (state, action) => {
      state.loadingStatus = "failed";
      state.error = action.payload as string;
    });

    // Reset Password
    builder.addCase(resetPasswordThunk.pending, (state) => {
      state.loadingStatus = "loading";
      state.error = null;
    });
    builder.addCase(resetPasswordThunk.fulfilled, (state) => {
      state.loadingStatus = "succeeded";
    });
    builder.addCase(resetPasswordThunk.rejected, (state, action) => {
      state.loadingStatus = "failed";
      state.error = action.payload as string;
    });

    // Sign Out
    builder.addCase(signOutThunk.pending, (state) => {
      state.loadingStatus = "loading";
      state.error = null;
    });
    builder.addCase(signOutThunk.fulfilled, (state) => {
      state.user = null;
      state.isLoggedIn = false;
      state.isPlanGenerated = false;
      state.isRecovery = false;
      // Clear onboarding state so the NEXT user signing in on this device
      // gets routed via a fresh server-side hasGoals check. hasSeenGetStarted
      // is intentionally NOT cleared — logout returns the user to Login,
      // not GetStarted; only account delete (RESET_ALL) reverts to GetStarted.
      state.isOnboarded = false;
      state.hasGoals = null;
      state.loadingStatus = "idle";
      state.error = null;
    });
    builder.addCase(signOutThunk.rejected, (state, action) => {
      state.loadingStatus = "failed";
      state.error = action.payload as string;
      // Still reset user state to avoid stale session
      state.user = null;
      state.isLoggedIn = false;
      state.isPlanGenerated = false;
      state.isRecovery = false;
      state.isOnboarded = false;
      state.hasGoals = null;
    });

    // Delete Account — fulfilled is a no-op because RESET_ALL has already
    // wiped the slice back to initialState before the action dispatches.
    builder.addCase(deleteAccountThunk.pending, (state) => {
      state.loadingStatus = "loading";
      state.error = null;
    });
    builder.addCase(deleteAccountThunk.rejected, (state, action) => {
      state.loadingStatus = "failed";
      state.error = (action.payload as string) ?? "Account deletion failed.";
    });
  },
});

export const {
  login, logout, clearSession, updateUser, clearError,
  completeOnboarding, setPlanGenerationLocal, setProgramStartDate, resetPlanGeneration,
  setRecovery, setHasGoals, setHasSeenGetStarted,
} = authSlice.actions;

export default authSlice.reducer;
