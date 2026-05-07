import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en";
import nb from "./nb";

const LANGUAGE_KEY = "user_language";

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
const defaultLng = deviceLanguage === "nb" || deviceLanguage === "nn" || deviceLanguage === "no" ? "nb" : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    nb: { translation: nb },
  },
  lng: defaultLng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Restore saved language preference
AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
  if (saved && (saved === "en" || saved === "nb")) {
    i18n.changeLanguage(saved);
  }
});

// Persist language changes
i18n.on("languageChanged", (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng);
});

export default i18n;
