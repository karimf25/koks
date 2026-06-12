import { db, memoryFiles, type MemoryFile } from "@/db";
import { eq, desc, ilike, or } from "drizzle-orm";

export type CreateMemoryInput = {
  path: string;
  title: string;
  summary?: string;
  contentText?: string;
  kind?: string;
  projectId?: string;
};

export type UpdateMemoryInput = Partial<Omit<CreateMemoryInput, "path">>;

export async function getMemoryFiles(filters?: { kind?: string; search?: string }) {
  const rows = await db
    .select()
    .from(memoryFiles)
    .orderBy(desc(memoryFiles.updatedAt));

  if (!filters) return rows;

  return rows.filter((f) => {
    if (filters.kind && f.kind !== filters.kind) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        (f.summary ?? "").toLowerCase().includes(q) ||
        f.contentText.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export async function getMemoryFile(id: string): Promise<MemoryFile | null> {
  const [file] = await db.select().from(memoryFiles).where(eq(memoryFiles.id, id));
  return file ?? null;
}

export async function getMemoryFileByPath(path: string): Promise<MemoryFile | null> {
  const [file] = await db.select().from(memoryFiles).where(eq(memoryFiles.path, path));
  return file ?? null;
}

export async function createMemoryFile(input: CreateMemoryInput): Promise<MemoryFile> {
  const [file] = await db
    .insert(memoryFiles)
    .values({
      path: input.path,
      title: input.title,
      summary: input.summary,
      contentText: input.contentText ?? "",
      kind: input.kind ?? "conversation",
      projectId: input.projectId as any,
    })
    .returning();
  return file;
}

export async function updateMemoryFile(
  id: string,
  input: UpdateMemoryInput
): Promise<MemoryFile | null> {
  const updates: any = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.summary !== undefined) updates.summary = input.summary;
  if (input.contentText !== undefined) updates.contentText = input.contentText;
  if (input.kind !== undefined) updates.kind = input.kind;
  if (input.projectId !== undefined) updates.projectId = input.projectId;

  const [file] = await db.update(memoryFiles).set(updates).where(eq(memoryFiles.id, id)).returning();
  return file ?? null;
}

export async function deleteMemoryFile(id: string) {
  await db.delete(memoryFiles).where(eq(memoryFiles.id, id));
}

export { MEMORY_KINDS } from "./memory-constants";
