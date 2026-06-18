/**
 * Cycle 1 completion detection — pure calendar check.
 *
 * The 12-week program advances calendar-day-by-day via programSchedule.ts.
 * Once today is past the calendar date of Week 12 / Day 7, cycle 1 is
 * considered complete and the celebration → choice flow should fire.
 *
 * No DB writes. No side effects. Caller decides what to do with the result.
 */

import { computeDateForDay, getToday, type ProgramScheduleConfig } from "./programSchedule";

export interface CycleDetectionInput {
  programStartDate: string; // YYYY-MM-DD
  totalWeeks?: number; // default 12
  today?: string; // YYYY-MM-DD; defaults to system today
}

export interface CycleDetectionResult {
  isComplete: boolean;
  lastDayDate: string; // calendar date of week N / day 7
  daysOverdue: number; // 0 if not complete, else days past lastDayDate
}

const MS_PER_DAY = 86_400_000;

const toDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function detectCycleCompletion(input: CycleDetectionInput): CycleDetectionResult {
  const totalWeeks = input.totalWeeks ?? 12;
  const today = input.today ?? getToday();

  const config: ProgramScheduleConfig = {
    programStartDate: input.programStartDate,
    totalWeeks,
  };

  const lastDayDate = computeDateForDay(config, totalWeeks, 7);
  const diffDays = Math.floor((toDate(today).getTime() - toDate(lastDayDate).getTime()) / MS_PER_DAY);
  const isComplete = diffDays > 0;

  return {
    isComplete,
    lastDayDate,
    daysOverdue: isComplete ? diffDays : 0,
  };
}
