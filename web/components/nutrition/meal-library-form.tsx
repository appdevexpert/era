"use client";

import type { ReactElement } from "react";

import { FormField, SelectField, TextAreaField } from "@/components/admin/form-field";
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
import { saveMealLibraryItem } from "@/lib/admin/actions";
import { MEAL_CATEGORIES } from "@/lib/admin/constants";
import { translation } from "@/lib/admin/format";
import type { MealLibraryRow } from "@/lib/admin/types";
import { useFormAction } from "@/lib/admin/use-form-action";

export function MealLibraryFormDialog({
  item,
  trigger,
  defaultOpen = false,
}: {
  item: MealLibraryRow | null;
  trigger?: ReactElement;
  defaultOpen?: boolean;
}) {
  const isEditing = Boolean(item);
  const { handleSubmit, pending } = useFormAction(saveMealLibraryItem, {
    success: isEditing ? "Meal updated" : "Meal created",
  });

  return (
    <Dialog defaultOpen={defaultOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {isEditing ? "Edit meal" : "Add meal"}
          </DialogTitle>
          <DialogDescription>
            The category drives the icon shown in the mobile app and the
            section the meal appears under inside a program day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <input type="hidden" name="id" value={item?.id ?? ""} />

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="English name"
              name="name_en"
              required
              defaultValue={translation(item?.name_translations, "en")}
            />
            <FormField
              label="Norwegian name"
              name="name_nb"
              required
              defaultValue={translation(item?.name_translations, "nb")}
            />
            <SelectField
              label="Category"
              name="category"
              options={MEAL_CATEGORIES}
              defaultValue={item?.category}
            />
            <FormField
              label="Slug"
              name="slug"
              placeholder="auto-generated from English name"
              defaultValue={item?.slug}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <FormField
              label="Kcal"
              name="kcal"
              type="number"
              required
              defaultValue={item?.kcal ?? 0}
            />
            <FormField
              label="Protein (g)"
              name="protein_g"
              type="number"
              defaultValue={item?.protein_g ?? 0}
            />
            <FormField
              label="Carbs (g)"
              name="carbs_g"
              type="number"
              defaultValue={item?.carbs_g ?? 0}
            />
            <FormField
              label="Fats (g)"
              name="fats_g"
              type="number"
              defaultValue={item?.fats_g ?? 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField
              label="Description (English)"
              name="note_en"
              placeholder="Optional. Short note shown on the meal card."
              defaultValue={translation(item?.note_translations, "en")}
            />
            <TextAreaField
              label="Description (Norwegian)"
              name="note_nb"
              placeholder="Valgfritt. Vises i mobilappen."
              defaultValue={translation(item?.note_translations, "nb")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              name="is_active"
              defaultChecked={item?.is_active ?? true}
            />
            <Label htmlFor="is_active">Active meal</Label>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create meal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
