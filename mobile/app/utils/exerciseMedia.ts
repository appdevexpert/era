import { ENV } from "@/app/config/env";
import type { ExerciseLibraryRow } from "@/app/types/workout";

/** Public storage bucket holding the per-exercise demo clips. */
const BUCKET = "exercise-media";

/**
 * Builds the public object URL for a storage path.
 *
 * Hand-built rather than going through `supabase.storage.getPublicUrl` so this
 * stays a pure function the mappers can call — no client import, no singleton.
 * The bucket is public, so this URL needs no token and never expires.
 */
const publicUrl = (path: string) =>
  `${ENV.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

/**
 * Picks which demo clip this user should see.
 *
 * Rules (confirmed with Tejasvi 2026-07-29):
 *   - female users get the female clip, everyone else gets the male clip
 *   - gender missing (shouldn't happen — onboarding requires it, but the
 *     column is nullable) falls back to male
 *   - if the matching gender has no clip, show the other gender's rather than
 *     an empty tile: a demo of the movement beats no demo
 *   - neither uploaded → null, and the tile renders nothing at all
 */
export const resolveExerciseDemoVideo = (
  library: Pick<
    ExerciseLibraryRow,
    "demo_video_male_path" | "demo_video_female_path"
  > | undefined,
  gender: string | null | undefined,
): string | null => {
  const male = library?.demo_video_male_path ?? null;
  const female = library?.demo_video_female_path ?? null;

  const preferred = gender?.toLowerCase() === "female" ? female : male;
  const fallback = gender?.toLowerCase() === "female" ? male : female;
  const path = preferred ?? fallback;

  return path ? publicUrl(path) : null;
};
