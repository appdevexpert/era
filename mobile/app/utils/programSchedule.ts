/**
 * Frontend-driven program scheduling.
 * All date math computed from programStartDate — no DB scheduling needed.
 *
 * Phase model (28 days per phase, 3 phases for a 12-week program):
 *
 *   Per phase k (0..2), starting at programStartDate + k*28:
 *     - Partial week (weekNumber = 4k+1): signup-weekday..Sun (e.g. Wed-Sun = 5 days)
 *     - Full week 2 (weekNumber = 4k+2): Mon-Sun
 *     - Full week 3 (weekNumber = 4k+3): Mon-Sun
 *     - Full week 4 (weekNumber = 4k+4): Mon-Sun
 *     - Rolled Over: Mon..(signup-1) — content from the partial week's days
 *       1..(signup-1). Marked with isAdjustedDay=true.
 *
 *   So the user's content for "Mon of Week 1" never disappears — it shows up
 *   on the Mon at the end of the phase as a rolled-over day, and the same
 *   pattern repeats for Phase 2 (Week 5) and Phase 3 (Week 9).
 */

export interface ProgramScheduleConfig {
  programStartDate: string; // YYYY-MM-DD
  totalWeeks: number; // 12
}

export interface CurrentPosition {
  weekNumber: number; // DB content week. For rolled-over days, points to the partial week (1/5/9).
  dayNumber: number; // DB content day (1..7)
  isAdjustedDay: boolean; // true when on a rolled-over day at end of a phase
}

const PHASE_DAYS = 28;
const PHASE_WEEKS = 4;

/* ─── Helpers ─── */

const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const diffDays = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / 86_400_000);

/** ISO weekday: 1=Mon, 7=Sun */
const isoDay = (d: Date) => ((d.getDay() + 6) % 7) + 1;

/* ─── Core: signup context ─── */

function getSignupContext(config: ProgramScheduleConfig) {
  const start = toDate(config.programStartDate);
  const signupWeekday = isoDay(start); // 1=Mon … 7=Sun
  const skippedDays = signupWeekday - 1; // 0 if Monday
  const partialWeekDays = 8 - signupWeekday; // 7 if Mon, 5 if Wed
  return { start, signupWeekday, skippedDays, partialWeekDays };
}

/* ─── Which week & day is "today"? ─── */

export function computeCurrentPosition(
  config: ProgramScheduleConfig,
  today: string = getToday(),
): CurrentPosition {
  const { start, signupWeekday, skippedDays, partialWeekDays } = getSignupContext(config);
  const t = toDate(today);

  // Before program started
  if (t < start) {
    return { weekNumber: 1, dayNumber: signupWeekday, isAdjustedDay: false };
  }

  const totalPhases = Math.ceil(config.totalWeeks / PHASE_WEEKS);
  const daysElapsed = diffDays(t, start);
  const phaseIndex = Math.floor(daysElapsed / PHASE_DAYS);

  // Past program end
  if (phaseIndex >= totalPhases) {
    return { weekNumber: config.totalWeeks, dayNumber: 7, isAdjustedDay: false };
  }

  const dayInPhase = daysElapsed - phaseIndex * PHASE_DAYS; // 0..27
  const partialWeekNumber = phaseIndex * PHASE_WEEKS + 1; // 1, 5, 9

  // Partial week (Wed..Sun for Wed signup)
  if (dayInPhase < partialWeekDays) {
    return {
      weekNumber: partialWeekNumber,
      dayNumber: signupWeekday + dayInPhase,
      isAdjustedDay: false,
    };
  }

  // Full weeks 2-4 within phase
  const fromFullWeeks = dayInPhase - partialWeekDays;
  if (fromFullWeeks < 21) {
    return {
      weekNumber: partialWeekNumber + 1 + Math.floor(fromFullWeeks / 7),
      dayNumber: (fromFullWeeks % 7) + 1,
      isAdjustedDay: false,
    };
  }

  // Rolled Over Mon..(signup-1)
  const rolledIndex = fromFullWeeks - 21; // 0..(skippedDays-1)
  if (rolledIndex < skippedDays) {
    return {
      weekNumber: partialWeekNumber,
      dayNumber: rolledIndex + 1,
      isAdjustedDay: true,
    };
  }

  // Safety: snap to phase end
  return { weekNumber: partialWeekNumber + 3, dayNumber: 7, isAdjustedDay: false };
}

/* ─── Calendar date for a given week + day ─── */

