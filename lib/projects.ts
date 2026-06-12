import { db, projects, tasks, type Project } from "@/db";
import { eq, and, count, desc } from "drizzle-orm";

export type CreateProjectInput = {
  name: string;
  description?: string;
  area?: string;
  color?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  status?: Project["status"];
};

export { AREAS, AREA_COLORS } from "./project-constants";

export async function getProjects(filters?: { status?: string; area?: string }) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(projects.status, filters.status));
  if (filters?.area) conditions.push(eq(projects.area, filters.area));

  return db
    .select()
    .from(projects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(projects.lastTouchedAt), desc(projects.createdAt));
}

export async function getProject(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project ?? null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const [project] = await db
    .insert(projects)
    .values({
      name: input.name,
      description: input.description,
      area: input.area ?? "other",
      color: input.color,
      lastTouchedAt: new Date(),
    })
    .returning();
  return project;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const updates: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date(),
    lastTouchedAt: new Date(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.area !== undefined) updates.area = input.area;
  if (input.color !== undefined) updates.color = input.color;
  if (input.status !== undefined) updates.status = input.status;

  const [project] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
  return project ?? null;
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getProjectsWithTaskCount() {
  const allProjects = await getProjects({ status: "active" });
  const taskCounts = await Promise.all(
    allProjects.map(async (p) => {
      const [row] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(eq(tasks.projectId, p.id as any), eq(tasks.status, "todo")));
      return { projectId: p.id, count: row?.count ?? 0 };
    })
  );
  const countMap = Object.fromEntries(taskCounts.map((r) => [r.projectId, r.count]));
  return allProjects.map((p) => ({ ...p, taskCount: countMap[p.id] ?? 0 }));
}
