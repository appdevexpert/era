# Notifications Feature

Date locked: 2026-06-30

This doc covers ERA's local + push notification stack — permission gate, scheduling, profile toggles, and the Phase 2 backend plan. Read this before adding any new notification type.

---

## 1. Phase Plan

| Phase | Status | Notifications |
|---|---|---|
| **Phase 1** | ✅ Shipped 2026-06-30 | Daily Reminder, Streak Warning, PR Alerts |
| **Phase 2** | ⏳ Pending backend | Weekly Summary (push from Supabase) |

Phase 1 is fully local — no server, no push tokens, no backend. The 4th toggle (Weekly Summary) exists in the UI but is a no-op until Phase 2 wires it to a Supabase Edge Function + `pg_cron`.

---

## 2. Local vs Push — Decision Matrix

| Notification | Type | Why |
|---|---|---|
| Daily Reminder (8 AM) | **Local** | Fixed time, no server data needed |
| Streak Warning (7 PM) | **Local** | Streak data already in Redux |
| PR Alerts | **Local** | Fires from `useWorkoutSession` after `checkAndCreateSetPRs` resolves |
| Weekly Summary | **Push** (Phase 2) | Server-side aggregation, fires even when app is closed |

Rule of thumb: anything that can be triggered from in-app state stays local. Anything that needs server-side computation or must fire while the app is dead is push.

---

## 3. Files Involved

### Code

| Path | Role |
|---|---|
| `app/utils/notifications.ts` | All `expo-notifications` wrappers — request permission, schedule, cancel, fire PR alert |
| `app/screen/notificationPermission/NotificationPermission.tsx` | First-login modal asking for permission |
| `app/navigation/Navigation.tsx` | Renders the modal + caches OS permission status in Redux |
| `app/screen/home/ProfileScreen.tsx` | Per-type toggle rows + "Open System Settings" fallback when permission denied |
| `app/hooks/useWorkoutSession.ts` | Fires `firePRAlert()` when a PR is detected (gated on `prAlerts` toggle) |
| `app/stores/slice/preferencesSlice.ts` | `notifications: { dailyReminder, streakWarning, prAlerts, weeklySummary }` + `notificationPermissionStatus` |
| `app/stores/slice/authSlice.ts` | `hasAskedNotificationPermission` — one-time gate flag |

### Config

| Path | Change |
|---|---|
| `app.json` | `expo-notifications` plugin added with brand gold color `#D4AF37` |
| `package.json` | `expo-notifications` + `expo-device` |

### Strings

| Path | Keys |
|---|---|
| `app/locales/en.ts` + `nb.ts` | `notificationPermission.*` (modal), `profile.notifications.*` (toggles), `notificationContent.*` (notification bodies) |

---

## 4. Permission Flow

### One-time Modal Gate

The permission ask is decoupled from the OS popup. We show a **custom modal first**, then trigger the native dialog only if the user explicitly opts in.

```text
[User logs in]
   ↓
[Underlying stack renders: Onboarding / PlanGen / Home]
   ↓
[Modal slides up (presentationStyle="pageSheet")]
   ↓
   ┌─────────────────────────────────┐
   │  Stay on track with ERA          │
   │  [notification preview cards]    │
   │  You can change in settings...   │
   │  [Enable Notifications]          │
   │  Maybe Later                     │
   └─────────────────────────────────┘
   ↓
[User picks Enable / Maybe Later / swipe-down dismiss]
   ↓
[hasAskedNotificationPermission = true forever]
   ↓
[Modal unmounts → underlying stack revealed]
```

### Trigger Condition

Defined in `Navigation.tsx`:

```typescript
const showNotificationPermissionModal =
  !showAuthStack && !hasAskedNotificationPermission;
```

Modal shows when:
- User is logged in (past the auth gate)
- `hasAskedNotificationPermission === false`

It does NOT depend on `hasGoals` or `hasWorkoutBootstrap` — the modal overlays whichever destination stack the user lands in.

### Dismiss Behaviour

