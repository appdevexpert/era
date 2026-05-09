import type { TranslationMap } from "@/app/types/workout";

export type AppLanguage = "en" | "nb";

export const normalizeLanguage = (language?: string): AppLanguage => {
  const value = language?.toLowerCase() ?? "en";

  if (value.startsWith("nb") || value.startsWith("nn") || value.startsWith("no")) {
    return "nb";
  }

  return "en";
};

export const getLocalizedText = (
  translations: TranslationMap,
  language: string,
  fallback = "",
) => {
  const normalizedLanguage = normalizeLanguage(language);

  return translations?.[normalizedLanguage] ?? translations?.en ?? fallback;
};
