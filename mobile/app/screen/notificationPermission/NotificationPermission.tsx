/**
 * NotificationPermission — first-login gate that asks the user to enable
 * push notifications. Rendered between Auth and Onboarding/PlanGen/Home
 * by Navigation.tsx whenever the user has logged in but
 * `hasAskedNotificationPermission` is still false.
 *
 * Two outcomes mark the gate as crossed (so the user never sees this screen
 * again on this install):
 *   1. "Enable" → fires the OS popup → schedules default-on notifications
 *      if granted.
 *   2. "Maybe Later" → silently marks asked + skips, user can re-enable
 *      later from Profile.
 */
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import { IconBolt } from "@/assets/icons";

interface NotificationMock {
  title: string;
  body: string;
  timestamp: string;
}

const NotificationPermission = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const notificationPrefs = useSelector(
    (state: RootState) => state.preferences.notifications,
  );

  const mocks: NotificationMock[] = [
    {
      title: t("notificationPermission.preview.prTitle"),
      body: t("notificationPermission.preview.prBody"),
      timestamp: t("notificationPermission.preview.now"),
    },
    {
      title: t("notificationPermission.preview.reminderTitle"),
      body: t("notificationPermission.preview.reminderBody"),
      timestamp: t("notificationPermission.preview.minutesAgo", { minutes: 5 }),
    },
  ];

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
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Text style={styles.title}>{t("notificationPermission.title")}</Text>
        <Text style={styles.subtitle}>{t("notificationPermission.subtitle")}</Text>

        <View style={styles.preview}>
          {mocks.map((m, idx) => (
            <NotificationMockCard key={idx} mock={m} stacked={idx > 0} />
          ))}
        </View>

        <View style={styles.actions}>
          <Text style={styles.hint}>{t("notificationPermission.hint")}</Text>
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

const NotificationMockCard = ({
  mock,
  stacked,
}: {
  mock: NotificationMock;
  stacked: boolean;
}) => (
  <View style={[styles.mockCard, stacked && styles.mockCardStacked]}>
    <LinearGradient
      colors={["#FCF3C0", "#F7E06F", "#C9A84C"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.mockIcon}
    >
      <IconBolt width={20} height={20} />
    </LinearGradient>
    <View style={styles.mockText}>
      <Text style={styles.mockTitle} numberOfLines={1}>
        {mock.title}
      </Text>
      <Text style={styles.mockBody} numberOfLines={2}>
        {mock.body}
      </Text>
    </View>
    <Text style={styles.mockTime}>{mock.timestamp}</Text>
  </View>
);

export default NotificationPermission;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.alpha.white72,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  preview: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  mockCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.alpha.surface08,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  mockCardStacked: {
    marginTop: 12,
    backgroundColor: COLORS.alpha.surface06,
    opacity: 0.85,
  },
  mockIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mockText: {
    flex: 1,
    gap: 2,
  },
  mockTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.neutral.white,
  },
  mockBody: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.alpha.white72,
  },
  mockTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.alpha.white50,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  actions: {
    gap: 14,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white50,
    textAlign: "center",
    marginBottom: 4,
  },
  maybeLater: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.primary.dark,
    textAlign: "center",
    paddingVertical: 8,
  },
});
