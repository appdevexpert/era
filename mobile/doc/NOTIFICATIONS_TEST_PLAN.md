# Notifications — Test Plan & Approval Checklist

Date: 2026-07-08
Purpose: Verify every implemented notification trigger works end-to-end before sign-off.
Companion to: `doc/NOTIFICATIONS.md` (spec/architecture).

Use this file as a **QA runbook**. Tick each box while testing. When every mandatory box under a phase is ticked and no P0 bugs remain, the notification feature is considered **approved for release**.

---

## 0. What's Being Tested

Phase 1 (shipped) — three notification types + permission gate + profile toggles.

| # | Notification | Type | Where implemented | Toggle key |
|---|---|---|---|---|
| 1 | **Daily Reminder** | Local, repeating daily @ 08:00 | `app/utils/notifications.ts::scheduleDailyReminder` | `preferences.notifications.dailyReminder` |
| 2 | **Streak Warning** | Local, repeating daily @ 19:00 | `app/utils/notifications.ts::scheduleStreakWarning` | `preferences.notifications.streakWarning` |
| 3 | **PR Alert** | Local, instant | `app/utils/notifications.ts::firePRAlert` (called from `useWorkoutSession.ts`) | `preferences.notifications.prAlerts` |
| 4 | **Weekly Summary** | Push (Phase 2) | UI only — **no-op**. Toggle exists in Profile but nothing schedules it. | `preferences.notifications.weeklySummary` |

Feature flag: `FEATURE_FLAGS.ENABLE_NOTIFICATIONS` in `app/config/featureFlags.ts` — must be `true` for any of this to fire.

---

## 1. Pre-Flight (Blockers)

Do this once before touching any test.

- [ ] `FEATURE_FLAGS.ENABLE_NOTIFICATIONS === true` in `app/config/featureFlags.ts`
- [ ] Building a **Development Build** or TestFlight/internal build — Expo Go on SDK 53+ does not support notification permission
- [ ] Physical device recommended (iOS Simulator works for scheduled notifications; Android emulator can delay first fire on cold boot)
- [ ] `npx expo prebuild --clean` has been run at least once since `expo-notifications` was added
- [ ] `app.json` includes `expo-notifications` plugin (verify `color: "#D4AF37"`)
- [ ] For a clean run, uninstall the app before starting — this resets `hasAskedNotificationPermission` and OS permission state

---

## 2. Permission Gate (First-Login Modal)

Files: `app/screen/notificationPermission/NotificationPermission.tsx`, `app/navigation/Navigation.tsx`, `authSlice.hasAskedNotificationPermission`

### 2A. Modal Appearance

- [ ] Fresh install → sign up / log in → modal slides up (iOS `pageSheet`, Android full-screen)
- [ ] Modal appears **on top of** the destination stack (Onboarding, PlanGen, or Home — whichever the user lands in)
- [ ] Preview cards render correctly (PR sample + Daily Reminder sample)
- [ ] Copy is localized:
  - EN: "Never miss a session"
  - NB: switch language to Norwegian before login → title reads in Norwegian
- [ ] `notificationPermission.hint` visible: "You can change this in settings any time."

### 2B. Enable Flow

- [ ] Tap **Allow Notifications** → native OS permission popup appears
- [ ] Grant permission → modal auto-dismisses
- [ ] `state.preferences.notificationPermissionStatus === "granted"` (verify via debugger / Redux DevTools if available)
- [ ] `state.auth.hasAskedNotificationPermission === true`
- [ ] Two schedules created — verify by adding a temp `Notifications.getAllScheduledNotificationsAsync()` log OR by opening Profile and confirming Daily Reminder + Streak Warning toggles are **ON** by default after grant

### 2C. Deny Flow

- [ ] Uninstall → reinstall → tap **Allow Notifications** → **Deny** at OS popup
- [ ] Modal closes
- [ ] `notificationPermissionStatus === "denied"`
- [ ] Profile → Notifications section shows "Notifications are turned off" + "Open System Settings" link (no toggles)

### 2D. Maybe Later Flow

- [ ] Fresh install → tap **Maybe Later** → modal closes silently
- [ ] No native OS popup was shown
- [ ] `hasAskedNotificationPermission === true`
- [ ] No scheduled notifications exist

### 2E. Back Button (Android)

- [ ] iOS: fullScreen presentation offers no swipe-to-dismiss — verify Enable / Maybe Later are the only exits
- [ ] Android: hardware back button → treated same as Maybe Later (flag set, no re-open)

