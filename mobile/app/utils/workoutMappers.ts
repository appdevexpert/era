import type { MuscleGroup } from "@/app/navigation/types";
import { computeCurrentPosition, computeDateForDay, getSkippedDaysInfo, getToday, getWeekdayFromDate, isWeekAccessible } from "@/app/utils/programSchedule";
import type {
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
  WorkoutPlanView,
  WorkoutPlanWeekView,
  WorkoutOverviewData,
} from "@/app/types/workout";
import { getLocalizedText, normalizeLanguage, type AppLanguage } from "@/app/utils/localization";
import {
  formatDayLabel,
  formatSetSummary,
  formatWeekProgress,
  formatWeight,
  formatWorkoutDuration,
} from "@/app/utils/workoutFormatters";

const WEEKDAY_LABELS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  nb: ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"],
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
    neck: "Neck",
    quads: "Quads",
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
    neck: "Nakke",
    quads: "Forside lår",
    recovery: "Restitusjon",
    shoulders: "Skuldre",
    traps: "Trapezius",
    triceps: "Triceps",
  },
};

const getWeekForDay = (weeks: ProgramWeekRow[], day: ProgramDayRow) =>
  weeks.find((week) => week.id === day.week_id);

const padDayNumber = (value: number) => String(value).padStart(2, "0");

const getWeekdayLabel = (weekday: number | null, language: string) => {
  const labels = WEEKDAY_LABELS[normalizeLanguage(language)];
  const index = typeof weekday === "number" ? weekday - 1 : 0;
  return labels[index] ?? labels[0];
};

const localizeMuscle = (muscle: string, language: string) => {
  const labels = MUSCLE_LABELS[normalizeLanguage(language)];
  return labels[muscle] ?? muscle;
};

export const mapMusclesToIcons = (muscles: string[]): MuscleGroup[] => {
  const iconKeys: MuscleGroup[] = [];

  muscles.forEach((muscle) => {
    let icon: MuscleGroup | null = null;

    if (muscle === "triceps" || muscle === "biceps" || muscle === "forearms") {
      icon = "arm";
    }

    if (muscle === "core" || muscle === "abs") {
      icon = "abs";
    }

    if (
      muscle === "legs" ||
      muscle === "quads" ||
      muscle === "hamstrings" ||
      muscle === "calves" ||
      muscle === "glutes"
    ) {
      icon = "leg";
    }

    if (muscle === "chest" || muscle === "shoulders") {
      icon = muscle;
    }

    if (icon && !iconKeys.includes(icon)) {
      iconKeys.push(icon);
    }
  });

  return iconKeys.slice(0, 4);
};

