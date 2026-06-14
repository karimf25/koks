import { db, tasks, type Task } from "@/db";
import { eq, and, gte, lte, isNull, or, ne, desc, asc, sql } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from "date-fns";

export type CreateTaskInput = {
  title: string;
  description?: string;
  notes?: string;
  projectId?: string;
  groupId?: string;
  priority?: number;
  status?: string;
  dueDate?: string | null;
  scheduledDate?: string;
  recurrence?: string;
  source?: string;
  msTodoId?: string;
  msListId?: string;
  completedAt?: string | Date | null;
  isMyDay?: boolean;
  addToMyDay?: boolean; // M1.6 — automation alias for isMyDay
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: Task["status"];
  isFocus?: boolean;
  isMyDay?: boolean;
  myDayDate?: string | null;
  completedAt?: string | Date | null;
  msTodoId?: string | null;
  msListId?: string | null;
  groupId?: string | null;
  notes?: string | null;
};

export async function getTasks(filters?: {
  status?: string;
  projectId?: string;
  priority?: number;
  scheduled?: string; // ISO date, returns tasks scheduled for that day
  dueToday?: boolean;
  dueThisWeek?: boolean;
  limit?: number;
}) {
  const conditions = [];

  if (filters?.status) conditions.push(eq(tasks.status, filters.status));
  if (filters?.projectId) conditions.push(eq(tasks.projectId, filters.projectId as any));
  if (filters?.priority) conditions.push(eq(tasks.priority, filters.priority));
  if (filters?.scheduled) {
    conditions.push(eq(tasks.scheduledDate, filters.scheduled));
  }
  if (filters?.dueToday) {
    const now = new Date();
    conditions.push(
      and(
        gte(tasks.dueDate, startOfDay(now) as any),
        lte(tasks.dueDate, endOfDay(now) as any)
      )!
    );
  }
  if (filters?.dueThisWeek) {
    const now = new Date();
    conditions.push(
      and(
        gte(tasks.dueDate, startOfWeek(now, { weekStartsOn: 1 }) as any),
        lte(tasks.dueDate, endOfWeek(now, { weekStartsOn: 1 }) as any)
      )!
    );
  }

  const query = db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.priority), desc(tasks.createdAt));

  return query;
}

export async function getTask(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task ?? null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${tasks.position}), 0) + 1` })
    .from(tasks);
  const myDay = input.isMyDay ?? input.addToMyDay ?? false;
  const today = new Date().toISOString().split("T")[0];
  const [task] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description,
      notes: input.notes,
      projectId: input.projectId as any,
      groupId: input.groupId as any,
      priority: input.priority ?? 2,
      status: input.status ?? "todo",
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      scheduledDate: input.scheduledDate,
      recurrence: input.recurrence,
      source: input.source ?? "app",
      msTodoId: input.msTodoId,
      msListId: input.msListId,
      position: Number(next) || 0,
      isMyDay: myDay,
      myDayDate: myDay ? today : undefined,
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
    })
    .returning();
  return task;
}

/**
 * Persist a manual ordering. `orderedIds` is the full list of task ids in the
 * desired order; each task's `position` is set to its index. Used by drag-drop (M1.8).
 */
export async function reorderTasks(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(tasks).set({ position: i, updatedAt: new Date() }).where(eq(tasks.id, id))
    )
  );
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const today = new Date().toISOString().split("T")[0];
  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.notes !== undefined) updates.notes = input.notes as any;
  if (input.projectId !== undefined) updates.projectId = input.projectId as any;
  if (input.groupId !== undefined) updates.groupId = input.groupId as any;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.status !== undefined) updates.status = input.status;
  if (input.isFocus !== undefined) updates.isFocus = input.isFocus;
  if (input.isMyDay !== undefined) {
    updates.isMyDay = input.isMyDay;
    updates.myDayDate = input.isMyDay ? (input.myDayDate ?? today) : (null as any);
  }
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate ? new Date(input.dueDate) : (null as any);
  if (input.scheduledDate !== undefined) updates.scheduledDate = input.scheduledDate;
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
  if (input.msTodoId !== undefined) updates.msTodoId = input.msTodoId as any;
  if (input.msListId !== undefined) updates.msListId = input.msListId as any;
  if (input.completedAt !== undefined) {
    updates.completedAt = input.completedAt ? new Date(input.completedAt) : (null as any);
  }
  if (input.status === "done" && !updates.completedAt) {
    updates.completedAt = new Date();
  }

  const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
  return task ?? null;
}

export async function getMyDayTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split("T")[0];
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.isMyDay, true), eq(tasks.myDayDate, today)))
    .orderBy(asc(tasks.position));
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ── Microsoft To Do sync helpers ────────────────────────────────────────────────

/** All LifeOS tasks linked to a given Microsoft To Do list. */
export async function getTasksByMsListId(listId: string): Promise<Task[]> {
  return db.select().from(tasks).where(eq(tasks.msListId, listId));
}

/**
 * LifeOS-native tasks eligible to be pushed to Microsoft for the first time:
 * not already linked (no msTodoId), not originally from Microsoft, not cancelled,
 * and not attached to a project (loose / inbox-style tasks).
 */
export async function getPushableTasks(): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.msTodoId),
        isNull(tasks.projectId),
        ne(tasks.source, "microsoft"),
        ne(tasks.status, "cancelled")
      )
    );
}

export async function getTaskStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [allTasks, todayTasks, weekTasks] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.status, "todo")),
    db.select().from(tasks).where(
      and(
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))!,
        or(
          and(gte(tasks.dueDate, todayStart as any), lte(tasks.dueDate, todayEnd as any))!,
          eq(tasks.scheduledDate, now.toISOString().split("T")[0])
        )!
      )!
    ),
    db.select().from(tasks).where(
      and(
        eq(tasks.status, "todo"),
        gte(tasks.dueDate, weekStart as any),
        lte(tasks.dueDate, weekEnd as any)
      )!
    ),
  ]);

  return {
    total: allTasks.length,
    today: todayTasks.length,
    thisWeek: weekTasks.length,
  };
}

export async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];
  return db
    .select()
    .from(tasks)
    .where(
      and(
        or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))!,
        or(
          eq(tasks.scheduledDate, today),
          and(
            gte(tasks.dueDate, startOfDay(new Date()) as any),
            lte(tasks.dueDate, endOfDay(new Date()) as any)
          )!
        )!
      )!
    )
    .orderBy(asc(tasks.priority))
    .limit(10);
}
