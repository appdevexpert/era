# ERA Admin Dashboard Plan

## Purpose

Build the web admin dashboard for the ERA app owner to manage workout content and view basic user metrics for this sprint.

This dashboard is for internal owner use. It is not a public marketing page and should feel like a clean operational tool: dense, readable, direct, and easy to scan.

## Sprint Scope

Deliver admin support for:

- Viewing total users and active users.
- Adding and editing exercises.
- Managing exercise English and Norwegian names.
- Managing exercise images and muscle groups.
- Creating and modifying 12-week workout programs.
- Managing daily exercise assignments inside the 12-week program.

Out of scope for this first admin pass:

- Full coach/admin role system.
- Multi-owner permissions.
- Workout logging analytics.
- Points, streaks, PR management.
- Advanced media upload workflow unless needed for exercise images.
- Complex program generation logic.

## Current Web App State

The web app is a fresh Next.js app with:

- Next.js app router.
- Tailwind CSS.
- shadcn/base-ui style setup.
- Supabase browser/server/admin helpers.
- ERA mobile fonts copied into `web/assets/fonts`.
- ERA mobile color tokens mapped in `app/globals.css`.

The admin dashboard UI has not been built yet.

## Design Rules

- Use the existing ERA black/gold theme from `app/globals.css`.
- Use `font-sans` for normal admin UI text.
- Use `font-display` only for key page headings or ERA-style display text.
- Keep cards at `8px` radius or close to the existing system radius.
- Do not create a landing page.
- First screen should be the actual admin dashboard.
- Avoid decorative blobs, oversized hero sections, and marketing layout.
- Prefer tables, compact panels, tabs, filters, and clear forms.
- Use lucide icons where helpful.
- Keep UI functional before decorative.

## Data Source

Use the existing Supabase schema from the mobile app.

Primary tables for admin:

- `profiles`
- `exercise_library`
- `workout_programs`
- `program_weeks`
- `program_days`
- `program_day_sections`
- `program_day_exercises`
- `planned_exercise_sets`
- `user_program_assignments`

Do not invent alternate table names.

## Supabase Access

For owner-only admin actions, use server-side Supabase access from the web app.

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client components.
- Admin writes should happen through server actions, route handlers, or server-only service functions.
- The service role key must be configured in web `.env.local` before unrestricted admin writes or auth user counts are used.

Current note:

- `NEXT_PUBLIC_SUPABASE_URL` exists.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists.
- `SUPABASE_SERVICE_ROLE_KEY` may still need to be added.

## Security Decision For This Sprint

The user does not want a full role gateway right now.

Accepted sprint approach:

- Treat the dashboard as owner-only.
- Protect deployment through platform-level access/password if deployed.
- Keep admin mutations server-side.

Future improvement:

- Add login and allow only `profiles.role in ('admin', 'coach')`.
- Add route protection for all admin pages.

## Admin Routes

Recommended structure:

```text
app/
  page.tsx
  exercises/
    page.tsx
  programs/
    page.tsx
    [programId]/
      page.tsx
  users/
    page.tsx
```

If the app later needs public routes, move admin under:

```text
app/admin/
```

For now, using `/` as the admin dashboard is acceptable because the web app is admin-only.

## Feature 1: Dashboard

Goal:

Show owner-level metrics and shortcuts.

Cards:

- Total users.
- Active users.
- Total exercises.
- Total workout programs.
- Draft programs.
- Active programs.

Suggested queries:

- `profiles` count for total app users.
- `workout_sessions` recent activity or `profiles.updated_at` for active users.
- `exercise_library` count.
- `workout_programs` count grouped by `status`.

Active users definition for sprint:

- Prefer users with workout activity in the last 30 days if `workout_sessions` has real data.
- If not, show placeholder or use profiles count with a clear label like "Active users unavailable until sessions are logged."

## Feature 2: Exercise Library

Table:

- `exercise_library`

Admin list columns:

- Exercise name.
- Norwegian name.
- Modality.
- Category.
- Muscle groups.
- Active status.
- Updated date.

Form fields:

- English name: `name_translations.en`
- Norwegian name: `name_translations.nb`
- Default/internal name: `name`
- Image URL: `image_url`
- Modality: `modality`
- Category: `category`
- Muscle groups: `muscle_groups`
- Equipment: `equipment`
- Instructions English/Norwegian: `instructions_translations`
- Coaching cues English/Norwegian: `coaching_cues_translations`
- Active: `is_active`

