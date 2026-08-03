"use client";

import React, {
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toast } from "@base-ui/react/toast";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Clock01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  Dumbbell01Icon,
  Layers01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/admin/empty-state";
import { FormField, OptionSelectField, SelectField } from "@/components/admin/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  addDefaultSections,
  assignExerciseToDay,
  deleteDayExercise,
  deleteDaySection,
  deleteProgramDay,
  deleteProgramWeek,
  reorderDayExercises,
  saveDaySection,
  savePlannedSets,
  saveProgramDay,
  saveProgramWeek,
  updateDayExercise,
  updateDaySection,
} from "@/lib/admin/actions";
import {
  allowedSetKindsForModality,
  formatRepsTarget,
  MAX_SETS_PER_EXERCISE,
  parseOptionalNumber,
  parseOptionalSeconds,
  parseRepsTarget,
  SECTION_KINDS,
  setColumnsForModality,
  setKindOptionsFor,
  WORKOUT_DAY_KINDS,
  WORKOUT_PHASES,
  type PlannedSetInput,
} from "@/lib/admin/constants";
import { translation } from "@/lib/admin/format";
import { useFormAction } from "@/lib/admin/use-form-action";
import type {
  DayExerciseRow,
  DaySectionRow,
  ExerciseRow,
  PlannedSetRow,
  ProgramDayRow,
  ProgramDetail,
  ProgramWeekRow,
} from "@/lib/admin/types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Hidden({ name, value }: { name: string; value: string | number | null | undefined }) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

// Lets any form/button rendered inside a BuilderDialog close it after a
// successful action — no prop-drilling through the many builder dialogs.
const DialogCloseContext = createContext<() => void>(() => {});

function BuilderDialog({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  // Controlled when the caller passes `open`; otherwise manages its own state
  // (trigger-based dialogs) so it can still close itself after a save/delete.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };
  const close = () => setOpen(false);

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-sans">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogCloseContext.Provider value={close}>
          {children}
        </DialogCloseContext.Provider>
      </DialogContent>
    </Dialog>
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
  const close = useContext(DialogCloseContext);
  const { handleSubmit, pending } = useFormAction(action, {
    success: successMessage,
    onSuccess: close,
  });
  return (
    <form onSubmit={handleSubmit} className={className ?? "grid gap-4"}>
      {children}
      <SubmitRow>
        <Button type="submit" loading={pending}>
          {submitLabel}
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
      toastManager.add({
        type: "error",
        title: "Failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" loading={pending} onClick={handleClick}>
      {!pending && <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />}
      Add default sections
    </Button>
  );
}

// Delete confirm button used inside a BuilderDialog — closes the dialog on
// success via the DialogCloseContext.
function ConfirmDeleteButton({
  action,
  formFields,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  formFields: Record<string, string>;
  label: string;
}) {
  const close = useContext(DialogCloseContext);
  const [pending, setPending] = useState(false);
  const toastManager = Toast.useToastManager();

  async function handleDelete() {
    setPending(true);
    try {
      const fd = new FormData();
      for (const [key, val] of Object.entries(formFields)) fd.set(key, val);
      await action(fd);
      toastManager.add({
        type: "success",
        title: `${label.charAt(0).toUpperCase() + label.slice(1)} deleted`,
      });
      close();
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
    <Button type="button" variant="destructive" loading={pending} onClick={handleDelete}>
      Delete {label}
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
  return (
    <BuilderDialog
      title={`Delete ${label}?`}
      description={`This will permanently delete this ${label} and all data inside it. This cannot be undone.`}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" {...props}>
          <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} className="text-destructive" />
        </Button>
      }
    >
      <div className="grid gap-4">
        <SubmitRow>
          <ConfirmDeleteButton
            action={action}
            formFields={{ id, program_id: programId }}
            label={label}
          />
        </SubmitRow>
      </div>
    </BuilderDialog>
  );
}

// ---------------------------------------------------------------------------
// Week forms
// ---------------------------------------------------------------------------

function AddWeekDialog({ programId, nextWeekNumber }: { programId: string; nextWeekNumber: number }) {
  return (
    <BuilderDialog
      title="Add week"
      description="Create the next phase in this program."
      trigger={
        <Button type="button" variant="secondary">
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          Add week
        </Button>
      }
    >
      <ActionForm action={saveProgramWeek} successMessage="Week added" submitLabel="Add week">
        <Hidden name="program_id" value={programId} />
        <FormField label="Week number" name="week_number" type="number" defaultValue={nextWeekNumber} />
        <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} />
      </ActionForm>
    </BuilderDialog>
  );
}

function EditWeekDialog({ week, programId }: { week: ProgramWeekRow; programId: string }) {
  return (
    <BuilderDialog
      title={`Edit week ${week.week_number}`}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit week">
          <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
        </Button>
      }
    >
      <ActionForm action={saveProgramWeek} successMessage="Week updated" submitLabel="Save week">
        <Hidden name="program_id" value={programId} />
        <Hidden name="id" value={week.id} />
        <FormField label="Week number" name="week_number" type="number" defaultValue={week.week_number} />
        <SelectField label="Phase" name="focus" options={WORKOUT_PHASES} defaultValue={week.focus ?? ""} />
      </ActionForm>
    </BuilderDialog>
  );
}

// ---------------------------------------------------------------------------
// Day forms
// ---------------------------------------------------------------------------

function dayFormFields(day?: ProgramDayRow, defaultDayNumber?: number) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormField
        label="Day number"
        name="day_number"
        type="number"
        defaultValue={day?.day_number ?? defaultDayNumber ?? 1}
      />
      <FormField label="Weekday 1-7" name="weekday" type="number" defaultValue={day?.weekday ?? ""} />
      <SelectField
        label="Workout kind"
        name="workout_kind"
        options={WORKOUT_DAY_KINDS}
        defaultValue={day?.workout_kind ?? "push"}
      />
      <FormField
        label="Estimated minutes"
        name="estimated_minutes"
        type="number"
        defaultValue={day?.estimated_minutes ?? ""}
      />
      <FormField
        label="Title EN"
        name="title_en"
        required
        defaultValue={day ? translation(day.title_translations, "en", day.title) : ""}
      />
      <FormField
        label="Title NO"
        name="title_nb"
        required
        defaultValue={day ? translation(day.title_translations, "nb", day.title) : ""}
      />
      <FormField
        label="Subtitle EN"
        name="subtitle_en"
        defaultValue={
          day ? translation(day.subtitle_translations ?? {}, "en", day.subtitle ?? "") : ""
        }
      />
      <FormField
        label="Subtitle NO"
        name="subtitle_nb"
        defaultValue={day ? translation(day.subtitle_translations ?? {}, "nb", "") : ""}
      />
      <div className="lg:col-span-2">
        <FormField
          label="Target muscles"
          name="target_muscles"
          placeholder="chest, shoulders"
          defaultValue={day?.target_muscles?.join(", ") ?? ""}
        />
      </div>
    </div>
  );
}

