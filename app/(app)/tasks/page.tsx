import { Metadata } from "next";
import { getTasks } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { serializeTask, serializeProject } from "@/lib/serialize";
import { TaskList } from "./_components/TaskList";

export const metadata: Metadata = { title: "Tasks — LifeOS" };

export default async function TasksPage() {
  const [rawTasks, rawProjects] = await Promise.all([getTasks(), getProjects()]);
  const tasks = rawTasks.map(serializeTask);
  const projects = rawProjects.map(serializeProject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Tasks</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all projects
        </p>
      </div>
      <TaskList initialTasks={tasks} projects={projects} />
    </div>
  );
}
