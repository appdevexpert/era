import type { MuscleGroup } from "@/app/navigation/types";
import { computeCurrentPosition, computeDateForDay, getCalendarWeekDates, getPartialWeekNumbers, getSkippedDaysInfo, getToday, getWeekdayFromDate, isWeekAccessible } from "@/app/utils/programSchedule";
import type {
  ExerciseLibraryRow,
  ExerciseListView,
  ExerciseMode,
  PlannedExerciseSetRow,
  ProgramDayDetailData,
  ProgramDayRow,
  ProgramWeekRow,
  SessionExercise,
  SessionExerciseSet,
  SessionWorkout,
  WorkoutHomeView,
  WorkoutPlanPhaseView,
  WorkoutPlanRolledOverView,
  WorkoutPlanView,
  WorkoutPlanWeekView,
  WorkoutOverviewData,
} from "@/app/types/workout";
import { DELOAD_MAX_SETS, DELOAD_WEIGHT_MULTIPLIER } from "@/app/utils/deloadTransform";
import { resolveExerciseDemoVideo } from "@/app/utils/exerciseMedia";
import { getLocalizedText, normalizeLanguage, type AppLanguage } from "@/app/utils/localization";
import {
  formatDayLabel,
  formatDuration,
  formatSetSummary,
  formatWeekProgress,
  formatWeight,
  formatWorkoutDuration,
} from "@/app/utils/workoutFormatters";

const WEEKDAY_LABELS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  nb: ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"],
};

const WEEKDAY_LABELS_FULL = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  nb: ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"],
};

const MUSCLE_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    abs: "Abs",
    back: "Back",
    biceps: "Biceps",
    cardio: "Cardio",
    chest: "Chest",
    core: "Core",
    calves: "Calves",
    forearms: "Forearms",
    glutes: "Glutes",
    hamstrings: "Hamstrings",
    legs: "Legs",
    lower_back: "Lower Back",
    neck: "Neck",
    obliques: "Obliques",
    quads: "Quads",
    rear_delts: "Rear Delts",
    recovery: "Recovery",
    shoulders: "Shoulders",
    traps: "Traps",
    triceps: "Triceps",
  },
  nb: {
    abs: "Mage",
    back: "Rygg",
    biceps: "Biceps",
    cardio: "Kondisjon",
    calves: "Legger",
    chest: "Bryst",
    core: "Kjerne",
    forearms: "Underarmer",
    glutes: "Setemuskler",
    hamstrings: "Bakside lår",
    legs: "Bein",
    lower_back: "Korsrygg",
    neck: "Nakke",
    obliques: "Skrå magemuskler",
    quads: "Forside lår",
    rear_delts: "Bakre skuldre",
    recovery: "Restitusjon",
    shoulders: "Skuldre",
    traps: "Trapezius",
    triceps: "Triceps",
  },
};

const getWeekForDay = (weeks: ProgramWeekRow[], day: ProgramDayRow) =>
  weeks.find((week) => week.id === day.week_id);

const padDayNumber = (value: number) => String(value).padStart(2, "0");

export const getWeekdayLabel = (weekday: number | null, language: string) => {
  const labels = WEEKDAY_LABELS[normalizeLanguage(language)];
  const index = typeof weekday === "number" ? weekday - 1 : 0;
  return labels[index] ?? labels[0];
};

export const getWeekdayLabelFull = (weekday: number | null, language: string) => {
  const labels = WEEKDAY_LABELS_FULL[normalizeLanguage(language)];
  const index = typeof weekday === "number" ? weekday - 1 : 0;
  return labels[index] ?? labels[0];
};

const localizeMuscle = (muscle: string, language: string) => {
  const labels = MUSCLE_LABELS[normalizeLanguage(language)];
  // Lower-cased: the library is admin-entered free text, so casing drifts
  // ("Forearms" vs "forearms") and an unmatched key would leak a raw DB string
  // into the UI.
  return labels[muscle.toLowerCase()] ?? muscle;
};

/** `exercise_library.category` enum — the "Compound" half of "Back • Compound". */
const CATEGORY_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    compound: "Compound",
    isolation: "Isolation",
    core: "Core",
    cardio: "Cardio",
  },
  nb: {
    compound: "Sammensatt",
    isolation: "Isolasjon",
    core: "Kjerne",
    cardio: "Kondisjon",
  },
};

/**
 * "Back • Compound" — the gold line under an exercise name in the info sheet.
 * Both halves come from `exercise_library`, so both need localizing; either can
 * be missing (empty `primary_muscles`, unseeded category) and the separator is
 * dropped rather than left dangling.
 */
