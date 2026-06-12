import { db, mindmaps, type Mindmap } from "@/db";
import { eq, and, desc } from "drizzle-orm";

export type MindmapNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: { label: string; color?: string };
};

export type MindmapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type MindmapData = {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
};

export type CreateMindmapInput = {
  title: string;
  projectId?: string;
  data?: MindmapData;
};

export type UpdateMindmapInput = Partial<CreateMindmapInput>;

const EMPTY_DATA: MindmapData = { nodes: [], edges: [] };

export async function getMindmaps(filters?: { projectId?: string }) {
  const conditions = [];
  if (filters?.projectId) conditions.push(eq(mindmaps.projectId, filters.projectId as any));

  return db
    .select()
    .from(mindmaps)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(mindmaps.updatedAt));
}

export async function getMindmap(id: string): Promise<Mindmap | null> {
  const [map] = await db.select().from(mindmaps).where(eq(mindmaps.id, id));
  return map ?? null;
}

export async function createMindmap(input: CreateMindmapInput): Promise<Mindmap> {
  const [map] = await db
    .insert(mindmaps)
    .values({
      title: input.title,
      projectId: input.projectId as any,
      data: (input.data ?? EMPTY_DATA) as any,
    })
    .returning();
  return map;
}

export async function updateMindmap(id: string, input: UpdateMindmapInput): Promise<Mindmap | null> {
  const updates: Partial<typeof mindmaps.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.projectId !== undefined) updates.projectId = input.projectId as any;
  if (input.data !== undefined) updates.data = input.data as any;

  const [map] = await db.update(mindmaps).set(updates).where(eq(mindmaps.id, id)).returning();
  return map ?? null;
}

export async function deleteMindmap(id: string) {
  await db.delete(mindmaps).where(eq(mindmaps.id, id));
}
