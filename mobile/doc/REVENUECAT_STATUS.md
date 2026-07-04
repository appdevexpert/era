# REVENUECAT_STATUS.md

**End-to-end completion status of the RevenueCat subscription integration.**

Audited: 2026-07-04. Branch: `clean-build`.
Companion doc: [`PAYMENT_FEATURE.md`](./PAYMENT_FEATURE.md) (tiers, pricing, spec — locked by Rami 2026-06-12). This file is the **status / what's-left tracker**; PAYMENT_FEATURE is the spec.

---

## 0. TL;DR (read this first)

- **App-side (client) integration: DONE and correct.** ✅ Subscribe, upgrade, downgrade, cancel, expiry, grace period, refund, restore, resubscribe all reflect correctly on-device, because RevenueCat's SDK does the lifecycle logic and the app reads its verdict live.
- **Server/DB side: NOT authoritative.** 🔴 There is **no RevenueCat → Supabase webhook**. The `profiles` subscription columns are written by the phone only, while the app is open. DB tier is *eventually consistent*, not real-time.
- **Cannot be verified from code (must be done + tested manually):** 🔴 RevenueCat dashboard config (products, entitlements, published offering), App Store Connect / Play Console products, and a real **sandbox purchase test**.

**"Is everything working?" →** The code path is correct. It is **not "proven" until you (1) build the webhook, (2) publish the RC offering + store products, and (3) run one full sandbox subscribe → cancel → restore → resubscribe cycle.**

---

## 1. Architecture (how it works, end to end)

```
App boot
  └─ App.tsx → configureRevenueCat()          // one-time SDK config + global customerInfo listener

Login (auth-first: login happens BEFORE onboarding/paywall)
  └─ authSlice / Navigation SIGNED_IN → identifyRevenueCatUser(supabaseUserId)
       └─ Purchases.logIn(uid)                 // RC App User ID == Supabase UID
       └─ every purchase now attaches to the correct account

Any entitlement change (purchase / renew / cancel / expiry / refund)
  └─ Purchases.addCustomerInfoUpdateListener fires (also on every app foreground)
       └─ updateCachedSnapshot(customerInfo)
            ├─ in-memory snapshot updated → useEntitlement consumers re-render → gates lock/unlock
            └─ saveSubscriptionState(userId, snapshot) → mirror into profiles (client-side only)

Logout / delete account
  └─ resetRevenueCatUser() → Purchases.logOut()
```

**Golden rule of this setup:** RevenueCat SDK is the **source of truth on the device**. The app never computes entitlement itself — it only reflects RC. That is why the lifecycle "just works" without us writing payment state machines.

**Entitlement hierarchy:** `pro` ⊃ `standard` ⊃ `free`. A `pro` user passes every `standard` gate.

---

## 2. What is DONE ✅ (client code — all wired and in use)

| Area | Status | File(s) |
|---|---|---|
| SDK installed | ✅ | `react-native-purchases ^10.4.0`, `react-native-purchases-ui ^10.4.0` (package.json) |
| API keys present | ✅ | `.env.local` (Apple + Google both set), read via `app/config/env.ts` |
| SDK config (one-time, idempotent) | ✅ | `app/services/revenueCatService.ts` → `configureRevenueCat()`, called at `app/App.tsx:22` |
| Global `customerInfo` listener | ✅ | `revenueCatService.ts` (fans out to hooks + DB mirror) |
| User identity link (RC ↔ Supabase UID) | ✅ | `identifyRevenueCatUser()` in `Navigation.tsx` (SIGNED_IN) + `authSlice.ts` (sign-in/sign-up) |
| Logout / delete reset | ✅ | `resetRevenueCatUser()` in `authSlice.ts` (logout + deleteAccount) |
| Entitlement model (`standard`, `pro`) | ✅ | `revenueCatService.ts` — snapshot `{ tier, expiresAt, productId }`, pro>standard |
| Read hook | ✅ | `app/hooks/useEntitlement.ts` |
| Action gate (→ paywall) | ✅ | `app/hooks/useRequireEntitlement.ts` |
| UI section gate | ✅ | `app/components/common/EntitlementGate.tsx` |
| Locked-feature placeholder | ✅ | `app/components/workout/ProChartLockedCard.tsx` |
| Paywall screen (inline RC UI) | ✅ | `app/screen/home/PaywallScreen.tsx` (handles purchase / restore / dismiss) |
| Paywall routes registered | ✅ | `OnboardingNavigator.tsx`, `HomeNavigator.tsx` |
| Onboarding → paywall entry | ✅ | `app/screen/onboarding/Onboarding.tsx:153` (`source: "onboarding"`) |
| Manage / cancel / refund UI | ✅ | `ManageSubscriptionBottomSheet.tsx` → `presentCustomerCenter()` (RC Customer Center + OS-settings fallback) |
| Subscription display in Profile | ✅ | `ProfileScreen.tsx` (tier / productId / daysRemaining) |
| DB mirror write | ✅ | `app/services/profileService.ts` → `saveSubscriptionState()` |
| DB columns + constraint + index | ✅ | `supabase/workout_schema.sql:145` (`subscription_tier/_expires_at/_product_id`) |
| Build-time kill switch | ✅ | `app/config/featureFlags.ts` → `ENABLE_PAYWALL` (currently `true` on this branch) |