Implementation rule:

- Store localized exercise content in JSON translation columns.
- Do not create separate English/Norwegian exercise rows.

Example translation shape:

```json
{
  "en": "Bench Press",
  "nb": "Benkpress"
}
```

## Feature 3: Program List

Table:

- `workout_programs`

Admin list columns:

- Program title.
- Status.
- Program type.
- Number of weeks.
- Goal.
- Created date.
- Updated date.

Form fields:

- English title: `title_translations.en`
- Norwegian title: `title_translations.nb`
- Subtitle translations.
- Description translations.
- Program type.
- Program goal translations.
- Status: `draft`, `active`, `archived`
- Total weeks: should be `12` for Rami-style plans.

## Feature 4: 12-Week Program Builder

Tables:

- `program_weeks`
- `program_days`
- `program_day_sections`
- `program_day_exercises`
- `planned_exercise_sets`

Builder layout:

- Left side: week list, weeks 1-12.
- Main area: selected week days.
- Day detail drawer/panel for assigned exercises and sets.

Week editor:

- Week number.
- Phase: Hypertrophy, Strength, Peak.
- English/Norwegian title.
- English/Norwegian focus.
- Notes.

Day editor:

- Day number.
- Weekday label.
- English/Norwegian workout title.
- English/Norwegian subtitle.
- Estimated minutes.
- Target muscles.
- Difficulty.

Sections inside day:

- Main exercises.
- Core finisher.
- Treadmill walk.
- Optional warmup/cooldown later.

Exercise assignment fields:

- Exercise from `exercise_library`.
- Section.
- Sort order.
- Display name translations if different from exercise library.
- Target summary translations.
- Coach notes translations.
- Initial weight.
- Rest seconds.
- Whether it is top set/back-off relevant.

Planned set fields:

- Set number.
- Set type.
- Target reps minimum.
- Target reps maximum.
- Target weight.
- Target duration seconds.
- Rest seconds.
- Intensity label.
- Display label translations.

## Feature 5: Program Assignment

Table:

- `user_program_assignments`

Sprint-simple approach:

- Assign an active program to a user.
- Optionally mark one program as the default active program.

Avoid complex automation for now.

Future:

- Program generation based on onboarding.
- Multiple active assignments.
- Pause/resume/complete program assignment.

## Suggested Code Organization

Keep server/data logic separate from UI.

Recommended structure:

```text
app/
  page.tsx
  exercises/page.tsx
  programs/page.tsx
  programs/[programId]/page.tsx
  users/page.tsx

components/
  admin/
    admin-shell.tsx
    sidebar.tsx
    stat-card.tsx
    data-table.tsx
    page-header.tsx
    empty-state.tsx
  exercises/
    exercise-form.tsx
    exercise-table.tsx
  programs/
    program-table.tsx
    program-builder.tsx
    week-selector.tsx
    day-editor.tsx
    exercise-assignment-editor.tsx

lib/
  admin/
    dashboard.ts
    exercises.ts
    programs.ts
    users.ts
  supabase/
    admin.ts
    server.ts
```

Keep components small and obvious. Avoid creating abstractions before the UI needs them.

## Implementation Order

1. Replace starter page with admin shell and dashboard.
2. Add server-side dashboard stat queries.
3. Build exercise list page.
4. Build add/edit exercise form.
5. Build program list page.
6. Build program detail page.
7. Build 12-week week/day editor.
8. Build exercise assignment editor.
9. Build planned set editor.
10. Add user list and simple program assignment if time allows.

## Validation

After implementation steps, run:

```bash
npm run lint
npx tsc --noEmit --incremental false
```

If a page uses server actions or Supabase queries, manually verify:

- Page loads without missing env errors.
- Empty state works.
- Create/edit form validates required fields.
- English/Norwegian translation JSON is saved correctly.
- Program builder preserves week/day/set order.

## Open Questions

- Should the dashboard live at `/` or `/admin`?
- Should exercise images be URL-only for sprint, or should uploads be supported?
- What exact definition should be used for active users?
- Should one default active program be assigned to all users automatically?
- Should program builder support copying days/weeks to speed up 12-week creation?
