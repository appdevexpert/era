# PAYMENT_TEST_PLAN.md

End-to-end iOS TestFlight test plan for the RevenueCat subscription flow. Run this before production release to prove that purchase → upgrade → cancel → expiry → restore → refund all work correctly on-device AND in the Supabase mirror.

Companion docs:
- [`PAYMENT_FEATURE.md`](./PAYMENT_FEATURE.md) — spec (tiers, prices, entitlements). Locked 2026-06-12.
- [`REVENUECAT_STATUS.md`](./REVENUECAT_STATUS.md) — what's built, what's pending. Read §7 for the raw checklist this doc expands.
- [`CLEAN_BUILD.md`](./CLEAN_BUILD.md) — the `ENABLE_PAYWALL` build-time flag that must be `true` before any of this is testable.

Scope: **iOS TestFlight only.** Android will use the same checklist once Play products are created.

Owner: Tejasvi. Prepared 2026-07-08.

---

## 0. Pre-flight blockers — resolve BEFORE testing

If any of these is not confirmed, the test flow will fail silently or crash. Do not proceed past this section until every box is checked.

### 0.1 Build flag — CONFIRMED ✅ (2026-07-08)
- [x] `ENABLE_PAYWALL = true` in `app/config/featureFlags.ts` (commit `042f04d`, branch `clean-build`).
- [x] `ENABLE_NOTIFICATIONS = true` as well — full production-like flow.
- [ ] Confirm the TestFlight build number matches the current branch state (bump if the build was uploaded before commit `042f04d`).

### 0.2 RevenueCat dashboard
- [x] Products exist and are attached to entitlements (verified 2026-07-08):
  - `era_standard_monthly` → `standard`
  - `era_standard_annual` → `standard`
  - `era_pro_monthly` → `pro`
  - `era_pro_annual` → `pro`
- [x] `default-new` is set as the current offering (confirmed 2026-07-08).
- [ ] The `default-new` offering's 4 packages point to the 4 products above (not stale/deleted variants).
- [ ] 🔴 **Paywall content fix needed** — current paywall shows placeholder Pro copy (`"fdfgdgd"`) and wrong Pro price (`$2.99`). Update Pro tier's feature list + pricing in RC → Paywalls editor before testing. Use the bullets in `PAYMENT_FEATURE.md` §1.

### 0.3 App Store Connect
- [ ] All 4 subscriptions in the "EraFit Subscription" group (ID `22170489`) are at status "Ready to Submit" (verified 2026-07-08 ✅).
- [ ] NOK prices confirmed per subscription:
  - `era_standard_monthly` = **99 NOK**
  - `era_standard_annual` = **899 NOK**
  - `era_pro_monthly` = **199 NOK**
  - `era_pro_annual` = **1799 NOK**
- [ ] Business tab: **Paid Apps Agreement = Active**, **Tax Forms = Complete**, **Bank Account = Complete**. Sandbox purchases will fail without these.
- [ ] iOS In-App Purchase capability is enabled in the app's provisioning profile / entitlements.

### 0.4 Sandbox test account
- [ ] Sandbox tester exists in ASC (verified 2026-07-08 ✅): `tejasvi+1@appeneure.com` (India).
- [ ] On the test iPhone, signed in via `Settings → App Store → Sandbox Account` (NOT the regular Apple ID slot).
- [ ] Regular Apple ID under `Settings → Media & Purchases` can stay signed in — StoreKit uses the sandbox slot when the app is a sandbox / TestFlight build.

### 0.5 Supabase
- [ ] Access to Supabase project `soyvnnicpkttehwjlpie` SQL editor.
- [ ] Test user's UUID recorded (see §1 below — you get this after first sign-up).
- [ ] Webhook health: RC dashboard → Integrations → Webhooks → last "Test event" returned `200` (verified 2026-07-05 ✅).

### 0.6 Device
- [ ] Physical iPhone (simulator does NOT support sandbox purchases).
- [ ] Prior installs of ERA deleted to reset local Redux state.

---

## 1. Verification SQL