### Feature gating actually applied (not just built)

| Tier required | Feature | File |
|---|---|---|
| **standard** | Smart Weight Engine (auto weight) | `WorkoutLogScreen.tsx`, `ExerciseListScreen.tsx` |
| **standard** | Weight history graph | `components/progress/WeightStatsCard.tsx` |
| **standard** | Meal logging | `NutritionScreen.tsx` |
| **standard** | Transformation gallery | `TransformationGalleryScreen.tsx` |
| **standard** | "What comes next" | `WhatComesNowScreen.tsx` |
| **standard** | Post-session flow gate | `SessionCompleteScreen.tsx` |
| **pro** | 12-week progression chart | `ExerciseHistoryScreen.tsx` |
| **pro** | Top Set stat | `TimerLogScreen.tsx`, `CardioTimerScreen.tsx` |

### Verified-safe edge case (was the scariest risk, and it's fine)
The app is **auth-first** (`Navigation.tsx:273` → login before onboarding/paywall). So the user is **always logged in and RC-identified before any purchase.** The "bought while anonymous → purchase lost on login" bug **cannot happen here.** ✅

---

## 3. How subscription data is stored in the DB

Table **`profiles`** (`supabase/workout_schema.sql:145`):

| Column | Type | Notes |
|---|---|---|
| `subscription_tier` | `text` default `'free'`, CHECK in (`free`,`standard`,`pro`) | current tier mirror |
| `subscription_expires_at` | `timestamptz` | renewal/expiry from RC |
| `subscription_product_id` | `text` | e.g. `era_pro_monthly` |
| index `idx_profiles_subscription_tier` | | |

- Written by `saveSubscriptionState()` on **every** `customerInfo` change while the app is open + logged in.
- **Self-heals on every app open:** cold start → login → `logIn` returns fresh customerInfo → listener → mirror re-synced.
- RLS `profiles_update_self` allows the user to write their own row (this is what makes the client mirror possible).
- **Currently NO server code reads these columns** — `web/` has zero consumers. So today the mirror is write-only / informational; its staleness has **zero user-facing impact yet.**

---

## 4. Payment lifecycle edge cases — verdict

RevenueCat handles the lifecycle; the app reflects it. On-device access:

| Scenario | On-device access | Notes |
|---|---|---|
| Subscribe | ✅ instant | `onPurchaseCompleted` + listener |
| Upgrade standard→pro | ✅ instant | pro wins hierarchy |
| Downgrade / crossgrade (monthly↔annual) | ✅ | applies when store applies it |
| Cancel auto-renew | ✅ | access continues until expiry (correct) |
| Expiry / lapse | ✅ | drops to free on next app foreground |
| Billing grace period | ✅ | access maintained during grace |
| Refund / revoke | ✅ | access drops on next foreground |
| Restore (reinstall / new device) | ✅ | auto via `logIn(uid)` + paywall restore + Customer Center |
| Resubscribe after lapse | ✅ | new purchase → listener |

**On-device access control is correct for all of the above.** ✅

---

## 5. What is PENDING 🔴 / risks

1. **No RevenueCat webhook → Supabase (biggest gap).**
   - No `supabase/functions` dir, no webhook handler anywhere in the repo.
   - Consequence: if a sub changes **while the app is closed** (renew/cancel/expire/refund), `profiles.subscription_tier` stays stale until the user next opens the app.
   - Also: RLS lets a user write their own `subscription_tier` → **spoofable** by a direct API call. Harmless today (nothing server-side trusts it) but must be locked down before any backend/admin/analytics reads it.

2. **RevenueCat dashboard config — not verifiable from code.** Products (`era_standard_monthly/annual`, `era_pro_monthly/annual`), entitlements (`standard`, `pro`), and a **published "current" offering** (PaywallScreen relies on `offerings.current`; unpublished → error screen).

