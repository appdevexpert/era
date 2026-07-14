# Modality & Kind — Admin Panel Demo Briefing

Nishant sir ke liye — Rami demo call se pehle read karo. Yeh doc bataata hai admin panel ke do similar-dikhne wale fields (`Modality` aur `Kind`) actually alag kaam kaise karte hain, aur mobile app mein kya effect padta hai.

Last updated: 2026-07-14 (post cleanup — warmup/drop_set/amrap removed, Modality-based Kind filter enforced).

---

## 30-Second Summary

Admin panel mein do fields hain jo similar dikhte hain:

| Field | Kahan set hota hai | Kitni baar | Kya control karta hai |
|---|---|---|---|
| **Modality** | Exercise Library → Add/Edit Exercise | Ek baar per exercise | Mobile app ki log screen UI |
| **Kind** | Program Builder → Day → Set | Har set ke liye alag | PR eligibility, points bonuses, Smart Weight Engine |

Confusion isliye hoti hai kyunki **dono mein `cardio` aur `core` values overlap** karte hain. But actual mein alag layers pe kaam karte hain.

**Naya rule (post cleanup):** Kind dropdown ab exercise ki Modality ke hisaab se **automatic filter** hota hai. Galat combo pick karna possible hi nahi hai.

---

## Modality — Exercise-Level

**Location:** Exercise Library → Add/Edit Exercise → `Modality` dropdown

**Purpose:** Mobile app ko batata hai *kaunsi log screen dikhaani hai* jab user is exercise ko log kare.

| Modality | Mobile app kya dikhata hai | Example |
|---|---|---|
| `strength` | Weight + Reps input | Squats, Bench Press, Pull-ups |
| `cardio` | Duration + Distance + HR input, writes to `session_cardio_logs` | Outdoor Walk, Cardio 4×4, Incline Walk |
| `core` | Timed stopwatch UI, no weight input | Plank, Dead Bug, Hollow Hold |
| ~~`mobility`~~ | ~~Timed stopwatch UI~~ | **Hidden from admin picker 2026-07-14** — zero mobility exercises seeded, no plan to add. Enum stays in DB; commented out in `EXERCISE_MODALITIES`. |

**Rule:** Ek baar set karo. "Squats" hamesha `strength` rahega, "Outdoor Walk" hamesha `cardio`. Ye exercise ka *nature* hai — badalta nahi.

