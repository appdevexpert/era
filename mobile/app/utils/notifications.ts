/**
 * Local notifications helper. Wraps expo-notifications with ERA-specific
 * scheduling logic for the three Phase 1 notifications:
 *   - Daily Reminder: every day at 8:00 AM
 *   - Streak Warning: every day at 7:00 PM
 *   - PR Alert: instant fire after a personal record is detected
 *
 * Weekly Summary is intentionally not handled here — it's a push notification
 * delivered by a Supabase edge function on Sunday evenings (Phase 2).
 *
 * Permission flow: requestPermission() is called once at first login from
 * Navigation.tsx. The result is stored in preferencesSlice; the Profile
 * screen reads it to decide whether to show toggles or an "Open Settings"
 * link.
 */
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { FEATURE_FLAGS } from "@/app/config/featureFlags";
import i18n from "@/app/locales/i18n";

export type NotificationKind = "dailyReminder" | "streakWarning" | "prAlert";

export type PermissionStatus = "granted" | "denied" | "undetermined";

/**
 * Stable identifiers so a re-schedule replaces (rather than duplicates) the
 * existing notification. expo-notifications matches by identifier on iOS;
 * on Android we cancel-then-schedule under the same id.
 */
const IDENTIFIERS = {
  dailyReminder: "era.dailyReminder",
  streakWarning: "era.streakWarning",
} as const;

/**
 * Foreground handler — when a notification arrives while the app is open,
 * still show the banner + play the sound. Without this, foreground
 * notifications are silently swallowed.
 */
if (FEATURE_FLAGS.ENABLE_NOTIFICATIONS) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const mapStatus = (status: Notifications.PermissionStatus): PermissionStatus => {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
};

export const getPermissionStatus = async (): Promise<PermissionStatus> => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return "granted";
  const { status } = await Notifications.getPermissionsAsync();
  return mapStatus(status);
};

/**
 * Triggers the native system permission dialog. Only fires once per install
 * per platform conventions — if the user has already answered, this returns
 * their previous answer without re-prompting.
 */
export const requestNotificationPermission = async (): Promise<PermissionStatus> => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return "granted";
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== "undetermined") return mapStatus(existing.status);

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return mapStatus(status);
};

export const openSystemSettings = () => {
  Linking.openSettings().catch(() => {
    // Fail silently — there's no recovery path if the OS refuses to open
    // its own settings, and the user can navigate there manually.
  });
};

/**
 * Schedules a daily repeating notification at the given hour/minute.
 * Replaces any existing schedule under the same identifier.
 */
const scheduleDaily = async (
  identifier: string,
  hour: number,
  minute: number,
  title: string,
  body: string,
) => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

export const scheduleDailyReminder = async () => {
  await scheduleDaily(
    IDENTIFIERS.dailyReminder,
    8,
    0,
    i18n.t("notificationContent.dailyReminder.title"),
    i18n.t("notificationContent.dailyReminder.body"),
  );
};

export const scheduleStreakWarning = async () => {
  await scheduleDaily(
    IDENTIFIERS.streakWarning,
    19,
    0,
    i18n.t("notificationContent.streakWarning.title"),
    i18n.t("notificationContent.streakWarning.body"),
  );
};

/**
 * Fires a one-off PR celebration notification. Used by the workout session
 * flow right after checkAndCreateSetPRs confirms a new max-weight PR.
 */
export const firePRAlert = async (exerciseName: string, weightLabel: string) => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notificationContent.prAlert.title"),
      body: i18n.t("notificationContent.prAlert.body", {
        exercise: exerciseName,
        weight: weightLabel,
      }),
      sound: true,
    },
    trigger: null,
  });
};

export const cancelDailyReminder = async () => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIERS.dailyReminder).catch(() => {});
};

export const cancelStreakWarning = async () => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIERS.streakWarning).catch(() => {});
};

export const cancelAllScheduledNotifications = async () => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
};

/**
 * One-shot setup of the default Android notification channel. expo-notifications
 * needs this on Android 8+ for any notification to show. Safe to call multiple
 * times — Android dedupes by channel id.
 */
export const ensureAndroidChannel = async () => {
  if (!FEATURE_FLAGS.ENABLE_NOTIFICATIONS) return;
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "ERA",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#D4AF37",
  });
};