3. **App Store Connect / Google Play Console — not verifiable from code.** Products created + approved/active, IAP agreements + tax/banking signed, iOS In-App Purchase capability enabled, sandbox/test accounts created. (`app.json` lists no IAP capability plugin; RN-purchases 10.x autolinks, but confirm the capability in the real build's provisioning.)

4. **No sandbox test done yet.** Correctness of config can ONLY be proven by a real sandbox purchase run.

5. **App Store submission blockers** (from PAYMENT_FEATURE §4, dated 2026-06-08 — re-verify): real `erafit.no` landing page, Privacy Policy, Terms of Service, support email.

6. **Cosmetic (optional, not correctness):** app tracks only `tier/expiresAt/productId`, not `willRenew` / `billingIssueDetectedAt` / `unsubscribeDetectedAt`. So no "subscription ends on X" / "billing problem — update card" / "in grace period" banners. Access is always correct; the app just doesn't *tell* the user about a pending cancel or billing issue.

---

## 6. TO DO — steps to fully complete

### A. Server authority (code — makes DB trustworthy)
- [ ] **Create Supabase edge function** `revenuecat-webhook` that verifies RC's `Authorization` header and upserts `profiles.subscription_tier/_expires_at/_product_id` from the event (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `PRODUCT_CHANGE`, `BILLING_ISSUE`, `REFUND`). Use service-role key server-side.
- [ ] **Register the webhook URL** in RevenueCat dashboard → Integrations → Webhooks, with the shared secret.
- [ ] **Lock down RLS:** remove `subscription_*` columns from what `profiles_update_self` can write (move to a restricted column set or a SECURITY DEFINER RPC), so only the webhook/service role can set tier. Keep the client mirror as a fast-path fallback only.
- [ ] Regenerate `supabase/workout_schema.sql` after the RLS change (schema-mirror rule).

### B. RevenueCat dashboard (config — no code)
- [ ] Create products `era_standard_monthly`, `era_standard_annual`, `era_pro_monthly`, `era_pro_annual`.
- [ ] Create entitlements `standard` and `pro`; attach products.
- [ ] Build + **publish** the default offering (this is what the paywall renders). Confirm `offerings.current` is non-null.
- [ ] Design the paywall in RC's Paywall editor (RevenueCatUI renders the hosted design).

### C. App Store / Play (store — no code)
- [ ] App Store Connect: create the 4 auto-renewable subscriptions, pricing (NOK: 99 / 899 / 199 / 1799), localizations, "Ready to Submit"; sign Paid Apps agreement + tax/banking.
- [ ] Play Console: create the 4 subscriptions + base plans, activate.
- [ ] Confirm iOS **In-App Purchase capability** is enabled in the app's provisioning/entitlements.
- [ ] Create sandbox / license test accounts (Apple sandbox tester, Play license tester).

### D. Store review compliance
- [ ] `erafit.no` real landing page (company info: RK2 Holding AS).
- [ ] Privacy Policy + Terms of Service (linked in-app / store listing).
- [ ] Support email live.
- [ ] Restore button — already present (paywall + Customer Center). ✅
- [ ] Manage/cancel — already present (Customer Center). ✅

### E. Optional UX polish
- [ ] Extend the snapshot to read `willRenew` / `billingIssueDetectedAt` and show "ends on X" / "billing issue" banners in Profile.

---

## 7. Sandbox test checklist (the real proof — do this on a physical device)

Run with a sandbox tester account. This is what actually confirms "everything works."

1. [ ] Fresh install → login → reach onboarding paywall → **buy Standard monthly** → standard features unlock instantly.
2. [ ] Confirm `profiles.subscription_tier = 'standard'` in Supabase.
3. [ ] **Upgrade to Pro** → pro features (12-week chart, Top Set) unlock.
4. [ ] **Cancel** from Customer Center → access **stays** until the (sandbox-accelerated) expiry.
5. [ ] Let it **expire** → reopen app → drops to free → gates lock → DB shows `free` (after webhook, verify it flips even without opening the app).
6. [ ] **Restore** on a second device / after reinstall (same login) → entitlement returns.
7. [ ] **Resubscribe** → unlocks again.
8. [ ] **Refund** (RC dashboard grant/revoke or store sandbox) → access revoked on next foreground; webhook flips DB.
9. [ ] Repeat 1–3 on **Android**.

> Until steps 1–9 pass, treat the integration as **code-ready, not proven.**

---

## 8. Bottom line (plain)

The app code is done and reflects RevenueCat correctly for every subscription state. To call it **truly complete and safe to trust server-side**, do §6.A (webhook + RLS lockdown), finish §6.B/C/D (dashboard + store + compliance), and pass §7 (sandbox test). The webhook alone does **not** make everything work — the dashboard/store config + a real test do.
