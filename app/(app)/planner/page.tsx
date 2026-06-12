import { Metadata } from "next";
import { getLatestFocusRun } from "@/lib/focus";
import { getTodayTasks } from "@/lib/tasks";
import { getTodayEvents } from "@/lib/events";
import { FocusEngine } from "./_components/FocusEngine";
import { GlassCard } from "@/components/glass";
import { CheckSquare, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Planner — LifeOS" };

export default async function PlannerPage() {
  const [focusRun, todayTasks, todayEvents] = await Promise.all([
    getLatestFocusRun(),
    getTodayTasks(),
    getTodayEvents(),
  ]);

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Planner</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Engine */}
        <div className="lg:col-span-2">
          <FocusEngine initialRun={focusRun as any} hasApiKey={hasApiKey} />
        </div>

        {/* Today's tasks */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5" /> Today's Tasks
          </p>
          {todayTasks.length === 0 ? (
            <GlassCard className="p-4 text-center text-sm text-[var(--text-3)]">No tasks scheduled for today</GlassCard>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((t) => (
                <GlassCard key={t.id} className="p-3 flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: t.priority === 1 ? "var(--accent)" : t.priority === 2 ? "var(--gold)" : "var(--slate)",
                    }}
                  />
                  <span className={`text-sm flex-1 ${t.status === "done" ? "line-through text-[var(--text-3)]" : "text-[var(--text)]"}`}>
                    {t.title}
                  </span>
                  {t.dueDate && (
                    <span className="text-xs text-[var(--text-3)]">
                      {new Date(t.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Today's events */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Today's Events
          </p>
          {todayEvents.length === 0 ? (
            <GlassCard className="p-4 text-center text-sm text-[var(--text-3)]">No events today</GlassCard>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((e) => (
                <GlassCard key={e.id} className="p-3 flex items-center gap-3">
                  <div className="text-xs text-[var(--teal)] font-mono flex-shrink-0">
                    {new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <span className="text-sm text-[var(--text)] flex-1">{e.title}</span>
                  <div className="text-xs text-[var(--text-3)]">
                    {new Date(e.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
