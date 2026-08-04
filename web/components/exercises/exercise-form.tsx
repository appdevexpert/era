"use client";

import { useState, type ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FormField, SelectField, TextAreaField } from "@/components/admin/form-field";
import { ExerciseVideoField } from "@/components/exercises/exercise-video-field";
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
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // `defaultOpen` marks the instance the server rendered from `?edit=<id>`.
  // That param has to go when the dialog closes, or the URL keeps claiming a
  // row is open: a reload would reopen it, and clicking the same row again
  // would navigate to the URL we're already on — no navigation, no remount,
  // nothing happens.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next || !defaultOpen) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const { handleSubmit, pending } = useFormAction(saveExercise, {
    success: isEditing ? "Exercise updated" : "Exercise created",
    onSuccess: () => handleOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {/* "Default rest seconds" used to sit here, editing
                exercise_library.default_rest_seconds. The mobile app never
                reads that column — getLibraryExercises() doesn't select it, and
                the rest a user sees resolves as
                  planned_exercise_sets.rest_seconds
                  -> program_day_exercises.default_rest_seconds
                  -> 60
                so the field looked like a program-wide rest control and did
                nothing. Rest is edited per assignment in the program builder.
                The column is left in place (still written by nothing) rather
                than dropped, so existing values survive if it's ever wired up. */}
            <FormField
              label="Primary muscles"
              name="primary_muscles"
              placeholder="chest, shoulders, triceps"
              defaultValue={exercise?.primary_muscles?.join(", ")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField
              label="English description"
              name="description_en"
              placeholder="How to perform the movement, cues, common mistakes."
              defaultValue={translation(exercise?.description_translations, "en")}
            />
            <TextAreaField
              label="Norwegian description"
              name="description_nb"
              placeholder="Samme beskrivelse på norsk."
              defaultValue={translation(exercise?.description_translations, "nb")}
            />
          </div>

          <div className="grid gap-4 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-medium">Demo clips</h3>
              <p className="text-sm text-muted-foreground">
                MP4 only, max 10 MB. Aim for a 3-5 second loop with no audio
                track — the app streams these mid-workout. The male clip is used
                whenever a user&apos;s clip is missing.
              </p>
            </div>

            {isEditing && exercise ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <ExerciseVideoField
                  gender="male"
                  label="Male demo"
                  slug={exercise.slug}
                  savedPath={exercise.demo_video_male_path}
                />
                <ExerciseVideoField
                  gender="female"
                  label="Female demo"
                  slug={exercise.slug}
                  savedPath={exercise.demo_video_female_path}
                />
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Create the exercise first, then reopen it to upload clips. The
                storage folder is named after the exercise slug, which only
                exists once the row is saved.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="demo_video_loop"
                name="demo_video_loop"
                defaultChecked={exercise?.demo_video_loop ?? true}
              />
              <Label htmlFor="demo_video_loop">
                Loop the clip continuously
              </Label>
            </div>
            <p className="-mt-2 text-sm text-muted-foreground">
              Off = the clip plays once, then the app shows a tap-to-play button.
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Checkbox
              id="is_active"
              name="is_active"
              defaultChecked={exercise?.is_active ?? true}
            />
            <Label htmlFor="is_active">Active exercise</Label>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={pending}>
              {isEditing ? "Save changes" : "Create exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