Keep this open in a Supabase SQL editor tab throughout the test. Re-run it after every purchase, upgrade, cancel, expiry, restore, and refund.

```sql
-- Replace with your test user UUID after first sign-up
SELECT
  id,
  email,
  subscription_tier,
  subscription_product_id,
  subscription_expires_at,
  subscription_event_at,
  updated_at
FROM profiles
WHERE id = '<TEST_USER_UUID>';
```

To find the UUID from the email:

```sql
SELECT id FROM auth.users WHERE email = '<test-signup-email>';
```

Record it here once known:

```
TEST_USER_UUID = ______________________________________
TEST_USER_EMAIL = _____________________________________
```

---

## 2. Phase 1 — Fresh subscribe (Standard Monthly)

### 2.1 Sign up
- [ ] Launch ERA on the test iPhone
- [ ] Sign up with a NEW email (suggest `tejasvi+testpay1@appeneure.com`)
- [ ] Complete onboarding steps → paywall screen appears
- [ ] Grab the new user's UUID and fill it in §1 above

### 2.2 Paywall renders correctly
- [ ] All 4 tiers appear with correct NOK prices (99 / 899 / 199 / 1799)
- [ ] Restore Purchases button is visible
- [ ] Localized correctly for the app language (English or Norwegian)

### 2.3 Purchase Standard Monthly
- [ ] Tap **Standard Monthly** → iOS sandbox purchase sheet appears
- [ ] Confirm with sandbox password
- [ ] Paywall dismisses, onboarding completes, Home tab loads

### 2.4 On-device gates (Standard tier)
- [ ] Open any workout → Smart Weight Engine shows suggested weight (NOT locked) — file: `WorkoutLogScreen.tsx`
- [ ] Open Nutrition tab → meal logging works — file: `NutritionScreen.tsx`
- [ ] Open Progress → weight history graph renders — file: `WeightStatsCard.tsx`
- [ ] Open Transformation Gallery → unlocked — file: `TransformationGalleryScreen.tsx`
- [ ] Session Complete flow does NOT redirect to paywall — file: `SessionCompleteScreen.tsx`

### 2.5 Pro gates should STILL be locked
- [ ] Open exercise history → 12-week progression chart shows `ProChartLockedCard` — file: `ExerciseHistoryScreen.tsx`
- [ ] Open cardio / timer log → Top Set stat is locked / hidden — files: `TimerLogScreen.tsx`, `CardioTimerScreen.tsx`

### 2.6 DB verification
- [ ] Run §1 SQL. Expected values:
  - `subscription_tier` = `'standard'`
  - `subscription_product_id` = `'era_standard_monthly'`
  - `subscription_expires_at` = ~5 minutes from now (sandbox accelerated)
  - `subscription_event_at` = populated (RC event timestamp)

---

## 3. Phase 2 — Upgrade Standard → Pro Monthly

### 3.1 Trigger upgrade
- [ ] Profile → Manage Subscription → RC Customer Center opens
- [ ] Choose **Change Plan → Pro Monthly** → confirm sandbox purchase

### 3.2 On-device gates (Pro tier)
- [ ] 12-week progression chart in Exercise History unlocks
- [ ] Top Set stat in Timer Log / Cardio Timer unlocks

### 3.3 DB verification
- [ ] `subscription_tier` = `'pro'`
- [ ] `subscription_product_id` = `'era_pro_monthly'`
- [ ] `subscription_event_at` is newer than the Phase 2.6 value

---

## 4. Phase 3 — Cancel + expiry (proves webhook works while app is closed)

This is the most important test. It proves the DB stays correct even when the app is not running.

### 4.1 Cancel
- [ ] Customer Center → Cancel subscription → confirm
- [ ] On-device: access **stays** immediately after cancel (correct behavior — until expiry)

### 4.2 Background the app (do NOT force-quit, do NOT reopen)
- [ ] Press Home / swipe up to background the ERA app
- [ ] Wait for sandbox expiry:
  - Monthly product → **5 minutes** real time
  - Annual product → **1 hour** real time

