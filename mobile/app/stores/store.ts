import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import type { AnyAction, Reducer } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import { RESET_ALL } from "./resetAction";
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
    "userId",
    "programId",
    "overview",
    "currentDayDetail",
    "dayDetailsById",
    "completedDayIds",
    "completedDayDurations",
    "loadedAt",
    "versionSignature",
    "assignment",
    "userExerciseOrderByDay",
  ],
};
const nutritionPersistConfig = {
  key: "nutrition",
  storage: AsyncStorage,
  whitelist: ["bootstrap", "logsByDate", "waterByDate", "selectedDate", "loadedAt"],
};
// Only the queue itself survives app kills — `flushing` is a runtime lock
// that has no meaning across processes, and persisting it could leave a
// fresh launch deadlocked.
const syncPersistConfig = {
  key: "sync",
  storage: AsyncStorage,
  whitelist: ["queue"],
};
// Active workout session is persisted so a mid-workout app kill (OS memory
// pressure, force-quit, crash) doesn't make the user lose their progress.
// Pairs with the local-first sync queue: the IDs in here are client-generated
// UUIDs, and the row inserts they reference are queued separately. Anything
// purely ephemeral / runtime-derived stays OUT of this whitelist on purpose
// (e.g. exerciseStats + lastLoggedSetsByExercise are refetched on resume so
// they reflect the latest historical data).
const sessionPersistConfig = {
  key: "session",
  storage: AsyncStorage,
  whitelist: [
    "sessionId",
    "programDayId",
    "exerciseMap",
    "setMap",
    "setsLogged",
    "exercisesCompleted",
    "sessionStartedAt",
    "accumulatedSeconds",
    "completedSets",
    "completedExerciseIds",
    "exerciseComments",
    "suggestedWeightBySetId",
    "isEditMode",
  ],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedOnboardingReducer = persistReducer(onboardingPersistConfig, onboardingReducer);
const persistedPreferencesReducer = persistReducer(preferencesPersistConfig, preferencesReducer);
const persistedWorkoutReducer = persistReducer(workoutPersistConfig, workoutReducer);
const persistedNutritionReducer = persistReducer(nutritionPersistConfig, nutritionReducer);
const persistedSyncReducer = persistReducer(syncPersistConfig, syncReducer);
const persistedSessionReducer = persistReducer(sessionPersistConfig, sessionReducer);

const combinedReducer = combineReducers({
  auth: persistedAuthReducer,
  onboarding: persistedOnboardingReducer,
  workout: persistedWorkoutReducer,
  nutrition: persistedNutritionReducer,
  session: persistedSessionReducer,
  sync: persistedSyncReducer,
  reward: rewardReducer,
  weight: weightReducer,
  photo: photoReducer,
  pr: prReducer,
  preferences: persistedPreferencesReducer,
});

const rootReducer: Reducer<ReturnType<typeof combinedReducer>, AnyAction> = (
  state,
  action,
) => {
  if (action.type === RESET_ALL) {
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
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
