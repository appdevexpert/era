import ManageSubscriptionBottomSheet, {
  type ManageSubscriptionBottomSheetRef,
} from "@/app/components/common/ManageSubscriptionBottomSheet";
import ProfileCard from "@/app/components/common/ProfileCard";
import ScreenFades from "@/app/components/common/ScreenFades";
import SegmentedPill from "@/app/components/common/SegmentedPill";
import SettingsCard from "@/app/components/common/SettingsCard";
import SettingsRow from "@/app/components/common/SettingsRow";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEntitlement } from "@/app/hooks/useEntitlement";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import {
  selectCurrentStreak,
  selectRewardStatus,
  selectTotalPoints,
} from "@/app/stores/selectors/rewardSelectors";
import { deleteAccountThunk, signOutThunk } from "@/app/stores/slice/authSlice";
import { loadRewardBootstrap } from "@/app/stores/slice/rewardSlice";
import { RootState, useAppDispatch } from "@/app/stores/store";
import { computeCurrentPosition } from "@/app/utils/programSchedule";
import { verticalScale } from "@/app/utils/responsive";
import {
  FluentPremium,
  InfoCircleGold,
  MedalBadge,
  ProfileBackChevron,
  SettingChevronRight,
  SettingChevronRightDanger,
  SettingGlobe,
  SettingLogout,
  SettingShieldUser,
  SettingTrashBin,
  SettingWeigher,
} from "@/assets/icons";
import type { HomeStackParamList } from "@/app/navigation/types";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Chevron = () => <SettingChevronRight width={24} height={24} />;
const ChevronDanger = () => <SettingChevronRightDanger width={24} height={24} />;

/**
 * Map a RevenueCat product id + remaining days to a 0..1 billing progress
 * fraction shown on the ProfileCard bar. Annual plans use a 365-day window,
 * everything else falls back to monthly (~30 days). Returns 0 when we can't
 * derive a period (e.g. free user, missing product id).
 */
const computeBillingProgress = (
  productId: string | null,
  daysRemaining: number | null,
): number => {
  if (productId == null || daysRemaining == null) return 0;
  const periodDays = productId.endsWith("_annual") ? 365 : 30;
  const consumed = Math.max(0, periodDays - daysRemaining);
  return Math.min(1, consumed / periodDays);
};

