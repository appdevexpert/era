import { useCallback, useEffect, useRef } from "react";
import { AppState, Linking, Modal } from "react-native";
import {
  AuthNavigator,
  HomeNavigator,
  OnboardingNavigator,
  PlanGenerationNavigator,
} from "@/app/navigation";
import NotificationPermission from "@/app/screen/notificationPermission/NotificationPermission";
import {
  completePlanGeneration,
  login,
  clearSession,
  setHasAskedNotificationPermission,
  setHasGoals,
  setRecovery,
} from "@/app/stores/slice/authSlice";
import { setNotificationPermissionStatus } from "@/app/stores/slice/preferencesSlice";
import {
  ensureAndroidChannel,
  getPermissionStatus,
} from "@/app/utils/notifications";
import { selectHasWorkoutBootstrap } from "@/app/stores/selectors/workoutSelectors";
import { loadGoalDataFromSupabase } from "@/app/stores/slice/onboardingSlice";
import { fetchUserGoalData } from "@/app/services/onboardingService";
import {
  checkAndRefreshIfStale,
  clearWorkoutCache,
} from "@/app/stores/slice/workoutSlice";
import { useSyncQueue } from "@/app/hooks/useSyncQueue";
import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from "@/app/services/revenueCatService";
import { useAppDispatch } from "@/app/stores/store";
import type { RootState } from "@/app/stores/store";
import { mapSupabaseUser, supabase } from "@/app/utils/auth";
// import { navigationIntegration } from "@/app/utils/sentry";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
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
  const { flushQueue, queueLength } = useSyncQueue();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const isPlanGenerated = useSelector((state: RootState) => state.auth.isPlanGenerated);
  const isRecovery = useSelector((state: RootState) => state.auth.isRecovery);
  const hasGoals = useSelector((state: RootState) => state.auth.hasGoals);
  const hasAskedNotificationPermission = useSelector(
    (state: RootState) => state.auth.hasAskedNotificationPermission,
  );
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);

  // Handle deep links (password recovery)
  useEffect(() => {
    const onUrl = async (url: string) => {
      if (!url.includes("reset-password")) return;
      dispatch(setRecovery(true));
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
  }, [dispatch]);

  // Auth state listener
  useEffect(() => {
    /**
     * Source-of-truth for "should we route to onboarding or skip past it?".
     * signInThunk already does this fetch and sets hasGoals atomically with
     * the login fulfillment — but social login (Google/Apple) and cold-start
     * session restores fire through this listener / getSession instead, so
     * we mirror the same logic here.
     */
    const resolveHasGoals = async (uid: string) => {
      try {
        const { data } = await fetchUserGoalData(uid);
        dispatch(setHasGoals(data !== null));
      } catch {
        // Network blip: stay conservative — assume goals exist so we don't
        // shove a returning user back into onboarding. Real failures surface
        // when loadWorkoutBootstrap runs next.
        dispatch(setHasGoals(true));
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          dispatch(setRecovery(true));
          return;
        }
        if (event === "SIGNED_IN" && session?.user) {
          if (!isRecovery) {
            dispatch(login(mapSupabaseUser(session.user)));
            resolveHasGoals(session.user.id);
            // Link RevenueCat to this Supabase user so purchases follow them
            // across devices/reinstalls. Fire-and-forget — a failure here
            // just means RC stays anonymous, which is harmless for free users.
            identifyRevenueCatUser(session.user.id).catch((err) =>
              console.warn("[revenueCat] identify failed", err),
            );
          }
        } else if (event === "SIGNED_OUT") {
          dispatch(clearSession());
          dispatch(clearWorkoutCache());
          resetRevenueCatUser().catch((err) =>
            console.warn("[revenueCat] logout failed", err),
          );
        }
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(login(mapSupabaseUser(session.user)));
        resolveHasGoals(session.user.id);
        identifyRevenueCatUser(session.user.id).catch((err) =>
          console.warn("[revenueCat] identify failed", err),
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, isRecovery]);

  // Flush any failed Supabase writes from the sync queue.
  //   - Fires whenever the queue gains items (the persisted queue rehydrates
  //     into a non-zero length on cold start; new failures bump it during a
  //     session).
  //   - Also re-fires when the app comes back to the foreground, since the
  //     most common reason a write failed is "network was off" and "back to
  //     active" is a strong signal that the user just regained connectivity.
  useEffect(() => {
    if (queueLength > 0) flushQueue();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && queueLength > 0) flushQueue();
    });
    return () => sub.remove();
  }, [queueLength, flushQueue]);

  // Detect admin-side program changes. Compares server's MAX(updated_at)
  // against the cached loadedAt and silently refetches the workout bootstrap
  // only when the server is newer — no UI, no spinner. Fires on:
  //   (a) cold start once redux has rehydrated and the user is logged in,
  //   (b) every background → active transition.
  // AppState's "change" event only fires on transitions, so without (a) a
  // freshly-launched app would never validate its cache.
  useEffect(() => {
    if (!isLoggedIn || !hasWorkoutBootstrap) return;
    dispatch(checkAndRefreshIfStale());
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") dispatch(checkAndRefreshIfStale());
    });
    return () => sub.remove();
  }, [dispatch, isLoggedIn, hasWorkoutBootstrap]);

  // Pull the user's body data from Supabase whenever we know who they are.
  // Cheap network call; harmless if Redux already has fresh values.
  useEffect(() => {
    if (userId) dispatch(loadGoalDataFromSupabase());
  }, [dispatch, userId]);

  useEffect(() => {
    if (isLoggedIn && hasWorkoutBootstrap && !isPlanGenerated) {
      dispatch(completePlanGeneration());
    }
  }, [dispatch, hasWorkoutBootstrap, isLoggedIn, isPlanGenerated]);

  // Keep Redux's mirror of the OS notification permission in sync. The
  // explicit permission ask happens inside NotificationPermissionScreen, not
  // here — this effect just refreshes the cached status on app open so the
  // Profile toggles + the routing decision (whether to show the permission
  // screen) reflect reality.
  useEffect(() => {
    ensureAndroidChannel().catch(() => {});
    if (!isLoggedIn) return;
    getPermissionStatus().then((status) => {
      dispatch(setNotificationPermissionStatus(status));
    });
  }, [dispatch, isLoggedIn]);

  /**
   * Auth-first decision tree:
   *   - Not logged in, in recovery, OR `hasGoals` not yet known → AuthStack.
   *     `hasGoals === null` means the post-login server check (signInThunk
   *     or the SIGNED_IN listener) is still in flight; pinning the user to
   *     AuthStack avoids briefly flashing PlanGeneration for new users
   *     who'll actually need onboarding. The Login button keeps its own
   *     spinner via signInThunk.pending so the user sees uninterrupted
   *     loading until the destination is decided.
   *   - Logged in but no goals row on the server → OnboardingStack.
   *   - Logged in with goals but workout cache not hydrated → PlanGeneration.
   *   - Otherwise → HomeStack.
   *
   * Persisted hasGoals from a previous session means returning users skip
   * the null window entirely on cold start and route straight to Home.
   */
  const showAuthStack = isRecovery || !isLoggedIn || hasGoals === null;

  // First-login notification permission modal. Renders as an iOS pageSheet
  // / Android slide-up over whichever stack the user just landed in
  // (Onboarding for new users, Home for returning ones). The modal closes
  // automatically once the user picks Enable / Maybe Later — both paths
  // dispatch setHasAskedNotificationPermission(true) inside the screen,
  // which flips this flag and unmounts the modal.
  const showNotificationPermissionModal =
    !showAuthStack && !hasAskedNotificationPermission;

  // Swipe-down (iOS) or Android-back dismiss is treated as "Maybe Later" —
  // otherwise the modal would immediately re-open because the gate flag
  // would still be false.
  const handleNotificationModalDismiss = useCallback(() => {
    dispatch(setHasAskedNotificationPermission(true));
  }, [dispatch]);

  return (
    <>
      <NavigationContainer ref={navigationRef} linking={showAuthStack ? linking : undefined}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showAuthStack ? (
            <Stack.Screen name="AuthStack" component={AuthNavigator} />
          ) :
          hasGoals === false ? (
            <Stack.Screen name="OnboardingStack" component={OnboardingNavigator} />
          ) : !hasWorkoutBootstrap ? (
            <Stack.Screen name="PlanGenerationStack" component={PlanGenerationNavigator} />
          ) : (
            <Stack.Screen name="HomeStack" component={HomeNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Modal
        visible={showNotificationPermissionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={handleNotificationModalDismiss}
        onRequestClose={handleNotificationModalDismiss}
      >
        <NotificationPermission />
      </Modal>
    </>
  );
};

export default Navigation;
