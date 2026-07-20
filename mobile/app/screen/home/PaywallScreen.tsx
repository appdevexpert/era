import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { type PurchasesOffering } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type {
  HomeStackParamList,
  OnboardingStackParamList,
  PaywallParams,
} from "@/app/navigation/types";
import { EVENTS, logEvent } from "@/app/services/analyticsService";
import { completeOnboarding, setHasGoals } from "@/app/stores/slice/authSlice";
import { useAppDispatch } from "@/app/stores/store";

type Nav = NativeStackNavigationProp<HomeStackParamList | OnboardingStackParamList>;

/**
 * Full-screen paywall. We render `<RevenueCatUI.Paywall />` inline so the
 * RC-hosted UI IS this screen — not a native modal layered on top of one.
 * Dismiss / purchase / restore callbacks all funnel through `finish()`,
 * which either pops the modal (Profile entry) or completes onboarding
 * (Onboarding entry) so the root navigator switches stacks.
 *
 * The service-level customerInfo listener (revenueCatService.configureRevenueCat)
 * keeps the tier cache fresh — we don't need to mirror that in Redux here.
 */
const PaywallScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const route =
    useRoute<RouteProp<{ Paywall: PaywallParams }, "Paywall">>();
  const source = route.params?.source ?? "profile";

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadError, setLoadError] = useState(false);
  const didPurchaseRef = useRef(false);

  const finish = useCallback(() => {
    if (source === "onboarding") {
      dispatch(completeOnboarding());
      dispatch(setHasGoals(true));
    } else {
      navigation.goBack();
    }
  }, [dispatch, navigation, source]);

  useEffect(() => {
    void logEvent(EVENTS.PAYWALL_VIEWED, { source });
  }, [source]);

  useEffect(() => {
    let alive = true;
    Purchases.getOfferings()
      .then((offerings) => {
        if (!alive) return;
        const current = offerings.current;
        if (!current) {
          setLoadError(true);
        } else {
          setOffering(current);
        }
      })
      .catch((err) => {
        console.warn("[paywall] getOfferings failed:", err);
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) {
    return (
      <View style={styles.root}>
        <PressableScale
          onPress={finish}
          hitSlop={12}
          style={[styles.closeButton, { top: insets.top + 8 }]}
        >
          <Feather name="x" size={24} color={COLORS.neutral.white} />
        </PressableScale>
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>
            {t("onboarding.steps.paywall.empty")}
          </Text>
        </View>
      </View>
    );
  }

  // Offering still resolving — show black so the RC paywall can slide into
  // a clean canvas instead of replacing visible chrome.
  if (!offering) {
    return <View style={styles.root} />;
  }

  return (
    <RevenueCatUI.Paywall
      style={styles.root}
      options={{ offering }}
      onPurchaseCompleted={({ customerInfo }) => {
        didPurchaseRef.current = true;
        const active = customerInfo.entitlements.active;
        const tier = active.pro ? "pro" : active.standard ? "standard" : "unknown";
        void logEvent(EVENTS.PURCHASE_COMPLETED, {
          source,
          tier,
          product: active.pro?.productIdentifier ?? active.standard?.productIdentifier ?? "unknown",
        });
        Toast.show({
          type: "success",
          text2: t("onboarding.steps.paywall.success"),
        });
        finish();
      }}
      onRestoreCompleted={({ customerInfo }) => {
        const hasActiveEntitlement =
          Object.keys(customerInfo.entitlements.active).length > 0;
        if (hasActiveEntitlement) {
          didPurchaseRef.current = true;
          const active = customerInfo.entitlements.active;
          const tier = active.pro ? "pro" : active.standard ? "standard" : "unknown";
          void logEvent(EVENTS.PURCHASE_RESTORED, { source, tier });
          Toast.show({
            type: "success",
            text2: t("onboarding.steps.paywall.success"),
          });
          finish();
        }
      }}
      onDismiss={() => {
        if (!didPurchaseRef.current) {
          void logEvent(EVENTS.PAYWALL_DISMISSED, { source });
        }
        finish();
      }}
    />
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.alpha.white72,
    textAlign: "center",
  },
});
