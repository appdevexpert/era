# Marketing videos

Vertical (1080×1920, 30fps) social videos for ERA Fit live in `mobile/marketing/promo/`. Each video is an HTML composition rendered frame-by-frame in headless Chromium and encoded with ffmpeg. The soundtrack is synthesized by `soundtrack.py`, so it carries no music-licensing risk.

| Video | Source | Output | Length |
|---|---|---|---|
| Brand promo | `promo.html` | `era-promo.mp4` | 20s |
| App tour (what ERA does / how it looks) | `app-tour.html` | `era-app-tour.mp4` | 46s |
| How to do your workout | `how-to-workout.html` | `era-how-to-workout.mp4` | 42s |
| How to log a workout | `how-to-log.html` | `era-how-to-log.mp4` | 50s |

## Render

```bash
cd mobile/marketing/promo
NODE_PATH=$(npm root -g) node render.mjs how-to-log.html era-how-to-log.mp4
```

Needs Playwright (global install is fine), ffmpeg, and python3 with numpy. A 45s video takes about 6 minutes. Open any `.html` file directly in a browser for a looping live preview.

## How a composition works

- `window.PROMO = { FPS, DURATION, HITS, MUSIC }`. `HITS` are seconds where the music adds an accent: booms for `promo`, soft tap blips for `explainer`.
- `window.render(t)` must be deterministic in `t`, because the renderer seeks frame by frame.
- `kit/kit.js` provides the timeline helpers: captions, phone views, tap ripples, scroll and count-up.
- `kit/kit.css` provides the stage, captions and the phone frame. The screen is laid out in iPhone points (393×852) and scaled ×1.6, so app dp values from the RN source can be used directly.
- `kit/screens.js` and `kit/screens.css` are HTML recreations of the real app screens, built from the RN components:
  - home and the workout card
  - exercise list and exercise info sheet
  - countdown, workout log, rest timer, timer and cardio screens
  - session complete
  - onboarding goal step and plan generation
  - progress, leaderboard and nutrition
- Colors and copy come from `app/constants/colors.ts` and `app/locales/en.ts`.

## Gotchas

- **Keep the recreations in sync with the app.** They are hand-built copies, not screenshots. When a screen's design changes, update `kit/screens.*` to match.
- **Sample data is invented.** The live program has planned weights of `0`, so the videos use invented realistic numbers: names, weights, points and leaderboard entries.
- **Smart weight adjustment is a paid feature.** Only Standard and Pro users get it, and the log video caption says so. Keep that qualifier if you edit the copy.
- **Captions are English only.** For a Norwegian cut, duplicate the composition and swap the caption text and in-screen strings for the ones in `app/locales/nb.ts`.
