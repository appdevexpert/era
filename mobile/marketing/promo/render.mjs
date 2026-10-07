// Renders promo.html frame-by-frame with headless Chromium, then encodes an MP4 with ffmpeg.
// Usage: node render.mjs [composition.html] [out.mp4]   (defaults: promo.html -> era-promo.mp4)
// Needs: playwright (global ok: NODE_PATH=$(npm root -g)), ffmpeg, python3 + numpy (soundtrack).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const html = resolve(here, process.argv[2] ?? 'promo.html');
const out = resolve(process.argv[3] ?? join(here, 'era-promo.mp4'));
const framesDir = join(here, '.frames');
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(html).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');
const { FPS, DURATION, HITS, MUSIC = 'promo' } = await page.evaluate(() => window.PROMO);

const total = Math.round(FPS * DURATION);
for (let f = 0; f < total; f++) {
  await page.evaluate(t => window.render(t), f / FPS);
  await page.screenshot({ path: join(framesDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (f % 60 === 0) console.log(`frame ${f}/${total}`);
}
await browser.close();

const wav = join(framesDir, 'music.wav');
execFileSync('python3', [join(here, 'soundtrack.py'), wav, String(DURATION), JSON.stringify(HITS), MUSIC], { stdio: 'inherit' });

execFileSync('ffmpeg', [
  '-y', '-v', 'error',
  '-framerate', String(FPS), '-i', join(framesDir, 'f%05d.jpg'),
  '-i', wav,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '20', '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
  out,
], { stdio: 'inherit' });
rmSync(framesDir, { recursive: true, force: true });
console.log(`wrote ${out}`);
