import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";
import {
  AuthNavigator,
  HomeNavigator,
  OnboardingNavigator,
  PlanGenerationNavigator,
} from "@/app/navigation";
import { login, clearSession } from "@/app/stores/slice/authSlice";
import { useAppDispatch } from "@/app/stores/store";
import type { RootState } from "@/app/stores/store";
import { mapSupabaseUser, supabase } from "@/app/utils/auth";
// import { navigationIntegration } from "@/app/utils/sentry";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { RecoveryContext } from "./RecoveryContext";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["mobile://"],
  config: {
    screens: {
      AuthStack: {
        screens: {
          ForgotPassword: "reset-password",
        },
      },
    },
  },
};

/** Parse key=value pairs from a URL fragment or query string */
const parseParams = (str: string): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const pair of str.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value) result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
};

/** Try to establish a Supabase session from deep link URL tokens */
const handleDeepLink = async (url: string): Promise<boolean> => {
  if (!url.includes("reset-password")) return false;

  // Try hash fragment first: mobile://reset-password#access_token=...&refresh_token=...&type=recovery
  const hashPart = url.split("#")[1];
  if (hashPart) {
    const params = parseParams(hashPart);
    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      return !error;
    }
  }

  // Try query params: mobile://reset-password?token_hash=...&type=recovery
  const queryPart = url.split("?")[1]?.split("#")[0];
  if (queryPart) {
    const params = parseParams(queryPart);
    if (params.token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.token_hash,
        type: "recovery",
      });
      return !error;
    }
  }

  return false;
};

const Navigation = () => {
  const dispatch = useAppDispatch();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const isOnboarded = useSelector((state: RootState) => state.auth.isOnboarded);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const isPlanGenerated = useSelector((state: RootState) => state.auth.isPlanGenerated);
  const [isRecovery, setIsRecovery] = useState(false);

  // Handle deep links (password recovery)
  useEffect(() => {
    const onUrl = async (url: string) => {
      if (!url.includes("reset-password")) return;
      setIsRecovery(true);
      await handleDeepLink(url);
    };

    // Cold start
    Linking.getInitialURL().then((url) => {
      if (url) onUrl(url);
    });

    // Warm start
    const subscription = Linking.addEventListener("url", ({ url }) => {
      onUrl(url);
    });

    return () => subscription.remove();
  }, []);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          setIsRecovery(true);
          return;
        }
        if (event === "SIGNED_IN" && session?.user) {
          if (!isRecovery) {
            dispatch(login(mapSupabaseUser(session.user)));
          }
        } else if (event === "SIGNED_OUT") {
          setIsRecovery(false);
          dispatch(clearSession());
        }
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(login(mapSupabaseUser(session.user)));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, isRecovery]);

  const clearRecovery = useCallback(() => {
    setIsRecovery(false);
    // After recovery, check if there's a valid session and log the user in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(login(mapSupabaseUser(session.user)));
      }
    });
  }, [dispatch]);
  const recoveryValue = useMemo(() => ({ isRecovery, clearRecovery }), [isRecovery, clearRecovery]);
  const showAuthStack = !isOnboarded ? false : isLoggedIn ? false : true;

  return (
    <RecoveryContext.Provider value={recoveryValue}>
      <NavigationContainer ref={navigationRef} linking={showAuthStack || isRecovery ? linking : undefined}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isOnboarded ? (
            <Stack.Screen name="OnboardingStack" component={OnboardingNavigator} />
          ) : isRecovery || !isLoggedIn ? (
            <Stack.Screen name="AuthStack" component={AuthNavigator} />
          ) : !isPlanGenerated ? (
            <Stack.Screen name="PlanGenerationStack" component={PlanGenerationNavigator} />
          ) : (
            <Stack.Screen name="HomeStack" component={HomeNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </RecoveryContext.Provider>
  );
};

export default Navigation;
