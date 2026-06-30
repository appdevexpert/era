import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type WeightUnit = "kg" | "lb";

export type NotificationKind =
  | "dailyReminder"
  | "streakWarning"
  | "prAlerts"
  | "weeklySummary";

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

export interface NotificationPreferences {
  dailyReminder: boolean;
  streakWarning: boolean;
  prAlerts: boolean;
  weeklySummary: boolean;
}

export interface PreferencesState {
  weightUnit: WeightUnit;
  notifications: NotificationPreferences;
  notificationPermissionStatus: NotificationPermissionStatus;
  hasSeenPlanAdjustmentSheet: boolean;
}

const initialState: PreferencesState = {
  weightUnit: "kg",
  notifications: {
    dailyReminder: true,
    streakWarning: true,
    prAlerts: true,
    weeklySummary: true,
  },
  notificationPermissionStatus: "undetermined",
  hasSeenPlanAdjustmentSheet: false,
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setWeightUnit: (state, action: PayloadAction<WeightUnit>) => {
      state.weightUnit = action.payload;
    },
    setNotificationToggle: (
      state,
      action: PayloadAction<{ kind: NotificationKind; value: boolean }>,
    ) => {
      state.notifications[action.payload.kind] = action.payload.value;
    },
    setNotificationPermissionStatus: (
      state,
      action: PayloadAction<NotificationPermissionStatus>,
    ) => {
      state.notificationPermissionStatus = action.payload;
    },
    setHasSeenPlanAdjustmentSheet: (state, action: PayloadAction<boolean>) => {
      state.hasSeenPlanAdjustmentSheet = action.payload;
    },
  },
});

export const {
  setWeightUnit,
  setNotificationToggle,
  setNotificationPermissionStatus,
  setHasSeenPlanAdjustmentSheet,
} = preferencesSlice.actions;
export default preferencesSlice.reducer;
