import { db, taskGroups, type TaskGroup } from "@/db";
import { eq, asc, sql } from "drizzle-orm";

export async function getTaskGroups(): Promise<TaskGroup[]> {
  return db.select().from(taskGroups).orderBy(asc(taskGroups.position), asc(taskGroups.createdAt));
}

export async function createTaskGroup(input: { name: string; color?: string }): Promise<TaskGroup> {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${taskGroups.position}), 0) + 1` })
    .from(taskGroups);
  const [group] = await db
    .insert(taskGroups)
    .values({ name: input.name, color: input.color ?? "#6366f1", position: Number(next) || 0 })
    .returning();
  return group;
}

export async function updateTaskGroup(
  id: string,
  input: { name?: string; color?: string; position?: number }
): Promise<TaskGroup | null> {
  const updates: Partial<typeof taskGroups.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.color !== undefined) updates.color = input.color;
  if (input.position !== undefined) updates.position = input.position;
  const [group] = await db.update(taskGroups).set(updates).where(eq(taskGroups.id, id)).returning();
  return group ?? null;
}

export async function deleteTaskGroup(id: string): Promise<void> {
  await db.delete(taskGroups).where(eq(taskGroups.id, id));
}
