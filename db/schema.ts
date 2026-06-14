import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  real,
  jsonb,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  area: text("area").notNull().default("other"), // uni | work | sports | side-project | personal | other
  color: text("color"),
  status: text("status").notNull().default("active"), // active | paused | done | archived
  lastTouchedAt: timestamp("last_touched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskGroups = pgTable("task_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"), // M1.1 — markdown notes on a task
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  groupId: uuid("group_id").references(() => taskGroups.id, { onDelete: "set null" }), // M1.4
  status: text("status").notNull().default("todo"), // todo | in_progress | done | cancelled
  priority: integer("priority").notNull().default(2), // 1 high, 2 medium, 3 low
  aiScore: real("ai_score"),
  aiRationale: text("ai_rationale"),
  isFocus: boolean("is_focus").notNull().default(false),
  isMyDay: boolean("is_my_day").notNull().default(false), // M1.5
  myDayDate: date("my_day_date"), // M1.5 — tracks which calendar day it was pinned
  dueDate: timestamp("due_date", { withTimezone: true }),
  scheduledDate: date("scheduled_date"),
  recurrence: text("recurrence"), // RRULE string
  msTodoId: text("ms_todo_id"),
  msListId: text("ms_list_id"),
  source: text("source").notNull().default("app"), // app | claude | microsoft | automation
  position: integer("position").notNull().default(0), // manual ordering (drag-drop); backfilled by createdAt
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const ideas = pgTable("ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  status: text("status").notNull().default("inbox"), // inbox | promoted | parked | dropped
  aiVerdict: text("ai_verdict"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  recurrence: text("recurrence"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mindmaps = pgTable("mindmaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  data: jsonb("data").notNull().default({ nodes: [], edges: [] }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memoryFiles = pgTable("memory_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  path: text("path").unique().notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  contentText: text("content_text").notNull().default(""),
  kind: text("kind").notNull().default("conversation"), // conversation | decision | spec | reference
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const focusRuns = pgTable("focus_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  briefingMd: text("briefing_md").notNull().default(""),
  picks: jsonb("picks").notNull().default([]),
  flags: jsonb("flags").notNull().default({}),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").unique().notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const automations = pgTable("automations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  trigger: jsonb("trigger").notNull(),
  action: jsonb("action").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  automationId: uuid("automation_id").references(() => automations.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | success | error
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerType: text("owner_type").notNull(), // task | project
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(), // object path within the storage bucket
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type TaskGroup = typeof taskGroups.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Mindmap = typeof mindmaps.$inferSelect;
export type MemoryFile = typeof memoryFiles.$inferSelect;
export type FocusRun = typeof focusRuns.$inferSelect;
export type Automation = typeof automations.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