export function computeDateForDay(
  config: ProgramScheduleConfig,
  weekNumber: number,
  dayNumber: number,
  isAdjusted = false,
): string {
  const { start, signupWeekday, partialWeekDays } = getSignupContext(config);

  const phaseIndex = Math.floor((weekNumber - 1) / PHASE_WEEKS);
  const weekInPhase = (weekNumber - 1) % PHASE_WEEKS; // 0=partial, 1/2/3=full
  const phaseOffset = phaseIndex * PHASE_DAYS;

  if (isAdjusted) {
    // Rolled-over Mon..(signup-1) at end of phase. dayNumber is 1..(signupWeekday-1).
    return toYMD(addDays(start, phaseOffset + partialWeekDays + 21 + (dayNumber - 1)));
  }

  if (weekInPhase === 0) {
    // Partial week — visible days are signupWeekday..7
    return toYMD(addDays(start, phaseOffset + (dayNumber - signupWeekday)));
  }

  // Full weeks 2-4 within phase
  return toYMD(
    addDays(start, phaseOffset + partialWeekDays + (weekInPhase - 1) * 7 + (dayNumber - 1)),
  );
}

/* ─── All dates for a week ─── */

export interface WeekDayDate {
  dayNumber: number;
  calendarDate: string;
  isAdjustedDay: boolean;
}

export function computeWeekDates(
  config: ProgramScheduleConfig,
  weekNumber: number,
): WeekDayDate[] {
  const { signupWeekday, skippedDays } = getSignupContext(config);
  const weekInPhase = (weekNumber - 1) % PHASE_WEEKS;
  const days: WeekDayDate[] = [];

  if (weekInPhase === 0) {
    // Partial week (visible) + rolled-over (end of same phase)
    for (let d = signupWeekday; d <= 7; d++) {
      days.push({
        dayNumber: d,
        calendarDate: computeDateForDay(config, weekNumber, d),
        isAdjustedDay: false,
      });
    }
    for (let d = 1; d <= skippedDays; d++) {
      days.push({
        dayNumber: d,
        calendarDate: computeDateForDay(config, weekNumber, d, true),
        isAdjustedDay: true,
      });
    }
    return days;
  }

  // Full week
  for (let d = 1; d <= 7; d++) {
    days.push({
      dayNumber: d,
      calendarDate: computeDateForDay(config, weekNumber, d),
      isAdjustedDay: false,
    });
  }
  return days;
}

/* ─── Week accessibility ─── */

export function isWeekAccessible(
  config: ProgramScheduleConfig,
  weekNumber: number,
  today: string = getToday(),
): boolean {
  const current = computeCurrentPosition(config, today);
  return weekNumber <= current.weekNumber;
}

/* ─── Skipped days info (for UI messages) ─── */

export function getSkippedDaysInfo(config: ProgramScheduleConfig) {
  const { signupWeekday, skippedDays } = getSignupContext(config);
  const dayNumbers = Array.from({ length: skippedDays }, (_, i) => i + 1);
  return { count: skippedDays, dayNumbers, signupWeekday };
}

/* ─── Calendar week (Mon-Sun) ─── */

/** Returns the 7 calendar dates (Mon..Sun) of the week containing `today`. */
export function getCalendarWeekDates(today: string = getToday()): string[] {
  const t = toDate(today);
  const wd = isoDay(t); // 1=Mon..7=Sun
  const monday = addDays(t, -(wd - 1));
  return Array.from({ length: 7 }, (_, i) => toYMD(addDays(monday, i)));
}

/* ─── Phase helpers ─── */

/** Partial-week numbers — one per phase (e.g. [1, 5, 9] for a 12-week program). */
export function getPartialWeekNumbers(totalWeeks: number): number[] {
  const totalPhases = Math.ceil(totalWeeks / PHASE_WEEKS);
  return Array.from({ length: totalPhases }, (_, i) => i * PHASE_WEEKS + 1);
}

/** Last calendar date of the program (last rolled-over day if any, else last week's Sun). */
export function computeProgramEndDate(config: ProgramScheduleConfig): string {
  const { skippedDays } = getSignupContext(config);
  const lastPhase = Math.ceil(config.totalWeeks / PHASE_WEEKS) - 1;
  const lastPartialWeek = lastPhase * PHASE_WEEKS + 1;

  if (skippedDays > 0) {
    return computeDateForDay(config, lastPartialWeek, skippedDays, true);
  }
  return computeDateForDay(config, lastPartialWeek + 3, 7);
}

/* ─── Day status ─── */

export type DayStatus = "completed" | "missed" | "active" | "future" | "rest";

export function computeDayStatus(
  dayDate: string,
  today: string,
  isRestDay: boolean,
  isCompleted: boolean,
): DayStatus {
  if (dayDate > today) return "future";
  if (dayDate === today) {
    return isCompleted ? "completed" : "active";
  }
  // Past
  if (isCompleted) return "completed";
  if (isRestDay) return "rest";
  return "missed";
}

/* ─── Weekday from calendar date ─── */

/** ISO weekday (1=Mon, 7=Sun) from a YYYY-MM-DD string */
export function getWeekdayFromDate(dateStr: string): number {
  return isoDay(toDate(dateStr));
}

/* ─── Today as YYYY-MM-DD ─── */

export function getToday(): string {
  return toYMD(new Date());
}
