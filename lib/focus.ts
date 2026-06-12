import { db, focusRuns } from "@/db";
import { desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { getTodayTasks } from "./tasks";
import { getTodayEvents } from "./events";
import { getProjects } from "./projects";
import { getIdeas } from "./ideas";

export type FocusPick = {
  kind: "task" | "project" | "idea";
  id: string;
  title: string;
  reason: string;
};

export async function getLatestFocusRun() {
  const [run] = await db.select().from(focusRuns).orderBy(desc(focusRuns.runAt)).limit(1);
  return run ?? null;
}

export async function runFocusEngine(): Promise<typeof focusRuns.$inferSelect> {
  const [tasks, events, projects, ideas] = await Promise.all([
    getTodayTasks(),
    getTodayEvents(),
    getProjects({ status: "active" }),
    getIdeas({ status: "inbox" }),
  ]);

  const context = JSON.stringify(
    {
      todayTasks: tasks.slice(0, 20).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        status: t.status,
      })),
      todayEvents: events.slice(0, 10).map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
      })),
      activeProjects: projects.slice(0, 10).map((p) => ({
        id: p.id,
        title: p.name,
        area: p.area,
      })),
      inboxIdeas: ideas.slice(0, 10).map((i) => ({
        id: i.id,
        title: i.title,
      })),
    },
    null,
    2
  );

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are the Focus Engine for LifeOS. Based on the user's tasks, events, projects, and ideas for today, pick the top 3–5 most important things to focus on. Return a JSON object with:
- picks: array of { kind: "task"|"project"|"idea", id, title, reason }
- briefing_md: a short markdown briefing (4–8 sentences) that reads like a morning brief

Here is today's data:
${context}

Respond ONLY with valid JSON matching this schema:
{ "picks": [...], "briefing_md": "..." }`,
      },
    ],
  });

  const text = response.content.find((c) => c.type === "text")?.text ?? "{}";
  let parsed: { picks: FocusPick[]; briefing_md: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { picks: [], briefing_md: text };
  }

  const [run] = await db
    .insert(focusRuns)
    .values({
      briefingMd: parsed.briefing_md ?? "",
      picks: parsed.picks ?? [],
    })
    .returning();

  return run;
}
