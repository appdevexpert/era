/**
 * Frontend-driven program scheduling.
 * All date math computed from programStartDate — no DB scheduling needed.
 */

export interface ProgramScheduleConfig {
  programStartDate: string; // YYYY-MM-DD
  totalWeeks: number; // 12
}

export interface CurrentPosition {
  weekNumber: number; // 1–12
  dayNumber: number; // 1–7
  isAdjustedDay: boolean; // Week 1 skipped day placed in Week 4
}

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
  const week1End = addDays(start, 7 - signupWeekday); // first Sunday
  const week2Start = addDays(week1End, 1); // first Monday after
  return { start, signupWeekday, skippedDays, week1End, week2Start };
}

/* ─── Which week & day is "today"? ─── */

export function computeCurrentPosition(
  config: ProgramScheduleConfig,
  today: string = toYMD(new Date()),
): CurrentPosition {
  const { start, signupWeekday, skippedDays, week1End, week2Start } =
    getSignupContext(config);
  const t = toDate(today);

  // Before program started
  if (t < start) return { weekNumber: 1, dayNumber: signupWeekday, isAdjustedDay: false };

  // Week 1 (partial)
  if (t <= week1End) {
    const elapsed = diffDays(t, start);
    return { weekNumber: 1, dayNumber: signupWeekday + elapsed, isAdjustedDay: false };
  }

  // After Week 1
  const fromW2 = diffDays(t, week2Start);

  // Weeks 2–3 (normal)
  if (fromW2 < 14) {
    return {
      weekNumber: 2 + Math.floor(fromW2 / 7),
      dayNumber: (fromW2 % 7) + 1,
      isAdjustedDay: false,
    };
  }

  // Week 4 (7 normal + skippedDays adjusted)
  const fromW4 = fromW2 - 14;
  const week4Total = 7 + skippedDays;
  if (fromW4 < week4Total) {
    if (fromW4 < 7) {
      return { weekNumber: 4, dayNumber: fromW4 + 1, isAdjustedDay: false };
    }
    // Adjusted days — content from Week 1's skipped days
    return { weekNumber: 4, dayNumber: fromW4 - 7 + 1, isAdjustedDay: true };
  }

  // Weeks 5–12
  const fromW5 = fromW2 - 14 - week4Total;
  const weekOff = Math.floor(fromW5 / 7);
  const weekNum = 5 + weekOff;

  // Clamp to totalWeeks
  if (weekNum > config.totalWeeks) {
    return { weekNumber: config.totalWeeks, dayNumber: 7, isAdjustedDay: false };
  }

  return { weekNumber: weekNum, dayNumber: (fromW5 % 7) + 1, isAdjustedDay: false };
}

/* ─── Calendar date for a given week + day ─── */

export function computeDateForDay(
  config: ProgramScheduleConfig,
  weekNumber: number,
  dayNumber: number,
  isAdjusted = false,
): string {
  const { start, signupWeekday, skippedDays, week2Start } =
    getSignupContext(config);

  if (weekNumber === 1) {
    // Partial week: day dayNumber maps to start + (dayNumber - signupWeekday)
    return toYMD(addDays(start, dayNumber - signupWeekday));
  }

  if (weekNumber <= 3) {
    return toYMD(addDays(week2Start, (weekNumber - 2) * 7 + (dayNumber - 1)));
  }

  if (weekNumber === 4) {
    if (isAdjusted) {
      // Adjusted days come after Week 4's normal 7 days
      return toYMD(addDays(week2Start, 14 + 7 + (dayNumber - 1)));
    }
    return toYMD(addDays(week2Start, 14 + (dayNumber - 1)));
  }

  // Week 5+
  const week4Total = 7 + skippedDays;
  return toYMD(addDays(week2Start, 14 + week4Total + (weekNumber - 5) * 7 + (dayNumber - 1)));
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
  const days: WeekDayDate[] = [];

  if (weekNumber === 1) {
    // Partial: only days from signupWeekday to 7
    for (let d = signupWeekday; d <= 7; d++) {
      days.push({
        dayNumber: d,
        calendarDate: computeDateForDay(config, 1, d),
        isAdjustedDay: false,
      });
    }
    return days;
  }

  // Normal 7 days
  for (let d = 1; d <= 7; d++) {
    days.push({
      dayNumber: d,
      calendarDate: computeDateForDay(config, weekNumber, d),
      isAdjustedDay: false,
    });
  }

  // Week 4: append adjusted days
  if (weekNumber === 4 && skippedDays > 0) {
    for (let d = 1; d <= skippedDays; d++) {
      days.push({
        dayNumber: d,
        calendarDate: computeDateForDay(config, 4, d, true),
        isAdjustedDay: true,
      });
    }
  }

  return days;
}

/* ─── Week accessibility ─── */

export function isWeekAccessible(
  config: ProgramScheduleConfig,
  weekNumber: number,
  today: string = toYMD(new Date()),
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

/** Returns ISO weekday (1=Mon, 7=Sun) from a YYYY-MM-DD string */
export function getWeekdayFromDate(dateStr: string): number {
  return isoDay(toDate(dateStr));
}

/* ─── Today as YYYY-MM-DD ─── */

export function getToday(): string {
  return toYMD(new Date());
}
