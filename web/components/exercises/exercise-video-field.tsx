"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createExerciseMediaUploadUrls,
  removeExerciseVideoObject,
} from "@/lib/admin/actions";
import {
  EXERCISE_MEDIA_BUCKET,
  EXERCISE_THUMBS_BUCKET,
  EXERCISE_VIDEO_MAX_BYTES,
  MEDIA_CACHE_CONTROL,
  type ExerciseMediaGender,
} from "@/lib/admin/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function publicUrl(path: string) {
  return createClient().storage.from(EXERCISE_MEDIA_BUCKET).getPublicUrl(path)
    .data.publicUrl;
}

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Dropped files sometimes arrive with an empty `type` (the OS didn't hand the
// browser a MIME type), so fall back to the extension before rejecting.
function isMp4(file: File) {
  return file.type === "video/mp4" || (!file.type && /\.mp4$/i.test(file.name));
}

/** Rejects rather than hanging forever on a file the browser can't decode. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), ms),
    ),
  ]);
}

/**
 * Grabs a single frame to use as the clip's poster.
 *
 * Mobile shows this instead of streaming the clip when the exercise info sheet
 * opens — ~15 KB rather than ~600 KB, and the video is only fetched if the user
 * actually taps play. Without a poster the card falls back to its empty
 * surface, which works but tells the user nothing about the movement.
 *
 * Deliberately returns null instead of throwing: a missing poster is a cosmetic
 * downgrade, and it must never be the reason an admin's upload fails.
 */
async function capturePoster(file: File): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("could not decode"));
      }),
      10_000,
    );

    // Frame zero is often a black lead-in, so seek a little way in — but never
    // past the end of a 3-second loop.
    const seekTo =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, video.duration / 3)
        : 0;

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("could not seek"));
        video.currentTime = seekTo;
      }),
      10_000,
    );

    if (!video.videoWidth || !video.videoHeight) return null;

    // 740px matches the card's rendered width on a 3x phone. Never upscale.
    const scale = Math.min(1, 740 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.72),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Upload control for one gender's demo clip.
 *
 * The file goes browser → Supabase Storage directly, using a signed upload URL
 * minted by a Server Action. It never passes through the Next server, which
 * caps Server Action bodies at 1 MB. The resulting storage path rides along in
 * a hidden input so the surrounding form saves it with everything else.
 *
 * Files arrive either from the hidden file input or from a drag-and-drop onto
 * the preview area — both funnel into handleFile.
 */
export function ExerciseVideoField({
  gender,
  label,
  slug,
  savedPath,
  savedPosterPath,
}: {
  gender: ExerciseMediaGender;
  label: string;
  /** Current slug (or name) — decides the storage folder. */
  slug: string;
  /** Path already stored on the row, or null when nothing is uploaded. */
  savedPath: string | null;
  /** Poster path already stored on the row. Null for clips predating posters. */
  savedPosterPath: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(savedPath);
  const [posterPath, setPosterPath] = useState<string | null>(savedPosterPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // dragleave fires every time the cursor crosses into a child element, so a
  // plain boolean flickers. Counting enter/leave pairs tracks the real state.
  const dragDepth = useRef(0);

  const handleFile = async (file: File) => {
    setError(null);

    if (!isMp4(file)) {
      setError("Only MP4 files are supported.");
      return;
    }
    if (file.size > EXERCISE_VIDEO_MAX_BYTES) {
      setError(
        `That file is ${megabytes(file.size)}. Keep clips under ${megabytes(
          EXERCISE_VIDEO_MAX_BYTES,
        )} — a 3-5 second loop with no audio should be well under 1 MB.`,
      );
      return;
    }

    setBusy(true);
    try {
      const {
        path: uploadPath,
        token,
        posterPath: posterUploadPath,
        posterToken,
      } = await createExerciseMediaUploadUrls(slug, gender);

      const client = createClient();

      const { error: uploadError } = await client
        .storage.from(EXERCISE_MEDIA_BUCKET)
        .uploadToSignedUrl(uploadPath, token, file, {
          contentType: "video/mp4",
          // These objects are immutable — the filename carries a timestamp and
          // a replacement always writes a new path — so cache them for a year
          // rather than letting Storage's 3600 default re-download every clip
          // hourly for every user.
          cacheControl: MEDIA_CACHE_CONTROL,
        });

      if (uploadError) throw new Error(uploadError.message);

      // After the clip is safely up: a failed poster leaves the clip usable,
      // but a clip that failed while we were busy making a thumbnail would not.
      const poster = await capturePoster(file);
      let uploadedPosterPath: string | null = null;

      if (poster) {
        const { error: posterError } = await client
          .storage.from(EXERCISE_THUMBS_BUCKET)
          .uploadToSignedUrl(posterUploadPath, posterToken, poster, {
            contentType: "image/jpeg",
            cacheControl: MEDIA_CACHE_CONTROL,
          });
        if (!posterError) uploadedPosterPath = posterUploadPath;
      }

      // Replacing an upload that was never saved: nothing will ever reference
      // the previous file, so drop it now rather than orphaning it. The saved
      // path is left alone — saveExercise deletes that one after it commits.
      if (path && path !== savedPath) {
        await removeExerciseVideoObject(
          path,
          posterPath !== savedPosterPath ? posterPath : null,
        ).catch(() => {});
      }

      setPath(uploadPath);
      setPosterPath(uploadedPosterPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    if (path && path !== savedPath) {
      await removeExerciseVideoObject(
        path,
        posterPath !== savedPosterPath ? posterPath : null,
      ).catch(() => {});
    }
    setPath(null);
    setPosterPath(null);
    setError(null);
  };

  // Text selections and dragged page elements also fire these events; only
  // react when the payload is actually a file.
  const carriesFiles = (event: React.DragEvent) =>
    event.dataTransfer.types.includes("Files");

  const endDrag = () => {
    dragDepth.current = 0;
    setDragging(false);
  };

  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      if (busy || !carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: React.DragEvent) => {
      if (busy || !carriesFiles(event)) return;
      // Without this the browser handles the drop itself and navigates away
      // from the form.
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) endDrag();
    },
    onDrop: (event: React.DragEvent) => {
      if (busy || !carriesFiles(event)) return;
      event.preventDefault();
      endDrag();
      const file = event.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
  };

  const browse = () => inputRef.current?.click();

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>

      {/* The values the form actually submits. Empty string = clip removed. */}
      <input type="hidden" name={`demo_video_${gender}_path`} value={path ?? ""} />
      <input
        type="hidden"
        name={`demo_video_${gender}_poster_path`}
        value={posterPath ?? ""}
      />

      <div className="relative" {...dropHandlers}>
        {path ? (
          <video
            key={path}
            src={publicUrl(path)}
            controls
            muted
            playsInline
            preload="metadata"
            className="w-full rounded-lg border border-border bg-black"
          />
        ) : (
          <button
            type="button"
            onClick={browse}
            disabled={busy}
            className={cn(
              "flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/40",
            )}
          >
            {busy ? (
              <span>Uploading…</span>
            ) : dragging ? (
              <span className="font-medium">Drop the MP4 to upload</span>
            ) : (
              <>
                <span>Drag &amp; drop an MP4 here</span>
                <span className="text-xs">or click to browse</span>
              </>
            )}
          </button>
        )}

        {/* Overlay for the replace-by-drop case, where the video already fills
            the box. pointer-events-none keeps drag events on the container. */}
        {path && dragging ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/80 text-sm font-medium text-primary">
            Drop to replace the clip
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={browse}
        >
          {path ? "Replace clip" : "Upload clip"}
        </Button>
        {path ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => void clear()}>
            Remove
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
