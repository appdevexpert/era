/**
 * Helpers for converting between calendar dates and program weeks.
 *
 * A program runs for 12 weeks starting on `profiles.program_start_date`.
 * Week N covers days [start + 7*(N-1), start + 7*N).
 */

const MS_PER_DAY = 86_400_000;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

const parseDateIso = (iso: string): number => {
  // Treat as UTC midnight so week math doesn't drift across timezones.
  return new Date(`${iso}T00:00:00Z`).getTime();
};

/**
 * Returns the 1-indexed program week containing `dateIso`. Dates before
 * `programStartIso` are clamped to W1; dates after W12 keep going (caller
 * may cap to 12 if needed).
 */
export const programWeekFromDate = (
  dateIso: string,
  programStartIso: string,
): number => {
  const diffDays = Math.floor(
    (parseDateIso(dateIso) - parseDateIso(programStartIso)) / MS_PER_DAY,
  );
  return Math.max(1, Math.floor(diffDays / 7) + 1);
};
