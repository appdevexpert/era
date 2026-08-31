# Auth Email Templates

Source of truth for the transactional Supabase auth emails, kept in
`mobile/supabase/email-templates/`.

Supabase (hosted) exposes **no API or CLI path** for these — the deployed copy
lives only in the Dashboard. This folder exists so the copy is version
controlled and reviewable; editing the files does **not** deploy anything.

## Applying a change

Dashboard → Authentication → Emails → Templates, pick the template, paste the
file contents, Save.

| File | Dashboard template |
|---|---|
| `confirmation.html` | Confirm signup |
| `recovery.html` | Reset password |
| `otp.html` | Magic Link / OTP |

## Copy rules

Write to the **person receiving the email**, who is acting on their **own**
account. Supabase's stock strings ("reset the password for your user",
"confirm your user") read like an administrator operating on somebody else's
account — that phrasing is the reason this folder was created.

- "reset your password", not "reset the password for your user"
- "confirm your email address", not "confirm your user"
- Always give an unexpecting recipient a line saying they can ignore the email.

## Design system mapping

All three share one shell. Colours come from `app/constants/colors.ts`:

| Role | Hex | Token |
|---|---|---|
| Page | `#000000` | `neutral.black` |
| Card | `#0A0A0A` | `neutral.black2` |
| Hairline | `#302A17` | `alpha.primary20` flattened onto the card |
| Button / links | `#C9A84C` | `primary.dark` |
| Gradient | `#FCF3C0 -> #F7E06F -> #C9A84C` | `GRADIENTS.primary` |
| Wordmark | `#DAA520` | `GRADIENTS.wordmark[0]` |
| Body text | `#F0F0F0` | `neutral.white` |
| Muted text | `#8A8A8A` | `alpha.white50` flattened onto the card |

Semi-transparent tokens are flattened to solid hex because Outlook's Word
renderer ignores `rgba()`.

### Three deliberate departures from the app

1. **No webfonts.** Gmail and Outlook strip `@font-face`, so PlayfairDisplay
   and Italiana would render inconsistently. Display type falls back to
   Georgia (closest high-contrast serif that ships everywhere); the wordmark
   is Georgia at `letter-spacing:10px` to echo Italiana.
2. **Button text is `#0A0A0A`, not the app's white.** White on the `#FCF3C0`
   end of the gold gradient is about 1.2:1 contrast. Email cannot guarantee
   which end of the gradient a client paints, so dark-on-gold is the only
   safe choice.
3. **Solid gold fallback under the gradient.** Outlook drops
   `linear-gradient` and paints `background-color:#C9A84C`.

### Email-client constraints already handled

- Tables + inline styles throughout; `<style>` carries only resets and the
  one mobile media query.
- VML `roundrect` gives Outlook a real rounded gold button; every other
  client uses the `<a>` and skips the VML via conditional comments.
- `color-scheme: dark` meta stops clients force-inverting an intentionally
  dark email.
- Hidden preheader controls the inbox preview line.
- Every link is also shown as pasteable text, for clients that strip buttons.
- 600px fixed, dropping to fluid under 600px.

Preview by opening the `.html` files directly in a browser. That shows the
non-Outlook path only — the VML branch renders solely in Outlook for Windows.

## Never state an expiry duration in the copy

Supabase has a **single** project-level setting, `MAILER_OTP_EXP` (Dashboard →
Authentication → Sign In / Providers → Email → "Email OTP Expiration"), and it
governs signup confirmation, magic link, OTP **and** password recovery
together. There is no per-template value.

So a template that says "expires in 60 minutes" is asserting something owned by
a dashboard field nobody will remember to keep in sync. That already bit us:
the OTP template claimed 10 minutes while recovery claimed 60, from one
setting — at most one could be true.

Templates therefore say "can only be used once, and expires shortly after it
was sent" and name no number. Set `MAILER_OTP_EXP` to whatever you like
(900 = 15 min is a sensible reset-link window; the Supabase default of 3600 is
long for password recovery) without touching a single template.

If you ever do want the number in the copy, it has to change in all three files
**and** the dashboard, in the same sitting.

## Available variables

`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`,
`{{ .Email }}`, `{{ .RedirectTo }}`. `{{ .Token }}` is the 6-digit OTP;
`{{ .ConfirmationURL }}` is the click-through link.

## Known gap

These emails are English-only. The app ships English + Norwegian Bokmål, but
Supabase serves one template per type with no locale branching, so a Norwegian
user still receives English mail. Closing that needs either a custom SMTP hook
or an Edge Function that sends the mail itself — not yet scoped.
