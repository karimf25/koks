import { NextRequest, NextResponse } from "next/server";
import { db, tasks, projects, ideas, notes } from "@/db";
import { ilike, or, eq, and, ne } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], projects: [], ideas: [], notes: [] });

  const pattern = `%${q}%`;

  const [taskRows, projectRows, ideaRows, noteRows] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
      .from(tasks)
      .where(and(ilike(tasks.title, pattern), ne(tasks.status, "done")))
      .limit(5),
    db
      .select({ id: projects.id, title: projects.name, status: projects.status })
      .from(projects)
      .where(ilike(projects.name, pattern))
      .limit(5),
    db
      .select({ id: ideas.id, title: ideas.title, status: ideas.status })
      .from(ideas)
      .where(and(ilike(ideas.title, pattern), eq(ideas.status, "inbox")))
      .limit(5),
    db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .where(ilike(notes.title, pattern))
      .limit(5),
  ]);

  return NextResponse.json({ tasks: taskRows, projects: projectRows, ideas: ideaRows, notes: noteRows });
}
