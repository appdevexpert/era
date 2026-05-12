"use client";

import Link from "next/link";
import React, { type ReactElement, type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Layers, Pencil, Plus, Trash2 } from "lucide-react";

import { FormField, OptionSelectField, SelectField } from "@/components/admin/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addBulkSets,
  addDefaultSections,
  addPlannedSet,
  assignExerciseToDay,
  deleteDayExercise,
  deleteDaySection,
  deletePlannedSet,
  deleteProgramDay,
  deleteProgramWeek,
  duplicateDay,
  saveDaySection,
  saveProgramDay,
  saveProgramWeek,
  updateDayExercise,
  updateDaySection,
  updatePlannedSet,
} from "@/lib/admin/actions";
import {
  PLANNED_SET_KINDS,
  SECTION_KINDS,
  WORKOUT_DAY_KINDS,
  WORKOUT_PHASES,
} from "@/lib/admin/constants";
import { translation } from "@/lib/admin/format";
import type { PlannedSetRow, ProgramDetail } from "@/lib/admin/types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Hidden({ name, value }: { name: string; value: string | number | null | undefined }) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

function BuilderDialog({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description?: string;
  trigger: ReactElement;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-sans">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function DialogButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" variant="secondary" {...props}>
      <Plus />
      {children}
    </Button>
  );
}

function SubmitRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      {children}
    </div>
  );
}

function DeleteButton({
  action,
  id,
  programId,
  label,
  ...props
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  programId: string;
  label: string;
} & Omit<React.ComponentProps<typeof Button>, "type">) {
  return (
    <BuilderDialog
      title={`Delete ${label}?`}
      description={`This will permanently delete this ${label} and all data inside it. This cannot be undone.`}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" {...props}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      }
    >
      <form action={action} className="grid gap-4">
        <Hidden name="id" value={id} />
        <Hidden name="program_id" value={programId} />
        <SubmitRow>
          <Button type="submit" variant="destructive">Delete {label}</Button>
        </SubmitRow>
      </form>
    </BuilderDialog>
  );
}

// ---------------------------------------------------------------------------
// Planned sets sub-component
// ---------------------------------------------------------------------------

