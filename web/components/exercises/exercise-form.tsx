"use client";

import type { ReactElement } from "react";

import { FormField, SelectField } from "@/components/admin/form-field";
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
import { saveExercise } from "@/lib/admin/actions";
import { useFormAction } from "@/lib/admin/use-form-action";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_MODALITIES,
} from "@/lib/admin/constants";
import { translation } from "@/lib/admin/format";
import type { ExerciseRow } from "@/lib/admin/types";

export function ExerciseFormDialog({
  exercise,
  trigger,
  defaultOpen = false,
}: {
  exercise: ExerciseRow | null;
  trigger?: ReactElement;
  defaultOpen?: boolean;
}) {
  const isEditing = Boolean(exercise);
  const { handleSubmit, pending } = useFormAction(saveExercise, {
    success: isEditing ? "Exercise updated" : "Exercise created",
  });

  return (
    <Dialog defaultOpen={defaultOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEditing ? "Edit exercise" : "Add exercise"}
          </DialogTitle>
          <DialogDescription>
            Manage the reusable exercise data used by workout days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <input type="hidden" name="id" value={exercise?.id ?? ""} />

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="English name"
              name="name_en"
              required
              defaultValue={translation(exercise?.name_translations, "en", exercise?.name)}
            />
            <FormField
              label="Norwegian name"
              name="name_nb"
              required
              defaultValue={translation(exercise?.name_translations, "nb", exercise?.name)}
            />
            <SelectField
              label="Modality"
              name="modality"
              options={EXERCISE_MODALITIES}
              defaultValue={exercise?.modality}
            />
            <SelectField
              label="Category"
              name="category"
              options={EXERCISE_CATEGORIES}
              defaultValue={exercise?.category}
            />
            <FormField
              label="Default rest seconds"
              name="default_rest_seconds"
              type="number"
              defaultValue={exercise?.default_rest_seconds}
            />
            <FormField
              label="Primary muscles"
              name="primary_muscles"
              placeholder="chest, shoulders, triceps"
              defaultValue={exercise?.primary_muscles?.join(", ")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              name="is_active"
              defaultChecked={exercise?.is_active ?? true}
            />
            <Label htmlFor="is_active">Active exercise</Label>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEditing ? "Save changes" : "Create exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