export const formatMuscleCategory = (
  library: Pick<ExerciseLibraryRow, "primary_muscles" | "category"> | undefined,
  language: string,
): string => {
  const muscle = library?.primary_muscles?.[0];
  const labels = CATEGORY_LABELS[normalizeLanguage(language)];
  const category = library?.category ? labels[library.category] ?? library.category : "";

  return [muscle ? localizeMuscle(muscle, language) : "", category]
    .filter(Boolean)
    .join(" • ");
};

export const mapMusclesToIcons = (muscles: string[]): MuscleGroup[] => {
  const iconKeys: MuscleGroup[] = [];

  muscles.forEach((muscle) => {
    let icon: MuscleGroup | null = null;

    // Singular-key badges (new close-up Figma designs).
    if (muscle === "triceps") icon = "tricep";
    else if (muscle === "biceps") icon = "bicep";
    else if (muscle === "forearms") icon = "forearm";
    else if (muscle === "traps") icon = "traps";
    else if (muscle === "neck") icon = "neck";
    else if (muscle === "back") icon = "back";
    else if (muscle === "chest") icon = "chest";
    else if (muscle === "shoulders") icon = "shoulders";
    else if (muscle === "quads") icon = "quads";
    else if (muscle === "glutes") icon = "glutes";
    else if (muscle === "hamstrings") icon = "hamstring";
    else if (muscle === "calves") icon = "calves";
    // Legacy generic icons — no per-muscle close-up yet.
    else if (muscle === "core" || muscle === "abs") icon = "abs";
    else if (muscle === "legs") icon = "leg";

    if (icon && !iconKeys.includes(icon)) {
      iconKeys.push(icon);
    }
  });

  return iconKeys.slice(0, 4);
};

/**
 * Returns the count of `main_exercises` rows for the given day, derived from
 * its cached detail. Same filter as mapExerciseList — keeps both screens
 * counting the same thing. Returns `null` when the day isn't cached yet so
 * callers can fall back to the bootstrap's stale `currentDayExerciseCount`.
 */
function getMainExerciseCount(detail: ProgramDayDetailData | undefined): number | null {
  if (!detail) return null;
  const mainSectionIds = new Set(
    detail.sections
      .filter((section) => section.section_kind === "main_exercises")
      .map((section) => section.id),
  );
  return detail.exercises.filter((exercise) =>
    mainSectionIds.has(exercise.section_id),
  ).length;
}

