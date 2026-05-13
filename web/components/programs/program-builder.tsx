"use client";

import React, { type ReactElement, type ReactNode, useState } from "react";
import { Toast } from "@base-ui/react/toast";
import { ChevronDown, ChevronUp, Layers, Pencil, Plus, Trash2 } from "lucide-react";

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
import { useFormAction } from "@/lib/admin/use-form-action";
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

function ActionForm({
  action,
  successMessage,
  submitLabel,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  submitLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const { handleSubmit, pending } = useFormAction(action, { success: successMessage });
  return (
    <form onSubmit={handleSubmit} className={className ?? "grid gap-4"}>
      {children}
      <SubmitRow>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </SubmitRow>
    </form>
  );
}

function DefaultSectionsButton({ programId, dayId }: { programId: string; dayId: string }) {
  const [pending, setPending] = useState(false);
  const toastManager = Toast.useToastManager();

  async function handleClick() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("program_id", programId);
      fd.set("program_day_id", dayId);
      await addDefaultSections(fd);
      toastManager.add({ type: "success", title: "Default sections added" });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      toastManager.add({ type: "error", title: "Failed", description: err instanceof Error ? err.message : "An unexpected error occurred." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={handleClick}>
      <Layers />
      {pending ? "Adding..." : "Add default sections"}
    </Button>
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
  const [pending, setPending] = useState(false);
  const toastManager = Toast.useToastManager();

  async function handleDelete() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("program_id", programId);
      await action(fd);
      toastManager.add({ type: "success", title: `${label.charAt(0).toUpperCase() + label.slice(1)} deleted` });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      toastManager.add({
        type: "error",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setPending(false);
    }
  }

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
      <div className="grid gap-4">
        <SubmitRow>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting..." : `Delete ${label}`}
          </Button>
        </SubmitRow>
      </div>
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
                      <ActionForm action={updatePlannedSet} successMessage="Set updated" submitLabel="Save set">
                        <Hidden name="id" value={set.id} />
                        <Hidden name="program_id" value={programId} />
                        <div className="grid gap-4 lg:grid-cols-2">
                          <FormField label="Set #" name="set_number" type="number" defaultValue={set.set_number} />
                          <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} defaultValue={set.set_kind} />
                          <FormField label="Weight (kg)" name="target_weight_value" type="number" defaultValue={set.target_weight_value ?? ""} />
                          <FormField label="Reps" name="target_reps_exact" type="number" defaultValue={set.target_reps_exact ?? ""} />
                        </div>
                      </ActionForm>
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
// Manage day dialog
// ---------------------------------------------------------------------------

function ManageDayDialog({
  day,
  programId,
  sections,
  dayExercises,
  sets,
  exercises,
  sectionKindOptions,
  exerciseLibraryOptions,
}: {
  day: ProgramDetail["days"][number];
  programId: string;
  sections: ProgramDetail["sections"];
  dayExercises: ProgramDetail["dayExercises"];
  sets: ProgramDetail["sets"];
  exercises: ProgramDetail["exercises"];
  sectionKindOptions: { label: string; value: string }[];
  exerciseLibraryOptions: { label: string; value: string }[];
}) {
  const daySections = sections.filter((s) => s.program_day_id === day.id);
  const dayExs = dayExercises.filter((e) => e.program_day_id === day.id);
  const sectionOptions = daySections.map((s) => ({
    label: translation(s.title_translations, "en", s.title),
    value: s.id,
  }));

  return (
    <BuilderDialog
      title={`${translation(day.title_translations, "en", day.title)} — Day ${day.day_number}`}
      description={`Sections, exercises, and sets for this workout day${day.estimated_minutes ? ` (${day.estimated_minutes} min)` : ""}.`}
      trigger={
        <button type="button" className="text-xs font-medium text-era-gold hover:underline">
          Manage
        </button>
      }
    >
      <div className="grid gap-6">
        {/* Sections */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-era-white">Sections</h4>
            <div className="flex gap-2">
              {!daySections.length ? (
                <DefaultSectionsButton programId={programId} dayId={day.id} />
              ) : null}
              <BuilderDialog
                title="Add section"
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Plus />
                    Add section
                  </Button>
                }
              >
                <ActionForm action={saveDaySection} successMessage="Section added" submitLabel="Add section">
                  <Hidden name="program_id" value={programId} />
                  <Hidden name="program_day_id" value={day.id} />
                  <Hidden name="sort_order" value={daySections.length + 1} />
                  <SelectField label="Section kind" name="section_kind" options={SECTION_KINDS} />
                  <FormField label="Title EN" name="title_en" required />
                  <FormField label="Title NO" name="title_nb" required />
                </ActionForm>
              </BuilderDialog>
            </div>
          </div>
          {daySections.length ? (
            <div className="grid gap-2">
              {daySections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-era-white">
                      {translation(section.title_translations, "en", section.title)}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
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
                      <ActionForm action={updateDaySection} successMessage="Section updated" submitLabel="Save section">
                        <Hidden name="id" value={section.id} />
                        <Hidden name="program_id" value={programId} />
                        <SelectField label="Section kind" name="section_kind" options={SECTION_KINDS} defaultValue={section.section_kind} />
                        <FormField label="Title EN" name="title_en" defaultValue={translation(section.title_translations, "en", section.title)} />
                        <FormField label="Title NO" name="title_nb" defaultValue={translation(section.title_translations, "nb", section.title)} />
                      </ActionForm>
                    </BuilderDialog>
                    <DeleteButton action={deleteDaySection} id={section.id} programId={programId} label="section" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sections yet.</p>
          )}
        </div>

        {/* Exercises */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-era-white">Exercises</h4>
            {sectionOptions.length && exerciseLibraryOptions.length ? (
              <BuilderDialog
                title="Assign exercise"
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Plus />
                    Assign exercise
                  </Button>
                }
              >
                <ActionForm action={assignExerciseToDay} successMessage="Exercise assigned" submitLabel="Assign exercise">
                  <Hidden name="program_id" value={programId} />
                  <Hidden name="program_day_id" value={day.id} />
                  <Hidden name="sort_order" value={dayExs.length + 1} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <OptionSelectField label="Section" name="section_id" options={sectionOptions} />
                    <OptionSelectField label="Exercise" name="exercise_id" options={exerciseLibraryOptions} />
                    <FormField label="Initial weight (kg)" name="initial_weight_value" type="number" />
                  </div>
                </ActionForm>
              </BuilderDialog>
            ) : null}
          </div>
          {dayExs.length ? (
            <div className="grid gap-3">
              {dayExs.map((assignment) => {
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
                          <ActionForm action={updateDayExercise} successMessage="Exercise updated" submitLabel="Save exercise">
                            <Hidden name="id" value={assignment.id} />
                            <Hidden name="program_id" value={programId} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <OptionSelectField label="Section" name="section_id" options={sectionOptions} defaultValue={assignment.section_id} />
                              <OptionSelectField label="Exercise" name="exercise_id" options={exerciseLibraryOptions} defaultValue={assignment.exercise_id} />
                              <FormField label="Initial weight (kg)" name="initial_weight_value" type="number" defaultValue={assignment.initial_weight_value ?? ""} />
                            </div>
                          </ActionForm>
                        </BuilderDialog>
                        <DeleteButton action={deleteDayExercise} id={assignment.id} programId={programId} label="exercise" />
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
                          <ActionForm action={addBulkSets} successMessage="Sets added" submitLabel="Add sets">
                            <Hidden name="program_id" value={programId} />
                            <Hidden name="program_day_exercise_id" value={assignment.id} />
                            <Hidden name="start_from" value={exerciseSets.length + 1} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <FormField label="Number of sets" name="set_count" type="number" defaultValue={3} />
                              <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} />
                              <FormField label="Weight (kg)" name="target_weight_value" type="number" />
                              <FormField label="Reps" name="target_reps_exact" type="number" />
                              <FormField label="Reps min" name="target_reps_min" type="number" />
                              <FormField label="Reps max" name="target_reps_max" type="number" />
                              <FormField label="Duration sec" name="target_duration_seconds" type="number" />
                              <FormField label="Rest sec" name="rest_seconds" type="number" />
                            </div>
                          </ActionForm>
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
                          <ActionForm action={addPlannedSet} successMessage="Set added" submitLabel="Add set">
                            <Hidden name="program_id" value={programId} />
                            <Hidden name="program_day_exercise_id" value={assignment.id} />
                            <Hidden name="set_number" value={exerciseSets.length + 1} />
                            <div className="grid gap-4 lg:grid-cols-2">
                              <SelectField label="Kind" name="set_kind" options={PLANNED_SET_KINDS} />
                              <FormField label="Weight (kg)" name="target_weight_value" type="number" />
                              <FormField label="Reps" name="target_reps_exact" type="number" />
                            </div>
                          </ActionForm>
                        </BuilderDialog>
                      </div>
                    </div>
                    <PlannedSetsList exerciseSets={exerciseSets} programId={programId} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {daySections.length ? "No exercises assigned yet." : "Add sections first, then assign exercises."}
            </p>
          )}
        </div>
      </div>
    </BuilderDialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgramBuilder({
  detail,
}: {
  detail: ProgramDetail;
}) {
  const { program, weeks, days, sections, dayExercises, sets, exercises } = detail;
  if (!program) return null;

  const weekOptions = weeks.map((week) => ({
    label: `Week ${week.week_number} - ${week.focus || week.title}`,
    value: week.id,
  }));
  const exerciseOptions = exercises.map((exercise) => ({
    label: translation(exercise.name_translations, "en", exercise.name),
    value: exercise.id,
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
                <ActionForm action={saveProgramWeek} successMessage="Week added" submitLabel="Add week">
                  <Hidden name="program_id" value={program.id} />
                  <FormField label="Week number" name="week_number" type="number" defaultValue={weeks.length + 1} />
                  <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} />
                </ActionForm>
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
                      <ActionForm action={saveProgramWeek} successMessage="Week updated" submitLabel="Save week">
                        <Hidden name="program_id" value={program.id} />
                        <FormField label="Week number" name="week_number" type="number" defaultValue={week.week_number} />
                        <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} defaultValue={week.focus ?? ""} />
                      </ActionForm>
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
                  <ActionForm action={saveProgramDay} successMessage="Day added" submitLabel="Add day">
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
                  </ActionForm>
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
                            <ManageDayDialog
                              day={day}
                              programId={program.id}
                              sections={sections}
                              dayExercises={dayExercises}
                              sets={sets}
                              exercises={exercises}
                              sectionKindOptions={SECTION_KINDS.map((k) => ({ label: k, value: k }))}
                              exerciseLibraryOptions={exerciseOptions}
                            />
                            <BuilderDialog
                              title="Edit day"
                              trigger={
                                <Button type="button" variant="ghost" size="icon-sm">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              }
                            >
                              <ActionForm action={saveProgramDay} successMessage="Day updated" submitLabel="Save day">
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
                              </ActionForm>
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

    </div>
  );
}
