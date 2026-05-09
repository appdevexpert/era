import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import authReducer from "./slice/authSlice";
import onboardingReducer from "./slice/onboardingSlice";
import workoutReducer from "./slice/workoutSlice";

const authPersistConfig = { key: "auth", storage: AsyncStorage };
const onboardingPersistConfig = { key: "onboarding", storage: AsyncStorage };
const workoutPersistConfig = {
  key: "workout",
  storage: AsyncStorage,
  whitelist: ["programId", "overview", "currentDayDetail", "loadedAt"],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedOnboardingReducer = persistReducer(onboardingPersistConfig, onboardingReducer);
const persistedWorkoutReducer = persistReducer(workoutPersistConfig, workoutReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    onboarding: persistedOnboardingReducer,
    workout: persistedWorkoutReducer,
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
