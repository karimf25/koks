import { db, ideas, type Idea } from "@/db";
import { eq, and, desc } from "drizzle-orm";

export type CreateIdeaInput = {
  title: string;
  body?: string;
  projectId?: string;
};

export type UpdateIdeaInput = Partial<CreateIdeaInput> & {
  status?: Idea["status"];
  aiVerdict?: string;
};

export async function getIdeas(filters?: { status?: string; projectId?: string }) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(ideas.status, filters.status));
  if (filters?.projectId) conditions.push(eq(ideas.projectId, filters.projectId as any));

  return db
    .select()
    .from(ideas)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ideas.createdAt));
}

export async function getIdea(id: string) {
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
  return idea ?? null;
}

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const [idea] = await db
    .insert(ideas)
    .values({
      title: input.title,
      body: input.body,
      projectId: input.projectId as any,
    })
    .returning();
  return idea;
}

export async function updateIdea(id: string, input: UpdateIdeaInput): Promise<Idea | null> {
  const updates: Partial<typeof ideas.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.body !== undefined) updates.body = input.body;
  if (input.projectId !== undefined) updates.projectId = input.projectId as any;
  if (input.status !== undefined) updates.status = input.status;
  if (input.aiVerdict !== undefined) updates.aiVerdict = input.aiVerdict;

  const [idea] = await db.update(ideas).set(updates).where(eq(ideas.id, id)).returning();
  return idea ?? null;
}

export async function deleteIdea(id: string) {
  await db.delete(ideas).where(eq(ideas.id, id));
}

export async function getIdeasInboxCount() {
  const inbox = await db.select().from(ideas).where(eq(ideas.status, "inbox"));
  return inbox.length;
}
