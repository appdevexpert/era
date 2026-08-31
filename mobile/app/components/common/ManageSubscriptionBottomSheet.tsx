import SheetBackHandler from "@/app/components/common/SheetBackHandler";
import GlassFill from "@/app/components/common/GlassFill";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEntitlement } from "@/app/hooks/useEntitlement";
import type { HomeStackParamList } from "@/app/navigation/types";
import { presentCustomerCenter } from "@/app/services/revenueCatService";
import { FluentPremium } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ManageSubscriptionBottomSheetRef {
  show: () => void;
  close: () => void;
}

interface ManageSubscriptionBottomSheetProps {
  /** Optional override — by default upgrades open the standalone Paywall route. */
  onUpgrade?: (planId: "standard" | "pro") => void;
}

const PILL_INACTIVE = [
  "rgba(252,243,192,0.24)",
  "rgba(247,224,111,0.24)",
  "rgba(201,168,76,0.24)",
] as const;
const CTA_GRADIENT = [
  "rgba(252,243,192,0.6)",
  "rgba(247,224,111,0.6)",
  "rgba(201,168,76,0.6)",
] as const;

const Dot = () => (
  <LinearGradient
    colors={["#FCF3C0", "#F7E06F", "#C9A84C"]}
    start={{ x: 0, y: 0.5 }}
    end={{ x: 1, y: 0.5 }}
    style={styles.dot}
  />
);

