import { Metadata } from "next";
import { FocusStrip } from "./_components/FocusStrip";
import { TodaySection } from "./_components/TodaySection";
import { StatNumber } from "@/components/glass";
import { getTaskStats, getTodayTasks } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { getIdeasInboxCount } from "@/lib/ideas";
import { getTodayEvents } from "@/lib/events";

export const metadata: Metadata = { title: "Dashboard — LifeOS" };

export default async function DashboardPage() {
  const [stats, todayTasks, activeProjects, inboxCount, todayEvents] = await Promise.all([
    getTaskStats(),
    getTodayTasks(),
    getProjects({ status: "active" }),
    getIdeasInboxCount(),
    getTodayEvents(),
  ]);

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
