import { db, automations, agentRuns } from "@/db";
import { eq, desc, and, lt, inArray } from "drizzle-orm";
import { tasks, ideas } from "@/db";
import { createTask } from "./tasks";
import { createNote } from "./notes";
import { runFocusEngine } from "./focus";
import { subDays, startOfDay, startOfWeek } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

export type Automation = typeof automations.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;

// ── Trigger / action shapes (stored as jsonb) ───────────────────────────────

export type AutomationTrigger =
  | { type: "schedule"; frequency: "daily" | "weekly"; weekday?: number } // weekday 0 = Sunday … 6 = Saturday, weekly only
  | { type: "tasks_overdue"; minCount: number }
  | { type: "ideas_stale"; days: number };

export type AutomationAction =
  | { type: "create_task"; title: string; priority?: number; dueInDays?: number }
  | { type: "run_focus_engine" }
  | { type: "ai_note"; prompt: string; noteTitle: string };

export type CreateAutomationInput = {
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled?: boolean;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAutomations(): Promise<Automation[]> {
  return db.select().from(automations).orderBy(desc(automations.createdAt));
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const [row] = await db.select().from(automations).where(eq(automations.id, id));
  return row ?? null;
}

export async function createAutomation(input: CreateAutomationInput): Promise<Automation> {
  const [row] = await db
    .insert(automations)
    .values({
      name: input.name,
      trigger: input.trigger,
      action: input.action,
      enabled: input.enabled ?? true,
    })
    .returning();
  return row;
}

export async function updateAutomation(
  id: string,
  input: Partial<CreateAutomationInput>
): Promise<Automation | null> {
  const updates: Partial<typeof automations.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.trigger !== undefined) updates.trigger = input.trigger;
  if (input.action !== undefined) updates.action = input.action;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  const [row] = await db.update(automations).set(updates).where(eq(automations.id, id)).returning();
  return row ?? null;
}

export async function deleteAutomation(id: string) {
  await db.delete(automations).where(eq(automations.id, id));
}

export async function getRecentRuns(limit = 20): Promise<AgentRun[]> {
  return db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(limit);
}

// ── Trigger evaluation ───────────────────────────────────────────────────────

/**
 * Decides whether an automation is due. Condition triggers (overdue/stale) are
 * checked against live data; schedule triggers fire at most once per period,
 * gated by lastRunAt. Returns extra context used to template the action.
 */
async function evaluateTrigger(
  a: Automation
): Promise<{ due: boolean; detail: string; context: Record<string, unknown> }> {
  const trigger = a.trigger as AutomationTrigger;
  const now = new Date();

  if (trigger.type === "schedule") {
    if (trigger.frequency === "daily") {
      const due = !a.lastRunAt || a.lastRunAt < startOfDay(now);
      return { due, detail: due ? "Daily schedule due" : "Already ran today", context: {} };
    }
    // weekly — default to Monday if weekday was omitted
    const isDay = now.getDay() === (trigger.weekday ?? 1);
    const ranThisWeek = !!a.lastRunAt && a.lastRunAt >= startOfWeek(now, { weekStartsOn: 1 });
    const due = isDay && !ranThisWeek;
    return {
      due,
      detail: due ? "Weekly schedule due" : isDay ? "Already ran this week" : "Not the scheduled day",
      context: {},
    };
  }

  if (trigger.type === "tasks_overdue") {
    const overdue = await db
      .select()
      .from(tasks)
      .where(
        and(
          lt(tasks.dueDate, startOfDay(now)),
          inArray(tasks.status, ["todo", "in_progress"])
        )
      );
    const min = trigger.minCount || 1;
    // Condition triggers also fire at most once a day so a standing condition
    // doesn't create duplicates on every run.
    const ranToday = !!a.lastRunAt && a.lastRunAt >= startOfDay(now);
    const due = overdue.length >= min && !ranToday;
    return {
      due,
      detail: `${overdue.length} overdue task(s), threshold ${min}${ranToday ? ", already ran today" : ""}`,
      context: { overdueCount: overdue.length, overdueTitles: overdue.slice(0, 10).map((t) => t.title) },
    };
  }

  if (trigger.type === "ideas_stale") {
    const cutoff = subDays(now, trigger.days || 7);
    const stale = await db
      .select()
      .from(ideas)
      .where(and(eq(ideas.status, "inbox"), lt(ideas.createdAt, cutoff)));
    const ranToday = !!a.lastRunAt && a.lastRunAt >= startOfDay(now);
    const due = stale.length > 0 && !ranToday;
    return {
      due,
      detail: `${stale.length} idea(s) older than ${trigger.days || 7} days${ranToday ? ", already ran today" : ""}`,
      context: { staleCount: stale.length, staleTitles: stale.slice(0, 10).map((i) => i.title) },
    };
  }

  return { due: false, detail: "Unknown trigger type", context: {} };
}

