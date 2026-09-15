import { ENV } from "@/app/config/env";
import type { ExerciseLibraryRow } from "@/app/types/workout";

/** Public storage bucket holding the per-exercise demo clips. */
const VIDEO_BUCKET = "exercise-media";

/** Public storage bucket holding one poster frame per clip. */
const POSTER_BUCKET = "exercise-thumbs";

/**
 * Builds the public object URL for a storage path.
 *
 * Hand-built rather than going through `supabase.storage.getPublicUrl` so this
 * stays a pure function the mappers can call — no client import, no singleton.
 * The buckets are public, so this URL needs no token and never expires.
 */
const publicUrl = (bucket: string, path: string) =>
  `${ENV.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

export type ExerciseDemoMedia = {
  /** Public URL of the clip, or null when neither gender has one. */
  videoUrl: string | null;
  /**
   * Public URL of that clip's poster frame, or null. Null is expected for
   * clips uploaded before posters existed — the card falls back to its empty
   * surface, which is a cosmetic downgrade, not a broken state.
   */
  posterUrl: string | null;
};

/**
 * Picks which demo clip this user should see, and the poster that goes with it.
 *
 * Rules (confirmed with Tejasvi 2026-07-29):
 *   - female users get the female clip, everyone else gets the male clip
 *   - gender missing (shouldn't happen — onboarding requires it, but the
 *     column is nullable) falls back to male
 *   - if the matching gender has no clip, show the other gender's rather than
 *     an empty tile: a demo of the movement beats no demo
 *   - neither uploaded → null, and the tile renders nothing at all
 *
 * Video and poster are resolved together, in one pass, on purpose. Picking them
 * separately would let the cross-gender fallback disagree — a female poster
 * over a male clip — and the poster is the still frame the user sees before
 * tapping play, so the mismatch would be obvious.
 */
export const resolveExerciseDemoMedia = (
  library:
    | Pick<
        ExerciseLibraryRow,
        | "demo_video_male_path"
        | "demo_video_female_path"
        | "demo_video_male_poster_path"
        | "demo_video_female_poster_path"
      >
    | undefined,
  gender: string | null | undefined,
): ExerciseDemoMedia => {
  const wantsFemale = gender?.toLowerCase() === "female";

  const preferred = wantsFemale
    ? { video: library?.demo_video_female_path, poster: library?.demo_video_female_poster_path }
    : { video: library?.demo_video_male_path, poster: library?.demo_video_male_poster_path };

  const fallback = wantsFemale
    ? { video: library?.demo_video_male_path, poster: library?.demo_video_male_poster_path }
    : { video: library?.demo_video_female_path, poster: library?.demo_video_female_poster_path };

  // Keyed off the video, not the poster: a clip with no poster still plays,
  // but a poster with no clip is nothing at all.
  const chosen = preferred.video ? preferred : fallback;

  return {
    videoUrl: chosen.video ? publicUrl(VIDEO_BUCKET, chosen.video) : null,
    posterUrl:
      chosen.video && chosen.poster ? publicUrl(POSTER_BUCKET, chosen.poster) : null,
  };
};
