#!/bin/bash

# =============================================================================
# Boilerplate Generator
# =============================================================================
# Usage:
#   npx create-expo-app@latest my-app
#   cd my-app
#   bash setup-boilerplate.sh
# =============================================================================

set -e

echo "============================================"
echo "  Boilerplate Setup"
echo "============================================"

# ─────────────────────────────────────────────
# 1. Install dependencies
# ─────────────────────────────────────────────
echo ""
echo "[1/4] Installing dependencies..."

npx expo install \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  react-native-reanimated \
  @reduxjs/toolkit \
  react-redux \
  redux-persist \
  @react-native-async-storage/async-storage \
  @gorhom/bottom-sheet \
  expo-splash-screen \
  expo-haptics \
  expo-image \
  @supabase/supabase-js \
  @sentry/react-native

echo "[1/4] Dependencies installed."

# ─────────────────────────────────────────────
# 2. Create folder structure
# ─────────────────────────────────────────────
echo ""
echo "[2/4] Creating folder structure..."

mkdir -p app/navigation
mkdir -p app/stores/slice
mkdir -p app/stores/selectors
mkdir -p app/screen/onboarding
mkdir -p app/screen/auth
mkdir -p app/screen/planGeneration
mkdir -p app/screen/home
mkdir -p app/components/layout
mkdir -p app/components/ui
mkdir -p app/hooks
mkdir -p app/services
mkdir -p app/utils
mkdir -p app/constants
mkdir -p app/config
mkdir -p app/types

echo "[2/4] Folder structure created."

# ─────────────────────────────────────────────
# 3. Write all files
# ─────────────────────────────────────────────
echo ""
echo "[3/4] Writing files..."

# ── Placeholder screen generator ──
# Creates a minimal screen component with just the screen name displayed.
# This way every screen file exists and is importable, so navigation works
# out of the box. You replace each placeholder with real UI as you build.
write_placeholder_screen() {
  local filepath=$1
  local screen_name=$2
  cat > "$filepath" << SCREENEOF
import { StyleSheet, Text, View } from "react-native";

const ${screen_name} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${screen_name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default ${screen_name};
SCREENEOF
}

# =============================================
# tsconfig.json
# =============================================
cat > tsconfig.json << 'TSEOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
TSEOF

# =============================================
# app/index.tsx
# =============================================
cat > app/index.tsx << 'EOF'
import "react-native-get-random-values";
import * as Sentry from "@sentry/react-native";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import App from "./App";
import { initSentry } from "./utils/sentry";

void SplashScreen.preventAutoHideAsync().catch(() => {});
initSentry();
registerRootComponent(Sentry.wrap(App));
EOF

# =============================================
# app/App.tsx
# =============================================
cat > app/App.tsx << 'EOF'
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Navigation from "./navigation/Navigation";
import { persistor, store } from "./stores/store";

const App = () => {
  useEffect(() => {
    // Initialize services here (analytics, push notifications, etc.)
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <StatusBar barStyle="light-content" translucent={true} />
              <Navigation />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
EOF

# =============================================
# app/utils/sentry.ts
# =============================================
cat > app/utils/sentry.ts << 'EOF'
import * as Sentry from "@sentry/react-native";

export const navigationIntegration = Sentry.reactNavigationIntegration();

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
    integrations: [navigationIntegration],
    tracesSampleRate: 1.0,
    enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  });
};

export const setSentryUser = (user: { id: string; email?: string }) => {
  Sentry.setUser(user);
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};
EOF

# =============================================
# app/utils/supabase.ts
# =============================================
cat > app/utils/supabase.ts << 'EOF'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
EOF

# =============================================
# app/utils/responsive.ts
# =============================================
cat > app/utils/responsive.ts << 'EOF'
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const horizontalScale = (size: number) =>
  (SCREEN_WIDTH / BASE_WIDTH) * size;

export const verticalScale = (size: number) =>
  (SCREEN_HEIGHT / BASE_HEIGHT) * size;

export const moderateScale = (size: number, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

export const responsiveFontSize = (size: number) => moderateScale(size, 0.3);

export const spacing = {
  xs: horizontalScale(4),
  sm: horizontalScale(8),
  md: horizontalScale(16),
  lg: horizontalScale(24),
  xl: horizontalScale(32),
};
EOF

# =============================================
# app/config/env.ts
# =============================================
cat > app/config/env.ts << 'EOF'
export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  SUPABASE_EDGE_FUNCTION_URL: process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL ?? "",
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
};

export const validateEnv = () => {
  const missing = Object.entries(ENV).filter(([, v]) => !v);
  if (missing.length) {
    console.warn("[ENV] Missing:", missing.map(([k]) => k).join(", "));
  }
};
EOF

# =============================================
# app/constants/fonts.ts
# =============================================
cat > app/constants/fonts.ts << 'EOF'
// Update these with your actual font family names after loading fonts
export const FONTS = {
  light: "",
  regular: "",
  medium: "",
  semiBold: "",
  bold: "",
  extraBold: "",
};
EOF

# =============================================
# app/types/index.ts
# =============================================
cat > app/types/index.ts << 'EOF'
export type LoadingState = "idle" | "loading" | "succeeded" | "failed";
EOF

# =============================================
# app/components/layout/SafeArea.tsx
# =============================================
cat > app/components/layout/SafeArea.tsx << 'EOF'
import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = { children: React.ReactNode };

const SafeArea = ({ children }: Props) => {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});

