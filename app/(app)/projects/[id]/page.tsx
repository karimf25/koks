import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getProjects, AREA_COLORS } from "@/lib/projects";
import { getTasks } from "@/lib/tasks";
import { TaskList } from "../../tasks/_components/TaskList";
import { GlassPanel } from "@/components/glass";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? `${project.name} — LifeOS` : "Project — LifeOS" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, tasks, allProjects] = await Promise.all([
    getProject(id),
    getTasks({ projectId: id }),
    getProjects(),
  ]);

  if (!project) notFound();

  const color = AREA_COLORS[project.area] ?? "var(--slate)";
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="text-xs text-[var(--text-3)] uppercase tracking-wider">
            {project.area.replace("-", " ")}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm text-[var(--text-3)] mt-1">{project.description}</p>
        )}
      </div>

      {tasks.length > 0 && (
        <GlassPanel noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-2)]">Progress</span>
            <span className="text-xs font-mono text-[var(--text-2)]">
              {doneTasks}/{tasks.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "var(--glass-strong)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: color }}
            />
          </div>
        </GlassPanel>
      )}

      <TaskList initialTasks={tasks} projects={allProjects} />
    </div>
  );
}
