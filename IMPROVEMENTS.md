# LifeOS — Further Improvements

Ideas and known gaps, roughly ordered by value-for-effort. Nothing here blocks
daily use — the platform is feature-complete for its original five phases.

## Unblock first (user actions, no code)

- [ ] **Top up Anthropic API credits** — chat, Focus Engine, AI notes, and recap
      summaries all return "credit balance is too low" until then.
      → console.anthropic.com → Plans & Billing.
- [ ] **Finish the Microsoft To Do connection** (code is done and deployed).
      → Azure free signup → app registration ("Personal Microsoft accounts only",
      redirect `{APP_URL}/api/integrations/microsoft/callback`) → put
      `MS_CLIENT_ID`/`MS_CLIENT_SECRET` in `.env.local` + Vercel → Settings → Connect.
- [ ] **Set `CRON_SECRET` in Vercel** so the daily cron endpoint isn't publicly
      callable (it's harmless today — runs a sync/automations pass — but lock it).
- [ ] **Fill in Supabase MCP tokens** in `.mcp.json` (project ref + access token)
      if you want Claude Code to query the DB directly in future sessions.

## High value

- [ ] **Recurring tasks & events** — the schema already has `recurrence` (RRULE
      string) on both tables and the `rrule` package is installed, but nothing
      reads it. Expand occurrences in `getEvents`/`getTasks` and add a repeat
      picker to the task/event forms.
- [ ] **Calendar week view** — the month grid is done; a 7-column hour-by-hour
      week view with drag-to-create would make the calendar a daily driver.
- [ ] **Global search (⌘K)** — one command palette across tasks, notes, ideas,
      projects, memory files. All the list queries already exist in `lib/`.
- [ ] **PWA** — manifest + service worker so it installs on the phone home
      screen; the mobile UI (bottom nav + hamburger drawer) is already in place.
- [ ] **Notifications** — daily focus briefing or due-task reminders via web
      push or email (Resend free tier). The cron route is the natural trigger.

## Medium

- [ ] **Recap video export** — the recap plays via `@remotion/player` in the
      browser; actual MP4 rendering needs `@remotion/renderer` on a server or
      Remotion Lambda. Player-only is fine until sharing matters.
- [ ] **More automation triggers/actions** — e.g. trigger: "task completed in
      project X", "no focus run today"; action: "send email", "archive stale
      ideas", "create event".
- [ ] **Idea AI verdict** — `ideas.aiVerdict` column exists but is never
      populated; a one-click "evaluate this idea" Claude call fits the
      existing patterns.
- [ ] **Link events to tasks in the UI** — `events.taskId` exists in the schema
      but no UI sets it. "Schedule this task" on a task → creates a linked
      calendar block.
- [ ] **Drag and drop** — reorder tasks, drag tasks onto planner days, drag
      events between calendar days.
- [ ] **Project detail page polish** — per-project notes/mindmaps/events tabs
      (data relations already exist).

## Nice to have

- [ ] **Tests** — there are none. Start with `lib/` unit tests (sync engine
      field mappers, automation trigger evaluation, recap aggregation) since
      those have the most logic.
- [ ] **Multi-user / real auth** — currently a single shared password
      (`APP_PASSWORD_HASH`) and one implicit user. Supabase Auth would slot in,
      but every table would need a `user_id`.
- [ ] **Error monitoring** — Sentry (or Vercel's built-in) for the deployed app.
- [ ] **Rate limiting** on the login route (it's brute-forceable today;
      bcrypt cost 12 helps but isn't a rate limit).
- [ ] **Streaming markdown renderer in chat** — chat output renders as plain
      text deltas; piping through `react-markdown` like Notes would look better.
- [ ] **Mind map auto-layout** — a "tidy up" button using dagre/elkjs.
- [ ] **Memory Vault embeddings** — semantic search via pgvector (Supabase
      supports it) instead of the current substring search.

## Known quirks to keep in mind

- Supabase pooler connections can wedge (`active` + `ClientRead` in
  `pg_stat_activity`); the pool is `max: 4` now so the app survives it, but a
  stuck one can be cleared with `pg_terminate_backend(pid)`.
- Turbopack dev cache can corrupt after moving exports between files
  (symptom: browser errors about `net`/`tls`/`fs`) — kill the dev server,
  delete `.next`, restart.
- `.env.local` `APP_PASSWORD_HASH` needs `\$` escaping locally; the same var in
  Vercel must be the raw `$2b$12$...` without backslashes.
- Vercel functions are pinned to `dub1` (vercel.json) to sit next to the
  Supabase pooler in eu-west-1 — if the DB region ever changes, change this too.