export default SafeArea;
EOF

# =============================================
# REDUX — Store
# =============================================
cat > app/stores/store.ts << 'EOF'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import authReducer from "./slice/authSlice";
import onboardingReducer from "./slice/onboardingSlice";

const authPersistConfig = { key: "auth", storage: AsyncStorage };
const onboardingPersistConfig = { key: "onboarding", storage: AsyncStorage };

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedOnboardingReducer = persistReducer(onboardingPersistConfig, onboardingReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    onboarding: persistedOnboardingReducer,
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
export const persistor = persistStore(store);
EOF

# =============================================
# REDUX — Auth Slice
# =============================================
cat > app/stores/slice/authSlice.ts << 'EOF'
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider?: string;
  created_at?: string;
};

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isOnboarded: boolean;
  isPlanGenerated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isOnboarded: false,
  isPlanGenerated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isLoggedIn = true;
    },
    logout: () => initialState,
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    completeOnboarding: (state) => { state.isOnboarded = true; },
    completePlanGeneration: (state) => { state.isPlanGenerated = true; },
    resetPlanGeneration: (state) => { state.isPlanGenerated = false; },
  },
});

export const {
  login, logout, updateUser,
  completeOnboarding, completePlanGeneration, resetPlanGeneration,
} = authSlice.actions;

export default authSlice.reducer;
EOF

# =============================================
# REDUX — Onboarding Slice
# =============================================
cat > app/stores/slice/onboardingSlice.ts << 'EOF'
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
EOF

# =============================================
# REDUX — Selectors
# =============================================
cat > app/stores/selectors/authSelectors.ts << 'EOF'
import { RootState } from "../store";

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsLoggedIn = (state: RootState) => state.auth.isLoggedIn;
export const selectIsOnboarded = (state: RootState) => state.auth.isOnboarded;
export const selectIsPlanGenerated = (state: RootState) => state.auth.isPlanGenerated;
EOF

cat > app/stores/selectors/onboardingSelectors.ts << 'EOF'
import { RootState } from "../store";

export const selectGoalData = (state: RootState) => state.onboarding.goalData;
export const selectOnboardingLoading = (state: RootState) => state.onboarding.isLoading;
export const selectOnboardingError = (state: RootState) => state.onboarding.error;
EOF

# =============================================
# NAVIGATION — Types
# =============================================
cat > app/navigation/types.ts << 'EOF'
import { NavigatorScreenParams } from "@react-navigation/native";

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type PlanGenerationStackParamList = {
  PlanGeneration: undefined;
};

export type HomeTabParamList = {
  Tab1: undefined;
  Tab2: undefined;
  Tab3: undefined;
  Tab4: undefined;
};

export type HomeStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  Setting: undefined;
  Notification: undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  AuthStack: undefined;
  PlanGenerationStack: undefined;
  HomeStack: undefined;
};
EOF

# =============================================
# NAVIGATION — index barrel
# =============================================
cat > app/navigation/index.ts << 'EOF'
export { default as AuthNavigator } from "./AuthNavigator";
export { default as BottomTabNavigator } from "./BottomTabNavigator";
export { default as HomeNavigator } from "./HomeNavigator";
export { default as OnboardingNavigator } from "./OnboardingNavigator";
export { default as PlanGenerationNavigator } from "./PlanGenerationNavigator";
export * from "./types";
EOF

# =============================================
# NAVIGATION — Navigation.tsx (root)
# =============================================
cat > app/navigation/Navigation.tsx << 'EOF'
import {
  AuthNavigator,
  HomeNavigator,
  OnboardingNavigator,
  PlanGenerationNavigator,
} from "@/app/navigation";
import { RootState } from "@/app/stores/store";
import { navigationIntegration } from "@/app/utils/sentry";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation = () => {
  const isOnboarded = useSelector((state: RootState) => state.auth.isOnboarded);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const isPlanGenerated = useSelector((state: RootState) => state.auth.isPlanGenerated);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <NavigationContainer onReady={() => navigationIntegration.registerNavigationContainer}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="OnboardingStack" component={OnboardingNavigator} />
        ) : !isLoggedIn ? (
          <Stack.Screen name="AuthStack" component={AuthNavigator} />
        ) : !isPlanGenerated ? (
          <Stack.Screen name="PlanGenerationStack" component={PlanGenerationNavigator} />
        ) : (
          <Stack.Screen name="HomeStack" component={HomeNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
EOF

# =============================================
# NAVIGATION — Onboarding Navigator
# =============================================
cat > app/navigation/OnboardingNavigator.tsx << 'EOF'
import Onboarding from "@/app/screen/onboarding/Onboarding";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="Onboarding" component={Onboarding} />
  </Stack.Navigator>
);

export default OnboardingNavigator;
EOF

# =============================================
# NAVIGATION — Auth Navigator
# =============================================
cat > app/navigation/AuthNavigator.tsx << 'EOF'
import Login from "@/app/screen/auth/Login";
import ForgotPassword from "@/app/screen/auth/ForgotPassword";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
  </Stack.Navigator>
);