### 2F. One-Time Gate

- [ ] After any of Enable / Deny / Maybe Later / Dismiss → kill app → relaunch → modal does **NOT** re-appear
- [ ] Sign out and sign back in → modal still does **NOT** re-appear (flag survives auth cycle)
- [ ] Delete account → sign up fresh → modal re-appears (state reset via `RESET_ALL`)

---

## 3. Daily Reminder

Files: `app/utils/notifications.ts::scheduleDailyReminder`, `ProfileScreen.tsx`, `notificationContent.dailyReminder` locale keys.

### 3A. Scheduling

- [ ] After granting permission → Daily Reminder is scheduled automatically (identifier `era.dailyReminder`)
- [ ] Profile → toggle Daily Reminder **OFF** → schedule cancelled
- [ ] Toggle **ON** again → schedule recreated (no duplicates)
- [ ] Toggle survives app kill + relaunch (reads persisted preference)

### 3B. Delivery

- [ ] Wait until 08:00 local time (or temporarily edit hour in `scheduleDaily(...)` to fire soon for testing) → notification arrives
- [ ] Title: "Time to train" (EN) / Norwegian equivalent
- [ ] Body: "Your workout is waiting. Let's go!"
- [ ] Sound plays
- [ ] Tapping notification opens the app
- [ ] App foregrounded when notification fires → banner still shows (per foreground handler)

### 3C. Post-Test

- [ ] Reset hour back to 8 before committing

---

## 4. Streak Warning

Files: `app/utils/notifications.ts::scheduleStreakWarning`, `notificationContent.streakWarning` locale keys.

### 4A. Scheduling

- [ ] Scheduled automatically after permission grant (identifier `era.streakWarning`)
- [ ] Toggle OFF → cancelled; toggle ON → recreated
- [ ] Fires at 19:00 local every day

### 4B. Delivery

- [ ] Notification arrives at 19:00 with title: "Don't break your streak"
- [ ] Body: "Log a workout today to keep your streak alive."
- [ ] Note: fires regardless of actual streak state (no client-side risk check). This is expected Phase 1 behavior — do not raise as a bug.

### 4C. Language

- [ ] Switch language mid-day → next fire uses new locale
- [ ] Norwegian body reads correctly (no i18n key visible in output)

---

## 5. PR Alert

Files: `app/hooks/useWorkoutSession.ts` (call site), `app/utils/notifications.ts::firePRAlert`, `notificationContent.prAlert` locale keys.

### 5A. Trigger

- [ ] Log a set that beats the previous `max_weight` PR for that exercise
- [ ] `checkAndCreateSetPRs` returns a `prDetail` payload
- [ ] Local notification fires **immediately** (title: "New PR!", body: "{ExerciseName} — {weight} {unit}")
- [ ] In-app PR celebration screen also appears (both should happen — notification is supplementary)
- [ ] Tap notification → app opens

### 5B. Toggle Gate

- [ ] Profile → PR Alerts **OFF** → log another PR → **no notification** fires
- [ ] In-app celebration still appears (unaffected by toggle)
- [ ] Profile → PR Alerts **ON** → next PR fires notification

### 5C. Content Correctness

- [ ] Exercise name reflects the actual exercise (correct localization via workout mappers)
- [ ] Weight uses user's preferred unit (kg / lb) — verify by switching unit in Profile
- [ ] Multiple PRs in one session → each fires its own notification (no batching / de-dupe)

### 5D. Edge Cases

- [ ] PR detected while app is backgrounded → notification still arrives (session write path continues)
- [ ] PR detected offline → notification fires (local trigger, no network dependency); Supabase sync-queue handles the PR row later
- [ ] Log a set that ties the previous PR (equal weight) → **no** notification (PR spec = strictly greater `max_weight`)
- [ ] Log a rep PR / volume PR → **no** notification (spec locked to `max_weight` only)

---

## 6. Weekly Summary (Phase 2 — Not Yet Implemented)

Only the toggle exists. Nothing fires. Confirm the UI is present but no-op.

- [ ] Toggle appears in Profile → Notifications section
- [ ] Toggling it ON / OFF only mutates Redux — no schedule created, no crash
- [ ] Do **NOT** raise "no push received" as a bug for this row. It is intentionally deferred.

---

## 7. Profile Screen — Toggle UI

File: `app/screen/home/ProfileScreen.tsx`