function AddDayDialog({
  programId,
  weekId,
  nextDayNumber,
  trigger,
}: {
  programId: string;
  weekId: string;
  nextDayNumber: number;
  trigger: ReactElement;
}) {
  return (
    <BuilderDialog
      title="Add day"
      description="Attach a workout day to this week."
      trigger={trigger}
    >
      <ActionForm action={saveProgramDay} successMessage="Day added" submitLabel="Add day">
        <Hidden name="program_id" value={programId} />
        <Hidden name="week_id" value={weekId} />
        {dayFormFields(undefined, nextDayNumber)}
      </ActionForm>
    </BuilderDialog>
  );
}

function EditDayDialog({
  day,
  programId,
  weekOptions,
  open,
  onOpenChange,
}: {
  day: ProgramDayRow;
  programId: string;
  weekOptions: { label: string; value: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BuilderDialog title="Edit day" open={open} onOpenChange={onOpenChange}>
      <ActionForm action={saveProgramDay} successMessage="Day updated" submitLabel="Save day">
        <Hidden name="program_id" value={programId} />
        <Hidden name="id" value={day.id} />
        <OptionSelectField
          label="Week"
          name="week_id"
          options={weekOptions}
          defaultValue={day.week_id}
        />
        {dayFormFields(day)}
      </ActionForm>
    </BuilderDialog>
  );
}

function DeleteDayDialog({
  day,
  programId,
  open,
  onOpenChange,
}: {
  day: ProgramDayRow;
  programId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const toastManager = Toast.useToastManager();

  async function handleDelete() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", day.id);
      fd.set("program_id", programId);
      await deleteProgramDay(fd);
      toastManager.add({ type: "success", title: "Day deleted" });
      onOpenChange(false);
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
      title="Delete day?"
      description={`This will permanently delete "${translation(day.title_translations, "en", day.title)}" and all its sections, exercises, and sets. This cannot be undone.`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4">
        <SubmitRow>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" loading={pending} onClick={handleDelete}>
            Delete day
          </Button>
        </SubmitRow>
      </div>
    </BuilderDialog>
  );
}

// ---------------------------------------------------------------------------
// Planned sets
// ---------------------------------------------------------------------------

function setSummary(set: PlannedSetRow): string {
  const parts: string[] = [];
  if (set.target_weight_value) parts.push(`${set.target_weight_value} kg`);
  if (set.target_reps_exact) parts.push(`${set.target_reps_exact} reps`);
  else if (set.target_reps_min || set.target_reps_max)
    parts.push(`${set.target_reps_min ?? "?"}–${set.target_reps_max ?? "?"} reps`);
  if (set.target_duration_seconds) parts.push(`${set.target_duration_seconds}s`);
  if (set.rest_seconds) parts.push(`rest ${set.rest_seconds}s`);
  return parts.join(" · ") || "—";
}

function defaultKindFor(modality: string | null | undefined): string {
  const allowed = allowedSetKindsForModality(modality);
  return allowed.includes("working") ? "working" : allowed[0];
}

// One collapsed line describing the whole set list, so a day can be scanned
// without opening anything. "4 × 10–12 reps · rest 60s" when every set matches,
// a plain count when they don't.
function describeSets(exerciseSets: PlannedSetRow[]): string {
  if (!exerciseSets.length) return "No sets yet";
  const shape = (set: PlannedSetRow) =>
    [
      set.set_kind,
      set.target_weight_value,
      set.target_reps_exact,
      set.target_reps_min,
      set.target_reps_max,
      set.target_duration_seconds,
      set.rest_seconds,
    ].join("|");

  const uniform = exerciseSets.every((set) => shape(set) === shape(exerciseSets[0]));
  if (!uniform) return `${exerciseSets.length} sets · mixed`;
  return `${exerciseSets.length} × ${setSummary(exerciseSets[0])}`;
}

// One editable row of the grid. Values are held as the strings the operator
// typed and only parsed on save, so a half-typed "10-" doesn't fight the input.
type SetDraft = {
  key: string;
  id: string | null;
  kind: string;
  weight: string;
  reps: string;
  duration: string;
  rest: string;
};

function toDrafts(exerciseSets: PlannedSetRow[]): SetDraft[] {
  // numeric columns arrive as strings ("0.00"); Number() first so the input
  // shows 0 and 62.5 rather than 0.00 and 62.50.
  const num = (raw: number | string | null | undefined) =>
    raw === null || raw === undefined ? "" : String(Number(raw));

  return [...exerciseSets]
    .sort((a, b) => a.set_number - b.set_number)
    .map((set) => ({
      key: set.id,
      id: set.id,
      kind: set.set_kind,
      weight: num(set.target_weight_value),
      reps: formatRepsTarget(set),
      duration: num(set.target_duration_seconds),
      rest: num(set.rest_seconds),
    }));
}

const BLANK_DRAFT: Omit<SetDraft, "key" | "id" | "kind"> = {
  weight: "",
  reps: "",
  duration: "",
  rest: "",
};

/**
 * Every set of an exercise, editable in place, saved in one call.
 *
 * Replaces a "Sets" count dialog plus one "Edit set" dialog per set. That shape
 * meant setting up four sets of 10–12 at 60s rest took five dialogs and four
 * revalidations, and the edit dialog only rendered 4 of the 8 columns — so a rep
 * range and a rest time could not be entered at all, and saving nulled the ones
 * that were off-screen. Here every column the action writes is on screen.
 */
// `expanded` lives in the parent and the component is keyed on the server data,
// so a save remounts it with real row ids while the grid stays open. Without the
// remount a freshly inserted row keeps `id: null` in the draft after saving, and
// pressing Save again inserts it a second time.
function PlannedSetsEditor({
  exerciseSets,
  programId,
  programDayExerciseId,
  modality,
  expanded,
  onExpandedChange,
}: {
  exerciseSets: PlannedSetRow[];
  programId: string;
  programDayExerciseId: string;
  modality: string | null;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
}) {
  const [drafts, setDrafts] = useState<SetDraft[]>(() => toDrafts(exerciseSets));
  const [pending, setPending] = useState(false);
  const nextKey = useRef(0);
  const toastManager = Toast.useToastManager();

  const columns = setColumnsForModality(modality);
  const initial = useMemo(() => toDrafts(exerciseSets), [exerciseSets]);
  const dirty = JSON.stringify(drafts) !== JSON.stringify(initial);

  const patch = (index: number, next: Partial<SetDraft>) =>
    setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, ...next } : row)));

  const addRow = () =>
    setDrafts((rows) => {
      const last = rows[rows.length - 1];
      return [
        ...rows,
        {
          // Copies the previous row, which is what "one more set" almost always
          // means and is why a new set can no longer land with empty reps and
          // rest beside populated siblings.
          ...(last ? { ...last } : { ...BLANK_DRAFT, kind: defaultKindFor(modality) }),
          key: `new-${nextKey.current++}`,
          id: null,
        },
      ];
    });

  const removeRow = (index: number) =>
    setDrafts((rows) => rows.filter((_, i) => i !== index));

  const copyFirstToAll = () =>
    setDrafts((rows) =>
      rows.map((row) =>
        row.key === rows[0].key
          ? row
          : {
              ...row,
              kind: rows[0].kind,
              weight: rows[0].weight,
              reps: rows[0].reps,
              duration: rows[0].duration,
              rest: rows[0].rest,
            },
      ),
    );

  async function handleSave() {
    let rows: PlannedSetInput[];
    try {
      rows = drafts.map((draft, index) => {
        try {
          return {
            id: draft.id,
            set_kind: draft.kind,
            target_weight_value: columns.weight
              ? parseOptionalNumber(draft.weight, "Weight")
              : null,
            ...(columns.reps
              ? parseRepsTarget(draft.reps)
              : { target_reps_exact: null, target_reps_min: null, target_reps_max: null }),
            target_duration_seconds: columns.duration
              ? parseOptionalSeconds(draft.duration, "Duration")
              : null,
            rest_seconds: parseOptionalSeconds(draft.rest, "Rest"),
          };
        } catch (err) {
          throw new Error(
            `Set ${index + 1}: ${err instanceof Error ? err.message : "invalid value"}`,
          );
        }
      });
    } catch (err) {
      toastManager.add({
        type: "error",
        title: "Check the sets",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
      return;
    }

    setPending(true);
    try {
      await savePlannedSets(programId, programDayExerciseId, rows);
      toastManager.add({ type: "success", title: "Sets saved" });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      toastManager.add({
        type: "error",
        title: "Save failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setPending(false);
    }
  }

  const gridTemplate = [
    "1.5rem",
    "8.5rem",
    columns.weight ? "5rem" : null,
    columns.reps ? "5rem" : null,
    columns.duration ? "5rem" : null,
    "5rem",
    "1.75rem",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {describeSets(exerciseSets)}
        {dirty ? <span className="text-primary">• unsaved</span> : null}
        <HugeiconsIcon
          icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={12}
          strokeWidth={1.8}
        />
      </button>

      {expanded ? (
        <div className="mt-2 rounded border border-border bg-background p-2">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div
                className="grid items-center gap-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <span>#</span>
                <span>Kind</span>
                {columns.weight ? <span>Kg</span> : null}
                {columns.reps ? <span>Reps</span> : null}
                {columns.duration ? <span>Sec</span> : null}
                <span>Rest</span>
                <span />
              </div>

              {drafts.map((draft, index) => (
                <div
                  key={draft.key}
                  className="grid items-center gap-2 py-0.5"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                  <Select
                    value={draft.kind}
                    onValueChange={(next: string | null) =>
                      patch(index, { kind: next ?? draft.kind })
                    }
                    items={setKindOptionsFor(modality, draft.kind).map((kind) => ({
                      label: kind,
                      value: kind,
                    }))}
                  >
                    <SelectTrigger size="sm" className="h-7 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {setKindOptionsFor(modality, draft.kind).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columns.weight ? (
                    <Input
                      className="h-7 text-xs"
                      value={draft.weight}
                      onChange={(event) => patch(index, { weight: event.target.value })}
                      placeholder="—"
                      inputMode="decimal"
                    />
                  ) : null}
                  {columns.reps ? (
                    <Input
                      className="h-7 text-xs"
                      value={draft.reps}
                      onChange={(event) => patch(index, { reps: event.target.value })}
                      placeholder="10-12"
                    />
                  ) : null}
                  {columns.duration ? (
                    <Input
                      className="h-7 text-xs"
                      value={draft.duration}
                      onChange={(event) => patch(index, { duration: event.target.value })}
                      placeholder="—"
                      inputMode="numeric"
                    />
                  ) : null}
                  <Input
                    className="h-7 text-xs"
                    value={draft.rest}
                    onChange={(event) => patch(index, { rest: event.target.value })}
                    placeholder="60"
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove set ${index + 1}`}
                    disabled={drafts.length <= 1}
                    onClick={() => removeRow(index)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={1.8} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={drafts.length >= MAX_SETS_PER_EXERCISE}
              onClick={addRow}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
              Add set
            </Button>
            {drafts.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={copyFirstToAll}>
                Copy set 1 to all
              </Button>
            ) : null}
            <span className="ml-auto flex items-center gap-2">
              {dirty ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDrafts(initial)}>
                  Reset
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                loading={pending}
                disabled={!dirty}
                onClick={handleSave}
              >
                Save sets
              </Button>
            </span>
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground">
            Reps takes a single number or a range — {`"10"`} or {`"10-12"`}. Leave a
            field empty to clear it.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day exercise card (one assignment row inside the Day editor)
// ---------------------------------------------------------------------------

function DayExerciseCard({
  assignment,
  exerciseSets,
  programId,
  sectionOptions,
  exerciseLibraryOptions,
  modality,
}: {
  assignment: DayExerciseRow;
  exerciseSets: PlannedSetRow[];
  programId: string;
  sectionOptions: { label: string; value: string }[];
  exerciseLibraryOptions: { label: string; value: string }[];
  modality: string | null;
}) {
  const exerciseName = translation(
    assignment.display_name_translations,
    "en",
    assignment.display_name || assignment.exercise_library?.name || "Exercise",
  );
  const [setsOpen, setSetsOpen] = useState(false);
  const setsSignature = useMemo(
    () => JSON.stringify(toDrafts(exerciseSets)),
    [exerciseSets],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{exerciseName}</p>
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
                <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
              </Button>
            }
          >
            <ActionForm
              action={updateDayExercise}
              successMessage="Exercise updated"
              submitLabel="Save exercise"
            >
              <Hidden name="id" value={assignment.id} />
              <Hidden name="program_id" value={programId} />
              <div className="grid gap-4 lg:grid-cols-2">
                <OptionSelectField
                  label="Section"
                  name="section_id"
                  options={sectionOptions}
                  defaultValue={assignment.section_id}
                />
                <OptionSelectField
                  label="Exercise"
                  name="exercise_id"
                  options={exerciseLibraryOptions}
                  defaultValue={assignment.exercise_id}
                />
                <FormField
                  label="Sort order"
                  name="sort_order"
                  type="number"
                  defaultValue={assignment.sort_order}
                />
                <FormField
                  label="Initial weight (kg)"
                  name="initial_weight_value"
                  type="number"
                  defaultValue={assignment.initial_weight_value ?? ""}
                />
                <FormField
                  label="Default rest (seconds)"
                  name="default_rest_seconds"
                  type="number"
                  defaultValue={assignment.default_rest_seconds ?? ""}
                />
                <FormField
                  label="Display name (English)"
                  name="display_name_en"
                  placeholder="Leave empty to use library name"
                  defaultValue={
                    assignment.display_name_translations?.en ||
                    assignment.display_name ||
                    ""
                  }
                />
                <FormField
                  label="Display name (Norwegian)"
                  name="display_name_nb"
                  placeholder="Leave empty to use library name"
                  defaultValue={assignment.display_name_translations?.nb || ""}
                />
              </div>
            </ActionForm>
          </BuilderDialog>
          <DeleteButton
            action={deleteDayExercise}
            id={assignment.id}
            programId={programId}
            label="exercise"
          />
        </div>
      </div>
      {/* Sets live in the card, not behind a dialog. "Bulk sets", "Set", "Edit
          set" and "Delete set" were four entry points onto one list — and the
          two add paths appended while reading as totals.

          Keyed on the server rows so a save remounts the editor with the real
          ids it just created; `setsOpen` sits out here so that remount doesn't
          fold the grid shut under the operator. */}
      <PlannedSetsEditor
        key={setsSignature}
        exerciseSets={exerciseSets}
        programId={programId}
        programDayExerciseId={assignment.id}
        modality={modality}
        expanded={setsOpen}
        onExpandedChange={setSetsOpen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable list helpers (dnd-kit)
// ---------------------------------------------------------------------------

// Wraps a list of children in a DndContext + SortableContext, tracks local order
// for optimistic UI, calls the server on drop, and reverts + toasts on failure.
function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  onReorder: (nextIds: string[]) => Promise<void>;
  children: (orderedItems: T[]) => ReactNode;
}) {
  // Track the server list identity so local optimistic order resets whenever
  // the parent re-fetches (e.g. after revalidatePath). Adjusting state during
  // render is the React-recommended pattern for prop-derived state.
  const [localItems, setLocalItems] = useState(items);
  const [serverSnapshot, setServerSnapshot] = useState(items);
  if (serverSnapshot !== items) {
    setServerSnapshot(items);
    setLocalItems(items);
  }

  const toastManager = Toast.useToastManager();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => localItems.map((item) => item.id), [localItems]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex((item) => item.id === active.id);
    const newIndex = localItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = localItems;
    const next = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(next);
    try {
      await onReorder(next.map((item) => item.id));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      setLocalItems(previous);
      toastManager.add({
        type: "error",
        title: "Reorder failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children(localItems)}
      </SortableContext>
    </DndContext>
  );
}

// Renders a drag-handle-equipped row. The handle is a small grip button on the
// left; the rest of the row is the child content.
function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="group/sortable flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
        className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border border-transparent text-muted-foreground/60 opacity-70 transition-all hover:border-border hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/sortable:opacity-100"
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} size={18} strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day editor (Sheet)
// ---------------------------------------------------------------------------

function DayEditorSheet({
  day,
  programId,
  sections,
  dayExercises,
  sets,
  exerciseLibraryOptions,
  modalityByExerciseId,
  trigger,
}: {
  day: ProgramDayRow;
  programId: string;
  sections: DaySectionRow[];
  dayExercises: DayExerciseRow[];
  sets: PlannedSetRow[];
  exerciseLibraryOptions: { label: string; value: string }[];
  modalityByExerciseId: Map<string, string>;
  trigger: ReactElement;
}) {
  const daySections = sections.filter((s) => s.program_day_id === day.id);
  const dayExs = dayExercises.filter((e) => e.program_day_id === day.id);
  const sectionOptions = daySections.map((s) => ({
    label: translation(s.title_translations, "en", s.title),
    value: s.id,
  }));

  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0"
        style={{ maxWidth: "min(48rem, 100vw)" }}
      >
        <SheetHeader className="border-b border-border bg-card/40 px-5 py-4">
          <SheetTitle>
            {translation(day.title_translations, "en", day.title)}
          </SheetTitle>
          <SheetDescription>
            Day {day.day_number} · {day.workout_kind}
            {day.estimated_minutes ? ` · ${day.estimated_minutes} min` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-6">
            {/* Sections */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-foreground">Sections</h4>
                <div className="flex gap-2">
                  {!daySections.length ? (
                    <DefaultSectionsButton programId={programId} dayId={day.id} />
                  ) : null}
                  <BuilderDialog
                    title="Add section"
                    trigger={
                      <Button type="button" variant="secondary" size="sm">
                        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
                        Add section
                      </Button>
                    }
                  >
                    <ActionForm
                      action={saveDaySection}
                      successMessage="Section added"
                      submitLabel="Add section"
                    >
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
                        <p className="text-sm font-medium text-foreground">
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
                              <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
                            </Button>
                          }
                        >
                          <ActionForm
                            action={updateDaySection}
                            successMessage="Section updated"
                            submitLabel="Save section"
                          >
                            <Hidden name="id" value={section.id} />
                            <Hidden name="program_id" value={programId} />
                            <SelectField
                              label="Section kind"
                              name="section_kind"
                              options={SECTION_KINDS}
                              defaultValue={section.section_kind}
                            />
                            <FormField
                              label="Title EN"
                              name="title_en"
                              defaultValue={translation(section.title_translations, "en", section.title)}
                            />
                            <FormField
                              label="Title NO"
                              name="title_nb"
                              defaultValue={translation(section.title_translations, "nb", section.title)}
                            />
                          </ActionForm>
                        </BuilderDialog>
                        <DeleteButton
                          action={deleteDaySection}
                          id={section.id}
                          programId={programId}
                          label="section"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sections yet.</p>
              )}
            </section>

            <Separator />

            {/* Exercises */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-foreground">Exercises</h4>
                {sectionOptions.length && exerciseLibraryOptions.length ? (
                  <BuilderDialog
                    title="Assign exercise"
                    trigger={
                      <Button type="button" variant="secondary" size="sm">
                        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
                        Assign exercise
                      </Button>
                    }
                  >
                    <ActionForm
                      action={assignExerciseToDay}
                      successMessage="Exercise assigned"
                      submitLabel="Assign exercise"
                    >
                      <Hidden name="program_id" value={programId} />
                      <Hidden name="program_day_id" value={day.id} />
                      <Hidden name="sort_order" value={dayExs.length + 1} />
                      <div className="grid gap-4 lg:grid-cols-2">
                        <OptionSelectField label="Section" name="section_id" options={sectionOptions} />
                        <OptionSelectField
                          label="Exercise"
                          name="exercise_id"
                          options={exerciseLibraryOptions}
                        />
                        <FormField label="Initial weight (kg)" name="initial_weight_value" type="number" />
                      </div>
                    </ActionForm>
                  </BuilderDialog>
                ) : null}
              </div>
              {daySections.length ? (
                <div className="grid gap-5">
                  {daySections.map((section) => {
                    const sectionExs = dayExs.filter((e) => e.section_id === section.id);
                    return (
                      <div key={section.id} className="grid gap-2">
                        <div className="flex items-end justify-between gap-3 border-b border-border/60 pb-1.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {translation(section.title_translations, "en", section.title)}
                            </p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {section.section_kind} · {sectionExs.length} exercise{sectionExs.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        {sectionExs.length ? (
                          <SortableList
                            items={sectionExs}
                            onReorder={(nextIds) =>
                              reorderDayExercises(programId, section.id, nextIds)
                            }
                          >
                            {(orderedExs) => (
                              <div className="grid gap-3">
                                {orderedExs.map((assignment) => (
                                  <SortableRow key={assignment.id} id={assignment.id}>
                                    <DayExerciseCard
                                      assignment={assignment}
                                      exerciseSets={sets.filter(
                                        (set) => set.program_day_exercise_id === assignment.id,
                                      )}
                                      programId={programId}
                                      sectionOptions={sectionOptions}
                                      exerciseLibraryOptions={exerciseLibraryOptions}
                                      modality={modalityByExerciseId.get(assignment.exercise_id) ?? null}
                                    />
                                  </SortableRow>
                                ))}
                              </div>
                            )}
                          </SortableList>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">
                            No exercises in this section yet.
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {(() => {
                    const sectionIds = new Set(daySections.map((s) => s.id));
                    const orphans = dayExs.filter((e) => !sectionIds.has(e.section_id));
                    if (!orphans.length) return null;
                    return (
                      <div className="grid gap-2">
                        <div className="border-b border-border/60 pb-1.5">
                          <p className="text-sm font-medium text-amber-500">Unassigned</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            No section · {orphans.length} exercise{orphans.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="grid gap-3">
                          {orphans.map((assignment) => (
                            <DayExerciseCard
                              key={assignment.id}
                              assignment={assignment}
                              exerciseSets={sets.filter(
                                (set) => set.program_day_exercise_id === assignment.id,
                              )}
                              programId={programId}
                              sectionOptions={sectionOptions}
                              exerciseLibraryOptions={exerciseLibraryOptions}
                              modality={modalityByExerciseId.get(assignment.exercise_id) ?? null}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add sections first, then assign exercises.
                </p>
              )}
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Day card (grid item)
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DayCard({
  day,
  programId,
  weekOptions,
  exerciseCount,
  setCount,
  sections,
  dayExercises,
  sets,
  exerciseLibraryOptions,
  modalityByExerciseId,
}: {
  day: ProgramDayRow;
  programId: string;
  weekOptions: { label: string; value: string }[];
  exerciseCount: number;
  setCount: number;
  sections: DaySectionRow[];
  dayExercises: DayExerciseRow[];
  sets: PlannedSetRow[];
  exerciseLibraryOptions: { label: string; value: string }[];
  modalityByExerciseId: Map<string, string>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const titleEn = translation(day.title_translations, "en", day.title);
  const titleNb = translation(day.title_translations, "nb", day.title);

  return (
    <>
      <Card
        size="sm"
        className="group !gap-1.5 !py-2.5 transition-shadow hover:ring-era-gold-dark/40"
      >
        <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-1">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{titleEn}</CardTitle>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {titleNb}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Day actions">
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={14} strokeWidth={1.8} />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <HugeiconsIcon icon={PencilEdit01Icon} size={16} strokeWidth={1.8} />
                Edit metadata
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
                Delete day
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] capitalize"
            >
              {day.workout_kind}
            </Badge>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              D{day.day_number}
            </Badge>
            {day.weekday && WEEKDAY_LABELS[day.weekday] ? (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {WEEKDAY_LABELS[day.weekday]}
              </Badge>
            ) : null}
            {day.estimated_minutes ? (
              <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[10px]">
                <HugeiconsIcon icon={Clock01Icon} size={10} strokeWidth={1.8} />
                {day.estimated_minutes}m
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <HugeiconsIcon icon={Dumbbell01Icon} size={12} strokeWidth={1.8} />
            <span>
              {exerciseCount} ex · {setCount} sets
            </span>
          </div>
        </CardContent>
        <CardFooter className="mt-auto border-t bg-transparent px-3 py-2">
          <DayEditorSheet
            day={day}
            programId={programId}
            sections={sections}
            dayExercises={dayExercises}
            sets={sets}
            exerciseLibraryOptions={exerciseLibraryOptions}
            modalityByExerciseId={modalityByExerciseId}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 w-full justify-center text-xs">
                <HugeiconsIcon icon={Settings02Icon} size={12} strokeWidth={1.8} />
                Open editor
              </Button>
            }
          />
        </CardFooter>
      </Card>

      <EditDayDialog
        day={day}
        programId={programId}
        weekOptions={weekOptions}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteDayDialog
        day={day}
        programId={programId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgramBuilder({ detail }: { detail: ProgramDetail }) {
  const { program, weeks, days, sections, dayExercises, sets, exercises } = detail;

  const sortedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.week_number - b.week_number),
    [weeks],
  );

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  // Derive the effective active week. If user's selection no longer exists
  // (e.g. deleted), fall back to first week without syncing state.
  const activeWeekId =
    selectedWeekId && sortedWeeks.some((w) => w.id === selectedWeekId)
      ? selectedWeekId
      : sortedWeeks[0]?.id ?? null;

  if (!program) return null;

  const weekOptions = sortedWeeks.map((week) => ({
    label: `Week ${week.week_number}${week.focus ? ` — ${week.focus}` : ""}`,
    value: week.id,
  }));
  const exerciseLibraryOptions = exercises.map((exercise: ExerciseRow) => ({
    label: translation(exercise.name_translations, "en", exercise.name),
    value: exercise.id,
  }));
  const modalityByExerciseId = new Map(
    exercises.map((exercise: ExerciseRow) => [exercise.id, exercise.modality] as const),
  );

  const activeWeek = sortedWeeks.find((w) => w.id === activeWeekId) ?? null;
  const daysInActiveWeek = activeWeek
    ? [...days]
        .filter((d) => d.week_id === activeWeek.id)
        .sort((a, b) => a.day_number - b.day_number)
    : [];

  const exercisesByDay = new Map<string, number>();
  const setsByDay = new Map<string, number>();
  for (const ex of dayExercises) {
    exercisesByDay.set(ex.program_day_id, (exercisesByDay.get(ex.program_day_id) ?? 0) + 1);
  }
  for (const s of sets) {
    const assignment = dayExercises.find((e) => e.id === s.program_day_exercise_id);
    if (!assignment) continue;
    setsByDay.set(
      assignment.program_day_id,
      (setsByDay.get(assignment.program_day_id) ?? 0) + 1,
    );
  }

  const nextWeekNumber = (sortedWeeks[sortedWeeks.length - 1]?.week_number ?? 0) + 1;
  const nextDayNumber = (daysInActiveWeek[daysInActiveWeek.length - 1]?.day_number ?? 0) + 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Weeks rail */}
      <aside className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark">
            Weeks
          </p>
          <AddWeekDialog programId={program.id} nextWeekNumber={nextWeekNumber} />
        </div>
        {sortedWeeks.length ? (
          <ul className="flex flex-col gap-1.5">
            {sortedWeeks.map((week) => {
              const isActive = week.id === activeWeekId;
              const dayTotal = days.filter((d) => d.week_id === week.id).length;
              return (
                <li key={week.id}>
                  <div
                    className={`group/week-row relative flex items-stretch rounded-lg border transition-colors ${
                      isActive
                        ? "border-era-gold-dark/40 bg-accent"
                        : "border-border bg-card/40 hover:border-era-gold-dark/30 hover:bg-card/70"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full transition-colors ${
                        isActive ? "bg-era-gold" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedWeekId(week.id)}
                      aria-pressed={isActive}
                      className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md text-[10px] font-medium uppercase tracking-[0.18em] ${
                          isActive
                            ? "bg-era-gold-dark/20 text-primary"
                            : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="leading-none opacity-70">W</span>
                        <span
                          className={`font-display text-base leading-none ${
                            isActive ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {week.week_number}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-sm font-medium ${
                              isActive ? "text-foreground" : "text-foreground/90"
                            }`}
                          >
                            {week.focus || "No phase"}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {dayTotal} {dayTotal === 1 ? "day" : "days"} planned
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 pr-2 opacity-0 transition-opacity group-hover/week-row:opacity-100 focus-within:opacity-100">
                      <EditWeekDialog week={week} programId={program.id} />
                      <DeleteButton
                        action={deleteProgramWeek}
                        id={week.id}
                        programId={program.id}
                        label="week"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No weeks yet.</p>
        )}
      </aside>

      {/* Active week panel */}
      <div className="grid min-w-0 gap-6">
      {activeWeek ? (
        <>
          {/* Days grid */}
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {daysInActiveWeek.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                programId={program.id}
                weekOptions={weekOptions}
                exerciseCount={exercisesByDay.get(day.id) ?? 0}
                setCount={setsByDay.get(day.id) ?? 0}
                sections={sections}
                dayExercises={dayExercises}
                sets={sets}
                exerciseLibraryOptions={exerciseLibraryOptions}
                modalityByExerciseId={modalityByExerciseId}
              />
            ))}
            <AddDayDialog
              programId={program.id}
              weekId={activeWeek.id}
              nextDayNumber={nextDayNumber}
              trigger={
                <button
                  type="button"
                  className="group flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card/30 text-xs text-muted-foreground transition-colors hover:border-era-gold-dark hover:bg-card/50 hover:text-foreground"
                >
                  <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
                  Add day
                </button>
              }
            />
          </div>
        </>
      ) : (
        <EmptyState
          title="No weeks yet"
          description="Add the first week to start building this 12-week program."
        />
      )}
      </div>
    </div>
  );
}