export function mapWorkoutHome(
  data: WorkoutOverviewData,
  language: string,
  programStartDate?: string | null,
  completedDayIds?: string[],
  completedDayDurations?: Record<string, number>,
  dayDetailsById?: Record<string, ProgramDayDetailData>,
): WorkoutHomeView {
  const config = programStartDate
    ? { programStartDate, totalWeeks: data.program.duration_weeks }
    : null;

  // Step A: Resolve current position. pos.weekNumber points to the DB content week
  // (partial week 1/5/9 when on a rolled-over day).
  let currentDay = data.currentDay;
  let calendarWeekNumber = 1;

  if (config) {
    const pos = computeCurrentPosition(config);
    calendarWeekNumber = pos.weekNumber;

    const found = data.days.find((d) => {
      const w = data.weeks.find((wk) => wk.id === d.week_id);
      return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
    });
    if (found) currentDay = found;
  } else {
    const week = getWeekForDay(data.weeks, currentDay);
    if (week) calendarWeekNumber = week.week_number;
  }

  // Step B: Calendar week for display (programWeek, programType)
  const calendarWeek = data.weeks.find((w) => w.week_number === calendarWeekNumber) ?? data.weeks[0];

  // Step C: Build the strip as a 7-day Mon-Sun calendar week. Each calendar
  // date maps to its DB content via computeCurrentPosition (handles rolled-over
  // automatically). Pre-signup dates render as dashed/inactive pills.
  const today = config ? getToday() : null;
  const completed = new Set(completedDayIds ?? []);
  const startDate = config?.programStartDate ?? null;

  const calendarDates = config && today ? getCalendarWeekDates(today) : null;

  let days: WorkoutHomeView["days"];
  if (config && calendarDates && startDate && today) {
    const todayStr = today;
    days = calendarDates.map((dateStr, index) => {
      const weekday = index + 1; // 1=Mon..7=Sun
      const dateLabel = dateStr.split("-")[2];

      // Pre-signup or post-program — render inactive dashed pill
      if (dateStr < startDate) {
        return {
          key: `pre-${dateStr}`,
          label: getWeekdayLabel(weekday, language),
          date: dateLabel,
          title: "",
          subtitle: "",
          muscles: [] as MuscleGroup[],
          active: false,
          completed: false,
          missed: false,
        };
      }

      const pos = computeCurrentPosition(config, dateStr);
      const day = data.days.find((d) => {
        const w = data.weeks.find((wk) => wk.id === d.week_id);
        return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
      });

      if (!day) {
        return {
          key: `none-${dateStr}`,
          label: getWeekdayLabel(weekday, language),
          date: dateLabel,
          title: "",
          subtitle: "",
          muscles: [] as MuscleGroup[],
          active: false,
          completed: false,
          missed: false,
        };
      }

      const isCompleted = completed.has(day.id);
      const isActive = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isMissed = isPast && !isCompleted && !day.is_rest_day;

      return {
        key: day.id,
        label: getWeekdayLabel(weekday, language),
        date: dateLabel,
        title: getLocalizedText(day.title_translations, language, day.title),
        subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
        muscles: mapMusclesToIcons(day.target_muscles),
        active: isActive,
        completed: isCompleted,
        missed: isMissed,
      };
    });
  } else {
    // Fallback: programStartDate not available — show the calendarWeek's DB days
    const fallback = data.days
      .filter((d) => d.week_id === calendarWeek.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    days = fallback.map((day) => ({
      key: day.id,
      label: getWeekdayLabel(day.weekday, language),
      date: padDayNumber(day.day_number),
      title: getLocalizedText(day.title_translations, language, day.title),
      subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
      muscles: mapMusclesToIcons(day.target_muscles),
      active: day.id === currentDay.id,
      completed: completed.has(day.id),
      missed: false,
    }));
  }

  // Step D: Build output — calendarWeek for program info, currentDay for workout content
  const isCurrentDayCompleted = completed.has(currentDay.id);
  const actualDurationMinutes = completedDayDurations?.[currentDay.id];
  // Prefer the user's actual session length once today's workout is done.
  // Falls back to the plan's estimate while the day is still pending.
  const displayDurationMinutes =
    isCurrentDayCompleted && actualDurationMinutes != null
      ? actualDurationMinutes
      : currentDay.estimated_minutes;
  // data.currentDayExerciseCount is captured at bootstrap for the program's
  // first non-rest day (see workoutService.getWorkoutOverview), so it goes
  // stale the moment the user moves past Day 1. Recompute from the resolved
  // day's cached detail when available — falling back to the bootstrap value
  // only when the per-day cache hasn't been populated yet (rare: pre-bootstrap
  // first render). Both ExerciseListScreen and this card now count the same
  // main_exercises rows, so the two screens always agree.
  const resolvedExerciseCount =
    getMainExerciseCount(dayDetailsById?.[currentDay.id]) ??
    data.currentDayExerciseCount;
  return {
    programId: data.program.id,
    currentDayId: currentDay.id,
    isCompleted: isCurrentDayCompleted,
    title: getLocalizedText(data.program.title_translations, language, data.program.title),
    subtitle: getLocalizedText(currentDay.subtitle_translations, language, currentDay.subtitle ?? ""),
    workoutName: getLocalizedText(currentDay.title_translations, language, currentDay.title),
    exerciseCount: resolvedExerciseCount,
    duration: formatWorkoutDuration(displayDurationMinutes),
    durationMinutes: displayDurationMinutes ?? 0,
    tags: currentDay.target_muscles.slice(0, 4).map((muscle) => localizeMuscle(muscle, language)),
    targetMuscles: currentDay.target_muscles,
    programType: calendarWeek
      ? getLocalizedText(calendarWeek.focus_translations, language, calendarWeek.focus ?? "")
      : "",
    programWeek: calendarWeek
      ? formatWeekProgress(calendarWeek.week_number, data.program.duration_weeks, language)
      : "",
    programDay: formatDayLabel(currentDay.day_number, language),
    days,
  };
}

export function mapWorkoutPlan(
  data: WorkoutOverviewData,
  language: string,
  programStartDate?: string | null,
  completedDayIds?: string[],
): WorkoutPlanView {
  // pos.weekNumber points to the DB content week (1/5/9 when on a rolled-over day)
  let currentDay = data.currentDay;
  let activeAdjustedWeekNumber: number | null = null;
  if (programStartDate) {
    const config = { programStartDate, totalWeeks: data.program.duration_weeks };
    const pos = computeCurrentPosition(config);
    if (pos.isAdjustedDay) activeAdjustedWeekNumber = pos.weekNumber;
    const found = data.days.find((d) => {
      const w = data.weeks.find((wk) => wk.id === d.week_id);
      return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
    });
    if (found) currentDay = found;
  }

  const currentWeek = getWeekForDay(data.weeks, currentDay) ?? data.weeks[0];

  // When on a rolled-over day, the user is calendar-wise AT the end of the
  // phase (Mon/Tue right after the phase's last full week). For phase progress,
  // treat them as being on the last week of that phase so the bar fills to 100%.
  const phaseProgressWeek = activeAdjustedWeekNumber !== null
    ? data.weeks.find((w) => w.week_number === activeAdjustedWeekNumber + 3) ?? currentWeek
    : currentWeek;
  const phases = buildPhases(data.weeks, phaseProgressWeek, language);
  const firstWeekDays = data.days
    .filter((day) => day.week_id === currentWeek?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const skippedInfo = programStartDate
    ? getSkippedDaysInfo({ programStartDate, totalWeeks: data.program.duration_weeks })
    : null;

  return {
    phases,
    weeks: data.weeks.map((week) =>
      mapPlanWeek({
        week,
        days: data.days.filter((day) => day.week_id === week.id),
        templateDays: firstWeekDays,
        currentDay,
        daysPerWeek: data.program.days_per_week,
        language,
        programStartDate,
        completedDayIds,
        skippedInfo,
      }),
    ),
    rolledOver: buildRolledOverSections({
      data,
      currentDay,
      activeAdjustedWeekNumber,
      language,
      programStartDate,
      completedDayIds,
      skippedInfo,
    }),
    hasAdjustment: (skippedInfo?.count ?? 0) > 0,
    skippedDayCount: skippedInfo?.count ?? 0,
  };
}

function buildRolledOverSections({
  data,
  currentDay,
  activeAdjustedWeekNumber,
  language,
  programStartDate,
  completedDayIds,
  skippedInfo,
}: {
  data: WorkoutOverviewData;
  currentDay: ProgramDayRow;
  activeAdjustedWeekNumber: number | null;
  language: string;
  programStartDate?: string | null;
  completedDayIds?: string[];
  skippedInfo?: { count: number; dayNumbers: number[]; signupWeekday: number } | null;
}): WorkoutPlanRolledOverView[] {
  if (!programStartDate || !skippedInfo || skippedInfo.count <= 0) return [];

  const config = { programStartDate, totalWeeks: data.program.duration_weeks };
  const today = getToday();
  const completed = new Set(completedDayIds ?? []);
  const partialWeekNumbers = getPartialWeekNumbers(data.program.duration_weeks);

  return partialWeekNumbers.flatMap((partialWeekNumber) => {
    const partialWeek = data.weeks.find((w) => w.week_number === partialWeekNumber);
    if (!partialWeek) return [];

    const lastWeekOfPhase = partialWeekNumber + 3;
    const phaseWeek = data.weeks.find((w) => w.week_number === lastWeekOfPhase);
    if (!phaseWeek) return [];

    const skippedDayRows = data.days
      .filter((d) => d.week_id === partialWeek.id && d.day_number < skippedInfo.signupWeekday)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (skippedDayRows.length === 0) return [];

    const days = skippedDayRows.map((day) => {
      const dayDate = computeDateForDay(config, partialWeekNumber, day.day_number, true);
      const weekday = getWeekdayFromDate(dayDate);
      const isCompleted = completed.has(day.id);
      const isActive = day.id === currentDay.id;
      const isPast = dayDate < today;
      const isFuture = dayDate > today;

      let status: "completed" | "missed" | "active" | "future";
      if (isCompleted) status = "completed";
      else if (isActive) status = "active";
      else if (isPast && !day.is_rest_day) status = "missed";
      else if (isFuture) status = "future";
      else status = "future";

      return {
        programDayId: day.id,
        isRestDay: day.is_rest_day,
        isToday: dayDate === today,
        date: dayDate.split("-")[2],
        dayLabel: getWeekdayLabel(weekday, language),
        status,
        title: getLocalizedText(day.title_translations, language, day.title),
        subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
        muscles: mapMusclesToIcons(day.target_muscles),
      };
    });

    return [{
      phase: getLocalizedText(phaseWeek.focus_translations, language, phaseWeek.focus ?? ""),
      afterWeekNumber: lastWeekOfPhase,
      sourceWeekNumber: partialWeekNumber,
      isCurrent: activeAdjustedWeekNumber === partialWeekNumber,
      days,
    }];
  });
}

/**
 * Reorders a single section's exercises to match the user's saved drag-and-drop
 * order. Drift-safe by design:
 *   - ids present in `orderOverride` are placed in that saved order,
 *   - any exercise the override doesn't mention (e.g. an admin added a new one
 *     after the user last reordered) keeps its default sort_order and lands
 *     after the known ones — never hidden, never dropped,
 *   - an empty / missing override falls back to plain sort_order (the plan's
 *     default, identical to today's behavior).
 * `orderOverride` is the full day's flat id list; since cross-section drag is
 * impossible, filtering to one section preserves that section's relative order.
 */
function applyExerciseOrder<T extends { id: string; sort_order: number }>(
  exercises: T[],
  orderOverride: string[] | undefined,
): T[] {
  const sorted = [...exercises].sort((a, b) => a.sort_order - b.sort_order);
  if (!orderOverride || orderOverride.length === 0) return sorted;

  const rank = new Map(orderOverride.map((id, index) => [id, index] as const));
  return sorted.sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra != null && rb != null) return ra - rb; // both saved → saved order
    if (ra != null) return -1; // known before unknown
    if (rb != null) return 1;
    return a.sort_order - b.sort_order; // both new → default order
  });
}

