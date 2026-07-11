"use client";

import { useState, type ReactElement } from "react";

import { FormField, OptionSelectField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveProgram } from "@/lib/admin/actions";
import { useFormAction } from "@/lib/admin/use-form-action";
import { translation } from "@/lib/admin/format";
import {
  EXPERIENCE_LEVELS,
  GENDER_LABELS,
  LEVEL_LABELS,
  USER_GENDERS,
} from "@/lib/admin/constants";
import type { ProgramRow } from "@/lib/admin/types";

const GENDER_OPTIONS = [
  { label: "— None —", value: "" },
  ...USER_GENDERS.map((g) => ({ label: GENDER_LABELS[g], value: g })),
];

const LEVEL_OPTIONS = [
  { label: "— None —", value: "" },
  ...EXPERIENCE_LEVELS.map((l) => ({ label: LEVEL_LABELS[l], value: l })),
];

const KIND_OPTIONS = [
  { label: "Standard (Cycle 1)", value: "standard" },
  { label: "Bro Split (Cycle 2)", value: "bro_split" },
];

export function ProgramFormDialog({
  program,
  trigger,
  defaultOpen = false,
}: {
  program: ProgramRow | null;
  trigger?: ReactElement;
  defaultOpen?: boolean;
}) {
  const isEditing = Boolean(program);
  const [open, setOpen] = useState(defaultOpen);
  const { handleSubmit, pending } = useFormAction(saveProgram, {
    success: isEditing ? "Program updated" : "Program created",
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEditing ? "Edit program" : "Create program"}
          </DialogTitle>
          <DialogDescription>
            Manage the program shell before opening the detailed builder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <input type="hidden" name="id" value={program?.id ?? ""} />

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="English title"
              name="title_en"
              required
              defaultValue={translation(program?.title_translations, "en", program?.title)}
            />
            <FormField
              label="Norwegian title"
              name="title_nb"
              required
              defaultValue={translation(program?.title_translations, "nb", program?.title)}
            />
            <FormField label="Internal title" name="title" defaultValue={program?.title} />
            <FormField
              label="Duration weeks"
              name="duration_weeks"
              type="number"
              defaultValue={program?.duration_weeks ?? 12}
            />
            <FormField
              label="Days per week"
              name="days_per_week"
              type="number"
              defaultValue={program?.days_per_week ?? 6}
            />
            <OptionSelectField
              label="Gender"
              name="gender"
              defaultValue={program?.gender ?? ""}
              options={GENDER_OPTIONS}
            />
            <OptionSelectField
              label="Experience level"
              name="level"
              defaultValue={program?.level ?? ""}
              options={LEVEL_OPTIONS}
            />
            <OptionSelectField
              label="Program kind"
              name="kind"
              defaultValue={program?.kind ?? "standard"}
              options={KIND_OPTIONS}
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={pending}>
              {isEditing ? "Save changes" : "Create program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