export function mapWorkoutHome(
  data: WorkoutOverviewData,
  language: string,
  programStartDate?: string | null,
  completedDayIds?: string[],
): WorkoutHomeView {
  const config = programStartDate
    ? { programStartDate, totalWeeks: data.program.duration_weeks }
    : null;

  // Step A: Resolve current position — separate content day from calendar week
  let currentDay = data.currentDay;
  let calendarWeekNumber = 1;

  if (config) {
    const pos = computeCurrentPosition(config);
    calendarWeekNumber = pos.weekNumber;

    if (pos.isAdjustedDay) {
      // Adjusted day in Week 4: content comes from Week 1's skipped day
      const week1 = data.weeks.find((w) => w.week_number === 1);
      if (week1) {
        const found = data.days.find(
          (d) => d.week_id === week1.id && d.day_number === pos.dayNumber,
        );
        if (found) currentDay = found;
      }
    } else {
      const found = data.days.find((d) => {
        const w = data.weeks.find((wk) => wk.id === d.week_id);
        return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
      });
      if (found) currentDay = found;
    }
  } else {
    const week = getWeekForDay(data.weeks, currentDay);
    if (week) calendarWeekNumber = week.week_number;
  }

  // Step B: Calendar week for display (programWeek, programType)
  const calendarWeek = data.weeks.find((w) => w.week_number === calendarWeekNumber) ?? data.weeks[0];

  // Step C: Build selector days for the calendar week
  const skippedInfo = config ? getSkippedDaysInfo(config) : null;
  const skipped = skippedInfo?.count ?? 0;
  const today = config ? getToday() : null;
  const completed = new Set(completedDayIds ?? []);

  let selectorDays = data.days
    .filter((day) => day.week_id === calendarWeek.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // If no DB rows for this week, generate from template
  if (selectorDays.length === 0) {
    const templateDays = data.days
      .filter((day) => day.week_id === data.weeks[0]?.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    selectorDays = buildFutureWeekDays(calendarWeek, templateDays, data.program.days_per_week);
  }

  // Build entries: normal days + adjusted days (Week 4 only)
  type DayEntry = { day: ProgramDayRow; isAdjusted: boolean };
  let allEntries: DayEntry[] = selectorDays.map((d) => ({ day: d, isAdjusted: false }));

  if (calendarWeekNumber === 4 && skipped > 0 && skippedInfo) {
    const week1 = data.weeks.find((w) => w.week_number === 1);
    if (week1) {
      const week1Skipped = data.days
        .filter((d) => d.week_id === week1.id && d.day_number < skippedInfo.signupWeekday)
        .sort((a, b) => a.sort_order - b.sort_order);
      allEntries = [
        ...allEntries,
        ...week1Skipped.map((d) => ({ day: d, isAdjusted: true })),
      ];
    }
  }

  // Map selector days with calendar dates and weekday labels
  const startDate = config?.programStartDate ?? null;
  const days = allEntries.map((entry) => {
    const { day, isAdjusted } = entry;
    let dayDate: string | null = null;
    if (config) {
      dayDate = computeDateForDay(config, calendarWeekNumber, day.day_number, isAdjusted);
    }
    const weekday = dayDate ? getWeekdayFromDate(dayDate) : day.weekday;
    // Pre-signup days (before programStartDate) are treated as future-style — not interactive
    const isPreSignup = !!(dayDate && startDate && dayDate < startDate);
    const isCompleted = !isPreSignup && completed.has(day.id);
    const isActive = !isPreSignup && day.id === currentDay.id;
    const isPast = dayDate && today ? dayDate < today : false;
    const isMissed = !isPreSignup && isPast && !isCompleted && !day.is_rest_day;

    return {
      key: day.id,
      label: getWeekdayLabel(weekday, language),
      date: dayDate ? dayDate.split("-")[2] : padDayNumber(day.day_number),
      title: getLocalizedText(day.title_translations, language, day.title),
      subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
      muscles: mapMusclesToIcons(day.target_muscles),
      active: isActive,
      completed: isCompleted,
      missed: isMissed,
    };
  });

  // Step D: Build output — calendarWeek for program info, currentDay for workout content
  return {
    programId: data.program.id,
    currentDayId: currentDay.id,
    isCompleted: completed.has(currentDay.id),
    title: getLocalizedText(data.program.title_translations, language, data.program.title),
    subtitle: getLocalizedText(currentDay.subtitle_translations, language, currentDay.subtitle ?? ""),
    workoutName: getLocalizedText(currentDay.title_translations, language, currentDay.title),
    exerciseCount: data.currentDayExerciseCount,
    duration: formatWorkoutDuration(currentDay.estimated_minutes),
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
  // Determine current day from date math
  let currentDay = data.currentDay;
  if (programStartDate) {
    const config = { programStartDate, totalWeeks: data.program.duration_weeks };
    const pos = computeCurrentPosition(config);
    const found = data.days.find((d) => {
      const w = data.weeks.find((wk) => wk.id === d.week_id);
      return w?.week_number === pos.weekNumber && d.day_number === pos.dayNumber;
    });
    if (found) currentDay = found;
  }

  const currentWeek = getWeekForDay(data.weeks, currentDay) ?? data.weeks[0];
  const phases = buildPhases(data.weeks, currentWeek, language);
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
        allDays: data.days,
        allWeeks: data.weeks,
        templateDays: firstWeekDays,
        currentDay,
        daysPerWeek: data.program.days_per_week,
        language,
        programStartDate,
        completedDayIds,
        skippedInfo,
      }),
    ),
    hasAdjustment: (skippedInfo?.count ?? 0) > 0,
    skippedDayCount: skippedInfo?.count ?? 0,
  };
}

