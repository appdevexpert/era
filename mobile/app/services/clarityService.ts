import * as Clarity from "@microsoft/react-native-clarity";
import { ENV } from "@/app/config/env";

let initialized = false;

/**
 * Skipped in __DEV__ so local sessions don't pollute the recording quota.
 * Safe to call multiple times.
 */
export const initializeClarity = () => {
  if (__DEV__) return;
  if (initialized) return;
  if (!ENV.CLARITY_PROJECT_ID) {
    console.warn("[clarity] CLARITY_PROJECT_ID missing — skipping init");
    return;
  }
  try {
    Clarity.initialize(ENV.CLARITY_PROJECT_ID);
    initialized = true;
  } catch (err) {
    console.warn("[clarity] init failed", err);
  }
};

export const setClarityUserId = (userId: string) => {
  if (!initialized) return;
  try {
    Clarity.setCustomUserId(userId);
  } catch (err) {
    if (__DEV__) console.warn("[clarity] setCustomUserId failed", err);
  }
};

export const setClarityScreenName = (screenName: string) => {
  if (!initialized) return;
  try {
    Clarity.setCurrentScreenName(screenName);
  } catch (err) {
    if (__DEV__) console.warn("[clarity] setCurrentScreenName failed", err);
  }
};

export const setClarityTag = (key: string, value: string) => {
  if (!initialized) return;
  try {
    Clarity.setCustomTag(key, value);
  } catch (err) {
    if (__DEV__) console.warn("[clarity] setCustomTag failed", err);
  }
};
