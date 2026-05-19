# 12 Week Personalized — Workout Program (as in the app)

> Heads up: you asked for "Pure 12 week", but the only 12-week program in the database is **"12 Week Personalized" — Male Advanced (Rami Reference)**. This doc reflects that one. If a different "Pure" program is expected, it hasn't been seeded yet.

## Overview

| Field | Value |
|---|---|
| Title | 12 Week Personalized |
| Subtitle | Male Advanced - Rami Reference |
| Goal | Build strength and hypertrophy with top sets, back-off work, core finishers, and treadmill conditioning |
| Duration | 12 weeks |
| Days / week | 6 training + 1 rest |
| Status | active (template) |
| Program ID | `2a87094c-260a-4a1b-95f6-7de8d5300001` |

### Block periodization
| Block | Weeks | Focus | Top-set reps |
|---|---|---|---|
| Hypertrophy | 1 – 4 | Volume, foundation | 10 |
| Strength | 5 – 8 | Heavier work | 8 |
| Peak | 9 – 12 | Peak intensity | 6 |

No week is flagged as a deload — the load/rep step-down between blocks carries the periodization.

## Weekly schedule (same shape every week, all 12 weeks)

| Day | Weekday | Workout | Target muscles | Est. min |
|---|---|---|---|---|
| 1 | Mon | Push – Heavy | chest, triceps, shoulders, core | 75 |
| 2 | Tue | Pull – Heavy | back, biceps, forearms, core | 75 |
| 3 | Wed | Legs – Heavy | quads, glutes, hamstrings, calves, core | 75 |
| 4 | Thu | Shoulders / Neck | shoulders, traps, neck | 75 |
| 5 | Fri | Cardio 4×4 | cardio | 45 |
| 6 | Sat | Legs – Volume | glutes, hamstrings, calves, neck | 75 |
| 7 | Sun | Rest + Walk | recovery | 30 (rest day) |

## Session structure

Each **strength day** uses three sections in order:
1. **Main Exercises** — primary lifts (compound = top set + back-offs; isolation = working sets)
2. **Core Finisher** — Leg Raises, Cable Crunch, Plank (3 sets each, 45s rest)
3. **Treadmill Walk** — ~20 min incline walk, RPE 6

The **Cardio day** uses:
1. **4×4 Intervals** — 4 × 4-min hard treadmill intervals (RPE 8), 3-min rest between
2. **Core** — same triple (Leg Raises, Cable Crunch, Plank)

The **Rest day** is a 30-min easy walk, nothing logged.

## Set types used in the app

| `set_kind` | Meaning | Typical RPE / RIR |
|---|---|---|
| `top_set` | Heaviest set of the lift | 8 / 2 |
| `backoff` | Reduced-load sets after the top set | 7 / 3 |
| `working` | Standard sets (mostly isolation lifts) | 7 / 3 |
| `core` | Core finisher set | 7 / 3 |
| `cardio` | Treadmill walk / interval | 6 – 8 |

---

## Day 1 — Push – Heavy (Week 1 reference)

**Main Exercises** (5 exercises · 13 sets)

| # | Exercise | Equipment | Plan (Wk 1) | Rest | RPE |
|---|---|---|---|---|---|
| 1 | Incline Dumbbell Press | DB + incline bench | 32.5 kg ×10 *(top)* → 29.5 ×10 ×2 *(back-off)* | 60s | 8 / 7 |
| 2 | Bench Press | barbell + bench | 30 kg ×10 *(top)* → 25.5 ×10 ×2 *(back-off)* | 60s | 8 / 7 |
| 3 | Rope Pushdown | cable rope | 40 kg × 10 × 3 *(working)* | 60s | 7 |
| 4 | Skull Crushers | EZ-bar / DB | 7.5 × 10 × 2, then 5.5 × 10 | 60s | 7 |
| 5 | Overhead Press | barbell / DB | 20 kg ×10 *(top)* → 17 ×10 ×2 *(back-off)* | 60s | 8 / 7 |

**Core Finisher**
- Leg Raises — 3 × 15-20
- Cable Crunch — 3 × 15-20 @ 32 kg
- Plank — 3 × hold

**Treadmill Walk** — Incline Walk, low intensity (RPE 6)

---

## Day 2 — Pull – Heavy (Week 1)

**Main Exercises** (6 exercises · 18 sets)

| # | Exercise | Equipment | Plan (Wk 1) | Rest | RPE |
|---|---|---|---|---|---|
| 1 | Pull-ups | pull-up bar | bodyweight × 6-10 × 3 *(working)* | 90s | 8 |
| 2 | Barbell Row | barbell | 22.5 ×10 *(top)* → 20.5 ×12 ×2 *(back-off)* | 90s | 8 / 7 |
| 3 | Seated Cable Row | cable | 52 ×12, 52 ×10, 47 ×10 *(working)* | 60s | 7 |
| 4 | Lat Pulldown | cable | 45 kg × 10 × 3 *(working)* | 60s | 7 |
| 5 | Hammer Curl | dumbbells | 17.5 kg × 12 × 3 *(working)* | 60s | 7 |
| 6 | Preacher Curl | barbell + preacher | 10 kg × 10 × 3 *(working)* | 60s | 7 |

**Core Finisher** — Leg Raises, Cable Crunch @ 32 kg, Plank (3 × each, 45s rest)
**Treadmill Walk** — Incline Walk

---

## Day 3 — Legs – Heavy (Week 1)

**Main Exercises** (4 exercises · 12 sets)

