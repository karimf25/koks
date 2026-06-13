import { z } from "zod";

export const triggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("schedule"),
    frequency: z.enum(["daily", "weekly"]),
    // required when frequency is "weekly"; the engine falls back to Monday
    weekday: z.number().int().min(0).max(6).optional(),
  }),
  z.object({ type: z.literal("tasks_overdue"), minCount: z.number().int().min(1) }),
  z.object({ type: z.literal("ideas_stale"), days: z.number().int().min(1) }),
]);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_task"),
    title: z.string().min(1),
    priority: z.number().int().min(1).max(3).optional(),
    dueInDays: z.number().int().min(0).optional(),
  }),
  z.object({ type: z.literal("run_focus_engine") }),
  z.object({
    type: z.literal("ai_note"),
    prompt: z.string().min(1),
    noteTitle: z.string().min(1),
  }),
]);

export const createAutomationSchema = z.object({
  name: z.string().min(1),
  trigger: triggerSchema,
  action: actionSchema,
  enabled: z.boolean().optional(),
});

export const updateAutomationSchema = createAutomationSchema.partial();
