#!/usr/bin/env node
/**
 * Re-encode every exercise demo clip and re-upload it cheaply.
 *
 * Why this exists
 * ---------------
 * The Free plan allows 5 GB of cached egress per cycle. The bucket held 130
 * raw clips totalling ~278 MB (4-11 MB each), served with `max-age=3600` or
 * `no-cache`, so a single user browsing the library could pull tens of MB and
 * pull it again an hour later. Compression plus a one-year cache header is the
 * whole fix; nothing about the app's data model has to change.
 *
 * What it does per object
 * -----------------------
 *   download -> ffmpeg (H.264 / <=720p / CRF 28 / no audio / faststart)
 *            -> ffmpeg poster frame (JPEG, <=740px wide)
 *            -> upload both with `cache-control: max-age=31536000`
 *            -> point the exercise_library row at the new paths
 *
 * Why a NEW path instead of overwriting
 * -------------------------------------
 * A one-year cache header makes a path effectively immutable: any client that
 * has cached it will not re-check for a year, and Supabase purging its own edge
 * does nothing about the copy in iOS's URLCache. Overwriting in place would
 * mean a bad encode is unfixable for twelve months. So each clip lands on a
 * fresh timestamped path and the DB row is updated to match — which is safe
 * because nothing hardcodes these URLs: `mobile/app/utils/exerciseMedia.ts`
 * builds them from the stored path at render time.
 *
 * Old objects are deliberately NOT deleted. Mobile persists raw rows in Redux,
 * so an install that hasn't refreshed its bootstrap still points at the old
 * path. Let those age out, then run the cleanup this script prints at the end.
 *
 * Usage
 * -----
 *   cd web
 *   node --env-file=.env.local scripts/recompress-exercise-media.mjs --dry-run
 *   node --env-file=.env.local scripts/recompress-exercise-media.mjs
 *
 * Flags
 *   --dry-run        download + encode + report, but no upload and no DB write
 *   --limit N        only process the first N eligible objects
 *   --concurrency N  parallel encodes (default 3)
 *   --reset          discard saved progress and start over
 *   --include-orphans  also re-encode objects no exercise_library row references.
 *                      Superseded originals from an earlier run stay skipped —
 *                      they are already replaced, so redoing them is waste.
 */

import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(HERE, ".recompress-state.json");

const VIDEO_BUCKET = "exercise-media";
const POSTER_BUCKET = "exercise-thumbs";

/** One year. Matches MEDIA_CACHE_CONTROL in lib/admin/constants.ts. */
const CACHE_CONTROL = "31536000";

/* ─── args ─── */

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const flagValue = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const raw = argv[i + 1];
  if (raw === undefined || raw.startsWith("--")) {
    fail(`--${name} needs a value.`);
  }
  return raw;
};

const DRY_RUN = hasFlag("dry-run");
const RESET = hasFlag("reset");
const INCLUDE_ORPHANS = hasFlag("include-orphans");
const LIMIT = Number(flagValue("limit", "0")) || Infinity;
const CONCURRENCY = Math.max(1, Number(flagValue("concurrency", "3")) || 3);

/* ─── tiny helpers ─── */

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

/** Runs a command, resolving with stdout. Rejects with stderr on non-zero. */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(new Error(`${command} exited ${code}\n${stderr.trim().slice(-800)}`)),
    );
  });
}

async function requireBinary(name) {
  try {
    await run("which", [name]);
  } catch {
    fail(`${name} is not on PATH. Install it with \`brew install ffmpeg\`.`);
  }
}

/* ─── state (resumability) ─── */