All three exits set `hasAskedNotificationPermission = true`:

1. **Enable** → fires native popup → saves OS status → schedules defaults if granted
2. **Maybe Later** → silently marks asked
3. **Swipe down (iOS) / back button (Android)** → handled in `Navigation.tsx` via `onDismiss` + `onRequestClose`

This guarantees the modal **never re-opens** without a state reset (account delete or app reinstall).

---

## 5. Notifications Catalog

### Daily Reminder

```text
ID:        era.dailyReminder
Type:      Local repeating
Schedule:  Every day at 08:00
Trigger:   Notifications.SchedulableTriggerInputTypes.DAILY
Toggle:    preferences.notifications.dailyReminder
```

### Streak Warning

```text
ID:        era.streakWarning
Type:      Local repeating
Schedule:  Every day at 19:00
Trigger:   Notifications.SchedulableTriggerInputTypes.DAILY
Toggle:    preferences.notifications.streakWarning
```

Always fires at 7 PM — there's no client-side check for whether the streak is actually at risk. Phase 2 may replace this with server-driven push that only fires for at-risk users.

### PR Alerts

```text
ID:        (one-off, no fixed identifier)
Type:      Local instant
Trigger:   trigger: null (immediate)
Toggle:    preferences.notifications.prAlerts
```

Fired inline from `useWorkoutSession.ts` immediately after `checkAndCreateSetPRs` returns a `prDetail` payload. The in-app PR celebration screen still fires regardless of the toggle — the notification is supplementary.

### Weekly Summary (Phase 2)

```text
Type:      Push (Supabase → Expo Push API)
Schedule:  pg_cron, Sunday 18:00
Toggle:    preferences.notifications.weeklySummary (UI ready, no-op until backend lands)
```

---

## 6. Profile Toggle Logic

Per-toggle behaviour in `ProfileScreen.tsx::handleNotificationToggle`:

| Toggle | ON → | OFF → |
|---|---|---|
| Daily Reminder | `scheduleDailyReminder()` | `cancelDailyReminder()` |
| Streak Warning | `scheduleStreakWarning()` | `cancelStreakWarning()` |
| PR Alerts | (pref flag only — checked by `useWorkoutSession`) | (pref flag only) |
| Weekly Summary | (Phase 2 — server reads pref) | (Phase 2) |

### Permission Denied UI

When `state.preferences.notificationPermissionStatus === "denied"`, the toggle list is replaced with:

```text
┌─────────────────────────────────────┐
│ Notifications are turned off        │
│ Enable them in system settings ...  │
│                                     │
│ ⓘ Open System Settings   →          │
└─────────────────────────────────────┘
```

`openSystemSettings()` calls `Linking.openSettings()`. When the user returns to the Profile screen, the `useEffect` re-fetches `getPermissionStatus()` and re-renders.

---

## 7. PR Alert Wiring

Located inside `useWorkoutSession.ts` after the `checkAndCreateSetPRs` call:

```typescript
if (result.prDetail) {
  // ... in-app celebration setup ...

  if (prAlertsEnabled) {
    firePRAlert(ex.name, `${weightKg} ${weightUnit}`).catch((err) =>
      console.warn("[useWorkoutSession] firePRAlert failed", err),
    );
  }
}
```

`prAlertsEnabled` is read from `state.preferences.notifications.prAlerts`. The notification body is templated as `{exercise} — {weight}`, with the title coming from `notificationContent.prAlert.title` ("New PR!" / "Ny PR!").

---

## 8. Bilingual Strings

All notification text — modal copy, toggle labels, notification titles and bodies — is in `app/locales/en.ts` and `nb.ts`. Notification bodies are resolved via `i18n.t()` from inside `notifications.ts`, so they pick up the current i18next language at fire time. **Do not hardcode notification text.**

Key paths:
- `notificationPermission.*` — modal UI
- `profile.sections.notifications` + `profile.notifications.*` — Profile section
- `notificationContent.{dailyReminder,streakWarning,prAlert}.{title,body}` — actual notification text

