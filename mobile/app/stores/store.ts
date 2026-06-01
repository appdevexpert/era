import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import authReducer from "./slice/authSlice";
import nutritionReducer from "./slice/nutritionSlice";
import onboardingReducer from "./slice/onboardingSlice";
import photoReducer from "./slice/photoSlice";
import prReducer from "./slice/prSlice";
import preferencesReducer from "./slice/preferencesSlice";
import rewardReducer from "./slice/rewardSlice";
import sessionReducer from "./slice/sessionSlice";
import syncReducer from "./slice/syncSlice";
import weightReducer from "./slice/weightSlice";
import workoutReducer from "./slice/workoutSlice";

const authPersistConfig = { key: "auth", storage: AsyncStorage };
const onboardingPersistConfig = { key: "onboarding", storage: AsyncStorage };
const preferencesPersistConfig = { key: "preferences", storage: AsyncStorage };
const workoutPersistConfig = {
  key: "workout",
  storage: AsyncStorage,
  whitelist: [
    "programId",
    "overview",
    "currentDayDetail",
    "completedDayIds",
    "loadedAt",
    "versionSignature",
  ],
};
const nutritionPersistConfig = {
  key: "nutrition",
  storage: AsyncStorage,
  whitelist: ["bootstrap", "logsByDate", "waterByDate", "selectedDate", "loadedAt"],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedOnboardingReducer = persistReducer(onboardingPersistConfig, onboardingReducer);
const persistedPreferencesReducer = persistReducer(preferencesPersistConfig, preferencesReducer);
const persistedWorkoutReducer = persistReducer(workoutPersistConfig, workoutReducer);
const persistedNutritionReducer = persistReducer(nutritionPersistConfig, nutritionReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    onboarding: persistedOnboardingReducer,
    workout: persistedWorkoutReducer,
    nutrition: persistedNutritionReducer,
    session: sessionReducer,
    sync: syncReducer,
    reward: rewardReducer,
    weight: weightReducer,
    photo: photoReducer,
    pr: prReducer,
    preferences: persistedPreferencesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const persistor = persistStore(store);