/**
 * The info sheet's middle tile: planned reps ("12-18") for a lifting exercise,
 * or the planned duration ("45 SEC") for a timed one. Reads the first set,
 * matching how `formatSetSummary` builds the row's prescription line.
 */
function deriveTargetLabel(
  sets: PlannedExerciseSetRow[],
  language: string,
): { targetLabel: string; targetKind: "reps" | "time" } {
  const firstSet = sets[0];
  if (!firstSet) return { targetLabel: "—", targetKind: "reps" };

  const reps =
    firstSet.target_reps_exact ??
    (firstSet.target_reps_min && firstSet.target_reps_max
      ? `${firstSet.target_reps_min}-${firstSet.target_reps_max}`
      : firstSet.target_reps_min ?? null);

  if (reps != null) return { targetLabel: String(reps), targetKind: "reps" };

  if (firstSet.target_duration_seconds) {
    return {
      targetLabel: formatDuration(firstSet.target_duration_seconds, language),
      targetKind: "time",
    };
  }

  return { targetLabel: "—", targetKind: "reps" };
}

export function mapExerciseList(
  data: ProgramDayDetailData,
  language: string,
  orderOverride?: string[],
  /** `goals.gender` — decides which demo clip the info sheet resolves to. */
  gender?: string | null,
): ExerciseListView {
  const setsByExerciseId = data.sets.reduce<Record<string, PlannedExerciseSetRow[]>>(
    (acc, set) => {
      const current = acc[set.program_day_exercise_id] ?? [];
      acc[set.program_day_exercise_id] = [...current, set];
      return acc;
    },
    {},
  );
  const libraryById = new Map(data.libraryExercises.map((exercise) => [exercise.id, exercise]));
  const mainSectionIds = new Set(
    data.sections
      .filter((section) => section.section_kind === "main_exercises")
      .map((section) => section.id),
  );

  return {
    id: data.day.id,
    title: getLocalizedText(data.day.title_translations, language, data.day.title),
    subtitle: getLocalizedText(data.day.subtitle_translations, language, data.day.subtitle ?? ""),
    exerciseCount: data.exercises.filter((exercise) => mainSectionIds.has(exercise.section_id)).length,
    estimatedMinutes: data.day.estimated_minutes ?? 0,
    sections: data.sections.map((section) => {
      const sectionExercises = applyExerciseOrder(
        data.exercises.filter((exercise) => exercise.section_id === section.id),
        orderOverride,
      );

      return {
        id: section.id,
        title: getLocalizedText(section.title_translations, language, section.title),
        showEdit: section.section_kind === "main_exercises",
        exercises: sectionExercises.map((exercise) => {
          const libraryExercise = libraryById.get(exercise.exercise_id);
          const exerciseSets = setsByExerciseId[exercise.id] ?? [];
          const firstWeightedSet = exerciseSets.find((set) => set.target_weight_value);
          const rawUnit =
            exercise.initial_weight_unit ?? firstWeightedSet?.target_weight_unit ?? "kg";
          const weightUnit = rawUnit === "lb" ? "lb" : "kg";
          const rawInitial =
            exercise.initial_weight_value ?? firstWeightedSet?.target_weight_value;
          const initialWeightKg =
            rawInitial == null || rawInitial === ""
              ? null
              : Number(rawInitial);
          const weight = formatWeight(rawInitial, weightUnit);
          const name = getLocalizedText(
            exercise.display_name_translations,
            language,
            exercise.display_name ??
              getLocalizedText(libraryExercise?.name_translations ?? null, language, libraryExercise?.name ?? ""),
          );

          return {
            id: exercise.id,
            exerciseLibraryId: exercise.exercise_id,
            exerciseCategory: libraryExercise?.category ?? "compound",
            name,
            prescription: formatSetSummary(exerciseSets, language),
            initialWeightKg: Number.isFinite(initialWeightKg) ? initialWeightKg : null,
            weightUnit,
            weight: weight || undefined,
            muscleCategory: formatMuscleCategory(libraryExercise, language),
            setCount: exerciseSets.length,
            ...deriveTargetLabel(exerciseSets, language),
            formDetail: getLocalizedText(
              libraryExercise?.description_translations ?? null,
              language,
              "",
            ),
            demoVideoUrl: resolveExerciseDemoVideo(libraryExercise, gender),
            demoVideoLoop: libraryExercise?.demo_video_loop ?? true,
          };
        }),
      };
    }),
  };
}