const Bullet = ({ text }: { text: string }) => (
  <View style={styles.bulletRow}>
    <Dot />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const ManageSubscriptionBottomSheet = forwardRef<
  ManageSubscriptionBottomSheetRef,
  ManageSubscriptionBottomSheetProps
>(function ManageSubscriptionBottomSheet({ onUpgrade }, ref) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { tier } = useEntitlement();

  useImperativeHandle(ref, () => ({
    show: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const standardFeatures = useMemo(
    () =>
      t("profile.subscription.standard.features", {
        returnObjects: true,
      }) as unknown as string[],
    [t],
  );
  const proFeatures = useMemo(
    () =>
      t("profile.subscription.pro.features", {
        returnObjects: true,
      }) as unknown as string[],
    [t],
  );

  /**
   * Tap on an upgrade CTA. Defers to caller-provided `onUpgrade` if given,
   * otherwise dismisses the sheet and pushes the standalone Paywall route
   * — RC's hosted UI handles picking the actual product variant.
   */
  const handleUpgrade = useCallback(
    (planId: "standard" | "pro") => {
      if (onUpgrade) {
        onUpgrade(planId);
        return;
      }
      sheetRef.current?.dismiss();
      navigation.navigate("Paywall");
    },
    [navigation, onUpgrade],
  );

  /**
   * Open RevenueCat's Customer Center so the user can cancel, change plan,
   * or request a refund. Only shown to users with an active subscription —
   * free users see the upgrade CTAs instead.
   */
  const handleManageInStore = useCallback(async () => {
    sheetRef.current?.dismiss();
    await presentCustomerCenter();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["80%"]}
      index={0}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <SheetBackHandler />
      <View style={styles.titleSection}>
        <Text style={styles.title}>{t("profile.subscription.title")}</Text>
      </View>

      <View style={styles.scrollWrap}>
        <BottomSheetScrollView
          contentContainerStyle={[
            // Edge-to-edge puts the sheet's bottom edge BEHIND the system nav
            // bar, so the last row needs the inset on top of its designed
            // padding. Math.max keeps the design on devices that report none.
            styles.scrollContent,
            { paddingBottom: Math.max(80, insets.bottom + 16) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Standard plan — Active pill if user has standard (and not pro),
              upgrade CTA otherwise. Pro users see the Pro card instead. */}
          <View style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <View style={styles.planTitleCol}>
                <View style={styles.planTitleRow}>
                  <FluentPremium width={24} height={24} />
                  <Text style={styles.planName}>
                    {t("profile.subscription.standard.name")}
                  </Text>
                </View>
                <Text style={styles.planPrice}>
                  {t("profile.subscription.standard.price")}
                </Text>
              </View>
              {tier === "standard" ? (
                <View style={styles.activePill}>
                  <LinearGradient
                    pointerEvents="none"
                    colors={PILL_INACTIVE}
                    start={{ x: 1, y: 0.5 }}
                    end={{ x: 0, y: 0.5 }}
                    style={styles.activePillFill}
                  />
                  <GlassFill effect="clear" style={styles.activePillFill} />
                  <Text style={styles.activeText}>
                    {t("profile.subscription.active")}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.divider} />
            {standardFeatures.map((f, i) => (
              <Bullet key={i} text={f} />
            ))}
            {tier === "free" ? (
              <PressableScale
                onPress={() => handleUpgrade("standard")}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 1, y: 0.5 }}
                  end={{ x: 0, y: 0.5 }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaText}>
                    {t("profile.subscription.standard.cta")}
                  </Text>
                </LinearGradient>
              </PressableScale>
            ) : null}
          </View>

          {/* Pro plan — Active pill if user has pro, upgrade CTA otherwise. */}
          <View style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <View style={styles.planTitleCol}>
                <View style={styles.planTitleRow}>
                  <FluentPremium width={24} height={24} />
                  <Text style={styles.planName}>
                    {t("profile.subscription.pro.name")}
                  </Text>
                </View>
                <Text style={styles.planPrice}>
                  {t("profile.subscription.pro.price")}
                </Text>
              </View>
              {tier === "pro" ? (
                <View style={styles.activePill}>
                  <LinearGradient
                    pointerEvents="none"
                    colors={PILL_INACTIVE}
                    start={{ x: 1, y: 0.5 }}
                    end={{ x: 0, y: 0.5 }}
                    style={styles.activePillFill}
                  />
                  <GlassFill effect="clear" style={styles.activePillFill} />
                  <Text style={styles.activeText}>
                    {t("profile.subscription.active")}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.divider} />
            {proFeatures.map((f, i) => (
              <Bullet key={i} text={f} />
            ))}
            {tier !== "pro" ? (
              <PressableScale
                onPress={() => handleUpgrade("pro")}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 1, y: 0.5 }}
                  end={{ x: 0, y: 0.5 }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaText}>
                    {t("profile.subscription.pro.cta")}
                  </Text>
                </LinearGradient>
              </PressableScale>
            ) : null}
          </View>
          {/* Familie tier intentionally hidden — Khushali pushback 2026-06-26
              (requires invite/member/permission flows that don't exist yet). */}

          {/* Cancel / change plan — App Store compliance (guideline 3.1.2).
              Only shown to users with an active subscription; free users
              already have upgrade CTAs above. */}
          {tier !== "free" ? (
            <PressableScale onPress={handleManageInStore} style={styles.manageRow}>
              <Text style={styles.manageRowText}>
                {t("profile.subscription.manageInStore")}
              </Text>
            </PressableScale>
          ) : null}
        </BottomSheetScrollView>

        {/* Bottom fade — content dissolves into the sheet background */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10,10,10,0)", "rgba(10,10,10,1)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomFade}
        />
      </View>
    </BottomSheetModal>
  );
});

ManageSubscriptionBottomSheet.displayName = "ManageSubscriptionBottomSheet";

export default ManageSubscriptionBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26.4,
  },
  scrollWrap: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    paddingHorizontal: 19,
    paddingTop: 24,
    paddingBottom: 80,
    gap: 24,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  planCard: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    overflow: "hidden",
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  planTitleCol: {
    flex: 1,
    gap: 8,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planName: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary.base,
  },
  planPrice: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  activePillFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  activeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    letterSpacing: 0.48,
    color: COLORS.neutral.white,
    textTransform: "uppercase",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.neutral.charcoal,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.neutral.white,
    lineHeight: 19.2,
  },
  ctaWrap: {
    width: "100%",
    marginTop: 16,
  },
  cta: {
    height: 48,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.36,
    color: COLORS.neutral.white,
  },
  manageRow: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  manageRowText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.alpha.white72,
    textDecorationLine: "underline",
  },
});
