"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/supabase";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const text = value(formData, key);
  return text ? text : null;
}

function numberValue(formData: FormData, key: string) {
  const text = value(formData, key);
  return text ? Number(text) : null;
}

function intValue(formData: FormData, key: string, fallback: number) {
  const text = value(formData, key);
  const number = Number.parseInt(text, 10);
  return Number.isFinite(number) ? number : fallback;
}

function textArray(formData: FormData, key: string) {
  return value(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function translations(en: string, nb: string) {
  if (!en && !nb) return {};
  return {
    en,
    nb: nb || en,
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function saveExercise(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const nameEn = value(formData, "name_en");
  const nameNb = value(formData, "name_nb");
  const name = value(formData, "name") || nameEn || nameNb;

  if (!name) {
    throw new Error("Exercise name is required.");
  }

  const payload = {
    slug: value(formData, "slug") || slugify(name),
    name,
    name_translations: translations(nameEn || name, nameNb || name),
    modality: value(formData, "modality") || "strength",
    category: value(formData, "category") || "compound",
    primary_muscles: textArray(formData, "primary_muscles"),
    default_rest_seconds: numberValue(formData, "default_rest_seconds"),
    is_active: formData.get("is_active") === "on",
  };

  const result = id
    ? await supabase.from("exercise_library").update(payload).eq("id", id)
    : await supabase.from("exercise_library").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath("/exercises");
}

export async function saveProgram(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = value(formData, "title") || titleEn || titleNb;

  if (!title) {
    throw new Error("Program title is required.");
  }

  const payload = {
    title,
    title_translations: translations(titleEn || title, titleNb || title),
    duration_weeks: intValue(formData, "duration_weeks", 12),
    days_per_week: intValue(formData, "days_per_week", 6),
  };

  const result = id
    ? await supabase.from("workout_programs").update(payload).eq("id", id)
    : await supabase.from("workout_programs").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath("/programs");
}

export async function saveProgramWeek(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const weekNumber = intValue(formData, "week_number", 1);
  const title = value(formData, "title") || `Week ${weekNumber}`;
  const focus = value(formData, "focus");

  const { error } = await supabase.from("program_weeks").upsert(
    {
      program_id: programId,
      week_number: weekNumber,
      title,
      title_translations: translations(title, title),
      focus,
      focus_translations: translations(focus, focus),
    },
    { onConflict: "program_id,week_number" },
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function saveProgramDay(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const weekId = value(formData, "week_id");
  const dayNumber = intValue(formData, "day_number", 1);
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = titleEn || titleNb || `Day ${dayNumber}`;

  const { error } = await supabase.from("program_days").upsert(
    {
      program_id: programId,
      week_id: weekId,
      day_number: dayNumber,
      weekday: numberValue(formData, "weekday"),
      workout_kind: value(formData, "workout_kind") || "custom",
      title,
      title_translations: translations(titleEn || title, titleNb || title),
      subtitle: optionalValue(formData, "subtitle_en"),
      subtitle_translations: translations(
        value(formData, "subtitle_en"),
        value(formData, "subtitle_nb"),
      ),
      target_muscles: textArray(formData, "target_muscles"),
      estimated_minutes: numberValue(formData, "estimated_minutes"),
      is_rest_day: formData.get("is_rest_day") === "on",
      sort_order: dayNumber,
    },
    { onConflict: "week_id,day_number" },
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function saveDaySection(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const programDayId = value(formData, "program_day_id");
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = titleEn || titleNb || "Section";

  const { error } = await supabase.from("program_day_sections").insert({
    program_day_id: programDayId,
    section_kind: value(formData, "section_kind") || "main_exercises",
    title,
    title_translations: translations(titleEn || title, titleNb || title),
    sort_order: intValue(formData, "sort_order", 0),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function assignExerciseToDay(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const exerciseId = value(formData, "exercise_id");
  const displayNameEn = value(formData, "display_name_en");
  const displayNameNb = value(formData, "display_name_nb");

  const { error } = await supabase.from("program_day_exercises").insert({
    program_day_id: value(formData, "program_day_id"),
    section_id: value(formData, "section_id"),
    exercise_id: exerciseId,
    sort_order: intValue(formData, "sort_order", 0),
    display_name: displayNameEn || null,
    display_name_translations: translations(displayNameEn, displayNameNb),
    initial_weight_value: numberValue(formData, "initial_weight_value"),
    initial_weight_unit: "kg",
    default_rest_seconds: numberValue(formData, "default_rest_seconds"),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function addPlannedSet(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("planned_exercise_sets").insert({
    program_day_exercise_id: value(formData, "program_day_exercise_id"),
    set_number: intValue(formData, "set_number", 1),
    set_kind: value(formData, "set_kind") || "working",
    target_weight_value: numberValue(formData, "target_weight_value"),
    target_reps_exact: numberValue(formData, "target_reps_exact"),
    target_reps_min: numberValue(formData, "target_reps_min"),
    target_reps_max: numberValue(formData, "target_reps_max"),
    target_duration_seconds: numberValue(formData, "target_duration_seconds"),
    rest_seconds: numberValue(formData, "rest_seconds"),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function addDefaultSections(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const programDayId = value(formData, "program_day_id");

  const defaults = [
    { section_kind: "main_exercises", title: "Exercises", title_nb: "Øvelser", sort_order: 1 },
    { section_kind: "core_finisher", title: "Core Finisher", title_nb: "Kjerneavslutning", sort_order: 2 },
    { section_kind: "treadmill_walk", title: "Treadmill Walk", title_nb: "Tredemølle", sort_order: 3 },
  ];

  const { error } = await supabase.from("program_day_sections").insert(
    defaults.map((section) => ({
      program_day_id: programDayId,
      section_kind: section.section_kind,
      title: section.title,
      title_translations: translations(section.title, section.title_nb),
      sort_order: section.sort_order,
    })),
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function addBulkSets(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const exerciseId = value(formData, "program_day_exercise_id");
  const count = intValue(formData, "set_count", 3);
  const startFrom = intValue(formData, "start_from", 1);
  const setKind = value(formData, "set_kind") || "working";
  const weight = numberValue(formData, "target_weight_value");
  const repsExact = numberValue(formData, "target_reps_exact");
  const repsMin = numberValue(formData, "target_reps_min");
  const repsMax = numberValue(formData, "target_reps_max");
  const durationSeconds = numberValue(formData, "target_duration_seconds");
  const restSeconds = numberValue(formData, "rest_seconds");

  const rows = Array.from({ length: count }, (_, i) => ({
    program_day_exercise_id: exerciseId,
    set_number: startFrom + i,
    set_kind: setKind,
    target_weight_value: weight,
    target_reps_exact: repsExact,
    target_reps_min: repsMin,
    target_reps_max: repsMax,
    target_duration_seconds: durationSeconds,
    rest_seconds: restSeconds,
  }));

  const { error } = await supabase.from("planned_exercise_sets").insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function duplicateDay(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const sourceDayId = value(formData, "source_day_id");
  const targetDayId = value(formData, "target_day_id");

  // 1. Copy sections
  const { data: sourceSections, error: sectionsError } = await supabase
    .from("program_day_sections")
    .select("*")
    .eq("program_day_id", sourceDayId)
    .order("sort_order");

  if (sectionsError) throw new Error(sectionsError.message);
  if (!sourceSections?.length) throw new Error("Source day has no sections to copy.");

  const newSections = sourceSections.map((section) => ({
    program_day_id: targetDayId,
    section_kind: section.section_kind,
    title: section.title,
    title_translations: section.title_translations,
    sort_order: section.sort_order,
  }));

  const { data: insertedSections, error: insertSectionsError } = await supabase
    .from("program_day_sections")
    .insert(newSections)
    .select("id, sort_order");

  if (insertSectionsError) throw new Error(insertSectionsError.message);

  // Map old section IDs to new section IDs by sort_order
  const sectionMap = new Map<string, string>();
  for (const oldSection of sourceSections) {
    const newSection = insertedSections?.find((s) => s.sort_order === oldSection.sort_order);
    if (newSection) sectionMap.set(oldSection.id, newSection.id);
  }

  // 2. Copy exercises
  const { data: sourceExercises, error: exercisesError } = await supabase
    .from("program_day_exercises")
    .select("*")
    .eq("program_day_id", sourceDayId)
    .order("sort_order");

  if (exercisesError) throw new Error(exercisesError.message);
  if (!sourceExercises?.length) {
    revalidatePath(`/programs/${programId}`);
    return;
  }

  const newExercises = sourceExercises.map((exercise) => ({
    program_day_id: targetDayId,
    section_id: sectionMap.get(exercise.section_id) ?? exercise.section_id,
    exercise_id: exercise.exercise_id,
    sort_order: exercise.sort_order,
    display_name: exercise.display_name,
    display_name_translations: exercise.display_name_translations,
    initial_weight_value: exercise.initial_weight_value,
    initial_weight_unit: exercise.initial_weight_unit,
    default_rest_seconds: exercise.default_rest_seconds,
  }));

  const { data: insertedExercises, error: insertExercisesError } = await supabase
    .from("program_day_exercises")
    .insert(newExercises)
    .select("id, sort_order");

  if (insertExercisesError) throw new Error(insertExercisesError.message);

  // Map old exercise IDs to new exercise IDs by sort_order
  const exerciseMap = new Map<string, string>();
  for (const oldExercise of sourceExercises) {
    const newExercise = insertedExercises?.find((e) => e.sort_order === oldExercise.sort_order);
    if (newExercise) exerciseMap.set(oldExercise.id, newExercise.id);
  }

  // 3. Copy planned sets
  const oldExerciseIds = sourceExercises.map((e) => e.id);
  const { data: sourceSets, error: setsError } = await supabase
    .from("planned_exercise_sets")
    .select("*")
    .in("program_day_exercise_id", oldExerciseIds)
    .order("set_number");

  if (setsError) throw new Error(setsError.message);

  if (sourceSets?.length) {
    const newSets = sourceSets
      .filter((set) => exerciseMap.has(set.program_day_exercise_id))
      .map((set) => ({
        program_day_exercise_id: exerciseMap.get(set.program_day_exercise_id)!,
        set_number: set.set_number,
        set_kind: set.set_kind,
        target_weight_value: set.target_weight_value,
        target_weight_unit: set.target_weight_unit,
        target_reps_exact: set.target_reps_exact,
        target_reps_min: set.target_reps_min,
        target_reps_max: set.target_reps_max,
        target_duration_seconds: set.target_duration_seconds,
        rest_seconds: set.rest_seconds,
      }));

    const { error: insertSetsError } = await supabase
      .from("planned_exercise_sets")
      .insert(newSets);

    if (insertSetsError) throw new Error(insertSetsError.message);
  }

  revalidatePath(`/programs/${programId}`);
}

// ============================================================
// Delete actions
// ============================================================

export async function deleteExercise(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");

  const { error } = await supabase.from("exercise_library").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/exercises");
}

export async function deleteProgram(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");

  const { error } = await supabase.from("workout_programs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/programs");
}

export async function deleteProgramWeek(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_weeks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function deleteProgramDay(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_days").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function deleteDaySection(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_day_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function deleteDayExercise(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_day_exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function deletePlannedSet(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("planned_exercise_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

// ============================================================
// Update actions (for entities that only had insert)
// ============================================================

export async function updateDaySection(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = titleEn || titleNb || "Section";

  const { error } = await supabase
    .from("program_day_sections")
    .update({
      section_kind: value(formData, "section_kind") || "main_exercises",
      title,
      title_translations: translations(titleEn || title, titleNb || title),
      sort_order: intValue(formData, "sort_order", 0),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function updateDayExercise(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const displayNameEn = value(formData, "display_name_en");
  const displayNameNb = value(formData, "display_name_nb");

  const { error } = await supabase
    .from("program_day_exercises")
    .update({
      section_id: value(formData, "section_id"),
      exercise_id: value(formData, "exercise_id"),
      sort_order: intValue(formData, "sort_order", 0),
      display_name: displayNameEn || null,
      display_name_translations: translations(displayNameEn, displayNameNb),
      initial_weight_value: numberValue(formData, "initial_weight_value"),
      initial_weight_unit: "kg",
      default_rest_seconds: numberValue(formData, "default_rest_seconds"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

export async function updatePlannedSet(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase
    .from("planned_exercise_sets")
    .update({
      set_number: intValue(formData, "set_number", 1),
      set_kind: value(formData, "set_kind") || "working",
      target_weight_value: numberValue(formData, "target_weight_value"),
      target_reps_exact: numberValue(formData, "target_reps_exact"),
      target_reps_min: numberValue(formData, "target_reps_min"),
      target_reps_max: numberValue(formData, "target_reps_max"),
      target_duration_seconds: numberValue(formData, "target_duration_seconds"),
      rest_seconds: numberValue(formData, "rest_seconds"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/programs/${programId}`);
}