function buildPhases(
  weeks: ProgramWeekRow[],
  currentWeek: ProgramWeekRow | undefined,
  language: string,
): WorkoutPlanPhaseView[] {
  const uniquePhases = weeks.reduce<string[]>((acc, week) => {
    const label = getLocalizedText(week.focus_translations, language, week.focus ?? "");

    if (label && !acc.includes(label)) {
      return [...acc, label];
    }

    return acc;
  }, []);

  const currentPhaseLabel = currentWeek
    ? getLocalizedText(currentWeek.focus_translations, language, currentWeek.focus ?? "")
    : null;
  const currentPhaseIndex = currentPhaseLabel
    ? uniquePhases.indexOf(currentPhaseLabel)
    : -1;

  return uniquePhases.map((label, phaseIndex) => {
    const phaseWeeks = weeks.filter(
      (week) => getLocalizedText(week.focus_translations, language, week.focus ?? "") === label,
    );
    const isActive = phaseIndex === currentPhaseIndex;

    let progress: number;
    if (currentPhaseIndex >= 0 && phaseIndex < currentPhaseIndex) {
      // Past phase — fully filled
      progress = 1;
    } else if (isActive && currentWeek) {
      const currentIndex = phaseWeeks.findIndex((week) => week.id === currentWeek.id);
      progress = Math.max((currentIndex + 1) / phaseWeeks.length, 0.12);
    } else {
      // Future phase
      progress = 0;
    }

    return {
      label,
      active: isActive,
      progress,
    };
  });
}