function PlannedSetsList({
  exerciseSets,
  programId,
}: {
  exerciseSets: PlannedSetRow[];
  programId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!exerciseSets.length) {
    return <p className="text-xs text-muted-foreground">0 planned sets</p>;
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-era-white transition-colors"
      >
        {exerciseSets.length} planned sets
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded ? (
        <div className="mt-2 grid gap-1.5">
          {exerciseSets
            .sort((a, b) => a.set_number - b.set_number)
            .map((set) => {
              const parts: string[] = [];
              if (set.target_weight_value) parts.push(`${set.target_weight_value} kg`);
              if (set.target_reps_exact) parts.push(`${set.target_reps_exact} reps`);
              else if (set.target_reps_min || set.target_reps_max)
                parts.push(`${set.target_reps_min ?? "?"}–${set.target_reps_max ?? "?"} reps`);
              if (set.target_duration_seconds) parts.push(`${set.target_duration_seconds}s`);
              if (set.rest_seconds) parts.push(`rest ${set.rest_seconds}s`);

              return (
                <div
                  key={set.id}
                  className="flex items-center justify-between rounded border border-border bg-background px-2 py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-era-white">
                      Set {set.set_number}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {set.set_kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {parts.join(" · ") || "—"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <BuilderDialog
                      title="Edit set"
                      trigger={
                        <Button type="button" variant="ghost" size="icon-sm">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      }
                    >
                      <form action={updatePlannedSet} className="grid gap-4">
                        <Hidden name="id" value={set.id} />
                        <Hidden name="program_id" value={programId} />
                        <div className="grid gap-4 lg:grid-cols-2">
                          <FormField label="Set" name="set_number" type="number" defaultValue={set.set_number} />
                          <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} defaultValue={set.set_kind} />
                          <FormField label="Weight" name="target_weight_value" type="number" defaultValue={set.target_weight_value ?? ""} />
                          <FormField label="Reps exact" name="target_reps_exact" type="number" defaultValue={set.target_reps_exact ?? ""} />
                          <FormField label="Reps min" name="target_reps_min" type="number" defaultValue={set.target_reps_min ?? ""} />
                          <FormField label="Reps max" name="target_reps_max" type="number" defaultValue={set.target_reps_max ?? ""} />
                          <FormField label="Duration sec" name="target_duration_seconds" type="number" defaultValue={set.target_duration_seconds ?? ""} />
                          <FormField label="Rest sec" name="rest_seconds" type="number" defaultValue={set.rest_seconds ?? ""} />
                          <FormField label="Label EN" name="display_label_en" defaultValue={translation(set.display_label_translations, "en", set.display_label ?? "")} />
                          <FormField label="Label NO" name="display_label_nb" defaultValue={translation(set.display_label_translations, "nb", "")} />
                        </div>
                        <SubmitRow>
                          <Button type="submit">Save set</Button>
                        </SubmitRow>
                      </form>
                    </BuilderDialog>
                    <DeleteButton action={deletePlannedSet} id={set.id} programId={programId} label="set" />
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgramBuilder({
  detail,
  selectedDayId,
}: {
  detail: ProgramDetail;
  selectedDayId?: string;
}) {
  const { program, weeks, days, sections, dayExercises, sets, exercises } = detail;
  if (!program) return null;

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0] ?? null;
  const selectedSections = selectedDay
    ? sections.filter((section) => section.program_day_id === selectedDay.id)
    : [];
  const selectedExercises = selectedDay
    ? dayExercises.filter((exercise) => exercise.program_day_id === selectedDay.id)
    : [];
  const weekOptions = weeks.map((week) => ({
    label: `Week ${week.week_number} - ${week.focus || week.title}`,
    value: week.id,
  }));
  const sectionOptions = selectedSections.map((section) => ({
    label: translation(section.title_translations, "en", section.title),
    value: section.id,
  }));
  const exerciseOptions = exercises.map((exercise) => ({
    label: translation(exercise.name_translations, "en", exercise.name),
    value: exercise.id,
  }));
  const dayOptions = days
    .filter((day) => selectedDay && day.id !== selectedDay.id)
    .map((day) => ({
      label: `Day ${day.day_number} - ${translation(day.title_translations, "en", day.title)}`,
      value: day.id,
    }));

  return (
    <div className="grid gap-6">
      {/* ============ WEEKS + DAYS ============ */}
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* --- Weeks --- */}
        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">Weeks</CardTitle>
            <CardAction>
              <BuilderDialog
                title="Add week"
                description="Create the next phase in this program."
                trigger={<DialogButton>Add week</DialogButton>}
              >
                <form action={saveProgramWeek} className="grid gap-4">
                  <Hidden name="program_id" value={program.id} />
                  <FormField label="Week number" name="week_number" type="number" defaultValue={weeks.length + 1} />
                  <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} />
                  <FormField label="Title" name="title" placeholder="Week 1" />
                  <FormField label="Notes" name="notes" />
                  <SubmitRow>
                    <Button type="submit">Add week</Button>
                  </SubmitRow>
                </form>
              </BuilderDialog>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-2">
            {weeks.length ? (
              weeks.map((week) => (
                <div
                  key={week.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-era-black-2 p-3"
                >
                  <div>
                    <p className="font-medium text-era-white">Week {week.week_number}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-era-gold-dark">
                      {week.focus || "No phase"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <BuilderDialog
                      title="Edit week"
                      trigger={
                        <Button type="button" variant="ghost" size="icon-sm">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    >
                      <form action={saveProgramWeek} className="grid gap-4">
                        <Hidden name="program_id" value={program.id} />
                        <FormField label="Week number" name="week_number" type="number" defaultValue={week.week_number} />
                        <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} defaultValue={week.focus ?? ""} />
                        <FormField label="Title" name="title" defaultValue={week.title} />
                        <FormField label="Notes" name="notes" defaultValue={week.notes ?? ""} />
                        <SubmitRow>
                          <Button type="submit">Save week</Button>
                        </SubmitRow>
                      </form>
                    </BuilderDialog>
                    <DeleteButton action={deleteProgramWeek} id={week.id} programId={program.id} label="week" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No weeks yet.</p>
            )}
          </CardContent>
        </Card>

        {/* --- Days --- */}
        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">Days</CardTitle>
            <CardAction>
              {weekOptions.length ? (
                <BuilderDialog
                  title="Add day"
                  description="Attach a workout day to a program week."
                  trigger={<DialogButton>Add day</DialogButton>}
                >
                  <form action={saveProgramDay} className="grid gap-4">
                    <Hidden name="program_id" value={program.id} />
                    <OptionSelectField label="Week" name="week_id" options={weekOptions} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField label="Day number" name="day_number" type="number" defaultValue={days.length + 1} />
                      <FormField label="Weekday 1-7" name="weekday" type="number" />
                      <SelectField label="Workout kind" name="workout_kind" options={WORKOUT_DAY_KINDS} />
                      <FormField label="Estimated minutes" name="estimated_minutes" type="number" />
                      <FormField label="Title EN" name="title_en" required />
                      <FormField label="Title NO" name="title_nb" required />
                      <FormField label="Subtitle EN" name="subtitle_en" />
                      <FormField label="Subtitle NO" name="subtitle_nb" />
                      <div className="lg:col-span-2">
                        <FormField label="Target muscles" name="target_muscles" placeholder="chest, shoulders" />
                      </div>
                    </div>
                    <SubmitRow>
                      <Button type="submit">Add day</Button>
                    </SubmitRow>
                  </form>
                </BuilderDialog>
              ) : (
                <Button type="button" variant="secondary" disabled>
                  <Plus />
                  Add day
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            {days.length ? (
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Workout</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Minutes</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((day) => {
                    const week = weeks.find((item) => item.id === day.week_id);
                    return (
                      <TableRow key={day.id}>
                        <TableCell>{day.day_number}</TableCell>
                        <TableCell>{translation(day.title_translations, "en", day.title)}</TableCell>
                        <TableCell>{week ? `Week ${week.week_number}` : "Unknown"}</TableCell>
                        <TableCell>{day.estimated_minutes ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/programs/${program.id}?day=${day.id}`}
                              className="text-xs font-medium text-era-gold hover:underline"
                            >
                              Manage
                            </Link>
                            <BuilderDialog
                              title="Edit day"
                              trigger={
                                <Button type="button" variant="ghost" size="icon-sm">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              }
                            >
                              <form action={saveProgramDay} className="grid gap-4">
                                <Hidden name="program_id" value={program.id} />
                                <OptionSelectField label="Week" name="week_id" options={weekOptions} defaultValue={day.week_id} />
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <FormField label="Day number" name="day_number" type="number" defaultValue={day.day_number} />
                                  <FormField label="Weekday 1-7" name="weekday" type="number" defaultValue={day.weekday ?? ""} />
                                  <SelectField label="Workout kind" name="workout_kind" options={WORKOUT_DAY_KINDS} defaultValue={day.workout_kind} />
                                  <FormField label="Estimated minutes" name="estimated_minutes" type="number" defaultValue={day.estimated_minutes ?? ""} />
                                  <FormField label="Title EN" name="title_en" defaultValue={translation(day.title_translations, "en", day.title)} />
                                  <FormField label="Title NO" name="title_nb" defaultValue={translation(day.title_translations, "nb", day.title)} />
                                  <FormField label="Subtitle EN" name="subtitle_en" defaultValue={translation(day.subtitle_translations ?? {}, "en", day.subtitle ?? "")} />
                                  <FormField label="Subtitle NO" name="subtitle_nb" defaultValue={translation(day.subtitle_translations ?? {}, "nb", "")} />
                                  <div className="lg:col-span-2">
                                    <FormField label="Target muscles" name="target_muscles" defaultValue={day.target_muscles?.join(", ") ?? ""} />
                                  </div>
                                </div>
                                <SubmitRow>
                                  <Button type="submit">Save day</Button>
                                </SubmitRow>
                              </form>
                            </BuilderDialog>
                            <DeleteButton action={deleteProgramDay} id={day.id} programId={program.id} label="day" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Create a week before adding days.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ SECTIONS + EXERCISES ============ */}
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* --- Selected day / sections --- */}
        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">
              {selectedDay ? "Selected day" : "No day selected"}
            </CardTitle>
            {selectedDay ? (
              <CardAction>
                <div className="flex gap-2">
                  {!selectedSections.length ? (
                    <form action={addDefaultSections}>
                      <Hidden name="program_id" value={program.id} />
                      <Hidden name="program_day_id" value={selectedDay.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        <Layers />
                        Add default sections
                      </Button>
                    </form>
                  ) : null}
                  <BuilderDialog
                    title="Add section"
                    description="Create a section for warmups, main work, or finishers."
                    trigger={<DialogButton size="sm">Add section</DialogButton>}
                  >
                    <form action={saveDaySection} className="grid gap-4">
                      <Hidden name="program_id" value={program.id} />
                      <Hidden name="program_day_id" value={selectedDay.id} />
                      <SelectField label="Section kind" name="section_kind" options={SECTION_KINDS} />
                      <FormField label="Title EN" name="title_en" required />
                      <FormField label="Title NO" name="title_nb" required />
                      <FormField label="Sort order" name="sort_order" type="number" defaultValue={selectedSections.length + 1} />
                      <SubmitRow>
                        <Button type="submit">Add section</Button>
                      </SubmitRow>
                    </form>
                  </BuilderDialog>
                </div>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-3">
            {selectedDay ? (
              <>
                <div className="rounded-lg border border-border bg-era-black-2 p-3">
                  <p className="font-medium text-era-white">
                    {translation(selectedDay.title_translations, "en", selectedDay.title)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Day {selectedDay.day_number} - {selectedDay.estimated_minutes ?? 0} min
                  </p>
                </div>
                {dayOptions.length ? (
                  <BuilderDialog
                    title="Duplicate from another day"
                    description="Copy all sections, exercises, and sets from a source day into this day."
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="w-full">
                        <Copy />
                        Duplicate from another day
                      </Button>
                    }
                  >
                    <form action={duplicateDay} className="grid gap-4">
                      <Hidden name="program_id" value={program.id} />
                      <Hidden name="target_day_id" value={selectedDay.id} />
                      <OptionSelectField label="Copy from" name="source_day_id" options={dayOptions} />
                      <p className="text-xs text-muted-foreground">
                        This will copy all sections, exercises, and planned sets from the selected day. You can then swap exercises as needed.
                      </p>
                      <SubmitRow>
                        <Button type="submit">Duplicate</Button>
                      </SubmitRow>
                    </form>
                  </BuilderDialog>
                ) : null}
                {selectedSections.length ? (
                  selectedSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-era-white">
                          {translation(section.title_translations, "en", section.title)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {section.section_kind}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <BuilderDialog
                          title="Edit section"
                          trigger={
                            <Button type="button" variant="ghost" size="icon-sm">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        >
                          <form action={updateDaySection} className="grid gap-4">
                            <Hidden name="id" value={section.id} />
                            <Hidden name="program_id" value={program.id} />
                            <SelectField label="Section kind" name="section_kind" options={SECTION_KINDS} defaultValue={section.section_kind} />
                            <FormField label="Title EN" name="title_en" defaultValue={translation(section.title_translations, "en", section.title)} />
                            <FormField label="Title NO" name="title_nb" defaultValue={translation(section.title_translations, "nb", section.title)} />
                            <FormField label="Sort order" name="sort_order" type="number" defaultValue={section.sort_order} />
                            <SubmitRow>
                              <Button type="submit">Save section</Button>
                            </SubmitRow>
                          </form>
                        </BuilderDialog>
                        <DeleteButton action={deleteDaySection} id={section.id} programId={program.id} label="section" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No sections yet.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Create or select a day to manage sections.</p>
            )}
          </CardContent>
        </Card>

        {/* --- Exercises and sets --- */}
        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">Exercises and sets</CardTitle>
            <CardAction>
              {selectedDay && sectionOptions.length && exerciseOptions.length ? (
                <BuilderDialog
                  title="Assign exercise"
                  description="Place an exercise inside one of the selected day's sections."
                  trigger={<DialogButton>Assign exercise</DialogButton>}
                >
                  <form action={assignExerciseToDay} className="grid gap-4">
                    <Hidden name="program_id" value={program.id} />
                    <Hidden name="program_day_id" value={selectedDay.id} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <OptionSelectField label="Section" name="section_id" options={sectionOptions} />
                      <OptionSelectField label="Exercise" name="exercise_id" options={exerciseOptions} />
                      <FormField label="Sort order" name="sort_order" type="number" defaultValue={selectedExercises.length + 1} />
                      <FormField label="Initial weight" name="initial_weight_value" type="number" />
                      <FormField label="Rest seconds" name="default_rest_seconds" type="number" />
                      <FormField label="Display EN" name="display_name_en" />
                      <FormField label="Display NO" name="display_name_nb" />
                      <FormField label="Target EN" name="target_summary_en" placeholder="3 sets - 10 reps" />
                      <FormField label="Target NO" name="target_summary_nb" />
                    </div>
                    <SubmitRow>
                      <Button type="submit">Assign exercise</Button>
                    </SubmitRow>
                  </form>
                </BuilderDialog>
              ) : (
                <Button type="button" variant="secondary" disabled>
                  <Plus />
                  Assign exercise
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {selectedExercises.length ? (
              selectedExercises.map((assignment) => {
                const exerciseSets = sets.filter(
                  (set) => set.program_day_exercise_id === assignment.id,
                );
                const exerciseName = translation(
                  assignment.display_name_translations,
                  "en",
                  assignment.display_name || assignment.exercise_library?.name || "Exercise",
                );

                return (
                  <div key={assignment.id} className="rounded-lg border border-border bg-era-black-2 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-era-white">{exerciseName}</p>
                        {assignment.initial_weight_value ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {assignment.initial_weight_value} {assignment.initial_weight_unit}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <BuilderDialog
                          title="Edit exercise"
                          trigger={
                            <Button type="button" variant="ghost" size="icon-sm">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        >
                          <form action={updateDayExercise} className="grid gap-4">
                            <Hidden name="id" value={assignment.id} />
                            <Hidden name="program_id" value={program.id} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <OptionSelectField label="Section" name="section_id" options={sectionOptions} defaultValue={assignment.section_id} />
                              <OptionSelectField label="Exercise" name="exercise_id" options={exerciseOptions} defaultValue={assignment.exercise_id} />
                              <FormField label="Sort order" name="sort_order" type="number" defaultValue={assignment.sort_order} />
                              <FormField label="Initial weight" name="initial_weight_value" type="number" defaultValue={assignment.initial_weight_value ?? ""} />
                              <FormField label="Rest seconds" name="default_rest_seconds" type="number" defaultValue={assignment.default_rest_seconds ?? ""} />
                              <FormField label="Display EN" name="display_name_en" defaultValue={translation(assignment.display_name_translations, "en", assignment.display_name ?? "")} />
                              <FormField label="Display NO" name="display_name_nb" defaultValue={translation(assignment.display_name_translations, "nb", "")} />
                              <FormField label="Target EN" name="target_summary_en" defaultValue={translation(assignment.target_summary_translations ?? {}, "en", assignment.target_summary ?? "")} />
                              <FormField label="Target NO" name="target_summary_nb" defaultValue={translation(assignment.target_summary_translations ?? {}, "nb", "")} />
                            </div>
                            <SubmitRow>
                              <Button type="submit">Save exercise</Button>
                            </SubmitRow>
                          </form>
                        </BuilderDialog>
                        <DeleteButton action={deleteDayExercise} id={assignment.id} programId={program.id} label="exercise" />
                        <BuilderDialog
                          title="Add bulk sets"
                          description="Create multiple identical sets at once."
                          trigger={
                            <Button type="button" variant="secondary" size="sm">
                              <Layers />
                              Add 3 sets
                            </Button>
                          }
                        >
                          <form action={addBulkSets} className="grid gap-4">
                            <Hidden name="program_id" value={program.id} />
                            <Hidden name="program_day_exercise_id" value={assignment.id} />
                            <Hidden name="start_from" value={exerciseSets.length + 1} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <FormField label="Number of sets" name="set_count" type="number" defaultValue={3} />
                              <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} />
                              <FormField label="Weight" name="target_weight_value" type="number" />
                              <FormField label="Reps exact" name="target_reps_exact" type="number" />
                              <FormField label="Reps min" name="target_reps_min" type="number" />
                              <FormField label="Reps max" name="target_reps_max" type="number" />
                              <FormField label="Duration sec" name="target_duration_seconds" type="number" />
                              <FormField label="Rest sec" name="rest_seconds" type="number" />
                            </div>
                            <SubmitRow>
                              <Button type="submit">Add sets</Button>
                            </SubmitRow>
                          </form>
                        </BuilderDialog>
                        <BuilderDialog
                          title="Add set"
                          description="Add one planned set to this exercise."
                          trigger={
                            <Button type="button" variant="secondary" size="sm">
                              <Plus />
                              Add set
                            </Button>
                          }
                        >
                          <form action={addPlannedSet} className="grid gap-4">
                            <Hidden name="program_id" value={program.id} />
                            <Hidden name="program_day_exercise_id" value={assignment.id} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <FormField label="Set" name="set_number" type="number" defaultValue={exerciseSets.length + 1} />
                              <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} />
                              <FormField label="Weight" name="target_weight_value" type="number" />
                              <FormField label="Reps exact" name="target_reps_exact" type="number" />
                              <FormField label="Reps min" name="target_reps_min" type="number" />
                              <FormField label="Reps max" name="target_reps_max" type="number" />
                              <FormField label="Duration sec" name="target_duration_seconds" type="number" />
                              <FormField label="Rest sec" name="rest_seconds" type="number" />
                              <FormField label="Label EN" name="display_label_en" />
                              <FormField label="Label NO" name="display_label_nb" />
                            </div>
                            <SubmitRow>
                              <Button type="submit">Add set</Button>
                            </SubmitRow>
                          </form>
                        </BuilderDialog>
                      </div>
                    </div>
                    <PlannedSetsList exerciseSets={exerciseSets} programId={program.id} />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a day section and active exercises before assigning exercises.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
