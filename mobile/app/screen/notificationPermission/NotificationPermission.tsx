/**
 * NotificationPermission — first-login gate that asks the user to enable
 * push notifications. Rendered between Auth and Onboarding/PlanGen/Home
 * by Navigation.tsx whenever the user has logged in but
 * `hasAskedNotificationPermission` is still false.
 *
 * Two outcomes mark the gate as crossed (so the user never sees this screen
 * again on this install):
 *   1. "Allow Notifications" → fires the OS popup → schedules default-on
 *      notifications if granted.
 *   2. "Maybe Later" → silently marks asked + skips, user can re-enable
 *      later from Profile.
 */
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import PressableScale from "@/app/components/common/PressableScale";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { setHasAskedNotificationPermission } from "@/app/stores/slice/authSlice";
import { setNotificationPermissionStatus } from "@/app/stores/slice/preferencesSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleStreakWarning,
} from "@/app/utils/notifications";
import { NotificationBell, NotificationPhoneMockup } from "@/assets/images";

const NotificationPermission = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const notificationPrefs = useSelector(
    (state: RootState) => state.preferences.notifications,
  );

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const status = await requestNotificationPermission();
      dispatch(setNotificationPermissionStatus(status));
      if (status === "granted") {
        if (notificationPrefs.dailyReminder) {
          await scheduleDailyReminder().catch(() => {});
        }
        if (notificationPrefs.streakWarning) {
          await scheduleStreakWarning().catch(() => {});
        }
      }
    } finally {
      // Always mark the gate as crossed — even if the user denied at the OS
      // level. We never re-prompt; they re-enable from Profile.
      dispatch(setHasAskedNotificationPermission(true));
    }
  };

  const handleMaybeLater = () => {
    if (busy) return;
    dispatch(setHasAskedNotificationPermission(true));
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.hero}>
          <Image
            source={NotificationBell}
            style={styles.bellIcon}
            resizeMode="contain"
          />

          <Text style={styles.title}>{t("notificationPermission.title")}</Text>
          <Text style={styles.subtitle}>{t("notificationPermission.subtitle")}</Text>
        </View>

        <View style={styles.previewSection}>
          <Image
            source={NotificationPhoneMockup}
            style={styles.mockupImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={t("notificationPermission.enableButton")}
            onPress={handleEnable}
            loading={busy}
          />
          <PressableScale onPress={handleMaybeLater} disabled={busy} hitSlop={12}>
            <Text style={styles.maybeLater}>
              {t("notificationPermission.maybeLater")}
            </Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

export default NotificationPermission;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hero: {
  alignItems: "center",
   gap: 16,
  },
  bellIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: 0.36,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    maxWidth: 325,
  },
  previewSection: {
    flex: 1,
   minHeight: 0,
   justifyContent: "flex-start",
    alignItems: "center",
   marginTop: 24,
   marginHorizontal: -24,
   overflow: "hidden",
  },
  mockupImage: {
    flex: 1,
    width: 500,
    maxWidth: 402,
  },
  actions: {
   // gap: 24,
  },
  maybeLater: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    letterSpacing: 0.36,
    color: "rgba(240,240,240,0.7)",
    textAlign: "center",
    paddingVertical: 8,
  },
});