async function loadState() {
  if (RESET) return null;
  try {
    const parsed = JSON.parse(await readFile(STATE_FILE, "utf8"));
    // A truncated file can still parse into something useless; insist on the
    // shape rather than silently resuming with no progress.
    if (!parsed || typeof parsed.stamp !== "number" || typeof parsed.done !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Written temp-then-rename because this file is the resumability guarantee, and
 * a plain overwrite is not atomic: a crash partway through truncates it and
 * takes every completed entry with it. (Observed — a SIGPIPE mid-write left a
 * 0-byte file and lost a full 124-object run's progress.) `rename` on the same
 * filesystem is atomic, so a reader sees either the old file or the new one.
 */
async function saveState(state) {
  if (DRY_RUN) return;
  const temp = `${STATE_FILE}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temp, STATE_FILE);
}

/* ─── storage ─── */

/**
 * `list()` is per-prefix and paginated, and returns folders as entries whose
 * `id` is null. Walk it into a flat array of real objects.
 */
async function listAllObjects(supabase, bucket, prefix = "") {
  const found = [];
  const PAGE = 100;

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`Listing "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        found.push(...(await listAllObjects(supabase, bucket, full)));
      } else {
        found.push({
          path: full,
          size: entry.metadata?.size ?? 0,
          cacheControl: entry.metadata?.cacheControl ?? "(none)",
          mimetype: entry.metadata?.mimetype ?? "(none)",
        });
      }
    }

    if (data.length < PAGE) break;
  }

  return found;
}

/* ─── path derivation ─── */

/**
 * Derives the new object path. The stamp is fixed for the whole migration and
 * persisted in the state file, so a resumed or retried run recomputes exactly
 * the same target and simply overwrites its own partial upload rather than
 * stranding another orphan.
 */
function newPathFor(oldPath, stamp) {
  const dir = path.posix.dirname(oldPath);
  const base = path.posix.basename(oldPath, path.posix.extname(oldPath));
  // squats/male-1785396206430.mp4 -> squats/male-<stamp>.mp4
  const gendered = base.match(/^(male|female)-\d+$/);
  const stem = gendered ? `${gendered[1]}-${stamp}` : `${base}-${stamp}`;
  return {
    video: dir === "." ? `${stem}.mp4` : `${dir}/${stem}.mp4`,
    poster: dir === "." ? `${stem}.jpg` : `${dir}/${stem}.jpg`,
  };
}

/* ─── ffmpeg ─── */

async function probeDuration(file) {
  try {
    const out = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ]);
    const seconds = Number.parseFloat(out);
    return Number.isFinite(seconds) ? seconds : 0;
  } catch {
    return 0;
  }
}

async function encodeVideo(input, output) {
  await run("ffmpeg", [
    "-nostdin", "-y",
    "-i", input,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    // Fit inside 1280x720 without ever upscaling a smaller master, then round
    // to even dimensions — yuv420p requires them and odd values abort the encode.
    "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    // Moves the moov atom to the front so playback starts before the whole
    // file has arrived. Without it a streamed clip stalls until fully buffered.
    "-movflags", "+faststart",
    // These are silent demos; the audio track is pure waste.
    "-an",
    output,
  ]);
}

async function extractPoster(input, output, duration) {
  // A frame at 0s is often a black lead-in. Seek a little way in, but never
  // past the end of a very short loop.
  const seek = duration > 0 ? Math.min(1, duration / 3) : 0;
  await run("ffmpeg", [
    "-nostdin", "-y",
    "-ss", seek.toFixed(3),
    "-i", input,
    "-frames:v", "1",
    "-q:v", "6",
    "-vf", "scale='min(740,iw)':-2",
    output,
  ]);
}

/* ─── per-object work ─── */

