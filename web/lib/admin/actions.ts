"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/supabase";
import {
  allowedSetKindsForModality,
  isMainProgramId,
  EXERCISE_MEDIA_BUCKET,
  MAX_SETS_PER_EXERCISE,
  scopeFromForm,
  ALL_WEEKS_FIELD,
  type ExerciseMediaGender,
  type PlannedSetInput,
  type PropagateScope,
} from "@/lib/admin/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAction } from "@/lib/admin/audit";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

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

// ---------------------------------------------------------------------------
// Patch helpers — UPDATE paths only.
//
// The helpers above treat a missing FormData key exactly like an empty one.
// That's right for an INSERT: a field the operator left blank and a field the
// dialog never rendered both mean "use the default". On an UPDATE the same
// conflation destroys data — a dialog that renders 4 of a row's 8 columns
// nulls the other 4 on every save.
//
// So update paths use these instead:
//   absent key           -> undefined -> stripped from the payload by defined()
//   present but empty    -> null      -> an explicit clear by the operator
// ---------------------------------------------------------------------------

function patchText(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;
  return value(formData, key) || null;
}

function patchNumber(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;
  const text = value(formData, key);
  return text ? Number(text) : null;
}

function patchInt(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;
  const parsed = Number.parseInt(value(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Checkboxes send nothing at all when unchecked, so absence alone can't tell
// "off" from "not on screen". A form that wants its checkbox patchable has to
// ship a `<name>__present` hidden marker next to it.
function patchBool(formData: FormData, key: string) {
  if (!formData.has(`${key}__present`)) return undefined;
  return formData.get(key) === "on";
}

function defined<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

// Positions are derived from what's in the table, never from a count the client
// had on screen. `list.length + 1` is wrong the moment anything was deleted
// (length ≠ max) or reordered, and every one of these columns sits under a
// UNIQUE constraint that turns the mistake into a raw 23505 in the operator's
// face — or, for set_number, into silent appending past the existing rows.
async function nextPosition(
  supabase: SupabaseClient,
  table: string,
  column: string,
  parentColumn: string,
  parentId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq(parentColumn, parentId)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const current = (data as Record<string, number | null> | null)?.[column];
  return (current ?? 0) + 1;
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

// Enforces the Kind/Modality contract server-side. A row in program_day_exercises
// pins to one exercise_library row, whose modality decides which set_kind values
// are valid (see allowedSetKindsForModality). Called from add/update/bulk set
// actions so a hand-crafted request can't bypass the admin dropdown filter.
async function assertKindMatchesExerciseModality(
  supabase: SupabaseClient,
  programDayExerciseId: string,
  setKind: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("program_day_exercises")
    .select("exercise_library(modality)")
    .eq("id", programDayExerciseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const modality = (data as { exercise_library?: { modality?: string | null } | null } | null)
    ?.exercise_library?.modality ?? null;
  const allowed = allowedSetKindsForModality(modality);
  if (!allowed.includes(setKind)) {
    throw new Error(
      `Set kind "${setKind}" is not valid for a ${modality ?? "unknown"} exercise. Allowed: ${allowed.join(", ")}.`,
    );
  }
}

/**
 * Mints a short-lived signed upload URL so the browser can push a demo clip
 * straight to Supabase Storage.
 *
 * The file deliberately never passes through this server: Next.js caps Server
 * Action request bodies at 1 MB (`serverActions.bodySizeLimit`) and these clips
 * are megabytes, so a normal form upload would just fail. Going direct also
 * avoids paying for the transfer twice.
 *
 * The filename carries a timestamp because the bucket is public and
 * CDN-cached. Re-uploading over a stable path like `bench-press/male.mp4` would
 * keep serving the *old* clip to every client that already cached that URL.
 */
export async function createExerciseVideoUploadUrl(
  rawSlug: string,
  gender: ExerciseMediaGender,
): Promise<{ path: string; token: string }> {
  const actor = await getCurrentAdminUser();
  if (!actor) {
    throw new Error("Not authorised to upload exercise media.");
  }
  if (gender !== "male" && gender !== "female") {
    throw new Error(`Unknown gender "${gender}".`);
  }

  const folder = slugify(rawSlug) || "unsorted";
  const path = `${folder}/${gender}-${Date.now()}.mp4`;

  const supabase = requireAdminClient();
  const { data, error } = await supabase.storage
    .from(EXERCISE_MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the upload URL.");
  }

  return { path: data.path, token: data.token };
}

/**
 * Deletes one object from the media bucket. Used when an admin replaces a clip
 * they uploaded but hasn't saved yet — without this, the abandoned upload would
 * sit in the bucket forever with nothing referencing it.
 */
export async function removeExerciseVideoObject(path: string) {
  const actor = await getCurrentAdminUser();
  if (!actor) {
    throw new Error("Not authorised to remove exercise media.");
  }
  if (!path) return;

  const supabase = requireAdminClient();
  const { error } = await supabase.storage
    .from(EXERCISE_MEDIA_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }
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

  const maleVideoPath = optionalValue(formData, "demo_video_male_path");
  const femaleVideoPath = optionalValue(formData, "demo_video_female_path");

  // Needed to spot clips that this save is replacing, so their files can be
  // deleted once the row update lands.
  const previous = id
    ? (
        await supabase
          .from("exercise_library")
          .select("demo_video_male_path,demo_video_female_path")
          .eq("id", id)
          .maybeSingle()
      ).data
    : null;

  const actor = await getCurrentAdminUser();
  const payload = {
    slug: value(formData, "slug") || slugify(name),
    name,
    name_translations: translations(nameEn || name, nameNb || name),
    description_translations: translations(
      value(formData, "description_en"),
      value(formData, "description_nb"),
    ),
    modality: value(formData, "modality") || "strength",
    category: value(formData, "category") || "compound",
    primary_muscles: textArray(formData, "primary_muscles"),
    // The form no longer renders this (see exercise-form.tsx — the mobile app
    // never read it). patchNumber keeps an absent field from nulling whatever
    // is already stored, so removing the input can't wipe the column.
    default_rest_seconds: patchNumber(formData, "default_rest_seconds"),
    is_active: formData.get("is_active") === "on",
    demo_video_male_path: maleVideoPath,
    demo_video_female_path: femaleVideoPath,
    demo_video_loop: formData.get("demo_video_loop") === "on",
    updated_by: actor?.full_name ?? actor?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase
        .from("exercise_library")
        .update(defined(payload))
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("exercise_library")
        .insert(defined(payload))
        .select("id")
        .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  // Only after the row is committed. Deleting first would risk the update
  // failing and leaving the row pointing at a file that no longer exists —
  // an orphaned file is the cheaper of the two failures.
  const replaced = [
    previous?.demo_video_male_path !== maleVideoPath
      ? previous?.demo_video_male_path
      : null,
    previous?.demo_video_female_path !== femaleVideoPath
      ? previous?.demo_video_female_path
      : null,
  ].filter((path): path is string => Boolean(path));

  if (replaced.length > 0) {
    await supabase.storage.from(EXERCISE_MEDIA_BUCKET).remove(replaced);
  }

  await logAdminAction({
    action: id ? "update" : "create",
    entity: "Exercise",
    table: "exercise_library",
    recordId: id || result.data?.id,
    summary: `${id ? "Updated" : "Created"} exercise "${name}"`,
    details: payload,
    actor,
  });

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

  const gender = value(formData, "gender") || null;
  const level = value(formData, "level") || null;
  const rawKind = value(formData, "kind") || "standard";
  const kind = rawKind === "bro_split" ? "bro_split" : "standard";

  // The six launch programs have locked gender/level/kind — those identify
  // which user cohort gets each program, and changing them silently re-routes
  // users.
  if (id && isMainProgramId(id)) {
    const { data: current, error: fetchErr } = await supabase
      .from("workout_programs")
      .select("gender, level, kind")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (
      current &&
      (current.gender !== gender || current.level !== level || current.kind !== kind)
    ) {
      throw new Error("Gender, level, and kind are locked on the launch programs.");
    }
  }

  const actor = await getCurrentAdminUser();
  const payload = {
    title,
    title_translations: translations(titleEn || title, titleNb || title),
    duration_weeks: intValue(formData, "duration_weeks", 12),
    days_per_week: intValue(formData, "days_per_week", 6),
    gender,
    level,
    kind,
    updated_by: actor?.full_name ?? actor?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase
        .from("workout_programs")
        .update(payload)
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("workout_programs")
        .insert(payload)
        .select("id")
        .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  await logAdminAction({
    action: id ? "update" : "create",
    entity: "Program",
    table: "workout_programs",
    recordId: id || result.data?.id,
    summary: `${id ? "Updated" : "Created"} program "${title}"`,
    details: payload,
    actor,
  });

  revalidatePath("/programs");
}

export async function saveProgramWeek(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const weekNumber = intValue(formData, "week_number", 1);
  const focus = value(formData, "focus");
  // Neither week dialog renders a title field, so an update has to leave the
  // stored title alone. It used to be rewritten to "Week N" on every save,
  // which would have silently erased any custom week title.
  const title = patchText(formData, "title") ?? (id ? undefined : `Week ${weekNumber}`);

  const row = defined({
    program_id: programId,
    week_number: weekNumber,
    title,
    title_translations: title ? translations(title, title) : undefined,
    focus,
    focus_translations: translations(focus, focus),
  });

  // Same identity fix as saveProgramDay: an upsert on (program_id, week_number)
  // meant changing a week's number didn't renumber it, it overwrote whichever
  // week already held that number.
  const { data, error } = id
    ? await supabase
        .from("program_weeks")
        .update(row)
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("program_weeks")
        .upsert(row, { onConflict: "program_id,week_number" })
        .select("id")
        .maybeSingle();

  if (error) throw new Error(error.message);
  if (id && !data) throw new Error("That week no longer exists — refresh and try again.");

  await logAdminAction({
    action: id ? "update" : "create",
    entity: "Program week",
    table: "program_weeks",
    recordId: data?.id ?? id,
    summary: `Saved Week ${weekNumber}`,
    details: { program_id: programId, week_number: weekNumber, title, focus },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function saveProgramDay(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const weekId = value(formData, "week_id");
  const dayNumber = intValue(formData, "day_number", 1);
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = titleEn || titleNb || `Day ${dayNumber}`;

  const row = {
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
    // No dialog renders this yet, so it stays undefined and is stripped: the
    // column default covers inserts and an edit leaves an existing rest day
    // alone. Previously every metadata save forced it back to false.
    is_rest_day: patchBool(formData, "is_rest_day"),
    sort_order: dayNumber,
  };

  // Identity comes from the row id whenever the form carries one. Upserting on
  // (week_id, day_number) meant editing a day's number didn't renumber that
  // day — it forked a new row, or overwrote whichever day already held the
  // target number. The unique constraint now surfaces a real collision instead.
  const { data, error } = id
    ? await supabase
        .from("program_days")
        .update(defined(row))
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("program_days")
        .upsert(defined(row), { onConflict: "week_id,day_number" })
        .select("id")
        .maybeSingle();

  if (error) throw new Error(error.message);
  // An id that matches nothing updates zero rows and reports success, which is
  // the same "it said saved but nothing changed" trap we're fixing elsewhere.
  if (id && !data) throw new Error("That day no longer exists — refresh and try again.");

  await logAdminAction({
    action: "update",
    entity: "Program day",
    table: "program_days",
    recordId: data?.id,
    summary: `Saved "${title}" (Day ${dayNumber})`,
    details: { program_id: programId, week_id: weekId, day_number: dayNumber, title },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function saveDaySection(formData: FormData) {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const programDayId = value(formData, "program_day_id");
  const titleEn = value(formData, "title_en");
  const titleNb = value(formData, "title_nb");
  const title = titleEn || titleNb || "Section";

  const { data, error } = await supabase
    .from("program_day_sections")
    .insert({
      program_day_id: programDayId,
      section_kind: value(formData, "section_kind") || "main_exercises",
      title,
      title_translations: translations(titleEn || title, titleNb || title),
      sort_order: await nextPosition(
        supabase,
        "program_day_sections",
        "sort_order",
        "program_day_id",
        programDayId,
      ),
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "create",
    entity: "Section",
    table: "program_day_sections",
    recordId: data?.id,
    summary: `Added section "${title}"`,
    details: { program_day_id: programDayId, title },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function assignExerciseToDay(formData: FormData): Promise<string | void> {
  const supabase = requireAdminClient();
  const programId = value(formData, "program_id");
  const exerciseId = value(formData, "exercise_id");
  const sectionId = value(formData, "section_id");
  const programDayId = value(formData, "program_day_id");
  const displayNameEn = value(formData, "display_name_en");
  const displayNameNb = value(formData, "display_name_nb");
  const scope = scopeFromForm(value(formData, ALL_WEEKS_FIELD));

  const shared = {
    exercise_id: exerciseId,
    display_name: displayNameEn || null,
    display_name_translations: translations(displayNameEn, displayNameNb),
    initial_weight_value: numberValue(formData, "initial_weight_value"),
    initial_weight_unit: "kg",
    default_rest_seconds: numberValue(formData, "default_rest_seconds"),
  };

  // Which (day, section) pairs receive the exercise. For a single day that is
  // just the one the operator is in; for all weeks it is every week's copy of
  // this day that actually has a section of the same kind.
  let placements = [{ programDayId, sectionId }];
  let totalDays = 1;

  if (scope === "all_weeks") {
    const { data: section, error: sectionError } = await supabase
      .from("program_day_sections")
      .select("section_kind")
      .eq("id", sectionId)
      .maybeSingle();
    if (sectionError) throw new Error(sectionError.message);
    if (!section) throw new Error("Section not found");

    const { data: day, error: dayError } = await supabase
      .from("program_days")
      .select("program_id, day_number")
      .eq("id", programDayId)
      .maybeSingle();
    if (dayError) throw new Error(dayError.message);
    if (!day) throw new Error("Program day not found");

    const siblings = await siblingDaySections(supabase, {
      programId: day.program_id,
      dayNumber: day.day_number,
      sectionKind: section.section_kind,
      exerciseId,
    });
    totalDays = siblings.totalDays;

    // Never create a second copy in a day that already has this exercise — no
    // day holds a duplicate today and the sibling key depends on that staying
    // true.
    const { data: alreadyThere, error: alreadyError } = await supabase
      .from("program_day_exercises")
      .select("section_id")
      .in(
        "section_id",
        siblings.sections.map((entry) => entry.sectionId),
      )
      .eq("exercise_id", exerciseId);
    if (alreadyError) throw new Error(alreadyError.message);

    const occupied = new Set((alreadyThere ?? []).map((row) => row.section_id));
    placements = siblings.sections.filter((entry) => !occupied.has(entry.sectionId));
    if (!placements.length) {
      return `Already present in all ${totalDays} weeks — nothing to add.`;
    }
  }

  // UNIQUE is (section_id, sort_order), so the position has to be resolved per
  // section. The client used to send a day-wide `dayExs.length + 1`, which
  // collided as soon as a day had more than one section.
  const rows = [];
  for (const placement of placements) {
    rows.push({
      program_day_id: placement.programDayId,
      section_id: placement.sectionId,
      sort_order: await nextPosition(
        supabase,
        "program_day_exercises",
        "sort_order",
        "section_id",
        placement.sectionId,
      ),
      ...shared,
    });
  }

  const { data, error } = await supabase
    .from("program_day_exercises")
    .insert(rows)
    .select("id");

  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "create",
    entity: "Exercise in day",
    table: "program_day_exercises",
    recordId: data?.[0]?.id,
    summary:
      scope === "all_weeks"
        ? `Added exercise${displayNameEn ? ` "${displayNameEn}"` : ""} to ${rows.length} week${
            rows.length === 1 ? "" : "s"
          }`
        : `Added exercise${displayNameEn ? ` "${displayNameEn}"` : ""} to a day`,
    details: {
      program_day_id: programDayId,
      exercise_id: exerciseId,
      scope,
      weeks_written: rows.length,
      weeks_with_this_day: totalDays,
    },
  });

  revalidatePath(`/programs/${programId}`);
  if (scope === "all_weeks") return describeReach(rows.length, totalDays, "day section");
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

  await logAdminAction({
    action: "create",
    entity: "Sections",
    table: "program_day_sections",
    recordId: programDayId,
    summary: `Added ${defaults.length} default sections`,
    details: { program_day_id: programDayId },
  });

  revalidatePath(`/programs/${programId}`);
}

// ---------------------------------------------------------------------------
// Propagating an edit across weeks
//
// A program keeps one row per week all the way down: program_weeks -> the same
// six program_days -> sections -> program_day_exercises -> planned_exercise_sets.
// A 12-week program therefore holds twelve independent copies of every exercise,
// and editing one changes exactly one week. That is what Rami reported on 30 Jul
// as "having to edit exercises week by week is not workable".
//
// There is nothing to share, so "all weeks" means resolving the sibling rows and
// repeating the write. The slot key is:
//
//     program_id + day_number + section_kind + exercise_id
//
// Verified unique against live data on 2026-08-03: no day holds two sections of
// the same kind, and no day holds the same exercise twice. So this matches at
// most one row per week — never two, never the wrong one.
//
// Weeks whose matching day lacks the section, or lacks the exercise entirely, are
// counted and reported rather than silently skipped. That drift is real: 13 slots
// across two programs sit in some weeks and not others, left behind by edits made
// before this existed.
// ---------------------------------------------------------------------------

type SlotAnchor = {
  programId: string;
  dayNumber: number;
  sectionKind: string;
  exerciseId: string;
};

async function readSlotAnchor(
  supabase: SupabaseClient,
  programDayExerciseId: string,
): Promise<SlotAnchor & { sectionId: string; programDayId: string }> {
  const { data: assignment, error: assignmentError } = await supabase
    .from("program_day_exercises")
    .select("exercise_id, section_id, program_day_id")
    .eq("id", programDayExerciseId)
    .maybeSingle();
  if (assignmentError) throw new Error(assignmentError.message);
  if (!assignment) throw new Error("Exercise assignment not found");

  const { data: section, error: sectionError } = await supabase
    .from("program_day_sections")
    .select("section_kind")
    .eq("id", assignment.section_id)
    .maybeSingle();
  if (sectionError) throw new Error(sectionError.message);
  if (!section) throw new Error("Section not found");

  const { data: day, error: dayError } = await supabase
    .from("program_days")
    .select("program_id, day_number")
    .eq("id", assignment.program_day_id)
    .maybeSingle();
  if (dayError) throw new Error(dayError.message);
  if (!day) throw new Error("Program day not found");

  return {
    programId: day.program_id,
    dayNumber: day.day_number,
    sectionKind: section.section_kind,
    exerciseId: assignment.exercise_id,
    sectionId: assignment.section_id,
    programDayId: assignment.program_day_id,
  };
}

// Every day in the program that shares this day_number — one per week — paired
// with its section of the given kind when it has one.
async function siblingDaySections(
  supabase: SupabaseClient,
  anchor: SlotAnchor,
): Promise<{ sections: Array<{ programDayId: string; sectionId: string }>; totalDays: number }> {
  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", anchor.programId)
    .eq("day_number", anchor.dayNumber);
  if (daysError) throw new Error(daysError.message);

  const dayIds = (days ?? []).map((day) => day.id);
  if (!dayIds.length) return { sections: [], totalDays: 0 };

  const { data: sections, error: sectionsError } = await supabase
    .from("program_day_sections")
    .select("id, program_day_id")
    .in("program_day_id", dayIds)
    .eq("section_kind", anchor.sectionKind);
  if (sectionsError) throw new Error(sectionsError.message);

  return {
    sections: (sections ?? []).map((section) => ({
      programDayId: section.program_day_id,
      sectionId: section.id,
    })),
    totalDays: dayIds.length,
  };
}

// The same exercise in every week's copy of this day. `totalDays` is how many
// weeks have the day at all, so `totalDays - matched.length` is the honest
// "couldn't apply here" count.
async function siblingDayExercises(
  supabase: SupabaseClient,
  anchor: SlotAnchor,
): Promise<{ ids: string[]; totalDays: number }> {
  const { sections, totalDays } = await siblingDaySections(supabase, anchor);
  if (!sections.length) return { ids: [], totalDays };

  const { data: rows, error } = await supabase
    .from("program_day_exercises")
    .select("id")
    .in(
      "section_id",
      sections.map((section) => section.sectionId),
    )
    .eq("exercise_id", anchor.exerciseId);
  if (error) throw new Error(error.message);

  return { ids: (rows ?? []).map((row) => row.id), totalDays };
}

// "Applied to 12 weeks" / "Applied to 9 weeks — 3 weeks don't have this exercise".
// The count always comes from what was written, never from what was intended.
function describeReach(written: number, totalDays: number, noun: string): string {
  const skipped = Math.max(0, totalDays - written);
  const weeks = `${written} week${written === 1 ? "" : "s"}`;
  if (!skipped) return `Applied to ${weeks}.`;
  return `Applied to ${weeks} — ${skipped} ${
    skipped === 1 ? "week does not" : "weeks do not"
  } have this ${noun}.`;
}

/**
 * Brings one exercise to exactly this list of sets, matched by POSITION.
 *
 * Position rather than row id, because the ids in a grid submission belong to
 * the one week the operator was looking at and the same write has to land on
 * eleven other weeks whose rows carry different ids. An id-based path for the
 * anchor plus a position-based one for the siblings is exactly how the four
 * original set actions drifted apart, so there is one path here.
 *
 * Row identity is not preserved when the list shrinks — deleting the middle row
 * of four leaves rows 1..3 holding the surviving values. That is harmless:
 * nothing references planned_exercise_sets.id except session_sets.planned_set_id,
 * which is ON DELETE SET NULL provenance next to a full snapshot of the target.
 */
async function writeSetShape(
  supabase: SupabaseClient,
  exerciseId: string,
  values: ReturnType<typeof plannedSetValues>[],
): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("planned_exercise_sets")
    .select("id, set_number")
    .eq("program_day_exercise_id", exerciseId)
    .order("set_number");
  if (fetchError) throw new Error(fetchError.message);

  const existing = existingRows ?? [];
  const reused = existing.slice(0, values.length);
  const doomed = existing.slice(values.length);

  // Drop the tail first so its set_numbers are free.
  if (doomed.length) {
    const { error } = await supabase
      .from("planned_exercise_sets")
      .delete()
      .in(
        "id",
        doomed.map((row) => row.id),
      );
    if (error) throw new Error(error.message);
  }

  // Park before writing final numbers. UNIQUE (program_day_exercise_id,
  // set_number) turns any mid-update overlap into a raw 23505, and these updates
  // run concurrently so their order isn't guaranteed. Same trick as
  // reorderDayExercises.
  if (reused.length) {
    const PARK_OFFSET = 1_000_000;
    const parked = await Promise.all(
      reused.map((row, index) =>
        supabase
          .from("planned_exercise_sets")
          .update({ set_number: PARK_OFFSET + index })
          .eq("id", row.id),
      ),
    );
    const parkFail = parked.find((result) => result.error);
    if (parkFail?.error) throw new Error(parkFail.error.message);

    const written = await Promise.all(
      reused.map((row, index) =>
        supabase
          .from("planned_exercise_sets")
          .update({ set_number: index + 1, ...values[index] })
          .eq("id", row.id),
      ),
    );
    const writeFail = written.find((result) => result.error);
    if (writeFail?.error) throw new Error(writeFail.error.message);
  }

  const fresh = values.slice(reused.length);
  if (fresh.length) {
    const { error } = await supabase.from("planned_exercise_sets").insert(
      fresh.map((entry, index) => ({
        program_day_exercise_id: exerciseId,
        set_number: reused.length + index + 1,
        target_weight_unit: "kg",
        ...entry,
      })),
    );
    if (error) throw new Error(error.message);
  }
}

function plannedSetValues(row: PlannedSetInput) {
  return {
    set_kind: row.set_kind,
    target_weight_value: row.target_weight_value,
    target_reps_exact: row.target_reps_exact,
    target_reps_min: row.target_reps_min,
    target_reps_max: row.target_reps_max,
    target_duration_seconds: row.target_duration_seconds,
    rest_seconds: row.rest_seconds,
  };
}

/**
 * Writes an exercise's entire set list in one call: the rows that stay, the
 * values on each, the ones that were removed, and the ones that are new.
 *
 * Replaces four separate operations — "Add bulk sets", "Add set", "Edit set"
 * (one dialog per set) and "Delete set". That split is what produced the two
 * bugs Rami reported on 30 Jul:
 *
 *  - Both add paths APPENDED, while the bulk field was labelled "Number of
 *    sets". A 3-set exercise plus a typed "4" became 7, which read as sets
 *    multiplying on their own during a page reload.
 *  - "Edit set" rendered 4 of the 8 set columns while updatePlannedSet wrote
 *    all 8, so fixing a weight nulled the rep range and the rest timer. The
 *    single-set add dialog had the same gap in reverse: it could only ever
 *    create a set with no rep range and no rest.
 *
 * One array in, one reconcile, one revalidate. Nothing is written that the
 * operator could not see on screen.
 */
export async function savePlannedSets(
  programId: string,
  programDayExerciseId: string,
  rows: PlannedSetInput[],
  scope: PropagateScope = "day",
): Promise<{ written: number; totalDays: number }> {
  const supabase = requireAdminClient();
  if (!programId || !programDayExerciseId) {
    throw new Error("Missing program or exercise id.");
  }
  if (!rows.length) throw new Error("An exercise needs at least one set.");
  if (rows.length > MAX_SETS_PER_EXERCISE) {
    throw new Error(`${MAX_SETS_PER_EXERCISE} sets is the cap — check the count.`);
  }

  const { data: storedRows, error: fetchError } = await supabase
    .from("planned_exercise_sets")
    .select("id, set_kind")
    .eq("program_day_exercise_id", programDayExerciseId);
  if (fetchError) throw new Error(fetchError.message);
  const stored = storedRows ?? [];

  // An id the grid carries that this exercise does not own means the page is
  // stale — refuse rather than reach into another exercise's sets.
  const storedIds = new Set(stored.map((row) => row.id));
  for (const row of rows) {
    if (row.id && !storedIds.has(row.id)) {
      throw new Error("This set list is out of date — refresh and try again.");
    }
  }

  // A kind already present on this exercise is left alone: 705 live sets hold a
  // kind their modality no longer allows (see setKindOptionsFor), and either
  // rejecting them or coercing them would move sets in and out of PR
  // eligibility over an edit to an unrelated column. Anything genuinely new
  // still has to pass. Siblings share the exercise_id, so they share the
  // modality — checking here covers every week.
  const alreadyUsed = new Set(stored.map((row) => row.set_kind));
  for (const kind of new Set(rows.map((row) => row.set_kind))) {
    if (!alreadyUsed.has(kind)) {
      await assertKindMatchesExerciseModality(supabase, programDayExerciseId, kind);
    }
  }

  const values = rows.map(plannedSetValues);

  // Resolve the targets before writing anything, so a failure to work out the
  // sibling set can't leave one week updated and eleven untouched.
  let targets = [programDayExerciseId];
  let totalDays = 1;
  if (scope === "all_weeks") {
    const anchor = await readSlotAnchor(supabase, programDayExerciseId);
    const siblings = await siblingDayExercises(supabase, anchor);
    totalDays = siblings.totalDays;
    // The anchor is in this list already — it matches its own key.
    targets = siblings.ids.length ? siblings.ids : [programDayExerciseId];
  }

  for (const target of targets) {
    await writeSetShape(supabase, target, values);
  }

  await logAdminAction({
    action: "update",
    entity: "Planned sets",
    table: "planned_exercise_sets",
    recordId: programDayExerciseId,
    summary:
      scope === "all_weeks"
        ? `Saved ${rows.length} set${rows.length === 1 ? "" : "s"} across ${targets.length} week${
            targets.length === 1 ? "" : "s"
          }`
        : `Saved ${rows.length} set${rows.length === 1 ? "" : "s"}`,
    details: {
      program_day_exercise_id: programDayExerciseId,
      scope,
      weeks_written: targets.length,
      weeks_with_this_day: totalDays,
      total: rows.length,
      sets: values.map((entry, index) => ({ set_number: index + 1, ...entry })),
    },
  });

  revalidatePath(`/programs/${programId}`);
  return { written: targets.length, totalDays };
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
    await logAdminAction({
      action: "create",
      entity: "Program day",
      table: "program_days",
      recordId: targetDayId,
      summary: "Duplicated a day (sections only)",
      details: { source_day_id: sourceDayId, target_day_id: targetDayId },
    });
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

  await logAdminAction({
    action: "create",
    entity: "Program day",
    table: "program_days",
    recordId: targetDayId,
    summary: "Duplicated a day (sections, exercises & sets)",
    details: { source_day_id: sourceDayId, target_day_id: targetDayId },
  });

  revalidatePath(`/programs/${programId}`);
}

// ============================================================
// Delete actions
// ============================================================

export async function deleteExercise(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");

  // Read the clip paths before the row goes, otherwise the only reference to
  // those files is gone and they sit in the bucket forever.
  const { data: media } = await supabase
    .from("exercise_library")
    .select("demo_video_male_path,demo_video_female_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("exercise_library").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const paths = [media?.demo_video_male_path, media?.demo_video_female_path].filter(
    (path): path is string => Boolean(path),
  );
  if (paths.length > 0) {
    await supabase.storage.from(EXERCISE_MEDIA_BUCKET).remove(paths);
  }

  await logAdminAction({
    action: "delete",
    entity: "Exercise",
    table: "exercise_library",
    recordId: id,
    summary: "Deleted an exercise",
  });

  revalidatePath("/exercises");
}

export async function deleteProgram(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");

  if (isMainProgramId(id)) {
    throw new Error("The six main launch programs cannot be deleted.");
  }

  const { error } = await supabase.from("workout_programs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "delete",
    entity: "Program",
    table: "workout_programs",
    recordId: id,
    summary: "Deleted a program",
  });

  revalidatePath("/programs");
}

export async function deleteProgramWeek(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_weeks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "delete",
    entity: "Program week",
    table: "program_weeks",
    recordId: id,
    summary: "Deleted a program week",
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deleteProgramDay(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_days").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "delete",
    entity: "Program day",
    table: "program_days",
    recordId: id,
    summary: "Deleted a program day",
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deleteDaySection(formData: FormData) {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");

  const { error } = await supabase.from("program_day_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "delete",
    entity: "Section",
    table: "program_day_sections",
    recordId: id,
    summary: "Deleted a section",
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deleteDayExercise(formData: FormData): Promise<string | void> {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const scope = scopeFromForm(value(formData, ALL_WEEKS_FIELD));

  // Resolve the siblings before deleting: the key includes exercise_id and
  // section_kind, and the anchor row has to still exist to be read.
  let targets = [id];
  let totalDays = 1;
  if (scope === "all_weeks") {
    const anchor = await readSlotAnchor(supabase, id);
    const siblings = await siblingDayExercises(supabase, anchor);
    totalDays = siblings.totalDays;
    targets = siblings.ids.length ? siblings.ids : [id];
  }

  // planned_exercise_sets cascade. Logged history does not: session_exercises
  // keeps its own exercise_id, display_name_snapshot and section_kind, and
  // session_sets keeps both the target snapshot and the logged values — the two
  // pointers back to the plan are ON DELETE SET NULL provenance only.
  const { error } = await supabase.from("program_day_exercises").delete().in("id", targets);
  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "delete",
    entity: "Exercise in day",
    table: "program_day_exercises",
    recordId: id,
    summary:
      scope === "all_weeks"
        ? `Removed an exercise from ${targets.length} week${targets.length === 1 ? "" : "s"}`
        : "Removed an exercise from a day",
    details: { scope, weeks_written: targets.length, weeks_with_this_day: totalDays, ids: targets },
  });

  revalidatePath(`/programs/${programId}`);
  if (scope === "all_weeks") return describeReach(targets.length, totalDays, "exercise");
}

// deletePlannedSet is gone: removing a row is part of savePlannedSets now, so a
// set can't be deleted without the operator seeing the list it leaves behind.

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

  // sort_order is not on this dialog, so it must not be written. It used to
  // fall back to 0, which silently moved the edited section to the top of the
  // day every time someone fixed a title.
  const payload = defined({
    section_kind: patchText(formData, "section_kind") || "main_exercises",
    title,
    title_translations: translations(titleEn || title, titleNb || title),
    sort_order: patchInt(formData, "sort_order"),
  });

  const { error } = await supabase
    .from("program_day_sections")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "update",
    entity: "Section",
    table: "program_day_sections",
    recordId: id,
    summary: `Updated section "${title}"`,
    details: payload,
  });

  revalidatePath(`/programs/${programId}`);
}

export async function updateDayExercise(formData: FormData): Promise<string | void> {
  const supabase = requireAdminClient();
  const id = value(formData, "id");
  const programId = value(formData, "program_id");
  const displayNameEn = value(formData, "display_name_en");
  const displayNameNb = value(formData, "display_name_nb");
  const sectionId = patchText(formData, "section_id");
  const scope = scopeFromForm(value(formData, ALL_WEEKS_FIELD));

  const { data: current, error: currentError } = await supabase
    .from("program_day_exercises")
    .select("section_id")
    .eq("id", id)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error("Exercise assignment not found");

  // Read before writing: the sibling key is built from the CURRENT exercise_id
  // and section_kind, and this update can change both.
  let targets = [id];
  let totalDays = 1;
  let siblingSectionKind: string | null = null;
  if (scope === "all_weeks") {
    const anchor = await readSlotAnchor(supabase, id);
    const siblings = await siblingDayExercises(supabase, anchor);
    totalDays = siblings.totalDays;
    siblingSectionKind = anchor.sectionKind;
    targets = siblings.ids.length ? siblings.ids : [id];
  }

  // Moving to another section is per-week work: every week has its own section
  // rows, so each sibling has to land in ITS week's section of the destination
  // kind. Carrying one section_id across weeks would point eleven rows at a
  // section belonging to week 1.
  let destinationKind: string | null = null;
  const movingSection = Boolean(sectionId) && sectionId !== current.section_id;
  if (movingSection && scope === "all_weeks") {
    const { data: destination, error: destinationError } = await supabase
      .from("program_day_sections")
      .select("section_kind")
      .eq("id", sectionId as string)
      .maybeSingle();
    if (destinationError) throw new Error(destinationError.message);
    if (!destination) throw new Error("Destination section not found");
    destinationKind = destination.section_kind;
    if (destinationKind === siblingSectionKind) destinationKind = null;
  }

  const shared = defined({
    exercise_id: patchText(formData, "exercise_id"),
    display_name: formData.has("display_name_en") ? displayNameEn || null : undefined,
    display_name_translations: formData.has("display_name_en")
      ? translations(displayNameEn, displayNameNb)
      : undefined,
    initial_weight_value: patchNumber(formData, "initial_weight_value"),
    initial_weight_unit: "kg",
    default_rest_seconds: patchNumber(formData, "default_rest_seconds"),
  });

  let moved = 0;
  for (const target of targets) {
    const row: Record<string, unknown> = { ...shared };

    if (destinationKind) {
      // Find this row's own week's section of the destination kind.
      const { data: assignment, error: assignmentError } = await supabase
        .from("program_day_exercises")
        .select("program_day_id")
        .eq("id", target)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);

      const { data: localSection, error: localError } = await supabase
        .from("program_day_sections")
        .select("id")
        .eq("program_day_id", assignment?.program_day_id ?? "")
        .eq("section_kind", destinationKind)
        .maybeSingle();
      if (localError) throw new Error(localError.message);

      // A week whose day has no section of that kind keeps the exercise where
      // it is rather than being left pointing at another week's section.
      if (localSection) {
        row.section_id = localSection.id;
        // UNIQUE (section_id, sort_order) — append rather than carry the old
        // position into a section that probably already uses it.
        row.sort_order = await nextPosition(
          supabase,
          "program_day_exercises",
          "sort_order",
          "section_id",
          localSection.id,
        );
        moved += 1;
      }
    } else if (movingSection) {
      row.section_id = sectionId;
      row.sort_order = await nextPosition(
        supabase,
        "program_day_exercises",
        "sort_order",
        "section_id",
        sectionId as string,
      );
      moved += 1;
    } else {
      const sortOrder = patchInt(formData, "sort_order");
      if (sortOrder !== undefined && targets.length === 1) row.sort_order = sortOrder;
    }

    if (!Object.keys(row).length) continue;
    const { error } = await supabase
      .from("program_day_exercises")
      .update(row)
      .eq("id", target);
    if (error) throw new Error(error.message);
  }

  await logAdminAction({
    action: "update",
    entity: "Exercise in day",
    table: "program_day_exercises",
    recordId: id,
    summary:
      scope === "all_weeks"
        ? `Updated an exercise${displayNameEn ? ` "${displayNameEn}"` : ""} in ${
            targets.length
          } week${targets.length === 1 ? "" : "s"}`
        : `Updated an exercise${displayNameEn ? ` "${displayNameEn}"` : ""} in a day`,
    details: {
      exercise_id: value(formData, "exercise_id"),
      display_name: displayNameEn || null,
      scope,
      weeks_written: targets.length,
      weeks_with_this_day: totalDays,
      section_moved_in: destinationKind ? moved : undefined,
    },
  });

  revalidatePath(`/programs/${programId}`);
  if (scope === "all_weeks") return describeReach(targets.length, totalDays, "exercise");
}

// updatePlannedSet is gone too. It wrote all eight set columns from a dialog
// that rendered four, so correcting a weight nulled the rep range and the rest
// timer on that set — 9 rows in the live data still carry the damage, all of
// them created 15 or 29 July. savePlannedSets writes the whole row from the
// whole row.

// Reorders exercises within a single section by re-indexing sort_order 0..N.
// Mobile default order comes from program_day_exercises.sort_order; users who
// dragged in-app keep their user_program_day_exercise_order override, so this
// admin change only affects users who haven't personalized the order.
//
// The table has a UNIQUE (section_id, sort_order) constraint, so we can't just
// write the final indices in place — mid-update collisions fire 23505. We do a
// two-pass write: first park every row at a high offset (out of realistic
// range), then set the final 0..N values. Both passes are collision-free.
export async function reorderDayExercises(
  programId: string,
  sectionId: string,
  orderedExerciseIds: string[],
): Promise<void> {
  const supabase = requireAdminClient();
  if (!programId || !sectionId) throw new Error("Missing program or section id.");
  if (!orderedExerciseIds.length) return;

  const { data: existing, error: fetchError } = await supabase
    .from("program_day_exercises")
    .select("id")
    .eq("section_id", sectionId);
  if (fetchError) throw new Error(fetchError.message);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  for (const id of orderedExerciseIds) {
    if (!existingIds.has(id)) {
      throw new Error("Exercise list is stale; refresh and try again.");
    }
  }
  if (orderedExerciseIds.length !== existingIds.size) {
    throw new Error("Exercise list is stale; refresh and try again.");
  }

  const PARK_OFFSET = 1_000_000;
  const parkResults = await Promise.all(
    orderedExerciseIds.map((id, index) =>
      supabase
        .from("program_day_exercises")
        .update({ sort_order: PARK_OFFSET + index })
        .eq("id", id),
    ),
  );
  const parkFail = parkResults.find((result) => result.error);
  if (parkFail?.error) throw new Error(parkFail.error.message);

  const finalResults = await Promise.all(
    orderedExerciseIds.map((id, index) =>
      supabase.from("program_day_exercises").update({ sort_order: index }).eq("id", id),
    ),
  );
  const finalFail = finalResults.find((result) => result.error);
  if (finalFail?.error) throw new Error(finalFail.error.message);

  await logAdminAction({
    action: "update",
    entity: "Exercise order",
    table: "program_day_exercises",
    recordId: sectionId,
    summary: `Reordered ${orderedExerciseIds.length} exercises`,
    details: { section_id: sectionId, order: orderedExerciseIds },
  });

  revalidatePath(`/programs/${programId}`);
}

// ============================================================
// App copy (remote-editable UI strings)
// ============================================================

// Updates one row in public.app_copy. The key itself is not editable —
// creating new keys requires a code change on the mobile side (register
// the key in CopyKey and dispatch loadAppCopy on the target screen),
// so admins can only edit rows that already exist.
export async function saveAppCopy(formData: FormData) {
  const supabase = requireAdminClient();
  const key = value(formData, "key");
  const en = value(formData, "en");
  const nb = value(formData, "nb");

  if (!key) throw new Error("Copy key is required.");
  if (!en && !nb) {
    throw new Error("At least one language (English or Norwegian) must be filled.");
  }

  // Norwegian falls back to English if left empty, so we never ship an
  // undefined `nb` value to the mobile client.
  const nextTranslations = { en: en || nb, nb: nb || en };

  const { error } = await supabase
    .from("app_copy")
    .update({
      translations: nextTranslations,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) throw new Error(error.message);

  await logAdminAction({
    action: "update",
    entity: "App copy",
    table: "app_copy",
    recordId: key,
    summary: `Updated app copy "${key}"`,
    details: nextTranslations,
  });

  revalidatePath("/copy");
}

// Bulk-updates several app_copy rows in one submit. The admin form encodes
// the list of keys as a "keys" field (comma-separated) plus one en_{key} /
// nb_{key} pair per key. Used by grouped cards on /copy (e.g. one card holds
// notification title + body). All updates share one audit entry so /activity
// doesn't get spammed.
export async function saveAppCopyGroup(formData: FormData) {
  const supabase = requireAdminClient();
  const keys = value(formData, "keys")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const groupLabel = value(formData, "group_label") || "group";

  if (keys.length === 0) throw new Error("No keys provided.");

  const updates: Array<{
    key: string;
    translations: { en: string; nb: string };
  }> = [];

  for (const key of keys) {
    const en = value(formData, `en_${key}`);
    const nb = value(formData, `nb_${key}`);
    if (!en && !nb) {
      throw new Error(`"${key}" must have English or Norwegian text.`);
    }
    updates.push({ key, translations: { en: en || nb, nb: nb || en } });
  }

  // No transaction wrapper — Supabase JS uses one HTTP call per update. If
  // one fails mid-way, earlier rows stay updated. Acceptable for copy edits;
  // admin can re-save. Wrap in an RPC later if that ever bites.
  for (const update of updates) {
    const { error } = await supabase
      .from("app_copy")
      .update({
        translations: update.translations,
        updated_at: new Date().toISOString(),
      })
      .eq("key", update.key);
    if (error) throw new Error(`${update.key}: ${error.message}`);
  }

  await logAdminAction({
    action: "update",
    entity: "App copy",
    table: "app_copy",
    recordId: keys.join(","),
    summary: `Updated app copy group "${groupLabel}" (${keys.length} keys)`,
    details: Object.fromEntries(updates.map((u) => [u.key, u.translations])),
  });

  revalidatePath("/copy");
}
