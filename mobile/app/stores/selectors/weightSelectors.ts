/**
 * Selectors that turn raw body_weight_log entries + goals metrics into the
 * exact shape the Progress tab needs:
 *  - current / heaviest / lightest weight in kg
 *  - 12-week chart (W1..W{current}) with the goals weight anchored at W1
 *  - BMI + height label (uses goals.height; never stored as derived data)
 */

import type { ChartPoint } from "@/app/components/workout/WeightProgressChart";
import type { RootState } from "@/app/stores/store";
import { programWeekFromDate, todayIso } from "@/app/utils/programWeek";

const MAX_PROGRAM_WEEKS = 12;
/** Always show at least this many week ticks so a fresh user sees a real chart. */
const MIN_VISIBLE_WEEKS = 5;

const round1 = (n: number): number => Math.round(n * 10) / 10;

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
 * raw entries — otherwise an off-screen goals weight can stretch the axis
 * far beyond what the chart shows. Targets 5 ticks (4 sections) to match
 * the Figma design.
 */
export const selectChartYRange = (
  state: RootState,
): { yMin: number; yMax: number; yStep: number } => {
  const { points } = selectWeeklyChartPoints(state);
  const { goalsWeightKg } = selectWeight(state);

  // No chart yet — anchor a small window around the goals weight so the
  // axis isn't a hardcoded 60..100.
  if (points.length === 0) {
    const center = Math.round(goalsWeightKg ?? 70);
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

const CM_PER_INCH = 2.54;

/** Returns height in metres (used by BMI). Null when we have no height yet. */
const heightMeters = (
  height: number | null,
  unit: "cm" | "ft",
): number | null => {
  if (height === null || height <= 0) return null;
  const cm = unit === "ft" ? height * CM_PER_INCH : height;
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
  const totalInches = Math.round(goalsHeight);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches - ft * 12;
  return `${ft}ft ${inches}in`;
};
