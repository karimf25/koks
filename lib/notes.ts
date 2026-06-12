import { db, notes, type Note } from "@/db";
import { eq, and, desc } from "drizzle-orm";

export type CreateNoteInput = {
  title: string;
  content?: string;
  projectId?: string;
  pinned?: boolean;
};

export type UpdateNoteInput = Partial<CreateNoteInput>;

export async function getNotes(filters?: { projectId?: string; search?: string }) {
  const conditions = [];
  if (filters?.projectId) conditions.push(eq(notes.projectId, filters.projectId as any));

  const rows = await db
    .select()
    .from(notes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));

  if (!filters?.search) return rows;

  const q = filters.search.toLowerCase();
  return rows.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );
}

export async function getNote(id: string): Promise<Note | null> {
  const [note] = await db.select().from(notes).where(eq(notes.id, id));
  return note ?? null;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const [note] = await db
    .insert(notes)
    .values({
      title: input.title,
      content: input.content ?? "",
      projectId: input.projectId as any,
      pinned: input.pinned ?? false,
    })
    .returning();
  return note;
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
  const updates: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) updates.content = input.content;
  if (input.projectId !== undefined) updates.projectId = input.projectId as any;
  if (input.pinned !== undefined) updates.pinned = input.pinned;

  const [note] = await db.update(notes).set(updates).where(eq(notes.id, id)).returning();
  return note ?? null;
}

export async function deleteNote(id: string) {
  await db.delete(notes).where(eq(notes.id, id));
}
