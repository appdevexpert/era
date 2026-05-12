"use client";

import type { ReactElement } from "react";

import { FormField, SelectField, TextAreaField } from "@/components/admin/form-field";
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
import { PROGRAM_STATUSES } from "@/lib/admin/constants";
import { translation } from "@/lib/admin/format";
import type { ProgramRow } from "@/lib/admin/types";

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

  return (
    <Dialog defaultOpen={defaultOpen}>
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

        <form action={saveProgram} className="grid gap-5">
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
            <SelectField
              label="Status"
              name="status"
              options={PROGRAM_STATUSES}
              defaultValue={program?.status}
            />
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
            <FormField
              label="Goal EN"
              name="program_goal_en"
              defaultValue={translation(program?.program_goal_translations, "en", program?.program_goal)}
            />
            <FormField
              label="Goal NO"
              name="program_goal_nb"
              defaultValue={translation(program?.program_goal_translations, "nb", program?.program_goal)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField
              label="Subtitle EN"
              name="subtitle_en"
              defaultValue={translation(program?.subtitle_translations, "en", program?.subtitle)}
            />
            <TextAreaField
              label="Subtitle NO"
              name="subtitle_nb"
              defaultValue={translation(program?.subtitle_translations, "nb", program?.subtitle)}
            />
            <TextAreaField
              label="Description EN"
              name="description_en"
              defaultValue={translation(program?.description_translations, "en", program?.description)}
            />
            <TextAreaField
              label="Description NO"
              name="description_nb"
              defaultValue={translation(program?.description_translations, "nb", program?.description)}
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit">{isEditing ? "Save changes" : "Create program"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
