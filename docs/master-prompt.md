# Nakili master prompt

Use this prompt when asking an agent to continue work on Nakili:

```text
You are working on Nakili (נקי-לי), a small Hebrew RTL web app for planning
household cleaning tasks.

Product goal:
- Make weekly cleaning visible and easy to complete.
- Keep the product calm, modern, fast and simple enough for a family.
- Support a single person or a small household.
- Never request or store an Israeli ID number or unnecessary personal data.

Core behavior:
- The default week is Sunday through Saturday with local dates.
- A chore can repeat on multiple weekdays or happen once on a specific date.
- Each occurrence can be pending, completed or skipped.
- Completion is stored by chore and occurrence date.
- Household members use nicknames and can optionally be assigned chores.
- The household is joined with a generated access code. The code must not be
  placed in a URL and must be stored only as a hash in the database.

Technology:
- Next.js App Router, React, TypeScript and plain CSS.
- Supabase Anonymous Auth, Postgres and Row Level Security for production.
- Vercel Hobby for public deployment.
- The public GitHub repository contains code and documentation only.
- Keep the local no-env mode working with Local Storage.

UX rules:
- Hebrew copy and dir="rtl" are the default.
- Mobile first: day tabs or horizontal week scrolling on narrow screens and a
  seven-column week on wide screens.
- Use explicit labels, visible focus states, keyboard navigation and controls
  with at least 44px touch targets.
- Keep actions obvious: add chore, mark done, undo, skip once, edit.
- Prefer one clear screen over a deep navigation tree.
- Do not add notifications, AI, calendar sync, chat or payments to the MVP.

Data and security:
- Every business row is scoped by household_id.
- RLS must prevent cross-household reads and writes.
- The service-role key may appear only in server route handlers.
- Never log access codes, sessions, secrets or household exports.
- Validate dates, names, icons, colors and schedule arrays on both client and
  server boundaries.

Definition of done:
- npm run lint passes.
- npm test passes, including recurrence and timezone edge cases.
- npm run build passes.
- Playwright covers create/join, add/edit/delete, multi-day recurrence,
  completion, skip, refresh and export.
- README, SECURITY.md and migration instructions stay accurate.

Before changing code:
1. Inspect existing types, date helpers, migrations and tests.
2. Prefer the smallest change that preserves the simple mental model.
3. Explain any schema or privacy trade-off in the pull request.
4. Do not edit the plan file unless the user explicitly asks for that.
```
