import type { PlannedExerciseSetRow } from "@/app/types/workout";
import { normalizeLanguage } from "@/app/utils/localization";

export type WeightUnit = "kg" | "lb";

export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 1 / KG_TO_LB;

export const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number | string | null | undefined) => {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "";
  }

  return Number.isInteger(parsed) ? String(parsed) : String(parsed).replace(/0+$/, "").replace(/\.$/, "");
};

const unitLabel = (unit: WeightUnit) => (unit === "lb" ? "lbs" : "kg");

const kgToDisplayValue = (kg: number, unit: WeightUnit): number => {
  if (unit === "kg") return kg;
  return Math.round(kg * KG_TO_LB);
};

const displayToKg = (value: number, unit: WeightUnit): number => {
  if (unit === "kg") return value;
  return Math.round(value * LB_TO_KG * 100) / 100;
};

export const formatWeight = (
  value: number | string | null | undefined,
  unit: WeightUnit = "kg",
) => {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} ${unitLabel(unit)}` : "";
};

/**
 * Convert a kg-stored value into the user's display unit + label.
 * kg stays as the canonical storage everywhere; this is display-only.
 */
export const formatWeightFromKg = (
  kg: number | string | null | undefined,
  unit: WeightUnit,
) => {
  const parsed = toNumber(kg);
  if (parsed === null) return "";
  const display = kgToDisplayValue(parsed, unit);
  return `${formatNumber(display)} ${unitLabel(unit)}`;
};

/**
 * Convert a value the user typed (in their preferred unit) back to kg.
 * Use this at every save site so the database stays kg-canonical.
 */
export const toKg = (value: number, unit: WeightUnit): number =>
  displayToKg(value, unit);

/**
 * Convert a stored kg value into the user's display unit (raw number, no label).
 * Use for picker `value`, ruler `min`/`max`, and chart ticks.
 */
export const kgToDisplay = (kg: number, unit: WeightUnit): number =>
  kgToDisplayValue(kg, unit);

export const weightUnitLabel = unitLabel;

export const formatDuration = (seconds: number | null | undefined, language: string) => {
  if (!seconds) {
    return "";
  }

  const appLanguage = normalizeLanguage(language);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const secondLabel = appLanguage === "nb" ? "sek" : "sec";

  if (minutes > 0 && remainingSeconds > 0) {
    return `${minutes} min ${remainingSeconds} ${secondLabel}`;
  }

  if (minutes > 0) {
    return `${minutes} min`;
  }

  return `${remainingSeconds} ${secondLabel}`;
};

export const formatWorkoutDuration = (minutes: number | null | undefined) =>
  minutes ? `${minutes}min` : "";

export const formatWeekProgress = (
  weekNumber: number,
  totalWeeks: number,
  language: string,
) => {
  const label = normalizeLanguage(language) === "nb" ? "Uke" : "Week";
  return `${label} ${weekNumber}/${totalWeeks}`;
};

export const formatDayLabel = (dayNumber: number, language: string) => {
  const label = normalizeLanguage(language) === "nb" ? "Dag" : "Day";
  return `${label} ${dayNumber}`;
};

export const formatSetSummary = (
  sets: PlannedExerciseSetRow[],
  language: string,
) => {
  if (sets.length === 0) {
    return "";
  }

  const appLanguage = normalizeLanguage(language);
  const firstSet = sets[0];
  const setLabel = appLanguage === "nb" ? "sett" : sets.length === 1 ? "Set" : "Sets";

  if (firstSet.target_duration_seconds && !firstSet.target_reps_exact && !firstSet.target_reps_min) {
    const duration = formatDuration(firstSet.target_duration_seconds, language);
    return sets.length === 1 ? duration : `${sets.length} ${setLabel} • ${duration}`;
  }

  const reps =
    firstSet.target_reps_exact ??
    (firstSet.target_reps_min && firstSet.target_reps_max
      ? `${firstSet.target_reps_min}-${firstSet.target_reps_max}`
      : null);

  if (!reps) {
    return `${sets.length} ${setLabel}`;
  }

  return `${sets.length} ${setLabel} • ${reps} reps`;
};