| # | Exercise | Equipment | Plan (Wk 1) | Rest | RPE |
|---|---|---|---|---|---|
| 1 | Squat | barbell, rack | 30 ×10 *(top)* → 25.5 ×10 ×2 *(back-off)* | 120s | 8 / 7 |
| 2 | Romanian Deadlift | barbell | 20 kg × 10 × 3 *(working)* | 90s | 7 |
| 3 | Lunges | dumbbells | 12 kg × 10 × 3 *(working)* | 60s | 7 |
| 4 | Leg Curl | machine | 54 ×12, 46 ×10, 46 ×12 *(working)* | 60s | 7 |

**Core Finisher** — Leg Raises ×3, Plank ×3 *(no Cable Crunch on this day)*
**Treadmill Walk** — Incline Walk

---

## Day 4 — Shoulders / Neck (Week 1)

**Main Exercises** (6 exercises · 16 sets)

| # | Exercise | Equipment | Plan (Wk 1) | Rest | RPE |
|---|---|---|---|---|---|
| 1 | Overhead Press | barbell / DB | target only (no logged set in the planned-sets table) | 90s | – |
| 2 | Lateral Raise | dumbbells | 12.5 kg × 12 × 3 | 60s | 7 |
| 3 | Rear Delt Flyes | dumbbells | 12.5 kg × 12 × 3 | 60s | 7 |
| 4 | Shrugs | Smith | 21 ×20 → 35 ×12 → 40.5 ×10 *(ascending)* | 60s | 7 |
| 5 | Face Pulls | cable | 50 kg × 10 × 3 | 60s | 7 |
| 6 | Neck Headband | headband | 10 kg × 12 × 3 | 60s | 7 |

**Treadmill Walk** — Incline Walk 20 min

---

## Day 5 — Cardio 4×4 (Week 1)

**4×4 Intervals** — Treadmill 4×4
- 4 × 4-min hard (240s each) at RPE 8
- 3-min rest (180s) between intervals

**Core** — Leg Raises ×3, Cable Crunch @ 32 kg ×3, Plank 60s ×3

---

## Day 6 — Legs – Volume (Week 1)

**Main Exercises** (6 exercises · 18 sets)

| # | Exercise | Equipment | Plan (Wk 1) | Rest | RPE |
|---|---|---|---|---|---|
| 1 | Squat | barbell, rack | 85 kg × 10 × 3 *(working)* | 120s | 7 |
| 2 | Hip Thrust | barbell, bench | 60 kg × 10 × 3 *(working)* | 90s | 7 |
| 3 | Bulgarian Split Squat | DB, bench | 15 kg × 10 × 3 *(working)* | 60s | 7 |
| 4 | Leg Curl | machine | 59 kg × 10 × 3 *(working)* | 60s | 7 |
| 5 | Standing Calf Raises | Smith | 60 kg × 12 × 3 *(working)* | 60s | 7 |
| 6 | Seated Calf Raises | machine | 40 kg × 12 × 3 *(working)* | 60s | 7 |

**Treadmill Walk** — Incline Walk

---

## Day 7 — Rest + Walk
Rest day. 30-min easy walk recommended. No sets are logged.

---

## 12-week top-set progression

Same exercises every week — only the planned weights / rep targets change. Top sets stay at RPE 8 throughout. Loads in kg.

| Lift | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | W11 | W12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bench Press | 30 ×10 | 30.5 ×10 | 31 ×10 | 32 ×10 | 32.5 ×8 | 33 ×8 | 33.5 ×8 | 34 ×8 | 35 ×6 | 35.5 ×6 | 36 ×6 | 36.5 ×6 |
| Incline DB Press | 32.5 ×10 | 33 ×10 | 33.5 ×10 | 34 ×10 | 34.5 ×8 | 35 ×8 | 35.5 ×8 | 36 ×8 | 36.5 ×6 | 37 ×6 | 37.5 ×6 | 38 ×6 |
| Overhead Press | 20 ×10 | 20.5 ×10 | 21 ×10 | 21 ×10 | 21.5 ×8 | 22 ×8 | 22.5 ×8 | 23 ×8 | 23 ×6 | 23.5 ×6 | 24 ×6 | 24.5 ×6 |
| Barbell Row | 22.5 ×10 | 23 ×10 | 23.5 ×10 | 24 ×10 | 24.5 ×8 | 25 ×8 | 25 ×8 | 25.5 ×8 | 26 ×6 | 26.5 ×6 | 27 ×6 | 27.5 ×6 |
| Squat (Heavy) | 30 ×10 | 30.5 ×10 | 31 ×10 | 32 ×10 | 32.5 ×8 | 33 ×8 | 33.5 ×8 | 34 ×8 | 35 ×6 | 35.5 ×6 | 36 ×6 | 36.5 ×6 |

Pattern: +~0.5 kg / week within a block; reps step down 10 → 8 → 6 at block boundaries.

## Set counts per day (all weeks)

| Day | Exercises | Total sets |
|---|---|---|
| 1 Push | 9 | 25 |
| 2 Pull | 10 | 28 |
| 3 Legs Heavy | 7 | 19 |
| 4 Shoulders/Neck | 7 | 16 |
| 5 Cardio 4×4 | 4 | 13 |
| 6 Legs Volume | 7 | 19 |
| 7 Rest | 0 | 0 |
| **Total / week** | **44** | **120** |
| **Total / program** | — | **1,440** |

---

## Source

Pulled from Supabase project **`era`** (`soyvnnicpkttehwjlpie`) via the Supabase MCP. Tables read:
- `workout_programs` (1 row · the program)
- `program_weeks` (12 rows · one per week)
- `program_days` (84 rows · 12 × 7)
- `program_day_sections` (sections per day, e.g. Exercises / Core Finisher / Treadmill Walk)
- `program_day_exercises` (exercises per day, in `sort_order`)
- `planned_exercise_sets` (1,440 planned sets — every set the app shows the user)
- `exercise_library` (canonical exercise definitions)
