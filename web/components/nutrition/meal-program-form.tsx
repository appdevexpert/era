"use client";

import type { ReactElement } from "react";

import { FormField, TextAreaField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { saveMealProgram } from "@/lib/admin/actions";
import { translation } from "@/lib/admin/format";
import type { MealProgramRow } from "@/lib/admin/types";
import { useFormAction } from "@/lib/admin/use-form-action";

export function MealProgramFormDialog({
  program,
  trigger,
  defaultOpen = false,
}: {
  program: MealProgramRow | null;
  trigger?: ReactElement;
  defaultOpen?: boolean;
}) {
  const isEditing = Boolean(program);
  const { handleSubmit, pending } = useFormAction(saveMealProgram, {
    success: isEditing ? "Meal program updated" : "Meal program created",
  });

  return (
    <Dialog defaultOpen={defaultOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEditing ? "Edit meal program" : "Create meal program"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edit the program title and description. Use the builder to author per-phase meals."
              : "On create, three phases (Hypertrophy / Strength / Peak) and 21 weekday slots are scaffolded automatically. You'll fill in meals from the builder."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <input type="hidden" name="id" value={program?.id ?? ""} />

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="English title"
              name="title_en"
              required
              defaultValue={translation(program?.title_translations, "en")}
            />
            <FormField
              label="Norwegian title"
              name="title_nb"
              required
              defaultValue={translation(program?.title_translations, "nb")}
            />
            <FormField
              label="Duration (days)"
              name="duration_days"
              type="number"
              defaultValue={program?.duration_days ?? 84}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField
              label="Description (English)"
              name="description_en"
              placeholder="Optional summary shown in admin views."
              defaultValue={translation(program?.description_translations, "en")}
            />
            <TextAreaField
              label="Description (Norwegian)"
              name="description_nb"
              placeholder="Valgfritt sammendrag."
              defaultValue={translation(program?.description_translations, "nb")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              name="is_active"
              defaultChecked={program?.is_active ?? true}
            />
            <Label htmlFor="is_active">Active program</Label>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