### 4.3 DB verification WHILE APP IS STILL BACKGROUNDED
- [ ] Run §1 SQL from Supabase editor (NOT from the app)
- [ ] Expected: `subscription_tier` = `'free'` — even though nothing on the device changed
- [ ] This proves the RevenueCat → Supabase webhook is doing its job
- [ ] If DB is still `'pro'`, the webhook did NOT fire — check RC dashboard → Integrations → Webhooks → recent deliveries for the failed event

### 4.4 Return to the app
- [ ] Foreground ERA
- [ ] Gates re-lock:
  - `ProChartLockedCard` renders in Exercise History
  - Smart Weight Engine goes back to locked/hidden
  - Meal logging redirects to paywall
- [ ] Home shows the paywall entry point / upgrade CTA

---

## 5. Phase 4 — Restore purchases

Simulates a user reinstalling or switching devices.

### 5.1 Setup — buy again
- [ ] From the now-free state, buy Standard Monthly again through the paywall
- [ ] Confirm gates unlock and DB shows `'standard'`

### 5.2 Uninstall + reinstall
- [ ] Delete ERA from the iPhone
- [ ] Reinstall from TestFlight
- [ ] Launch → log in with the SAME test email
- [ ] Paywall appears (fresh local state → RC hasn't cached the customer yet locally)
- [ ] Tap **Restore Purchases** on the paywall
- [ ] Standard gates unlock without re-charging
- [ ] DB is unchanged (still `'standard'`, same `subscription_product_id`)

---

## 6. Phase 5 — Refund (RC dashboard grant/revoke)

### 6.1 Revoke via RC dashboard
- [ ] Open RC dashboard → Customers → search by Supabase UID
- [ ] Grant / Revoke → revoke the active entitlement
- [ ] Foreground the app → access drops (may take one foreground cycle)
- [ ] DB verification: `subscription_tier` = `'free'`

---

## 7. Phase 6 — Paywall from Profile (non-onboarding entry)

The paywall is reachable from two sources. The `source` param determines what happens on dismiss.

### 7.1 Free user opens paywall from Profile
- [ ] With a free account, from Profile → tap Upgrade
- [ ] Paywall opens (`source: "profile"`)
- [ ] Tap the X / dismiss WITHOUT buying
- [ ] Should pop back to Profile — should NOT re-trigger onboarding completion or navigate to Home

### 7.2 Compare with onboarding entry (already covered in Phase 1)
- [ ] Onboarding paywall dismiss = navigation completes onboarding → Home

---

## 8. Phase 7 — Annual tiers

Sandbox pricing verification for the annual SKUs.

### 8.1 Standard Annual
- [ ] Fresh signup with a new email
- [ ] Complete onboarding → paywall
- [ ] Tap **Standard Annual** (899 NOK) → confirm sandbox purchase
- [ ] DB: `subscription_product_id` = `'era_standard_annual'`, `subscription_tier` = `'standard'`
- [ ] `subscription_expires_at` should be ~1 hour from now (annual sandbox timing)

### 8.2 Pro Annual
- [ ] Fresh signup with another new email
- [ ] Tap **Pro Annual** (1799 NOK) → confirm sandbox purchase
- [ ] DB: `subscription_product_id` = `'era_pro_annual'`, `subscription_tier` = `'pro'`

---

## 9. Phase 8 — Feature gate spot-checks (as free user)

Sanity-check that `useRequireEntitlement` and `EntitlementGate` are wired everywhere they should be. Run with a fresh account that has NOT purchased.

### 9.1 Standard gates → paywall redirect
- [ ] Tap Smart Weight Engine action → redirects to paywall — `WorkoutLogScreen.tsx`, `ExerciseListScreen.tsx`
- [ ] Try to log a meal → redirects to paywall — `NutritionScreen.tsx`
- [ ] Try to open weight history graph → gate blocks — `WeightStatsCard.tsx`
- [ ] Try to open transformation gallery → gate blocks — `TransformationGalleryScreen.tsx`
- [ ] Session complete screen → paywall gate — `SessionCompleteScreen.tsx`

### 9.2 Pro gates → placeholder / paywall
- [ ] Exercise history 12-week chart → `ProChartLockedCard` renders — `ExerciseHistoryScreen.tsx`
- [ ] Cardio / timer Top Set stat → hidden or locked — `TimerLogScreen.tsx`, `CardioTimerScreen.tsx`

---

## 10. Regression checks

Non-payment flows that could be inadvertently broken by the paywall being enabled.

- [ ] First-run login → signup flow still completes without crash
- [ ] Auth-first flow: user reaches paywall AFTER login (RC identity attached before purchase) — check RC dashboard shows the App User ID = Supabase UID
- [ ] Delete account flow: purchase state cleared on RC (`resetRevenueCatUser` called)
- [ ] Logout → login as different user: entitlement snapshot flips correctly
- [ ] Notifications flag: if `ENABLE_NOTIFICATIONS` is also flipped on for this build, permission modal appears once after login (not on every launch)
- [ ] i18n: paywall renders in Norwegian when app language is `nb`

---

## 11. Sign-off checklist

Only mark this section complete when every phase above passes end-to-end on a physical iPhone with a sandbox tester account.

- [ ] Phase 1 (Fresh subscribe Standard Monthly) — passed on _________ (date)
- [ ] Phase 2 (Upgrade to Pro Monthly) — passed on _________
- [ ] Phase 3 (Cancel + expiry, DB flips while app closed) — passed on _________
- [ ] Phase 4 (Restore after reinstall) — passed on _________
- [ ] Phase 5 (Refund) — passed on _________
- [ ] Phase 6 (Paywall from Profile) — passed on _________
- [ ] Phase 7 (Standard Annual + Pro Annual pricing) — passed on _________
- [ ] Phase 8 (Free-user gate spot-checks) — passed on _________
- [ ] Regression checks — passed on _________

Tester: _______________________
TestFlight build number: _______________________
Date signed off: _______________________

---

## 12. What to do when a phase fails

| Symptom | Likely cause | Where to look |
|---|---|---|
| Paywall never appears after onboarding | `ENABLE_PAYWALL = false` in the shipped build | `mobile/app/config/featureFlags.ts` — must be `true`; rebuild + upload |
| Paywall crashes / "No offerings" error | `offerings.current` is null in RC | RC dashboard → Offerings → mark the correct offering as "Current" |
| Sandbox purchase sheet doesn't appear | Sandbox tester not signed in on device | `Settings → App Store → Sandbox Account` — sign in with `tejasvi+1@appeneure.com` |
| Purchase completes on device but DB stays `'free'` | Webhook didn't fire or failed auth | RC dashboard → Integrations → Webhooks → last delivery; also Supabase → Edge Function logs → `revenuecat-webhook` |
| DB stays `'pro'` after cancel + expiry (with app closed) | Webhook not receiving `EXPIRATION` event | Same as above; check `apply_subscription_event` RPC logs; verify `subscription_event_at` isn't blocking a later event as stale |
| Restore doesn't return entitlement | RC App User ID mismatch (bought while anonymous) | Should NOT happen — auth-first flow prevents it. If it does, check `identifyRevenueCatUser` is called on `SIGNED_IN` in `Navigation.tsx` |
| Norwegian prices show as USD or blank | ASC localization not published, or storefront on device set to wrong region | Sandbox tester's region should match Norway; ASC subscription localization should be published |
| Gate doesn't lock on free user | Feature-gate hook not wired on that screen | Grep for the screen in `REVENUECAT_STATUS.md` §2 "Feature gating actually applied" table — add hook if missing |

---

## 13. When this plan is done

- If all boxes pass → payments are production-ready for iOS. Re-run the plan on Android once Play products are created.
- Update `REVENUECAT_STATUS.md` §7 to mark the sandbox test checklist ✅ with the sign-off date.
- File an issue for any UX polish items caught during testing (e.g., banner for "billing issue" — currently not implemented per REVENUECAT_STATUS.md §5.6).