**Where it lives in code:**
- DB: `exercise_library.modality` enum
- Mobile mapper: [mobile/app/utils/workoutMappers.ts:737-748](mobile/app/utils/workoutMappers.ts#L737-L748) → `deriveMode()` decides log UI

---

## Kind — Set-Level

**Location:** Program Builder → Day → Exercise → Add Set / Add Bulk Sets → `Kind` dropdown

**Purpose:** Mobile app ko batata hai *yeh specific set kaunsa role play karta hai* — even within the same exercise.

### Current allowed Kinds (5)

| Kind | Kya karta hai |
|---|---|
| `working` | **Default.** Normal training set. Counted for PR + points. Feeds Smart Weight Engine. |
| `top_set` | Advanced programs ka heaviest set. Smart Weight Engine yahi anchor karta hai. Collapses to `working` in session logs (still counts for PR/points). |
| `backoff` | Top set ke baad 80–90% lighter high-rep set. Auto-derived weight from paired top_set. Collapses to `working` in logs. |
| `core` | Timed / bodyweight core set. No weight field. Not PR-eligible. |
| `cardio` | Cardio interval. Writes to `session_cardio_logs`. **Triggers +150 ERA cardio bonus** at session end. |

### Removed Kinds (dead options, no longer in dropdown)

| Removed | Reason |
|---|---|
| `warmup` | **Rami locked "no warm-up sets" 2026-06-25.** Working sets naturally ramp. Enum value stays in DB for parity, but no new rows emit it. |
| `drop_set` | No mobile logic branch. Was placeholder. |
| `amrap` | No mobile logic branch. Was placeholder. |

**Rule:** Har set alag Kind ka ho sakta hai — even in the same exercise. Ye set ka *role* hai, not the exercise ka.

---

## Modality → Kind Contract (Naya Behavior)

Ab admin panel automatic filter karta hai:

| Exercise ki Modality | Kind dropdown mein kya dikhta hai |
|---|---|
| `strength` | `working`, `top_set`, `backoff` |
| `cardio` | `cardio` (only) |
| `core` | `core` (only) |
| ~~`mobility`~~ | Hidden from picker; if legacy row still has it, falls back to strength options. |

**Enforcement:**
- **UI level** — `web/lib/admin/constants.ts` → `allowedSetKindsForModality()` decides options per dropdown.
- **Server level** — `web/lib/admin/actions.ts` → `assertKindMatchesExerciseModality()` blocks invalid combos before DB write.

Toh agar Rami puchhe *"kya galat combo save ho sakta hai?"* → **Nahi. UI se pick nahi kar sakta, aur crafted request bhi server pe reject ho jaayegi.**

---

## Real Example (Rami ko dikhane ke liye)

### Male Advanced program → Push day → Bench Press

```
Exercise:  Bench Press
Modality:  strength         ← exercise-level, ek baar set hota hai
Sets:
  ├─ Set 1  Kind: top_set   100 kg × 5   ← Smart Weight anchor
  ├─ Set 2  Kind: backoff    85 kg × 8   ← 85% of top set
  ├─ Set 3  Kind: backoff    85 kg × 8
  └─ Set 4  Kind: backoff    85 kg × 8
```

Ek exercise, 4 sets, 2 different Kinds. Modality poore exercise ke liye ek hi — `strength`.
**This is why Modality is on the exercise, Kind is on the set.**

### Female Beginner → Cardio day → Outdoor Walk

```
Exercise:  Outdoor Walk
Modality:  cardio            ← exercise-level, auto-locks Kind
Sets:
  └─ Set 1  Kind: cardio     30 min brisk walk
```

Modality `cardio` isliye Kind dropdown mein sirf `cardio` option dikha. Session complete hone pe **+150 ERA bonus** milega.

---

## Rami-Facing Demo Script

### Step 1 — Exercise Library kholein

> "Rami, this is our master exercise list. When we add or edit an exercise, we set its **Modality** — what kind of thing it is. Squats is `strength`, Outdoor Walk is `cardio`, Plank is `core`. This decides how the user logs it in the mobile app — whether they see weight+reps, or duration+distance, or a timer."

### Step 2 — Program Builder kholein → Male Advanced → Push day → Bench Press

> "Now inside a program day, we plan the sets. Each set gets a **Kind** — is it a top set, back-off, or normal working set? Notice Bench Press has multiple sets with different Kinds — that's how advanced programming works: one heavy top set, then lighter back-off sets to hit volume."

### Step 3 — Click Add Set / Add Bulk Sets

> "Look, the Kind dropdown only shows 3 options for a strength exercise: working, top_set, backoff. Warmup is gone — as per your 25 June spec, working sets naturally ramp up. For a cardio exercise like Outdoor Walk, the dropdown will only show `cardio`. The system enforces this automatically."

### Step 4 — Mobile app open kar ke same day dikhaayein

> "See how the top set is highlighted as the target weight, and back-off sets are shown at 85%. The Smart Weight Engine reads the top_set Kind and auto-derives the back-off weight. All from what we picked in admin panel."

### Step 5 — Cardio day dikhayein (Cardio 4×4)

> "For cardio exercises, both Modality and Kind are locked to `cardio`. Session complete hone pe user ko +150 ERA points bonus milta hai — because the app detects at least one cardio-Kind set was logged."

---

## Points System Connection

Agar Rami puchhe *"points kaise milte hain?"*:

| Event | Points |
|---|---|
| Workout complete | +50 |
| Har PR (heaviest weight beat) | +100 |
| Session mein koi cardio-Kind set logged | +150 |
| 7-day streak | +200 |

**Yeh values locked hain** — Rami ne 2026-06-12 pe approve kiya tha. Change nahi karna.

Reference: `memory/project_era_points_streak_spec.md` and `mobile/doc/PR_FEATURE.md`.

---

## Common Q&A (Nishant sir ke liye)

### Q1: "Modality strength hai toh Kind cardio kyun ho sakti hai?"

**A:** Ab nahi ho sakti. Cleanup ho chuka hai:
- Admin panel Kind dropdown Modality ke hisaab se filter karta hai
- Server bhi validate karta hai — invalid combo API pe reject hoti hai
- Cardio exercise ke sets sirf `cardio` Kind ho sakte hain, strength exercise ke sets sirf `working/top_set/backoff`

Related files:
- [web/lib/admin/constants.ts](web/lib/admin/constants.ts) → `allowedSetKindsForModality()`
- [web/lib/admin/actions.ts](web/lib/admin/actions.ts) → `assertKindMatchesExerciseModality()`

### Q2: "Ek exercise male ki hai ya female ki, kaise pata chalega?"

**A:** Exercise gender-neutral hai. Same "Squats" male aur female dono programs mein use hoti hai.
- Gender program-level pe hai — `workout_programs.gender` column
- 4 launch programs hain: Male Beginner, Male Advanced, Female Beginner, Female Advanced
- Same library, different curation per program

Agar future mein gender-locked exercise chahiye, ek `allowed_genders` column baad mein add ho sakta hai — abhi zaroorat nahi.

### Q3: "Warmup option kyun nahi dikh raha?"

**A:** Aap ne 2026-06-25 pe khud "no warm-up sets" spec locked kiya tha. Working sets naturally ramp up karte hain, alag warmup track karne ki zaroorat nahi. Admin panel se hataa diya, but agar future mein wapas laana ho toh Postgres enum untouched hai — 5 minute mein wapas aa jaayega.

### Q4: "Purane rows jinme warmup Kind hai, unka kya hoga?"

**A:** DB mein rows waise hi rahenge. Edit dialog khologe toh dropdown default automatically first allowed Kind (working) pe fall back ho jaayega. Purani rows corrupt nahi hain, sirf UI mein warmup option gaayab hai.

### Q5: "top_set aur backoff kya hain? Sirf strength mein hi kyun?"

**A:** Advanced programs (Male Advanced, Female Advanced) mein use hote hain:
- `top_set` — sabse heavy set (jaise 100 kg × 5)
- `backoff` — top_set ke baad lighter sets (jaise 85 kg × 8 × 3 sets)

Smart Weight Engine top_set ka weight anchor karta hai, phir backoff automatic 80-90% pe derive karta hai. Beginner programs mein sab `working` sets hote hain, uniform weight.

Reference: `memory/project_top_set_backoff_model.md`.

---

## Cheat Sheet (Screen pe rakhne ke liye)

```
Modality → Exercise ka nature (strength/cardio/core/mobility)
Kind     → Set ka role (working/top_set/backoff/core/cardio)

Modality = set once per exercise
Kind     = set per set (multiple different Kinds possible per exercise)

Modality drives → log screen UI
Kind drives     → PR eligibility, points bonuses, Smart Weight Engine

Contract:
  strength/mobility → working / top_set / backoff
  cardio            → cardio
  core              → core
```

---

## Related Files

**Web admin:**
- [web/lib/admin/constants.ts](web/lib/admin/constants.ts) — `PLANNED_SET_KINDS`, `allowedSetKindsForModality()`
- [web/lib/admin/actions.ts](web/lib/admin/actions.ts) — server-side kind/modality validation
- [web/components/programs/program-builder.tsx](web/components/programs/program-builder.tsx) — Kind dropdowns wired to `allowedKinds`
- [web/lib/admin/data.ts](web/lib/admin/data.ts) — fetches `exercise_library.modality` with day exercises

**Mobile:**
- [mobile/app/utils/workoutMappers.ts](mobile/app/utils/workoutMappers.ts) — `deriveMode()` reads Modality → picks log UI
- [mobile/app/utils/deloadTransform.ts](mobile/app/utils/deloadTransform.ts) — `PlannedSetKind` type mirrors enum
- [mobile/app/services/sessionService.ts](mobile/app/services/sessionService.ts) — top_set/backoff collapse to working on log rows

**Locked specs:**
- `memory/project_no_warmup_sets.md` — Rami 2026-06-25
- `memory/project_top_set_backoff_model.md` — Advanced program anchor
- `memory/project_era_points_streak_spec.md` — points values locked 2026-06-12
- `memory/project_pr_calculation_spec.md` — PR = max_weight only
