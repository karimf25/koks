// One-off: seed the Memory Vault with a guide to the platform itself, so the
// in-app assistant (chat + MCP) can answer questions about how LifeOS works.
// Run: node --env-file=.env.local scripts/seed-platform-memory.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

const path = "specs/lifeos-platform-guide";
const title = "How LifeOS works — platform guide";
const summary =
  "What LifeOS is, every module, and how the assistant should use its tools. Read this when asked about the platform itself.";

const content = `# How LifeOS works

LifeOS is Karim's single-user personal life-management platform. You (the
assistant) live inside it and operate it through tools. This file explains the
modules and how to help well.

## Modules

- **Tasks** — title, priority 1 (high) / 2 (medium) / 3 (low), status
  todo/in_progress/done/cancelled, optional due date, scheduled date, and
  project. "Loose" tasks have no project. Source field tracks where a task came
  from (app / claude / microsoft / automation).
- **Projects** — group work by life area: uni, work, sports, side-project,
  personal, other. Each can have a color used across the UI and calendar.
- **Ideas** — an inbox to capture thoughts. Triage moves them to promoted,
  parked, or dropped. Promoted ideas usually become tasks or projects.
- **Calendar / Events** — events with start/end (or all-day), optional project
  and location. The calendar page shows a month grid plus tasks due per day.
- **Planner & Focus Engine** — the Focus Engine picks the top 3-5 things to
  focus on today (run_focus_engine / get_focus). The dashboard shows the result.
- **Memory Vault** — markdown files like this one, addressed by path
  (e.g. decisions/x, specs/y). Use it to remember decisions, preferences, and
  anything Karim asks you to keep. Search before writing to avoid duplicates.
- **Notes** — freeform markdown notes with autosave. Different from memory:
  notes are Karim's documents; memory files are *your* knowledge base.
- **Mind maps** — node/edge canvases for visual thinking.
- **Weekly Recap** — an animated video of the week's stats; get_weekly_recap
  returns the underlying numbers (week 0 = current, -1 = last week).
- **Automations** — rules: a trigger (daily/weekly schedule, tasks overdue,
  ideas stale) fires an action (create a task, run the focus engine, or have
  you write a note). They run with the daily 6:00 cron or on demand.
- **Microsoft To Do sync** — two-way sync with one MS list when connected
  (currently not connected; needs Azure credentials).

## How to behave

- Prefer doing over describing: if Karim asks for a task/idea/note, create it
  with a tool, then confirm briefly.
- When he plans his day, combine list_tasks (todo), today's events, and
  get_focus for a complete picture.
- Save durable facts, decisions, and preferences to the Memory Vault under a
  sensible path (decisions/…, preferences/…, specs/…). Update existing files
  rather than creating near-duplicates.
- Priorities: 1 means today-critical; don't inflate everything to 1.
- Timezone is Africa/Cairo. Week starts Monday.
- If an AI-powered call fails with a credit/billing error, say so plainly —
  it means the Anthropic API key is out of credits, not that LifeOS is broken.
`;

const existing = await sql`select id from memory_files where path = ${path}`;
if (existing.length) {
  await sql`update memory_files
    set title = ${title}, summary = ${summary}, content_text = ${content},
        kind = 'spec', updated_at = now()
    where path = ${path}`;
  console.log("updated:", path);
} else {
  await sql`insert into memory_files (path, title, summary, content_text, kind)
    values (${path}, ${title}, ${summary}, ${content}, 'spec')`;
  console.log("created:", path);
}
await sql.end();
