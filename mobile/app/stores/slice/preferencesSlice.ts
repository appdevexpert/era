import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type WeightUnit = "kg" | "lb";

export interface PreferencesState {
  weightUnit: WeightUnit;
}

const initialState: PreferencesState = {
  weightUnit: "kg",
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setWeightUnit: (state, action: PayloadAction<WeightUnit>) => {
      state.weightUnit = action.payload;
    },
  },
});

export const { setWeightUnit } = preferencesSlice.actions;
export default preferencesSlice.reducer;
