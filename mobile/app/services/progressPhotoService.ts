/**
 * Progress photo upload + read.
 *
 * Flow:
 *   1. Compress + resize the local image via expo-image-manipulator
 *      (Supabase storage is billed per byte; we cap the longest edge at
 *      1080px and re-encode as JPEG at quality 0.7).
 *   2. Upload to the private `progress-photos` bucket under `${userId}/`
 *      so RLS can match on the path prefix.
 *   3. Call `record_progress_photo` RPC — it inserts session_media and
 *      conditionally awards 25 points (only first photo per server-day).
 *
 * Reads use `get_my_progress_photos` + per-row signed URLs (private bucket).
 */

import { supabase } from "@/app/utils/auth";
import * as ImageManipulator from "expo-image-manipulator";

const BUCKET = "progress-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — plenty for a screen visit.
const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.7;

export interface UploadProgressPhotoArgs {
  /** Local URI from expo-image-picker (file://...). */
  localUri: string;
  /** Optional — set when the upload is triggered from Session Complete. */
  sessionId?: string | null;
}

export interface UploadProgressPhotoResult {
  mediaId: string;
  pointsAwarded: number;
  totalPoints: number;
  storagePath: string;
  /** Short-lived signed URL so the caller can render the new photo immediately. */
  signedUrl: string | null;
}

export interface ProgressPhotoRow {
  id: string;
  sessionId: string | null;
  storagePath: string;
  pointsAwarded: number;
  createdAt: string;
  signedUrl: string | null;
}

const throwIfError = (error: { message?: string } | null, fallback: string) => {
  if (error) throw new Error(error.message ?? fallback);
};

/** Compress + resize. Returns the path of the manipulated temp file. */
async function compressLocalImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/** Read the file as an ArrayBuffer for the storage SDK. */
async function fileUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to read local image (${response.status})`);
  }
  return await response.arrayBuffer();
}

async function createSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.warn("[progressPhoto] signed URL failed", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function uploadProgressPhoto(
  args: UploadProgressPhotoArgs,
): Promise<UploadProgressPhotoResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const compressedUri = await compressLocalImage(args.localUri);
  const body = await fileUriToArrayBuffer(compressedUri);

  // Filename: `${userId}/${timestamp}-${random}.jpg`. The folder prefix is
  // load-bearing — RLS uses storage.foldername(name)[1] to match auth.uid().
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storagePath = `${user.id}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, body, {
      contentType: "image/jpeg",
      upsert: false,
    });
  throwIfError(uploadError, "Failed to upload progress photo");

  const { data, error } = await supabase.rpc("record_progress_photo", {
    p_storage_path: storagePath,
    p_session_id: args.sessionId ?? null,
  });
  throwIfError(error, "Failed to record progress photo");

  const row = (data?.[0] ?? null) as {
    media_id: string;
    points_awarded: number;
    total_points: number;
  } | null;

  if (!row) throw new Error("record_progress_photo returned no row");

  const signedUrl = await createSignedUrl(storagePath);

  return {
    mediaId: row.media_id,
    pointsAwarded: row.points_awarded,
    totalPoints: row.total_points,
    storagePath,
    signedUrl,
  };
}

export interface DeleteProgressPhotoArgs {
  mediaId: string;
  storagePath: string;
}

export async function deleteProgressPhoto(
  args: DeleteProgressPhotoArgs,
): Promise<void> {
  // Remove the storage object first (best-effort — a stranded DB row is worse
  // than a stranded file, since the row is what the UI reads).
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([args.storagePath]);
  if (storageError) {
    console.warn("[progressPhoto] storage delete failed", storageError.message);
  }

  // Delete the DB row — RLS (session_media_own_all) scopes to auth.uid().
  const { error } = await supabase
    .from("session_media")
    .delete()
    .eq("id", args.mediaId);
  throwIfError(error, "Failed to delete progress photo");
}

export async function fetchMyProgressPhotos(
  limit = 50,
): Promise<ProgressPhotoRow[]> {
  const { data, error } = await supabase.rpc("get_my_progress_photos", {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as {
    id: string;
    session_id: string | null;
    storage_path: string;
    points_awarded: number;
    created_at: string;
  }[];

  // Sign URLs in parallel — private bucket, so the raw storage_path isn't
  // renderable on its own.
  const signedUrls = await Promise.all(
    rows.map((r) => createSignedUrl(r.storage_path)),
  );

  return rows.map((r, i) => ({
    id: r.id,
    sessionId: r.session_id,
    storagePath: r.storage_path,
    pointsAwarded: r.points_awarded,
    createdAt: r.created_at,
    signedUrl: signedUrls[i],
  }));
}
