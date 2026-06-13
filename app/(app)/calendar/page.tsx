import { Metadata } from "next";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { getEvents } from "@/lib/events";
import { getTasks } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { serializeEvent, serializeTask, serializeProject } from "@/lib/serialize";
import { CalendarView } from "./_components/CalendarView";

export const metadata: Metadata = { title: "Calendar — LifeOS" };

export default async function CalendarPage() {
  const now = new Date();
  const from = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const to = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });

  const [events, tasks, projects] = await Promise.all([
    getEvents({ from, to }),
    getTasks(),
    getProjects(),
  ]);

  return (
    <CalendarView
      initialEvents={events.map(serializeEvent)}
      tasks={tasks.filter((t) => t.dueDate || t.scheduledDate).map(serializeTask)}
      projects={projects.map(serializeProject)}
    />
  );
}