function mapPlanWeek({
  week,
  days,
  templateDays,
  currentDay,
  daysPerWeek,
  language,
  programStartDate,
  completedDayIds,
  skippedInfo,
}: {
  week: ProgramWeekRow;
  days: ProgramDayRow[];
  templateDays: ProgramDayRow[];
  currentDay: ProgramDayRow;
  daysPerWeek: number;
  language: string;
  programStartDate?: string | null;
  completedDayIds?: string[];
  skippedInfo?: { count: number; dayNumbers: number[]; signupWeekday: number } | null;
}): WorkoutPlanWeekView {
  let orderedDays = days.length > 0
    ? [...days].sort((a, b) => a.sort_order - b.sort_order)
    : buildFutureWeekDays(week, templateDays, daysPerWeek);

  const isCurrentWeek = week.id === currentDay.week_id;
  const completed = new Set(completedDayIds ?? []);
  const today = programStartDate ? getToday() : null;
  const config = programStartDate
    ? { programStartDate, totalWeeks: 12 }
    : null;
  const isLocked = config
    ? !isWeekAccessible(config, week.week_number, today ?? undefined)
    : false;

  // Partial weeks (1, 5, 9) only show day_number >= signupWeekday in their own card;
  // the earlier day_numbers render in the matching "Rolled Over Days" section.
  const isPartialWeek = (week.week_number - 1) % 4 === 0;
  if (isPartialWeek && skippedInfo && skippedInfo.count > 0) {
    orderedDays = orderedDays.filter((d) => d.day_number >= skippedInfo.signupWeekday);
  }

  const rawEntries = orderedDays.map((d) => ({ day: d, isAdjusted: false }));

  // Attach calendar date once, then hide days before the user joined the program.
  // Only the week containing programStartDate can lose entries here — every other
  // week's dates are >= programStartDate so the filter is a no-op for them.
  const allDayEntries = rawEntries
    .map((entry) => ({
      day: entry.day,
      isAdjusted: entry.isAdjusted,
      dayDate: config
        ? computeDateForDay(config, week.week_number, entry.day.day_number, entry.isAdjusted)
        : null,
    }))
    .filter(
      (entry) => !(entry.dayDate && programStartDate && entry.dayDate < programStartDate),
    );

  return {
    weekNumber: week.week_number,
    title: getLocalizedText(week.title_translations, language, week.title),
    phase: getLocalizedText(week.focus_translations, language, week.focus ?? ""),
    completedDays: allDayEntries.filter((e) => completed.has(e.day.id)).length,
    totalDays: allDayEntries.length,
    days: allDayEntries.map((entry) => {
      const { day, dayDate } = entry;
      // Use calendar date for weekday label when available
      const weekday = dayDate ? getWeekdayFromDate(dayDate) : day.weekday;
      const isCompleted = completed.has(day.id);
      const isActive = day.id === currentDay.id;
      const isPast = dayDate && today ? dayDate < today : false;
      const isFuture = dayDate && today ? dayDate > today : !isActive;

      let status: "completed" | "missed" | "active" | "future";
      if (isCompleted) status = "completed";
      else if (isActive) status = "active";
      else if (isPast && !day.is_rest_day) status = "missed";
      else if (isFuture) status = "future";
      else status = "future";

      return {
        programDayId: day.id,
        isRestDay: day.is_rest_day,
        isToday: dayDate === today,
        date: dayDate ? dayDate.split("-")[2] : padDayNumber(day.day_number),
        dayLabel: getWeekdayLabel(weekday, language),
        status,
        title: getLocalizedText(day.title_translations, language, day.title),
        subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
        muscles: mapMusclesToIcons(day.target_muscles),
      };
    }),
    isCurrentWeek,
    isLocked,
  };
}

