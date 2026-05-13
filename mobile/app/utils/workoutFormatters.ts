import type { PlannedExerciseSetRow } from "@/app/types/workout";
import { normalizeLanguage } from "@/app/utils/localization";

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

export const formatWeight = (
  value: number | string | null | undefined,
  unit = "kg",
) => {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} ${unit}` : "";
};

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

export const formatElapsedTime = (seconds: number | null | undefined) => {
  const safeSeconds = Math.max(Math.floor(seconds ?? 0), 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

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