export function mapExerciseList(
  data: ProgramDayDetailData,
  language: string,
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
      const sectionExercises = data.exercises.filter(
        (exercise) => exercise.section_id === section.id,
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
          const weight = formatWeight(
            exercise.initial_weight_value ?? firstWeightedSet?.target_weight_value,
            rawUnit === "lb" ? "lb" : "kg",
          );
          const name = getLocalizedText(
            exercise.display_name_translations,
            language,
            exercise.display_name ??
              getLocalizedText(libraryExercise?.name_translations ?? null, language, libraryExercise?.name ?? ""),
          );

          return {
            id: exercise.id,
            name,
            prescription: formatSetSummary(exerciseSets, language),
            weight: weight || undefined,
            showHandle: section.section_kind !== "treadmill_walk",
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

  return uniquePhases.map((label) => {
    const phaseWeeks = weeks.filter(
      (week) => getLocalizedText(week.focus_translations, language, week.focus ?? "") === label,
    );
    const isActive = currentWeek
      ? phaseWeeks.some((week) => week.id === currentWeek.id)
      : false;
    const currentIndex = currentWeek
      ? phaseWeeks.findIndex((week) => week.id === currentWeek.id)
      : -1;

    return {
      label,
      active: isActive,
      progress: isActive ? Math.max((currentIndex + 1) / phaseWeeks.length, 0.12) : 0,
    };
  });
}

function mapPlanWeek({
  week,
  days,
  allDays,
  allWeeks,
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
  allDays: ProgramDayRow[];
  allWeeks: ProgramWeekRow[];
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

  const skipped = skippedInfo?.count ?? 0;

  // Week 4 adjusted: append Week 1's skipped days after the normal 7
  let adjustedDays: { day: ProgramDayRow; isAdjusted: boolean }[] = [];
  if (week.week_number === 4 && skipped > 0 && skippedInfo) {
    const week1 = allWeeks.find((w) => w.week_number === 1);
    if (week1) {
      const week1Skipped = allDays
        .filter((d) => d.week_id === week1.id && d.day_number < skippedInfo.signupWeekday)
        .sort((a, b) => a.sort_order - b.sort_order);
      adjustedDays = week1Skipped.map((d) => ({ day: d, isAdjusted: true }));
    }
  }

  const isCurrentWeek = week.id === currentDay.week_id;
  const completed = new Set(completedDayIds ?? []);
  const today = programStartDate ? getToday() : null;
  const config = programStartDate
    ? { programStartDate, totalWeeks: 12 }
    : null;
  const isLocked = config
    ? !isWeekAccessible(config, week.week_number, today ?? undefined)
    : false;

  // Build day entries: normal days + adjusted days (Week 4 only)
  const rawEntries = [
    ...orderedDays.map((d) => ({ day: d, isAdjusted: false })),
    ...adjustedDays,
  ];

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
    totalDays: allDayEntries.filter((e) => !e.day.is_rest_day).length,
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
): SessionWorkout {
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
    const sectionExercises = data.exercises
      .filter((ex) => ex.section_id === section.id)
      .sort((a, b) => a.sort_order - b.sort_order);

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

      const sets: SessionExerciseSet[] = rawSets.map((s) => ({
        id: s.id,
        setNumber: s.set_number,
        setKind: s.set_kind ?? "working",
        targetWeight: s.target_weight_value != null ? Number(s.target_weight_value) : null,
        targetWeightUnit: s.target_weight_unit ?? exercise.initial_weight_unit ?? "kg",
        targetReps: s.target_reps_exact ?? s.target_reps_min ?? null,
        targetRepsMin: s.target_reps_min ?? null,
        targetRepsMax: s.target_reps_max ?? null,
        targetDuration: s.target_duration_seconds ?? null,
        restSeconds: s.rest_seconds ?? null,
        displayLabel: null,
      }));

      const topSet = rawSets.find((s) => s.set_kind === "top_set");
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