// ── Action execution ─────────────────────────────────────────────────────────

/** Replaces {{key}} placeholders with values from the trigger context. */
function template(text: string, context: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = context[key];
    if (Array.isArray(v)) return v.join(", ");
    return v != null ? String(v) : `{{${key}}}`;
  });
}

async function executeAction(
  a: Automation,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const action = a.action as AutomationAction;

  if (action.type === "create_task") {
    const dueDate = action.dueInDays != null
      ? new Date(Date.now() + action.dueInDays * 86400000).toISOString()
      : null;
    const task = await createTask({
      title: template(action.title, context),
      priority: action.priority ?? 2,
      dueDate,
      source: "automation",
    });
    return { taskId: task.id, title: task.title };
  }

  if (action.type === "run_focus_engine") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    const run = await runFocusEngine();
    return { focusRunId: run.id };
  }

  if (action.type === "ai_note") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an automation inside LifeOS, a personal life management app. Write the body of a markdown note based on this instruction. Respond with markdown only — no preamble.

Instruction: ${template(action.prompt, context)}

Context from the trigger: ${JSON.stringify(context)}
Today is ${new Date().toDateString()}.`,
        },
      ],
    });
    const text = response.content.find((c) => c.type === "text")?.text ?? "";
    const dateSuffix = new Date().toISOString().split("T")[0];
    const note = await createNote({
      title: `${template(action.noteTitle, context)} — ${dateSuffix}`,
      content: text,
    });
    return { noteId: note.id, title: note.title };
  }

  throw new Error("Unknown action type");
}

// ── Engine ───────────────────────────────────────────────────────────────────

export type AutomationRunResult = {
  automationId: string;
  name: string;
  status: "success" | "error" | "skipped";
  detail: string;
  output?: Record<string, unknown>;
};

/**
 * Runs one automation. With force=true the trigger check is skipped (the
 * "Run now" button); the trigger is still evaluated to build template context.
 */
export async function runAutomation(a: Automation, force = false): Promise<AutomationRunResult> {
  const { due, detail, context } = await evaluateTrigger(a);

  if (!due && !force) {
    return { automationId: a.id, name: a.name, status: "skipped", detail };
  }

  const [run] = await db
    .insert(agentRuns)
    .values({
      automationId: a.id,
      kind: (a.action as AutomationAction).type,
      status: "running",
      input: { trigger: a.trigger, action: a.action, context, forced: force },
    })
    .returning();

  try {
    const output = await executeAction(a, context);
    await db
      .update(agentRuns)
      .set({ status: "success", output, finishedAt: new Date() })
      .where(eq(agentRuns.id, run.id));
    await db.update(automations).set({ lastRunAt: new Date() }).where(eq(automations.id, a.id));
    return { automationId: a.id, name: a.name, status: "success", detail, output };
  } catch (err) {
    await db
      .update(agentRuns)
      .set({ status: "error", error: String(err), finishedAt: new Date() })
      .where(eq(agentRuns.id, run.id));
    return { automationId: a.id, name: a.name, status: "error", detail: String(err) };
  }
}

/** Runs every enabled automation whose trigger is due. Called by the daily cron. */
export async function runDueAutomations(): Promise<AutomationRunResult[]> {
  const all = await getAutomations();
  const results: AutomationRunResult[] = [];
  for (const a of all) {
    if (!a.enabled) continue;
    results.push(await runAutomation(a));
  }
  return results;
}