- [ ] "Notifications" section renders under App Settings
- [ ] Four toggle rows visible when permission is granted: Daily Reminder, Streak Warning, PR Alerts, Weekly Summary
- [ ] Each toggle reflects persisted state on app relaunch
- [ ] When permission status is `denied`:
  - [ ] Toggles are **hidden**
  - [ ] "Notifications are turned off" copy shown
  - [ ] "Open System Settings" row is tappable → opens OS settings for the app
- [ ] Return from system settings → Profile re-fetches permission → UI updates without manual refresh
- [ ] Section is completely **hidden** if `FEATURE_FLAGS.ENABLE_NOTIFICATIONS === false`

---

## 8. Bilingual (EN + NB)

- [ ] Modal (title, subtitle, hint, buttons, preview cards) — all localized
- [ ] Profile section title + toggle labels + denied-state copy — all localized
- [ ] Notification bodies (Daily Reminder, Streak Warning, PR Alert) — all localized at fire time (they call `i18n.t()` inside `notifications.ts`)
- [ ] No raw i18n keys visible anywhere (e.g. no `notificationPermission.title` strings leaking through)
- [ ] Language change mid-session → next scheduled notification fires in the new language

---

## 9. Platform-Specific

### iOS

- [ ] Permission popup shows on Allow tap
- [ ] Banner + sound with app foregrounded
- [ ] Banner + sound + lockscreen entry with app backgrounded / killed
- [ ] Modal presentation is `pageSheet`

### Android

- [ ] Default notification channel `default` exists (created by `ensureAndroidChannel`) — verify in system settings → app info → notifications
- [ ] Channel color = `#D4AF37`
- [ ] Notifications appear in the notification tray with app icon
- [ ] Modal falls back to full-screen slide-up (no `pageSheet`)
- [ ] Hardware back button dismisses modal correctly

---

## 10. Persistence & Lifecycle

- [ ] Kill app → schedules survive (expo-notifications persists natively)
- [ ] Reboot phone → schedules still fire at correct time
- [ ] Change device timezone → next fire adjusts to new local 08:00 / 19:00
- [ ] Change device time forward past next fire → verify notification catches up appropriately
- [ ] Uninstall + reinstall → all schedules cleared; new install starts clean

---

## 11. Regression Spot-Checks

- [ ] No duplicate notifications: scheduling twice under same identifier only leaves one entry (verify with `getAllScheduledNotificationsAsync()`)
- [ ] Toggle rapid-fire (ON → OFF → ON quickly) leaves system in expected state (single schedule for that identifier)
- [ ] Delete account flow → all schedules cancelled (via `RESET_ALL` reset path)
- [ ] Sign out (without delete) → schedules persist? — verify against product decision; currently should remain until user re-signs-in with different account (document actual behavior observed here → )

---

## 12. Failure-Triage Table

| Symptom | Likely cause | First check |
|---|---|---|
| Modal never appears | `hasAskedNotificationPermission` already true from prior install | Uninstall + reinstall |
| Modal appears but Allow does nothing | `FEATURE_FLAGS.ENABLE_NOTIFICATIONS` is false | `featureFlags.ts` |
| Grant OS permission but no schedules | Native permissions granted but scheduling threw | Check console for `expo-notifications` errors |
| Notification fires in EN when language is NB | `i18n.language` wasn't hydrated when schedule was created | Re-schedule after language change (toggle OFF/ON) |
| PR notification never fires | `prAlerts` toggle is OFF, OR PR spec (`max_weight`) not met | Check toggle + verify weight > previous best |
| Android: no notification shown | Channel not created | Call `ensureAndroidChannel()` on app start (already wired) |
| iOS Simulator: no notification | Silent Mode / DND enabled | Turn off DND; check Focus modes |
| Notifications duplicated | Multiple scheduling calls under different identifiers | Grep for `scheduleNotificationAsync` — should only be inside `notifications.ts` |

---

## 13. Sign-Off Criteria

The notification feature is considered **approved** when:

- [ ] All checkboxes in sections 1–5 and 7–10 are ticked (Weekly Summary section 6 is informational only)
- [ ] No P0 (blocker) or P1 (major) bugs remain open
- [ ] Both iOS and Android runs completed
- [ ] Both EN and NB verified
- [ ] Tester name + date recorded below

**Tester:** ______________________
**Device(s):** ______________________
**Build:** ______________________
**Date:** ______________________
**Result:** ⬜ Approved   ⬜ Approved with follow-ups   ⬜ Rejected

Follow-up notes:

```
(list any P2/P3 issues to address in a follow-up build)
```
