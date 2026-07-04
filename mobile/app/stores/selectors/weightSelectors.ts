/**
 * Selectors that turn raw body_weight_log entries + goals metrics into the
 * exact shape the Progress tab needs:
 *  - current / heaviest / lightest weight in kg
 *  - last-30-days daily trend chart (day 1..30, today = day 30) for the card
 *  - 12-week chart (W1..W{current}) — kept for reference / alternate views
 *  - BMI + height label (uses goals.height; never stored as derived data)
 */

import type { ChartPoint } from "@/app/components/workout/WeightProgressChart";
import type { RootState } from "@/app/stores/store";
import { programWeekFromDate, todayIso } from "@/app/utils/programWeek";

const MAX_PROGRAM_WEEKS = 12;
/** Always show at least this many week ticks so a fresh user sees a real chart. */
const MIN_VISIBLE_WEEKS = 5;

/** Rolling window for the body-weight trend chart on the Progress screen. */
const DAILY_WINDOW_DAYS = 30;
const MS_PER_DAY = 86_400_000;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Returns `iso` shifted by `days` (can be negative) as a YYYY-MM-DD string. */
const shiftIso = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);

/** Whole-day offset of `iso` from `startIso` (0 = same day, negative = before). */
const dayOffset = (iso: string, startIso: string): number =>
  Math.floor(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${startIso}T00:00:00Z`)) /
      MS_PER_DAY,
  );

const selectWeight = (state: RootState) => state.weight;

export const selectWeightStatus = (state: RootState) => state.weight.status;
export const selectWeightError = (state: RootState) => state.weight.error;

export const selectWeightEntries = (state: RootState) => state.weight.entries;

export const selectGoalsWeightKg = (state: RootState) =>
  state.weight.goalsWeightKg;

/**
 * Fallback rule (Option B): latest log row → goals weight → null.
 */
export const selectCurrentWeightKg = (state: RootState): number | null => {
  const { entries, goalsWeightKg } = selectWeight(state);
  if (entries.length > 0) return entries[0].weight_kg;
  return goalsWeightKg;
};

/**
 * Heaviest / lightest = extremes across the goals starting weight + every
 * logged entry. The goals weight is always part of the pool because it's
 * the W1 anchor on the chart — heaviest/lightest must reflect everything
 * the user sees plotted.
 */
const collectAllWeightValues = (state: RootState): number[] => {
  const { entries, goalsWeightKg } = selectWeight(state);
  const values: number[] = entries.map((e) => e.weight_kg);
  if (goalsWeightKg !== null) values.push(goalsWeightKg);
  return values;
};

export const selectHeaviestKg = (state: RootState): number | null => {
  const values = collectAllWeightValues(state);
  if (values.length === 0) return null;
  return round1(Math.max(...values));
};

export const selectLightestKg = (state: RootState): number | null => {
  const values = collectAllWeightValues(state);
  if (values.length === 0) return null;
  return round1(Math.min(...values));
};

/**
 * Builds the chart data array. Weeks without logs carry the last known
 * weight forward (isReal=false) so the line stays continuous; the halo
 * marker lands on the most recent real log. W1 is always anchored to the
 * onboarding weight if no W1 log exists.
 */
export const selectWeeklyChartPoints = (
  state: RootState,
): { points: ChartPoint[]; ticks: string[] } => {
  const { entries, goalsWeightKg } = selectWeight(state);
  const programStartDate = state.auth.programStartDate;
  if (!programStartDate) return { points: [], ticks: [] };

  const currentWeek = Math.min(
    MAX_PROGRAM_WEEKS,
    programWeekFromDate(todayIso(), programStartDate),
  );

  // Group entries by program week, dropping anything outside W1..W12.
  const byWeek = new Map<number, number[]>();
  for (const entry of entries) {
    const w = programWeekFromDate(entry.logged_for_date, programStartDate);
    if (w < 1 || w > MAX_PROGRAM_WEEKS) continue;
    const bucket = byWeek.get(w) ?? [];
    bucket.push(entry.weight_kg);
    byWeek.set(w, bucket);
  }

  // X-axis always spans at least 5 weeks so the chart never collapses to a
  // single tick. It grows as the user progresses, capped at 12.
  const visibleWeeks = Math.min(
    MAX_PROGRAM_WEEKS,
    Math.max(MIN_VISIBLE_WEEKS, currentWeek),
  );

  const points: ChartPoint[] = [];
  const ticks: string[] = [];
  let lastValue: number | null = null;

  for (let w = 1; w <= visibleWeeks; w++) {
    ticks.push(`WEEK ${w}`);
    // Only emit data points up to currentWeek — future weeks stay empty on
    // the line but still appear as tick labels on the x-axis.
    if (w > currentWeek) continue;
    const weekValues = byWeek.get(w);
    if (weekValues && weekValues.length > 0) {
      const avg =
        weekValues.reduce((sum, v) => sum + v, 0) / weekValues.length;
      points.push({ label: `WEEK ${w}`, value: round1(avg), isReal: true });
      lastValue = avg;
    } else if (w === 1 && goalsWeightKg !== null) {
      points.push({
        label: `WEEK ${w}`,
        value: round1(goalsWeightKg),
        isReal: false,
      });
      lastValue = goalsWeightKg;
    } else if (lastValue !== null) {
      points.push({ label: `WEEK ${w}`, value: round1(lastValue), isReal: false });
    }
  }

  return { points, ticks };
};

/**
 * Builds the last-30-days body-weight trend for the Progress screen.
 *
 * X axis = day 1..30 (day 30 = today, day 1 = 29 days ago). Y axis = weight.
 * Every day gets a point so the line is time-accurate:
 *   - a day with a logged weight            → real point (halo lands on the newest)
 *   - a gap between two logs                 → linear interpolation (smooth trend)
 *   - before the first / after the last log  → carry the nearest value flat
 * Only day 1 + every 5th day is labelled so the 30 ticks never overlap.
 */
export const selectDailyChartPoints = (
  state: RootState,
): { points: ChartPoint[]; ticks: string[] } => {
  const today = todayIso();
  const windowStart = shiftIso(today, -(DAILY_WINDOW_DAYS - 1));

  // dayIndex (0..29) → logged weight. Entries are unique per date & newest-first,
  // so the first hit per index wins.
  const byDay = new Map<number, number>();
  for (const entry of selectWeightEntries(state)) {
    const idx = dayOffset(entry.logged_for_date, windowStart);
    if (idx < 0 || idx > DAILY_WINDOW_DAYS - 1) continue;
    if (!byDay.has(idx)) byDay.set(idx, round1(entry.weight_kg));
  }

  // X-axis label for each day = its day-of-month (the date), e.g.
  // 5, 6 … 30, 1, 2, 3, 4 across a month boundary. Every day is labelled;
  // the chart scrolls horizontally (pageSize) so labels never overlap.
  const ticks: string[] = [];
  for (let i = 0; i < DAILY_WINDOW_DAYS; i++) {
    ticks.push(String(Number(shiftIso(windowStart, i).slice(8, 10))));
  }

  const realDays = [...byDay.keys()].sort((a, b) => a - b);

  // Nothing logged in the window → flat line at the latest known weight so the
  // card still shows a chart instead of collapsing to empty.
  if (realDays.length === 0) {
    const baseline = selectCurrentWeightKg(state);
    if (baseline === null) return { points: [], ticks };
    const flat = round1(baseline);
    const points = ticks.map((label) => ({
      label,
      value: flat,
      isReal: false,
    }));
    return { points, ticks };
  }

  const firstDay = realDays[0];
  const lastDay = realDays[realDays.length - 1];

  const points: ChartPoint[] = [];
  for (let i = 0; i < DAILY_WINDOW_DAYS; i++) {
    const label = ticks[i];
    const logged = byDay.get(i);
    if (logged !== undefined) {
      points.push({ label, value: logged, isReal: true });
    } else if (i < firstDay) {
      points.push({ label, value: byDay.get(firstDay)!, isReal: false });
    } else if (i > lastDay) {
      points.push({ label, value: byDay.get(lastDay)!, isReal: false });
    } else {
      // Interpolate between the surrounding logs for a smooth up/down trend.
      let prev = i - 1;
      while (!byDay.has(prev)) prev--;
      let next = i + 1;
      while (!byDay.has(next)) next++;
      const pv = byDay.get(prev)!;
      const nv = byDay.get(next)!;
      const ratio = (i - prev) / (next - prev);
      points.push({
        label,
        value: round1(pv + (nv - pv) * ratio),
        isReal: false,
      });
    }
  }

  return { points, ticks };
};

/**
 * Picks a Y-axis step that keeps the tick count at ~5 regardless of the
 * spread between min and max. Without this a 25 kg spread renders 25 ticks.
 */
const pickYStep = (range: number): number => {
  if (range <= 5) return 1;
  if (range <= 12) return 2;
  if (range <= 25) return 5;
  if (range <= 60) return 10;
  return 20;
};

/**
 * Y-axis range derived from the points that are ACTUALLY plotted, not from
 * raw entries — otherwise an off-screen weight can stretch the axis far
 * beyond what the chart shows. Targets 5 ticks (4 sections) to match the
 * Figma design. `fallbackCenter` anchors a small window when nothing is
 * plotted yet, so the axis isn't a hardcoded 60..100.
 */
const computeYRange = (
  points: ChartPoint[],
  fallbackCenter: number,
): { yMin: number; yMax: number; yStep: number } => {
  if (points.length === 0) {
    const center = Math.round(fallbackCenter);
    return { yMin: center - 1, yMax: center + 3, yStep: 1 };
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const yStep = pickYStep(spread);

  // Tight spread (≤4 kg) → force the design's 5-tick layout with data
  // sitting in the lower portion of the visible range (Figma 80..84 case).
  if (spread <= 4) {
    const yMin = Math.floor(min) - 1;
    return { yMin, yMax: yMin + 4, yStep: 1 };
  }

  // Wider spread → snap to step boundaries on both sides for round labels.
  const yMin = Math.floor(min / yStep) * yStep - yStep;
  const yMax = Math.ceil(max / yStep) * yStep + yStep;
  return { yMin, yMax, yStep };
};

export const selectChartYRange = (
  state: RootState,
): { yMin: number; yMax: number; yStep: number } =>
  computeYRange(
    selectWeeklyChartPoints(state).points,
    selectWeight(state).goalsWeightKg ?? 70,
  );

export const selectDailyChartYRange = (
  state: RootState,
): { yMin: number; yMax: number; yStep: number } =>
  computeYRange(
    selectDailyChartPoints(state).points,
    selectCurrentWeightKg(state) ?? selectWeight(state).goalsWeightKg ?? 70,
  );

const CM_PER_FOOT = 30.48;

/**
 * Storage convention for `goals.height`:
 *   - cm-mode → centimeters
 *   - ft-mode → decimal feet (e.g. 5.9166 for 5'11")
 */

/** Returns height in metres (used by BMI). Null when we have no height yet. */
const heightMeters = (
  height: number | null,
  unit: "cm" | "ft",
): number | null => {
  if (height === null || height <= 0) return null;
  const cm = unit === "ft" ? height * CM_PER_FOOT : height;
  return cm / 100;
};

export const selectBmi = (state: RootState): number | null => {
  const weightKg = selectCurrentWeightKg(state);
  const meters = heightMeters(state.weight.goalsHeight, state.weight.goalsHeightUnit);
  if (weightKg === null || meters === null) return null;
  return round1(weightKg / (meters * meters));
};

export const selectHeightLabel = (state: RootState): string | null => {
  const { goalsHeight, goalsHeightUnit } = state.weight;
  if (goalsHeight === null || goalsHeight <= 0) return null;
  if (goalsHeightUnit === "cm") return `${Math.round(goalsHeight)} cm`;
  const totalInches = Math.round(goalsHeight * 12);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches - ft * 12;
  return `${ft}ft ${inches}in`;
};
