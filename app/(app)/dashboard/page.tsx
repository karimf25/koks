import { Metadata } from "next";
import { FocusStrip } from "./_components/FocusStrip";
import { TodaySection } from "./_components/TodaySection";
import { StatNumber } from "@/components/glass";
import { getTaskStats, getTodayTasks, getTasks } from "@/lib/tasks";
import { getProjects, AREA_COLORS } from "@/lib/projects";
import { getIdeasInboxCount } from "@/lib/ideas";
import { getTodayEvents } from "@/lib/events";
import { serializeTask, serializeEvent } from "@/lib/serialize";

export const metadata: Metadata = { title: "Dashboard — LifeOS" };

export default async function DashboardPage() {
  const [stats, rawTodayTasks, activeProjects, inboxCount, rawTodayEvents, allTasks] = await Promise.all([
    getTaskStats(),
    getTodayTasks(),
    getProjects({ status: "active" }),
    getIdeasInboxCount(),
    getTodayEvents(),
    getTasks(),
  ]);
  const todayTasks = rawTodayTasks.map(serializeTask);
  const todayEvents = rawTodayEvents.map(serializeEvent);

  // Project progress: tasks per project
  const projectProgress = activeProjects.slice(0, 4).map((p) => {
    const projectTasks = allTasks.filter((t) => t.projectId === p.id);
    const done = projectTasks.filter((t) => t.status === "done").length;
    const total = projectTasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color = AREA_COLORS[p.area] ?? "var(--teal)";
    return { id: p.id, name: p.name, done, total, pct, color };
  }).filter((p) => p.total > 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">
            {greeting}
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <FocusStrip />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={String(stats.today)} label="Tasks today" />
        <StatCard value={String(stats.thisWeek)} label="Due this week" />
        <StatCard value={String(activeProjects.length)} label="Projects active" />
        <StatCard value={String(inboxCount)} label="Ideas inbox" accent={inboxCount > 0} />
      </div>

      <TodaySection tasks={todayTasks} events={todayEvents} />

      {projectProgress.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">
            Project progress
          </p>
          <div className="glass-card p-4 space-y-3">
            {projectProgress.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-2)] truncate max-w-[200px]">{p.name}</span>
                  <span className="text-[var(--text-3)] font-mono ml-2 flex-shrink-0">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--glass-strong)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.pct}%`, background: p.color, minWidth: p.done > 0 ? "4px" : "0" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <StatNumber value={value} label={label} accent={accent} />
    </div>
  );
}
