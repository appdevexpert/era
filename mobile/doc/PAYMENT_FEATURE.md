# PAYMENT_FEATURE.md

Source of truth for ERA subscription tiers, RevenueCat integration, and the 12-week program completion flow.

**Locked by Rami on 2026-06-12** (Slack #era, message ts 1781189555). Supersedes the earlier 2026-04-14 spec.

---

## 1. Tier Structure

### FREE (0 kr) — Entry tier
- Basic workout logging (sets, reps, weight)
- 1 program access (Beginner only)
- 7-day workout history (auto-deletes after 7 days)
- PR auto-detection
- Streak tracking capped at 7 days
- Body weight log
- NO Smart Weight Engine
- NO meal logging
- NO advanced features

### STANDARD (99 NOK/month) — Core training tier
Everything in Free, plus:
- Full unlimited workout history
- Smart Weight Engine (auto weight adjustment based on user feedback)
- All 3 programs: Male Advanced, Female Golden Era, Beginner
- Bro Split access after week 12
- Progress photos (before/after comparison)
- Body weight log with full history graph
- Basic meal logging (free-text food diary)
- Push notifications (streaks, milestones, weekly summary)

### PRO (199 NOK/month) — Premium tier
Everything in Standard, plus:
- Top Set + Back-off Set on heavy compound lifts (Advanced progression)
- Advanced meal logging (detailed tracking)
- Meal suggestions (curated daily meal recommendations)
- Nutrition Guidance (daily nutrition coaching based on training plan)
- Total Session Volume + Lifetime Volume tracking
- 12-week progression chart per exercise

### Annual pricing (updated 2026-06-24)
- Standard monthly: 99 NOK
- Standard annual: 899 NOK
- Pro monthly: 199 NOK
- Pro annual: 1799 NOK

---

## 2. Payment Architecture (Locked 2026-04-14)

- Phase 1: Apple IAP + Google Play Billing via RevenueCat
- Phase 2: Vipps MobilePay (later, do not block on this)
- **Subscription logic must be decoupled from provider** so Vipps can be added without rewriting core logic.

Confirmed by Khushali on 2026-04-14 that backend is structured this way.

---

## 3. RevenueCat Configuration

### Products to create
```
era_standard_monthly   → 99 NOK/month
era_standard_annual    → 899 NOK/year
era_pro_monthly        → 199 NOK/month
era_pro_annual         → 1799 NOK/year
```

### Entitlements
- `standard` — unlocks Standard features
- `pro` — unlocks Pro features AND everything in Standard (set hierarchy in RevenueCat offerings)

### Code-side architecture (current implementation)

**File map**

| File | Role |
|---|---|
| `app/services/revenueCatService.ts` | Only file that imports `react-native-purchases` + `react-native-purchases-ui`. Owns the SDK config, the in-module tier cache, the subscriber registry, and the Supabase mirror. |
| `app/services/profileService.ts` | Profile reads/writes. **Note:** the old `saveSubscriptionState` client mirror was removed on 2026-07-05 — `subscription_*` is now written server-side only by the `revenuecat-webhook` edge function (see REVENUECAT_STATUS.md). |
| `app/hooks/useEntitlement.ts` | Read-only hook. Returns `{ tier, isFree, hasStandard, hasPro }`. Subscribes to the service's cache for live updates. |
| `app/hooks/useRequireEntitlement.ts` | **Action-gate hook.** Returns a function `(required: "standard" \| "pro") => boolean`. Inside an event handler, call it before doing gated work — falsy return means it already redirected the user to the paywall. |
| `app/components/common/EntitlementGate.tsx` | **UI-section gate.** `<EntitlementGate requires="pro" fallback={...}>...</EntitlementGate>` — wraps any block of JSX that should disappear (or be replaced) for users below the required tier. |
| `app/screen/home/PaywallScreen.tsx` | Single paywall screen. Inline `<RevenueCatUI.Paywall />`. Reachable from both onboarding (`source: "onboarding"`) and Profile (`source: "profile"`); the source param decides whether dismissal completes onboarding or pops back. |

**Data flow**

```
RC dashboard / Apple-Google purchase
  → ON DEVICE: Purchases.addCustomerInfoUpdateListener fires
      → revenueCatService.updateCachedSnapshot(info)
      → tier cache updated → useEntitlement consumers re-render
  → ON SERVER: RevenueCat → revenuecat-webhook edge function
      → apply_subscription_event RPC (service_role) → profiles row updated
        (authoritative; works even while the app is closed)
```

**Identity flow**

```
SIGNED_IN (Supabase) → Navigation.tsx → identifyRevenueCatUser(user.id)
  → Purchases.logIn(supabaseUserId) → RC App User ID == Supabase UID
  → Subsequent customerInfo events know which user to mirror
```

### Gating patterns — pick the right one

**Action gate (event handlers, ~80% of cases):**
```tsx
const requireEntitlement = useRequireEntitlement();

const handleAddPhoto = () => {
  if (!requireEntitlement("standard")) return; // bounced to paywall
  // ...proceed
};
```

**UI gate (whole sections / cards):**
```tsx
<EntitlementGate requires="pro" fallback={<ProUpgradeCard />}>
  <NutritionGuidancePanel />
</EntitlementGate>
```

**Conditional render (rarely needed):**
```tsx
const { hasPro } = useEntitlement();
{hasPro && <ProBadge />}
```

### Supabase mirror columns (on `profiles`)
| Column | Type | Purpose |
|---|---|---|
| `subscription_tier` | text, default `'free'`, CHECK in (`free`, `standard`, `pro`) | Current tier mirror |
| `subscription_expires_at` | timestamptz | Renewal/expiry from RC |
| `subscription_product_id` | text | e.g. `era_pro_monthly` |

RLS: the `subscription_*` columns are **locked to service_role** (`prevent_subscription_tampering` trigger, 2026-07-05) — a user can no longer set their own tier. ✅ The "Phase 2 authoritative RC webhook → Supabase edge function" is now built (`revenuecat-webhook` + `apply_subscription_event`); a fourth column `subscription_event_at` was added as an out-of-order guard. See REVENUECAT_STATUS.md §6.A for deploy status.

### Access status (as of 2026-06-08)
- RevenueCat admin invite sent by Rami to `appeneuretech@gmail.com` — confirm received before starting.
- Google Play Console access — Rami to re-share to `appeneuretech@gmail.com`.
- Apple Developer Account — RK2 Holding AS approved 2026-06-08, fully active.

---

## 4. App Store Submission Blocker

Apple flagged that `erafit.no` (currently redirects to Instagram) is insufficient as the organization website.

Required before submission:
- Real landing page on erafit.no
- Company info (RK2 Holding AS)
- Support contact email (need to set this up)
- Privacy Policy
- Terms of Service

---

## 5. 12-Week Program Completion Flow

### Program selection after week 12

**Male users:**
1. Restart Male Advanced with progressed weights, OR
2. Switch to Bro Split, OR
3. Take a deload week before restart

**Female users:**
1. Restart Female Golden Era with progressed weights, OR
2. Take a deload week before restart

Bro Split is NOT included for the female track at launch.

### New starting weight formula

Base case:
```
New Week 1 Top Set = (last successful Week 12 Top Set) × 1.05
```
Example: Week 12 Bench 100 kg × 5 rated "correct" → New Week 1 Top Set = 105 kg × 5

Edge cases:
- If user failed final Week 12 Top Set → use **90%** of attempted weight as new starting point
- If user skipped Week 12 entirely → restart at **Week 11 weight + 2.5%**
- If user rates first session "too heavy" → Smart Weight Engine adjusts down automatically from there

---

## 6. Open Items Before RevenueCat Lock

1. **Confirm Pro feature implementation status** — Rami explicitly asked:
   > "Please confirm which Pro features are currently implemented in the app vs. which are pending in the additional sprint. If anything in the Pro tier isn't yet built, let's discuss timing before I lock the tier structure for RevenueCat."

   Pro features to verify:
   - Top Set + Back-off Set → spec locked but ship status unclear
   - Advanced meal logging → status unclear
   - Meal suggestions → status unclear
   - Nutrition Guidance → status unclear
   - Total + Lifetime Volume → added to current sprint on 2026-06-03
   - 12-week progression chart → status unclear

2. **Confirm RevenueCat admin invite accepted** by `appeneuretech@gmail.com`.

3. **Landing page on erafit.no** — must be live before App Store submission.

---

## 7. Related Specs

- `mobile/PR_FEATURE.md` — PR detection (max_weight only)
- `WORKOUT_SCHEMA_EXPLAINED.md` — DB schema
- Memory: `project_top_set_backoff_model.md`, `project_advanced_program_scope.md`, `project_weight_adjustment.md`, `project_era_points_streak_spec.md`
