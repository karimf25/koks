import { NextResponse } from "next/server";
import { getTodayTasks } from "@/lib/tasks";
import { getTodayEvents } from "@/lib/events";
import { getIdeas } from "@/lib/ideas";
import Anthropic from "@anthropic-ai/sdk";

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  }

  const [todayTasks, todayEvents, inboxIdeas] = await Promise.all([
    getTodayTasks(),
    getTodayEvents(),
    getIdeas({ status: "inbox" }),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const tasksText = todayTasks.length
    ? todayTasks
        .map((t) => `- [P${t.priority}] ${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : ""}`)
        .join("\n")
    : "No tasks scheduled for today";

  const eventsText = todayEvents.length
    ? todayEvents
        .map((e) => `- ${new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–${new Date(e.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: ${e.title}`)
        .join("\n")
    : "No events today";

  const ideasText = inboxIdeas.slice(0, 5).length
    ? inboxIdeas.slice(0, 5).map((i) => `- ${i.title}`).join("\n")
    : "Inbox is empty";

  const prompt = `You are Claude Code, acting as a personal co-worker planning ${today} for Karim.

Review the following information and create a focused, actionable day plan. Be direct and specific.

TODAY'S TASKS:
${tasksText}

TODAY'S EVENTS:
${eventsText}

IDEAS INBOX (top 5):
${ideasText}

Create a structured day plan with:
1. **Priority focus** — the 1-3 most important things to accomplish today (with brief reasoning)
2. **Suggested time blocks** — a rough schedule that works around the events
3. **Quick wins** — 2-3 small tasks to knock out early for momentum
4. **One idea worth acting on** — if any inbox ideas deserve attention today

Format as clean markdown. Be concise — this is a working plan, not an essay. Max 300 words.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const plan = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ plan });
}
