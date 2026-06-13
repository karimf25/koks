import { db, tasks, ideas, notes, events, projects } from "@/db";
import { and, gte, lte, eq, isNotNull } from "drizzle-orm";
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";

/** Everything the Remotion recap composition needs — fully JSON-serializable. */
export type WeekRecapData = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  tasksCompleted: number;
  completedTitles: string[];
  tasksCreated: number;
  ideasCaptured: number;
  notesTouched: number;
  eventsCount: number;
  projects: { name: string; color: string | null; completed: number }[];
  byDay: { day: string; count: number }[];
  bestDay: string | null;
};

export async function getWeekRecap(weekOffset = 0): Promise<WeekRecapData> {
  const anchor = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });

  const [completed, created, capturedIdeas, touchedNotes, weekEvents, allProjects] =
    await Promise.all([
      db
        .select()
        .from(tasks)
        .where(
          and(
            isNotNull(tasks.completedAt),
            gte(tasks.completedAt, weekStart),
            lte(tasks.completedAt, weekEnd),
            eq(tasks.status, "done")
          )
        ),
      db
        .select()
        .from(tasks)
        .where(and(gte(tasks.createdAt, weekStart), lte(tasks.createdAt, weekEnd))),
      db
        .select()
        .from(ideas)
        .where(and(gte(ideas.createdAt, weekStart), lte(ideas.createdAt, weekEnd))),
      db
        .select()
        .from(notes)
        .where(and(gte(notes.updatedAt, weekStart), lte(notes.updatedAt, weekEnd))),
      db
        .select()
        .from(events)
        .where(and(gte(events.start, weekStart), lte(events.start, weekEnd))),
      db.select().from(projects),
    ]);

  // Completions per project, sorted by count
  const byProject = new Map<string, number>();
  for (const t of completed) {
    if (t.projectId) byProject.set(t.projectId, (byProject.get(t.projectId) ?? 0) + 1);
  }
  const projectStats = [...byProject.entries()]
    .map(([id, count]) => {
      const p = allProjects.find((x) => x.id === id);
      return { name: p?.name ?? "Unknown", color: p?.color ?? null, completed: count };
    })
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);

  // Completions per weekday (Mon..Sun)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of completed) {
    if (!t.completedAt) continue;
    const jsDay = t.completedAt.getDay(); // 0 = Sun
    dayCounts[(jsDay + 6) % 7] += 1; // shift so 0 = Mon
  }
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDay = dayNames.map((day, i) => ({ day, count: dayCounts[i] }));
  const max = Math.max(...dayCounts);
  const bestDay = max > 0 ? dayNames[dayCounts.indexOf(max)] : null;

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekLabel: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
    isCurrentWeek: weekOffset === 0,
    tasksCompleted: completed.length,
    completedTitles: completed.slice(0, 6).map((t) => t.title),
    tasksCreated: created.length,
    ideasCaptured: capturedIdeas.length,
    notesTouched: touchedNotes.length,
    eventsCount: weekEvents.length,
    projects: projectStats,
    byDay,
    bestDay,
  };
}
