/**
 * Small, dependency-free calendar helpers for the custom ERA date picker.
 *
 * Month/weekday labels follow the same in-code bilingual pattern as
 * WEEKDAY_LABELS in workoutMappers (data arrays, not locale-file strings) so
 * the picker stays fully localized without bloating the locale files.
 *
 * All date math is UTC-based to match `logged_for_date` and `todayIso()` used
 * elsewhere — this keeps the highlighted "today" cell in sync with the date a
 * log actually gets written under.
 */

import { normalizeLanguage } from "@/app/utils/localization";

export const MONTH_LABELS: Record<"en" | "nb", string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  nb: [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ],
};

/** Monday-first weekday initials — the app renders Monday-first weeks. */
export const WEEKDAY_MIN: Record<"en" | "nb", string[]> = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  nb: ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"],
};

const pad = (n: number): string => String(n).padStart(2, "0");

/** YYYY-MM-DD for the given year, 0-based month and day. */
export const toIso = (year: number, month0: number, day: number): string =>
  `${year}-${pad(month0 + 1)}-${pad(day)}`;

export const daysInMonth = (year: number, month0: number): number =>
  new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

/** Monday-first weekday index (0 = Mon … 6 = Sun) of the 1st of the month. */
export const firstWeekdayMondayFirst = (year: number, month0: number): number =>
  (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7;

/** "4 JULY, 2026" style — localized, uppercased month. */
export const formatLongDate = (iso: string, language: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  const month0 = (month ?? 1) - 1;
  const name = MONTH_LABELS[normalizeLanguage(language)][month0] ?? "";
  return `${day} ${name.toUpperCase()}, ${year}`;
};