export default AuthNavigator;
EOF

# =============================================
# NAVIGATION — Plan Generation Navigator
# =============================================
cat > app/navigation/PlanGenerationNavigator.tsx << 'EOF'
import PlanGeneration from "@/app/screen/planGeneration/PlanGeneration";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PlanGenerationStackParamList } from "./types";

const Stack = createNativeStackNavigator<PlanGenerationStackParamList>();

const PlanGenerationNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="PlanGeneration" component={PlanGeneration} />
  </Stack.Navigator>
);

export default PlanGenerationNavigator;
EOF

# =============================================
# NAVIGATION — Bottom Tab Navigator (native)
# =============================================
cat > app/navigation/BottomTabNavigator.tsx << 'EOF'
import Tab1Screen from "@/app/screen/home/Tab1Screen";
import Tab2Screen from "@/app/screen/home/Tab2Screen";
import Tab3Screen from "@/app/screen/home/Tab3Screen";
import Tab4Screen from "@/app/screen/home/Tab4Screen";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { HomeTabParamList } from "./types";

const Tab = createNativeBottomTabNavigator<HomeTabParamList>();

const BottomTabNavigator = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Tab1" component={Tab1Screen} options={{ tabBarLabel: "Tab 1" }} />
    <Tab.Screen name="Tab2" component={Tab2Screen} options={{ tabBarLabel: "Tab 2" }} />
    <Tab.Screen name="Tab3" component={Tab3Screen} options={{ tabBarLabel: "Tab 3" }} />
    <Tab.Screen name="Tab4" component={Tab4Screen} options={{ tabBarLabel: "Tab 4" }} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
EOF

# =============================================
# NAVIGATION — Home Navigator
# =============================================
cat > app/navigation/HomeNavigator.tsx << 'EOF'
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomTabNavigator";
import SettingScreen from "@/app/screen/home/SettingScreen";
import NotificationScreen from "@/app/screen/home/NotificationScreen";
import { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="HomeTabs" component={BottomTabNavigator} />
    <Stack.Screen name="Setting" component={SettingScreen} />
    <Stack.Screen name="Notification" component={NotificationScreen} />
  </Stack.Navigator>
);

export default HomeNavigator;
EOF

# =============================================
# PLACEHOLDER SCREENS
# =============================================

# Onboarding
write_placeholder_screen "app/screen/onboarding/Onboarding.tsx" "Onboarding"

# Auth
write_placeholder_screen "app/screen/auth/Login.tsx" "Login"
write_placeholder_screen "app/screen/auth/ForgotPassword.tsx" "ForgotPassword"

# Plan Generation
write_placeholder_screen "app/screen/planGeneration/PlanGeneration.tsx" "PlanGeneration"

# Home Tabs
write_placeholder_screen "app/screen/home/Tab1Screen.tsx" "Tab1Screen"
write_placeholder_screen "app/screen/home/Tab2Screen.tsx" "Tab2Screen"
write_placeholder_screen "app/screen/home/Tab3Screen.tsx" "Tab3Screen"
write_placeholder_screen "app/screen/home/Tab4Screen.tsx" "Tab4Screen"

# Home Stack
write_placeholder_screen "app/screen/home/SettingScreen.tsx" "SettingScreen"
write_placeholder_screen "app/screen/home/NotificationScreen.tsx" "NotificationScreen"

# =============================================
# .env.local template
# =============================================
cat > .env.local.example << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL=
EXPO_PUBLIC_SENTRY_DSN=
EOF

echo "[3/4] Files written."

# ─────────────────────────────────────────────
# 4. Clean up default Expo files
# ─────────────────────────────────────────────
echo ""
echo "[4/4] Cleaning up default Expo files..."

rm -f app/_layout.tsx app/+not-found.tsx app/+html.tsx
rm -rf "app/(tabs)"

echo "[4/4] Done."

# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Flow: Onboarding -> Auth -> PlanGeneration -> Home"
echo ""
echo "  dispatch completeOnboarding() -> Auth"
echo "  dispatch login()              -> PlanGeneration"
echo "  dispatch completePlanGeneration() -> Home (4 tabs)"
echo "============================================"
echo ""
echo "  Next: copy .env.local.example to .env.local and fill in your keys"
echo ""