function buildFutureWeekDays(
  week: ProgramWeekRow,
  templateDays: ProgramDayRow[],
  daysPerWeek: number,
): ProgramDayRow[] {
  const count = templateDays.length || daysPerWeek;

  return Array.from({ length: count }, (_, index) => {
    const template = templateDays[index];
    const dayNumber = (week.week_number - 1) * count + index + 1;

    return {
      id: `${week.id}-${index + 1}`,
      program_id: week.program_id,
      week_id: week.id,
      day_number: dayNumber,
      weekday: template?.weekday ?? index + 1,
      workout_kind: template?.workout_kind ?? "custom",
      title: template?.title ?? "",
      title_translations: template?.title_translations ?? null,
      subtitle: template?.subtitle ?? null,
      subtitle_translations: template?.subtitle_translations ?? null,
      target_muscles: template?.target_muscles ?? [],
      estimated_minutes: template?.estimated_minutes ?? null,
      is_rest_day: template?.is_rest_day ?? false,
      sort_order: index + 1,
    };
  });
}

/* ─── Session workout mapper ─── */

function deriveMode(
  modality: string | undefined,
  category: string | undefined,
  hasWeight: boolean,
  hasDuration: boolean,
  hasReps: boolean,
): ExerciseMode {
  if (modality === "cardio") return "cardio";
  if ((modality === "core" || modality === "mobility") && hasDuration && !hasReps) return "timed";
  if (modality === "strength" && !hasWeight) return "bodyweight";
  return "weighted";
}

