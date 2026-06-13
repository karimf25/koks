# LifeOS — Handoff

Single-user personal life-management platform. Everything you need to run,
develop, and deploy it is in this file.

## What it is

| Page | What it does |
|---|---|
| `/dashboard` | Morning greeting, AI focus picks, today's tasks & events, stats |
| `/tasks` | Task list with priorities, quick add, filters |
| `/ideas` | Idea inbox with triage (promote / park / drop) |
| `/calendar` | Month grid, project-colored events, day panel, event editor |
| `/planner` | Day planner + Focus Engine (AI picks top priorities) |
| `/projects` | Projects by life area, per-project detail |
| `/memory` | Memory Vault — markdown files the AI can read/write |
| `/notes` | Markdown notes with live preview and autosave |
| `/mindmaps` | React Flow canvas mind maps, autosaved |
| `/chat` | Built-in Claude chat with tools over all of the above |
| `/recap` | Remotion-animated weekly video recap + AI summary |
| `/automations` | Trigger→action rules run by the daily cron |
| `/settings` | Microsoft To Do integration, logout |

## Stack

- **Next.js 16** (App Router, Turbopack, `proxy.ts` instead of middleware) + React 19 + TypeScript
- **Supabase Postgres** via `postgres` (postgres.js) + **Drizzle ORM** — schema in `db/schema.ts`
- **Tailwind v4** + custom "Midnight Glass" design system (`app/globals.css`, `components/glass/`)
- **Motion** (Framer Motion) for animation, **Remotion** (`@remotion/player`) for the recap video
- **iron-session** cookie auth (single password), **Anthropic SDK** for AI, **zod** for validation
- Deployed on **Vercel**, functions pinned to `dub1` (see `vercel.json`)

## Run it locally

```bash
cd lifeos
npm install
# .env.local must exist (gitignored) — see "Environment variables" below
npm run dev          # http://localhost:3000, password: koks
```

Other scripts: `npm run build` (prod build), `npm run db:push` (sync schema to
DB), `npm run hash-password -- <pw>` (generate APP_PASSWORD_HASH).

## Environment variables

Set in `.env.local` locally AND in Vercel project settings (redeploy after
changing them in Vercel).

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Supabase **pooler** URL (port 6543, eu-west-1) |
| `APP_PASSWORD_HASH` | bcrypt hash of the login password. Locally `\$`-escaped; in Vercel raw `$2b$...` |
| `SESSION_SECRET` | iron-session key, ≥32 chars (500s everywhere if missing) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | AI features (chat, focus, ai_note, recap summary) |
| `MCP_API_KEY` | Bearer token for the `/api/mcp` server |
| `APP_URL` | `http://localhost:3000` locally, prod URL in Vercel |
| `MS_CLIENT_ID` / `MS_CLIENT_SECRET` / `MS_TENANT` | Microsoft To Do OAuth (currently empty — connection parked) |
| `CRON_SECRET` | Bearer guard for `/api/cron/sync` (Vercel sends it automatically) |
| `REMOTION_*` (5 vars) | Weekly Recap MP4 export via Remotion Lambda — see `RECAP_EXPORT.md` (optional; button degrades gracefully when unset) |

## Architecture rules (read before changing code)

1. **Business logic lives in `lib/`** — API routes, the chat tool executor
   (`app/api/chat/route.ts`), and the MCP server (`app/api/mcp/route.ts`) all
   call the same `lib/` functions. Add a feature once in `lib/`, then expose it
   in all three places.
2. **Serialize before crossing to the client.** Drizzle returns `Date` objects;
   passing them from a server component to a client component crashes React.
   Always map rows through `lib/serialize.ts` helpers and have client
   components import types from `lib/serialize` — never from `@/db`.
3. **`db/index.ts` imports `"server-only"`** — if a client bundle ever pulls in
   the DB, the build fails loudly. Keep it that way. Client components must not
   value-import anything from `lib/*` that touches the DB (type-only imports
   are fine).
4. **`(app)/layout.tsx` has `force-dynamic`** so pages aren't prerendered at
   build time (they'd hit the DB and time out).
5. **Next 16 specifics:** `params`/`searchParams` are Promises (await them);
   `proxy.ts` (exported `proxy`) replaces middleware; route files may only
   export handlers.
6. **Zod 4:** `discriminatedUnion` forbids two options with the same
   discriminator value — merge them into one option with an enum field.

## Database

11 tables (see `db/schema.ts`): projects, tasks, ideas, events, notes,
mindmaps, memory_files, focus_runs, integrations, automations, agent_runs.
Schema changes: edit `db/schema.ts` → `npm run db:push`. The connection pool is
`max: 4` with `connect_timeout: 15` — do not drop it back to 1 (a single
wedged pooler query then blocks every page render).

## Deployment

- GitHub `karimf25/koks` (repo root = this `lifeos/` folder) → push to `master`
  auto-deploys to Vercel project **koks** → https://koks-gamma.vercel.app
- `vercel.json`: functions in `dub1` (next to the DB — don't remove, it was a
  4x latency fix) + daily cron `0 6 * * *` hitting `/api/cron/sync`
  (Microsoft sync, if connected, + due automations).

## Integrations

- **Built-in chat** (`/chat`): streaming agentic loop, ~17 tools.
- **MCP server** (`POST /api/mcp`): JSON-RPC over HTTP (initialize / ping /
  notifications / tools/list / tools/call), `Authorization: Bearer ${MCP_API_KEY}`,
  32 tools. Lets external Claude clients operate LifeOS against the live data.

  **Connect from Claude Code:** the project `../.mcp.json` (in the `koks/`
  folder, one level above this repo) registers it as an `http` server named
  `lifeos` pointing at the production URL. Requirements:
  1. `MCP_API_KEY` in Vercel must equal the `Authorization: Bearer` value in
     `.mcp.json` (redeploy after changing it in Vercel).
  2. Restart Claude Code (or run `/mcp`) and approve the `lifeos` server.

  For use outside this project folder, register it at user scope instead:
  `claude mcp add -s user -t http lifeos https://koks-gamma.vercel.app/api/mcp -H "Authorization: Bearer <MCP_API_KEY>"`
- **Microsoft To Do** (`lib/microsoft/`): two-way sync, last-write-wins;
  chosen MS list mirrors into LifeOS; loose LifeOS tasks (no project) push to
  MS; MS-deleted → cancelled (never hard-deleted). Parked: needs an Azure app
  registration (see IMPROVEMENTS.md "Unblock first").

## Current state & gotchas

- All five build phases complete + calendar; see `IMPROVEMENTS.md` for the
  open list (top items: API credits exhausted, Microsoft connection parked).
- Dev server quirks: kill orphaned `next dev` processes if queries start
  failing (they hold pooler connections); delete `.next` if pages hang with
  bundler errors about `net`/`tls`.
- The platform documents itself: there is a memory file at path
  `specs/lifeos-platform-guide` inside the app's own Memory Vault that the
  in-app assistant reads, plus this file and `IMPROVEMENTS.md` for humans.
