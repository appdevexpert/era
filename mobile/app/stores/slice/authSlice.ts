import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  type AuthUser,
  mapSupabaseUser,
  signUp,
  signIn,
  resetPassword,
  signOut,
} from "@/app/utils/auth";
import type { LoadingState } from "@/app/types";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isOnboarded: boolean;

  loadingStatus: LoadingState;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isOnboarded: false,

  loadingStatus: "idle",
  error: null,
};

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
    return mapSupabaseUser(data.user);
  },
);

export const signInThunk = createAsyncThunk(
  "auth/signIn",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await signIn(email, password);
    if (error) return rejectWithValue(error.message);
    if (!data.user) return rejectWithValue("Sign in failed");
    return mapSupabaseUser(data.user);
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
      state.loadingStatus = "idle";
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    completeOnboarding: (state) => { state.isOnboarded = true; },

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
      state.user = action.payload;
      state.isLoggedIn = true;
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
    builder.addCase(signOutThunk.fulfilled, () => initialState);
    builder.addCase(signOutThunk.rejected, (state, action) => {
      state.error = action.payload as string;
      // Still reset user state to avoid stale session
      state.user = null;
      state.isLoggedIn = false;
    });
  },
});

export const {
  login, logout, clearSession, updateUser, clearError,
  completeOnboarding,
} = authSlice.actions;

export default authSlice.reducer;
