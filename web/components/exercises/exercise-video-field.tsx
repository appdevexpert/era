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

function publicUrl(path: string) {
  return createClient().storage.from(EXERCISE_MEDIA_BUCKET).getPublicUrl(path)
    .data.publicUrl;
}

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Upload control for one gender's demo clip.
 *
 * The file goes browser → Supabase Storage directly, using a signed upload URL
 * minted by a Server Action. It never passes through the Next server, which
 * caps Server Action bodies at 1 MB. The resulting storage path rides along in
 * a hidden input so the surrounding form saves it with everything else.
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

  const handleFile = async (file: File) => {
    setError(null);

    if (file.type !== "video/mp4") {
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

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>

      {/* The value the form actually submits. Empty string = clip removed. */}
      <input type="hidden" name={`demo_video_${gender}_path`} value={path ?? ""} />

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
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          No clip uploaded
        </div>
      )}

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
          onClick={() => inputRef.current?.click()}
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
