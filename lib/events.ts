import { db, events, type Event } from "@/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export type CreateEventInput = {
  title: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  start: string;
  end: string;
  allDay?: boolean;
  recurrence?: string;
  location?: string;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export async function getEvents(filters?: {
  from?: Date;
  to?: Date;
  projectId?: string;
}) {
  const conditions = [];
  if (filters?.from) conditions.push(gte(events.start, filters.from as any));
  if (filters?.to) conditions.push(lte(events.start, filters.to as any));
  if (filters?.projectId) conditions.push(eq(events.projectId, filters.projectId as any));

  return db
    .select()
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(events.start);
}

export async function getEvent(id: string) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event ?? null;
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const [event] = await db
    .insert(events)
    .values({
      title: input.title,
      description: input.description,
      projectId: input.projectId as any,
      taskId: input.taskId as any,
      start: new Date(input.start),
      end: new Date(input.end),
      allDay: input.allDay ?? false,
      recurrence: input.recurrence,
      location: input.location,
    })
    .returning();
  return event;
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event | null> {
  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.projectId !== undefined) updates.projectId = input.projectId as any;
  if (input.start !== undefined) updates.start = new Date(input.start);
  if (input.end !== undefined) updates.end = new Date(input.end);
  if (input.allDay !== undefined) updates.allDay = input.allDay;
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
  if (input.location !== undefined) updates.location = input.location;

  const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
  return event ?? null;
}

export async function deleteEvent(id: string) {
  await db.delete(events).where(eq(events.id, id));
}

export async function getTodayEvents() {
  const now = new Date();
  return db
    .select()
    .from(events)
    .where(
      and(
        gte(events.start, startOfDay(now) as any),
        lte(events.start, endOfDay(now) as any)
      )!
    )
    .orderBy(events.start);
}

export async function getWeekEvents(date?: Date) {
  const ref = date ?? new Date();
  return db
    .select()
    .from(events)
    .where(
      and(
        gte(events.start, startOfWeek(ref, { weekStartsOn: 1 }) as any),
        lte(events.start, endOfWeek(ref, { weekStartsOn: 1 }) as any)
      )!
    )
    .orderBy(events.start);
}
