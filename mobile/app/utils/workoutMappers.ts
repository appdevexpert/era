import type { MuscleGroup } from "@/app/navigation/types";
import type {
  ExerciseListView,
  PlannedExerciseSetRow,
  ProgramDayDetailData,
  ProgramDayRow,
  ProgramWeekRow,
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
): WorkoutHomeView {
  const currentWeek = getWeekForDay(data.weeks, data.currentDay) ?? data.weeks[0];
  const weekDays = data.days.filter((day) => day.week_id === data.currentDay.week_id);

  return {
    programId: data.program.id,
    currentDayId: data.currentDay.id,
    title: getLocalizedText(data.program.title_translations, language, data.program.title),
    subtitle: getLocalizedText(data.currentDay.subtitle_translations, language, data.currentDay.subtitle ?? ""),
    workoutName: getLocalizedText(data.currentDay.title_translations, language, data.currentDay.title),
    exerciseCount: data.currentDayExerciseCount,
    duration: formatWorkoutDuration(data.currentDay.estimated_minutes),
    tags: data.currentDay.target_muscles.slice(0, 4).map((muscle) => localizeMuscle(muscle, language)),
    targetMuscles: data.currentDay.target_muscles,
    programType: currentWeek
      ? getLocalizedText(currentWeek.focus_translations, language, currentWeek.focus ?? "")
      : "",
    programWeek: currentWeek
      ? formatWeekProgress(currentWeek.week_number, data.program.duration_weeks, language)
      : "",
    programDay: formatDayLabel(data.currentDay.day_number, language),
    days: weekDays.map((day) => ({
      key: day.id,
      label: getWeekdayLabel(day.weekday, language),
      date: padDayNumber(day.day_number),
      active: day.id === data.currentDay.id,
    })),
  };
}

export function mapWorkoutPlan(
  data: WorkoutOverviewData,
  language: string,
): WorkoutPlanView {
  const currentWeek = getWeekForDay(data.weeks, data.currentDay) ?? data.weeks[0];
  const phases = buildPhases(data.weeks, currentWeek, language);
  const firstWeekDays = data.days
    .filter((day) => day.week_id === currentWeek?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    phases,
    weeks: data.weeks.map((week) =>
      mapPlanWeek({
        week,
        days: data.days.filter((day) => day.week_id === week.id),
        templateDays: firstWeekDays,
        currentDay: data.currentDay,
        daysPerWeek: data.program.days_per_week,
        language,
      }),
    ),
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
          const weight = formatWeight(
            exercise.initial_weight_value ?? firstWeightedSet?.target_weight_value,
            exercise.initial_weight_unit ?? firstWeightedSet?.target_weight_unit ?? "kg",
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
            prescription: getLocalizedText(
              exercise.target_summary_translations,
              language,
              exercise.target_summary ?? formatSetSummary(exerciseSets, language),
            ),
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
  templateDays,
  currentDay,
  daysPerWeek,
  language,
}: {
  week: ProgramWeekRow;
  days: ProgramDayRow[];
  templateDays: ProgramDayRow[];
  currentDay: ProgramDayRow;
  daysPerWeek: number;
  language: string;
}): WorkoutPlanWeekView {
  const orderedDays = days.length > 0
    ? [...days].sort((a, b) => a.sort_order - b.sort_order)
    : buildFutureWeekDays(week, templateDays, daysPerWeek);
  const isCurrentWeek = week.id === currentDay.week_id;

  return {
    weekNumber: week.week_number,
    title: getLocalizedText(week.title_translations, language, week.title),
    phase: getLocalizedText(week.focus_translations, language, week.focus ?? ""),
    completedDays: 0,
    totalDays: orderedDays.filter((day) => !day.is_rest_day).length,
    days: orderedDays.map((day) => ({
      programDayId: day.id,
      isRestDay: day.is_rest_day,
      date: padDayNumber(day.day_number),
      dayLabel: getWeekdayLabel(day.weekday, language),
      status: day.id === currentDay.id ? "active" : "future",
      title: getLocalizedText(day.title_translations, language, day.title),
      subtitle: getLocalizedText(day.subtitle_translations, language, day.subtitle ?? ""),
      muscles: mapMusclesToIcons(day.target_muscles),
    })),
    isCurrentWeek,
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
      points_available: template?.points_available ?? 0,
      is_rest_day: template?.is_rest_day ?? false,
      sort_order: index + 1,
    };
  });
}