async function processObject({ supabase, object, stamp, rowsByPath, workDir, index, total }) {
  const log = [];
  const say = (line) => log.push(line);

  const targets = newPathFor(object.path, stamp);
  const scratch = await mkdtemp(path.join(workDir, "clip-"));
  const original = path.join(scratch, "in.mp4");
  const encoded = path.join(scratch, "out.mp4");
  const poster = path.join(scratch, "poster.jpg");

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .download(object.path);
    if (downloadError) throw new Error(`download: ${downloadError.message}`);

    await writeFile(original, Buffer.from(await blob.arrayBuffer()));
    const beforeBytes = (await stat(original)).size;
    const duration = await probeDuration(original);

    await encodeVideo(original, encoded);
    await extractPoster(original, poster, duration);

    let afterBytes = (await stat(encoded)).size;
    let uploadFrom = encoded;
    let note = "";

    // An already-well-compressed master can come out larger under CRF 28. Ship
    // the original bytes in that case — the cache header is the bigger win and
    // there is no reason to pay a re-encode quality hit for nothing.
    if (afterBytes >= beforeBytes) {
      uploadFrom = original;
      afterBytes = beforeBytes;
      note = "  (re-encode was larger — kept original bytes)";
    }

    const posterBytes = (await stat(poster)).size;
    const saved = beforeBytes - afterBytes;
    const pct = beforeBytes > 0 ? Math.round((saved / beforeBytes) * 100) : 0;

    say(`[${index}/${total}] ${object.path}`);
    say(`    was  ${mb(beforeBytes).padStart(9)}   cache-control: ${object.cacheControl}`);
    say(`    now  ${mb(afterBytes).padStart(9)}   cache-control: max-age=${CACHE_CONTROL}   -${pct}%${note}`);
    say(`    poster ${kb(posterBytes).padStart(7)}   ${targets.poster}`);
    say(`    -> ${targets.video}`);

    if (DRY_RUN) {
      say("    (dry run — nothing uploaded, nothing written)");
      return { log, beforeBytes, afterBytes, posterBytes, oldPath: object.path, skipped: false };
    }

    const videoBody = await readFile(uploadFrom);
    const { error: videoError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(targets.video, videoBody, {
        contentType: "video/mp4",
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
    if (videoError) throw new Error(`upload video: ${videoError.message}`);

    const posterBody = await readFile(poster);
    const { error: posterError } = await supabase.storage
      .from(POSTER_BUCKET)
      .upload(targets.poster, posterBody, {
        contentType: "image/jpeg",
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
    if (posterError) throw new Error(`upload poster: ${posterError.message}`);

    // Only after both objects are live. Pointing the row at a file that failed
    // to upload would break the clip for every user; an unreferenced object is
    // the cheaper of the two failures.
    const row = rowsByPath.get(object.path);
    if (row) {
      const patch =
        row.gender === "male"
          ? { demo_video_male_path: targets.video, demo_video_male_poster_path: targets.poster }
          : { demo_video_female_path: targets.video, demo_video_female_poster_path: targets.poster };

      const { error: updateError } = await supabase
        .from("exercise_library")
        .update(patch)
        .eq("id", row.id);
      if (updateError) throw new Error(`db update: ${updateError.message}`);
      say(`    row ${row.slug} (${row.gender}) updated`);
    } else {
      say("    orphan — no exercise_library row points here, nothing to update");
    }

    return { log, beforeBytes, afterBytes, posterBytes, oldPath: object.path, skipped: false };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/* ─── pool ─── */

async function pool(items, size, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/* ─── main ─── */

async function main() {
  await requireBinary("ffmpeg");
  await requireBinary("ffprobe");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set. Run with `node --env-file=.env.local`.");
  if (!serviceKey) fail("SUPABASE_SERVICE_ROLE_KEY is not set. Run with `node --env-file=.env.local`.");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n  Project : ${url}`);
  console.log(`  Mode    : ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);

  /* Preflight: the poster columns and bucket must exist, or every object would
     encode fine and then fail at the last step. */
  const { error: columnError } = await supabase
    .from("exercise_library")
    .select("demo_video_male_poster_path,demo_video_female_poster_path")
    .limit(1);
  if (columnError) {
    fail(
      `exercise_library is missing the poster columns (${columnError.message}).\n` +
        "    Apply mobile/supabase/2026_09_15_exercise_media_egress.sql first.",
    );
  }

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) fail(`Could not list buckets: ${bucketError.message}`);
  if (!buckets.some((b) => b.id === POSTER_BUCKET)) {
    fail(
      `Bucket "${POSTER_BUCKET}" does not exist.\n` +
        "    Apply mobile/supabase/2026_09_15_exercise_media_egress.sql first.",
    );
  }

  /* Which objects does the library actually reference? */
  const { data: rows, error: rowsError } = await supabase
    .from("exercise_library")
    .select("id,slug,demo_video_male_path,demo_video_female_path");
  if (rowsError) fail(`Could not read exercise_library: ${rowsError.message}`);

  const rowsByPath = new Map();
  for (const row of rows) {
    if (row.demo_video_male_path) {
      rowsByPath.set(row.demo_video_male_path, { id: row.id, slug: row.slug, gender: "male" });
    }
    if (row.demo_video_female_path) {
      rowsByPath.set(row.demo_video_female_path, { id: row.id, slug: row.slug, gender: "female" });
    }
  }

  const objects = await listAllObjects(supabase, VIDEO_BUCKET);
  const totalBefore = objects.reduce((sum, o) => sum + o.size, 0);

  // Load progress before reporting, so superseded originals can be named as
  // such instead of lumped in with genuine orphans — they are the inputs this
  // script already replaced, and re-encoding them would be pure waste.
  const previous = await loadState();
  const stamp = previous?.stamp ?? Date.now();
  const done = new Map(Object.entries(previous?.done ?? {}));

  const unreferenced = objects.filter((o) => !rowsByPath.has(o.path));
  const superseded = unreferenced.filter((o) => done.has(o.path));
  const orphans = unreferenced.filter((o) => !done.has(o.path));

  console.log(`  Bucket  : ${objects.length} objects, ${mb(totalBefore)} total`);
  console.log(`  Referenced by exercise_library: ${objects.length - unreferenced.length}`);
  if (superseded.length) {
    console.log(`  Superseded originals (already replaced): ${superseded.length}`);
  }
  console.log(`  Orphans (nothing points at them): ${orphans.length}`);

  const noCache = objects.filter((o) => /no-cache|no-store|max-age=0/.test(o.cacheControl));
  if (noCache.length) {
    console.log(`  Currently uncacheable: ${noCache.length} objects (full re-download every view)`);
  }

  /* The stamp is fixed for the whole migration and reused across resumes, so a
     retry recomputes the same target and overwrites its own partial upload
     rather than stranding another orphan. */
  if (previous && !RESET) {
    console.log(`  Resuming run ${stamp} — ${done.size} already processed`);
  }

  /**
   * An object already carrying the one-year header IS output of this script — a
   * previous run created it and pointed a row at it. Skipping on that alone is
   * what makes the script safely re-runnable, and the state file cannot do it:
   * `done` keys on the OLD path, so after a completed run the new objects are
   * referenced by exercise_library, absent from `done`, and look like fresh
   * input. Re-encoding one stacks a second CRF 28 pass on an already-compressed
   * file and — because `newPathFor` is deterministic per stamp — upserts the
   * degraded result over the good one, at a path pinned for a year.
   */
  const alreadyEncoded = objects.filter(
    (o) => o.cacheControl === `max-age=${CACHE_CONTROL}`,
  );
  if (alreadyEncoded.length) {
    console.log(`  Already re-encoded (one-year header): ${alreadyEncoded.length} — skipping`);
  }

  let eligible = objects.filter((o) => o.cacheControl !== `max-age=${CACHE_CONTROL}`);
  eligible = eligible.filter((o) => INCLUDE_ORPHANS || rowsByPath.has(o.path));
  // Superseded originals carry the OLD header, so the check above does not
  // catch them; `done` is what keeps --include-orphans from redoing them.
  eligible = eligible.filter((o) => !done.has(o.path));

  /* Two sources collapsing onto one target would have the second silently
     overwrite the first. Cannot happen for referenced objects (one path per
     row per gender) but --include-orphans can produce it. */
  const collisions = new Map();
  for (const o of eligible) {
    const target = newPathFor(o.path, stamp).video;
    if (collisions.has(target)) {
      fail(
        `"${o.path}" and "${collisions.get(target)}" both map to "${target}".\n` +
          "    Rename one in the bucket, or re-run without --include-orphans.",
      );
    }
    collisions.set(target, o.path);
  }

  if (eligible.length > LIMIT) eligible = eligible.slice(0, LIMIT);

  if (eligible.length === 0) {
    console.log("\n  Nothing left to do.\n");
    return;
  }

  console.log(`  To process: ${eligible.length} (concurrency ${CONCURRENCY})\n`);

  const workDir = await mkdtemp(path.join(tmpdir(), "era-recompress-"));
  const failures = [];
  let processedBefore = 0;
  let processedAfter = 0;
  let posterTotal = 0;

  try {
    await pool(eligible, CONCURRENCY, async (object, i) => {
      try {
        const result = await processObject({
          supabase,
          object,
          stamp,
          rowsByPath,
          workDir,
          index: i + 1,
          total: eligible.length,
        });

        console.log(result.log.join("\n"));
        processedBefore += result.beforeBytes;
        processedAfter += result.afterBytes;
        posterTotal += result.posterBytes;

        done.set(object.path, {
          at: new Date().toISOString(),
          before: result.beforeBytes,
          after: result.afterBytes,
        });
        // Written per object, not at the end, so a crash or Ctrl-C keeps
        // everything finished so far.
        await saveState({ stamp, done: Object.fromEntries(done) });
      } catch (error) {
        failures.push({ path: object.path, message: error.message });
        console.log(`[${i + 1}/${eligible.length}] ${object.path}\n    ✗ ${error.message}`);
      }
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  /* ─── summary ─── */

  const saved = processedBefore - processedAfter;
  const pct = processedBefore > 0 ? Math.round((saved / processedBefore) * 100) : 0;

  console.log(`\n${"─".repeat(64)}`);
  console.log(`  Processed   ${eligible.length - failures.length}/${eligible.length} objects`);
  console.log(`  Before      ${mb(processedBefore)}`);
  console.log(`  After       ${mb(processedAfter)}`);
  console.log(`  Saved       ${mb(saved)}  (-${pct}%)`);
  console.log(`  Posters     ${mb(posterTotal)} added (${eligible.length - failures.length} files)`);
  console.log(`  Cache       max-age=3600/no-cache  ->  max-age=${CACHE_CONTROL} (1 year)`);

  if (processedBefore > 0) {
    // Cached egress scales with bytes served, so the compression ratio carries
    // straight over: a full library pull that cost `totalBefore` now costs
    // that times the ratio.
    const FREE_EGRESS = 5 * 1024 ** 3;
    const ratio = processedAfter / processedBefore;
    const projected = totalBefore * ratio;

    console.log(`\n  A full library pull: ${mb(totalBefore)}  ->  ~${mb(projected)}`);
    console.log(
      `  Full pulls inside the 5 GB Free allowance: ` +
        `${Math.floor(FREE_EGRESS / totalBefore)}  ->  ~${Math.floor(FREE_EGRESS / projected)}`,
    );
    console.log(
      "  And that counts only first views — repeat views are now free for a year.",
    );
  }

  if (failures.length) {
    console.log(`\n  ${failures.length} failed (re-run to retry — finished work is skipped):`);
    for (const f of failures) console.log(`    ${f.path}\n      ${f.message}`);
  }

  if (!DRY_RUN && failures.length === 0) {
    console.log(
      "\n  Old objects were left in place on purpose: mobile persists raw rows in\n" +
        "  Redux, so installs that have not refreshed their bootstrap still point at\n" +
        "  the old paths. Once those have aged out, list them with:\n" +
        `    node --env-file=.env.local scripts/recompress-exercise-media.mjs --list-superseded`,
    );
  }

  console.log("");
}

/**
 * Lists the objects that are safe to delete once no install can still be
 * holding an old path.
 *
 * Derived from the live bucket and the live rows, NOT from the state file: an
 * object no exercise_library row references is superseded or orphaned either
 * way. That is the set you actually want to review, and it stays correct even
 * if the state file is missing, stale, or from a different machine.
 */
async function listSuperseded() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) fail("Run with `node --env-file=.env.local`.");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("exercise_library")
    .select("demo_video_male_path,demo_video_female_path");
  if (error) fail(`Could not read exercise_library: ${error.message}`);

  const live = new Set();
  for (const row of rows) {
    if (row.demo_video_male_path) live.add(row.demo_video_male_path);
    if (row.demo_video_female_path) live.add(row.demo_video_female_path);
  }

  // "No row references it" is the whole test. An earlier version also required
  // the old cache header, which silently hid anything this script itself
  // superseded — exactly the objects most worth reclaiming.
  const objects = await listAllObjects(supabase, VIDEO_BUCKET);
  const stale = objects.filter((o) => !live.has(o.path));
  const bytes = stale.reduce((sum, o) => sum + o.size, 0);

  console.log(`\n  ${stale.length} objects no row references, ${mb(bytes)} total:\n`);
  for (const o of stale) {
    console.log(`    ${o.path.padEnd(52)} ${mb(o.size).padStart(9)}  ${o.cacheControl}`);
  }
  console.log(
    "\n  Delete only once no install can still be holding these paths — mobile\n" +
      "  persists raw rows in Redux, so a stale bootstrap still points here.\n",
  );
}

if (hasFlag("list-superseded")) {
  await listSuperseded();
} else {
  await main().catch((error) => fail(error.stack ?? error.message));
}