function formatTimeDuration(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}min ${s}sec` : `${m} min`;
  }
  return `${seconds} sec`;
}

export function mapSessionWorkout(
  data: ProgramDayDetailData,
  language: string,
  options: {
    isDeloadWeek?: boolean;
    usesTopSetBackoff?: boolean;
    /** User's saved per-day exercise ordering (drag-and-drop preference). */
    orderOverride?: string[];
    /** `goals.gender` — decides which demo clip each exercise resolves to. */
    gender?: string | null;
  } = {},
): SessionWorkout {
  const isDeload = options.isDeloadWeek === true;
  // Rami 2026-06-25: Top Set + Back-off applies only to Male Advanced.
  // For every other program (Male Beginner, Female Beginner, Female Golden Era)
  // we flatten the planned sets: same weight across all sets, working kind only.
  const usesTopSetBackoff = options.usesTopSetBackoff === true;
  const setsByExerciseId = data.sets.reduce<Record<string, PlannedExerciseSetRow[]>>(
    (acc, set) => {
      const current = acc[set.program_day_exercise_id] ?? [];
      acc[set.program_day_exercise_id] = [...current, set];
      return acc;
    },
    {},
  );
  const libraryById = new Map(data.libraryExercises.map((ex) => [ex.id, ex]));

  const sortedSections = [...data.sections].sort((a, b) => a.sort_order - b.sort_order);
  let globalOrder = 0;

  const exercises: SessionExercise[] = sortedSections.flatMap((section) => {
    const sectionExercises = applyExerciseOrder(
      data.exercises.filter((ex) => ex.section_id === section.id),
      options.orderOverride,
    );

    return sectionExercises.map((exercise) => {
      const lib = libraryById.get(exercise.exercise_id);
      const rawSets = (setsByExerciseId[exercise.id] ?? []).sort(
        (a, b) => a.set_number - b.set_number,
      );
      const firstSet = rawSets[0];
      const firstWeightedSet = rawSets.find((s) => s.target_weight_value);

      const weightValue =
        exercise.initial_weight_value != null
          ? Number(exercise.initial_weight_value)
          : firstWeightedSet?.target_weight_value != null
            ? Number(firstWeightedSet.target_weight_value)
            : null;

      const hasWeight = weightValue != null;
      const hasDuration = rawSets.some((s) => s.target_duration_seconds != null);
      const hasReps = rawSets.some(
        (s) => s.target_reps_exact != null || s.target_reps_min != null,
      );

      const mode = deriveMode(lib?.modality, lib?.category, hasWeight, hasDuration, hasReps);

      const name = getLocalizedText(
        exercise.display_name_translations,
        language,
        exercise.display_name ??
          getLocalizedText(lib?.name_translations ?? null, language, lib?.name ?? ""),
      );

      const primaryMuscle = lib?.primary_muscles?.[0] ?? "";
      const catLabel = lib?.category ?? "";
      const category = primaryMuscle
        ? `${primaryMuscle} \u2022 ${catLabel}`
        : section.section_kind === "treadmill_walk"
          ? "treadmill"
          : getLocalizedText(section.title_translations, language, section.title);

      // Deload week: drop top_set / backoff rows, cap to 2 working sets,
      // and apply 50% weight to remaining sets. Rules live in deloadTransform.ts.
      const deloadFiltered = isDeload
        ? rawSets.filter((s) => {
            const kind = s.set_kind ?? "working";
            return kind !== "top_set" && kind !== "backoff";
          }).slice(0, DELOAD_MAX_SETS)
        : rawSets;

      // Non-Male-Advanced programs: rewrite top_set/backoff → working and
      // flatten the planned weight to the first set's value so every set
      // in the exercise shows the same weight (Rami 2026-06-25).
      const baseSets = !usesTopSetBackoff && !isDeload
        ? (() => {
            const firstWeight =
              deloadFiltered.find((s) => s.target_weight_value != null)
                ?.target_weight_value ?? null;
            return deloadFiltered.map((s) => ({
              ...s,
              set_kind:
                s.set_kind === "top_set" || s.set_kind === "backoff"
                  ? "working"
                  : (s.set_kind ?? "working"),
              target_weight_value: firstWeight,
            }));
          })()
        : deloadFiltered;

      const sets: SessionExerciseSet[] = baseSets.map((s) => {
        const baseWeight = s.target_weight_value != null ? Number(s.target_weight_value) : null;
        const weight = isDeload && baseWeight != null
          ? Math.round((baseWeight * DELOAD_WEIGHT_MULTIPLIER) / 2.5) * 2.5
          : baseWeight;
        return {
          id: s.id,
          setNumber: s.set_number,
          setKind: s.set_kind ?? "working",
          targetWeight: weight,
          targetWeightUnit: s.target_weight_unit ?? exercise.initial_weight_unit ?? "kg",
          targetReps: s.target_reps_exact ?? s.target_reps_min ?? null,
          targetRepsMin: s.target_reps_min ?? null,
          targetRepsMax: s.target_reps_max ?? null,
          targetDuration: s.target_duration_seconds ?? null,
          restSeconds: s.rest_seconds ?? null,
          displayLabel: null,
        };
      });

      const topSet = usesTopSetBackoff
        ? rawSets.find((s) => s.set_kind === "top_set")
        : undefined;
      const restSeconds =
        firstSet?.rest_seconds ?? exercise.default_rest_seconds ?? 60;

      globalOrder += 1;

      return {
        id: exercise.id,
        exerciseLibraryId: exercise.exercise_id,
        sectionId: section.id,
        sectionKind: section.section_kind,
        name,
        category,
        modality: lib?.modality ?? "strength",
        exerciseCategory: lib?.category ?? "compound",
        demoVideoUrl: resolveExerciseDemoVideo(lib, options.gender),
        demoVideoLoop: lib?.demo_video_loop ?? true,
        mode,
        setCount: rawSets.length,
        sets,
        initialWeight: weightValue,
        weightUnit: exercise.initial_weight_unit ?? "kg",
        targetReps: firstSet?.target_reps_exact ?? firstSet?.target_reps_min ?? null,
        targetDuration: firstSet?.target_duration_seconds ?? null,
        restSeconds,
        showWeight: mode === "weighted",
        idealTime: firstSet?.target_duration_seconds
          ? formatTimeDuration(firstSet.target_duration_seconds)
          : undefined,
        topTime: topSet?.target_duration_seconds
          ? formatTimeDuration(topSet.target_duration_seconds)
          : undefined,
        sortOrder: globalOrder,
      };
    });
  });

  const weekNumber = data.week?.week_number ?? 1;
  const dayNumber = data.day?.day_number ?? 1;

  return {
    programDayId: data.day.id,
    title: getLocalizedText(data.day.title_translations, language, data.day.title),
    weekLabel: `Week ${weekNumber}`,
    dayLabel: `Day ${dayNumber}`,
    weekNumber,
    dayNumber,
    exercises,
  };
}

export function getScreenForExercise(
  exercise: SessionExercise,
): "WorkoutLog" | "TimerLog" | "CardioTimer" {
  switch (exercise.mode) {
    case "timed":
      return "TimerLog";
    case "cardio":
      return "CardioTimer";
    default:
      return "WorkoutLog";
  }
}
