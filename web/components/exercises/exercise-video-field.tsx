"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createExerciseVideoUploadUrl,
  removeExerciseVideoObject,
} from "@/lib/admin/actions";
import {
  EXERCISE_MEDIA_BUCKET,
  EXERCISE_VIDEO_MAX_BYTES,
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
}: {
  gender: ExerciseMediaGender;
  label: string;
  /** Current slug (or name) — decides the storage folder. */
  slug: string;
  /** Path already stored on the row, or null when nothing is uploaded. */
  savedPath: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(savedPath);
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
      const { path: uploadPath, token } = await createExerciseVideoUploadUrl(
        slug,
        gender,
      );

      const { error: uploadError } = await createClient()
        .storage.from(EXERCISE_MEDIA_BUCKET)
        .uploadToSignedUrl(uploadPath, token, file, { contentType: "video/mp4" });

      if (uploadError) throw new Error(uploadError.message);

      // Replacing an upload that was never saved: nothing will ever reference
      // the previous file, so drop it now rather than orphaning it. The saved
      // path is left alone — saveExercise deletes that one after it commits.
      if (path && path !== savedPath) {
        await removeExerciseVideoObject(path).catch(() => {});
      }

      setPath(uploadPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    if (path && path !== savedPath) {
      await removeExerciseVideoObject(path).catch(() => {});
    }
    setPath(null);
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

      {/* The value the form actually submits. Empty string = clip removed. */}
      <input type="hidden" name={`demo_video_${gender}_path`} value={path ?? ""} />

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