const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t, i18n } = useTranslation();
  const subscriptionSheetRef = useRef<ManageSubscriptionBottomSheetRef>(null);
  const { unit: weightUnit, setUnit: setWeightUnitPref } = useWeightUnit();
  const { tier, productId, daysRemaining } = useEntitlement();

  const user = useSelector(selectUser);
  const authStatus = useSelector((state: RootState) => state.auth.loadingStatus);
  const authError = useSelector((state: RootState) => state.auth.error);
  const programStartDate = useSelector(
    (state: RootState) => state.auth.programStartDate,
  );
  const overview = useSelector((state: RootState) => state.workout.overview);
  const goalData = useSelector((state: RootState) => state.onboarding.goalData);
  const totalPoints = useSelector(selectTotalPoints);
  const currentStreak = useSelector(selectCurrentStreak);
  const rewardStatus = useSelector(selectRewardStatus);
  const completedWorkouts = useSelector(
    (state: RootState) => state.workout.completedDayIds.length,
  );

  // Safety-net: ensure reward data is loaded even if user opens Profile before Progress.
  useEffect(() => {
    if (user?.id && rewardStatus === "idle") {
      dispatch(loadRewardBootstrap(user.id));
    }
  }, [dispatch, user?.id, rewardStatus]);

  const [isDeleting, setIsDeleting] = useState(false);

  const isNorwegian = i18n.language === "nb";
  const isLoggingOut = authStatus === "loading" && !isDeleting;

  const displayName =
    user?.name || user?.email?.split("@")[0] || t("profile.fallbackName");
  const uid = user?.id ? `uid_${user.id.slice(0, 8)}` : "uid_——";

  const totalWeeks = overview?.program.duration_weeks ?? 12;
  const currentWeek = programStartDate
    ? computeCurrentPosition({ programStartDate, totalWeeks }).weekNumber
    : 1;

  const genderKey = goalData.gender === "female" ? "female" : "male";
  const levelKey =
    goalData.level === "intermediate"
      ? "intermediate"
      : goalData.level === "advanced"
        ? "advanced"
        : "beginner";

  const metaLine = [
    t("profile.weekProgress", { current: currentWeek, total: totalWeeks }),
    t(`profile.gender.${genderKey}`),
    t(`profile.level.${levelKey}`),
  ].join(t("profile.metaSeparator"));

  const handleLogout = () => {
    if (!isLoggingOut && !isDeleting) dispatch(signOutThunk());
  };

  const handleOpenPaywall = () => navigation.navigate("Paywall");

  const handleDeleteAccount = () => {
    if (isLoggingOut || isDeleting) return;
    Alert.alert(
      t("profile.deleteAccountConfirmTitle"),
      t("profile.deleteAccountConfirmBody"),
      [
        { text: t("profile.deleteAccountCancel"), style: "cancel" },
        {
          text: t("profile.deleteAccountConfirm"),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await dispatch(deleteAccountThunk()).unwrap();
              // Navigation auto-redirects to OnboardingStack once Redux resets.
            } catch (err) {
              setIsDeleting(false);
              Alert.alert(
                t("profile.deleteAccountFailedTitle"),
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        <ProfileCard
          name={displayName}
          uid={uid}
          metaLine={metaLine}
          subscriptionLabel={t(`profile.tierLabel.${tier}`)}
          manageLabel={t(tier === "free" ? "profile.upgradePlan" : "profile.manageSubscription")}
          daysLeftLabel={
            tier === "free"
              ? t("profile.freePlanCta")
              : daysRemaining != null
                ? t("profile.daysLeft", { count: daysRemaining })
                : ""
          }
          progress={computeBillingProgress(productId, daysRemaining)}
          onManagePress={() =>
            tier === "free"
              ? navigation.navigate("Paywall")
              : subscriptionSheetRef.current?.show()
          }
        />

        <View style={styles.statsRow}>
          <StatCard value={String(totalPoints)} label={t("profile.eraPoints")} />
          <StatCard value={String(currentStreak)} label={t("profile.dayStreak")} />
          <StatCard value={String(completedWorkouts)} label={t("profile.workouts")} />
        </View>

        <SectionTitle>{t("profile.sections.subscription")}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={<FluentPremium width={24} height={24} />}
            label={t("profile.upgradePlan")}
            right={<Chevron />}
            onPress={handleOpenPaywall}
          />
        </SettingsCard>

        <SectionTitle>{t("profile.sections.appSettings")}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={<SettingGlobe width={24} height={24} />}
            label={t("profile.language")}
            right={
              <SegmentedPill
                leftLabel={t("profile.languageNor")}
                rightLabel={t("profile.languageEng")}
                selectedIndex={isNorwegian ? 0 : 1}
                onChange={(i) => i18n.changeLanguage(i === 0 ? "nb" : "en")}
              />
            }
          />
          <SettingsRow
            icon={<SettingWeigher width={24} height={24} />}
            label={t("profile.weightUnit")}
            right={
              <SegmentedPill
                leftLabel={t("profile.weightKg")}
                rightLabel={t("profile.weightLbs")}
                selectedIndex={weightUnit === "kg" ? 0 : 1}
                onChange={(i) => setWeightUnitPref(i === 0 ? "kg" : "lb")}
              />
            }
          />
        </SettingsCard>

        <SectionTitle>{t("profile.sections.support")}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={<InfoCircleGold width={24} height={24} />}
            label={t("profile.termsOfService")}
            right={<Chevron />}
            onPress={() => navigation.navigate("TermsOfService")}
          />
          <SettingsRow
            icon={<SettingShieldUser width={24} height={24} />}
            label={t("profile.privacyPolicy")}
            right={<Chevron />}
            onPress={() => navigation.navigate("PrivacyPolicy")}
          />
          {/* Dev-only shortcut to test the cycle 1 → cycle 2 celebration flow. */}
          {__DEV__ && (
            <SettingsRow
              icon={<MedalBadge width={24} height={24} />}
              label={t("twelveWeekCompletion.devTestButton")}
              right={<Chevron />}
              onPress={() => navigation.navigate("TwelveWeekCompletion")}
            />
          )}
        </SettingsCard>

        <SectionTitle>{t("profile.sections.sessionManagement")}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={<SettingLogout width={24} height={24} />}
            label={t("profile.signOut")}
            right={
              isLoggingOut ? (
                <ActivityIndicator size="small" color={COLORS.primary.dark} />
              ) : (
                <Chevron />
              )
            }
            onPress={handleLogout}
            disabled={isLoggingOut}
          />
          <SettingsRow
            icon={<SettingTrashBin width={24} height={24} />}
            label={t("profile.deleteAccount")}
            labelColor={COLORS.semantic.danger}
            right={
              isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.semantic.danger} />
              ) : (
                <ChevronDanger />
              )
            }
            onPress={handleDeleteAccount}
            disabled={isDeleting || isLoggingOut}
          />
        </SettingsCard>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <Text style={styles.versionText}>{t("profile.version")}</Text>
      </ScrollView>

      <ScreenFades topExtra={80} bottomExtra={60} />

      <PressableScale
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ProfileBackChevron width={24} height={24} />
      </PressableScale>

      <ManageSubscriptionBottomSheet ref={subscriptionSheetRef} />
    </View>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.sectionTitle}>{children.toUpperCase()}</Text>
);

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
  </View>
);

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    letterSpacing: 0.5,
    color: COLORS.alpha.white50,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 0.56,
    color: "rgba(240, 240, 240, 0.6)",
    marginBottom: -8,
  },
  errorText: {
    marginTop: verticalScale(2),
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.semantic.danger,
    textAlign: "center",
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(240, 240, 240, 0.6)",
    textAlign: "center",
    marginTop: verticalScale(8),
  },
});