---

## 9. Edge Cases

| Case | Behaviour |
|---|---|
| User denies at OS level | Modal flag still set → modal never re-opens. Profile shows "Open System Settings" link. |
| User swipes modal down | Treated as Maybe Later — flag set. |
| User toggles a notification ON but permission is denied | Scheduling call no-ops (expo-notifications silently fails). Profile UI hides toggles entirely when denied, so this is a defensive case only. |
| App reinstall | All Redux state wipes — modal reappears on next login. |
| Account delete (`RESET_ALL`) | Same as reinstall. |
| Phone reboot / app kill | `expo-notifications` persists schedules natively — no re-registration needed. |
| Language change | Next notification fire reads the current `i18next` language. |
| Android (no `pageSheet`) | Modal falls back to full-screen slide-up. |

---

## 10. Testing

### Local Setup

```bash
cd mobile
npx expo install expo-notifications expo-device  # already done
npx expo prebuild --clean                         # required after plugin add
npx expo run:ios --device                         # physical device for true behaviour
```

### Manual Test Checklist

- [ ] Fresh install → login → modal slides up on top of Onboarding/Home
- [ ] Tap **Enable Notifications** → native OS popup → grant → modal closes
- [ ] Schedule visible: `Notifications.getAllScheduledNotificationsAsync()` returns 2 entries (`era.dailyReminder`, `era.streakWarning`)
- [ ] Tap **Maybe Later** → modal closes → no scheduled notifications
- [ ] Swipe modal down → modal closes → flag set → relaunch does not re-open
- [ ] Profile → toggle Daily Reminder OFF → schedule list drops to 1
- [ ] Log a workout set that beats a previous PR → local PR notification fires (toggle ON)
- [ ] Toggle PR Alerts OFF → log another PR → no notification (in-app celebration still fires)
- [ ] Deny permission at OS level → reopen Profile → "Open System Settings" link visible
- [ ] Switch language to Norwegian → next scheduled notification fires in Norwegian

### Notes

- iOS Simulator: permission popup works, scheduled notifications work.
- Android emulator: works, but cold-boot may delay first scheduled fire.
- Expo Go (SDK 53+): **does not** support push permission. Use a Development Build.

---

## 11. Phase 2 — Weekly Summary Plan

Pending work, kept here so the implementation reference is in one place.

### Schema Additions

```sql
ALTER TABLE profiles
  ADD COLUMN expo_push_token TEXT,
  ADD COLUMN push_token_updated_at TIMESTAMPTZ;

-- Optional: log table for debugging
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  kind TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT
);
```

### Client

- On app open + after login → register Expo Push token → `UPSERT profiles.expo_push_token`
- Read `state.preferences.notifications.weeklySummary` server-side, do not send if `false`

### Server

- Supabase Edge Function: query each user's last-7-days workouts + PRs, build localized message using the user's `language` profile column, POST to `https://exp.host/--/api/v2/push/send`
- `pg_cron`: `0 18 * * 0` (Sunday 18:00) → trigger the Edge Function

### Locked Decisions

- Single push provider: **Expo Push** (free, handles APNs + FCM relay)
- One push per user per week (idempotent on `notification_log.kind = 'weekly_summary' AND sent_at::date = current_date`)
- Localized at send time, not on receive — server picks `en` / `nb` based on profile

---

## 12. Don't

- **Don't add Sentry / error reporting around notification failures.** ERA is not on Sentry. Use `console.warn` only (see `memory/feedback_no_sentry.md`).
- **Don't fire PR notifications from anywhere except `useWorkoutSession`.** Centralized trigger keeps the toggle gate single-sourced.
- **Don't hardcode notification text.** Always route through `i18n.t()` so Norwegian users get Norwegian.
- **Don't re-open the modal after `hasAskedNotificationPermission` is true.** Drive re-enable through Profile → Open System Settings only.
- **Don't add more local notification types without a feature spec.** Notification fatigue kills retention faster than it helps it.
