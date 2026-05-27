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
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import { RootState, useAppDispatch } from "@/app/stores/store";
import { computeCurrentPosition } from "@/app/utils/programSchedule";
import { verticalScale } from "@/app/utils/responsive";
import {
  InfoCircleGold,
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
import { useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Chevron = () => <SettingChevronRight width={24} height={24} />;
const ChevronDanger = () => <SettingChevronRightDanger width={24} height={24} />;

const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t, i18n } = useTranslation();
  const subscriptionSheetRef = useRef<ManageSubscriptionBottomSheetRef>(null);
  const { unit: weightUnit, setUnit: setWeightUnitPref } = useWeightUnit();

  const user = useSelector(selectUser);
  const authStatus = useSelector((state: RootState) => state.auth.loadingStatus);
  const authError = useSelector((state: RootState) => state.auth.error);
  const programStartDate = useSelector(
    (state: RootState) => state.auth.programStartDate,
  );
  const overview = useSelector((state: RootState) => state.workout.overview);
  const goalData = useSelector((state: RootState) => state.onboarding.goalData);

  const isNorwegian = i18n.language === "nb";
  const isLoggingOut = authStatus === "loading";

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
    if (!isLoggingOut) dispatch(signOutThunk());
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
          subscriptionLabel={t("profile.freeTrial")}
          manageLabel={t("profile.manageSubscription")}
          daysLeftLabel={t("profile.daysLeft", { count: 3 })}
          progress={0.78}
          onManagePress={() => subscriptionSheetRef.current?.show()}
        />

        <View style={styles.statsRow}>
          <StatCard value="2840" label={t("profile.eraPoints")} />
          <StatCard value="18" label={t("profile.dayStreak")} />
          <StatCard value="42" label={t("profile.workouts")} />
        </View>

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
            right={<ChevronDanger />}
            onPress={() => {}}
          />
        </SettingsCard>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <Text style={styles.versionText}>{t("profile.version")}</Text>
      </ScrollView>

      <ScreenFades topExtra={80} bottomExtra={60} />

      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ProfileBackChevron width={24} height={24} />
      </Pressable>

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
