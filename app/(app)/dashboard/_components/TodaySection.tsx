"use client";

import { GlassPanel, GlassButton, PriorityDot } from "@/components/glass";
import { CheckSquare, Calendar, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { Task, Event } from "@/db";

interface Props {
  tasks: Task[];
  events: Event[];
}

export function TodaySection({ tasks, events }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TodayTasks tasks={tasks} />
      <TodayEvents events={events} />
    </div>
  );
}

function TodayTasks({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, startTransition] = useTransition();

  const toggleDone = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus as Task["status"] } : t))
    );
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    });
  };

  return (
    <GlassPanel>
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-2)]">Today&apos;s tasks</h3>
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-[var(--text-3)]">{tasks.length}</span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">No tasks scheduled for today.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 group"
            >
              <button
                onClick={() => toggleDone(task.id)}
                className="flex-shrink-0 w-4 h-4 rounded-full border border-[var(--glass-border)] flex items-center justify-center transition-colors hover:border-[var(--accent)]"
                style={
                  task.status === "done"
                    ? { background: "var(--accent)", borderColor: "var(--accent)" }
                    : {}
                }
              >
                {task.status === "done" && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <PriorityDot priority={task.priority as 1 | 2 | 3} />
              <span
                className="text-sm text-[var(--text)] truncate flex-1"
                style={task.status === "done" ? { opacity: 0.4, textDecoration: "line-through" } : {}}
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

function TodayEvents({ events }: { events: Event[] }) {
  return (
    <GlassPanel>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-[var(--teal)]" />
        <h3 className="text-sm font-semibold text-[var(--text-2)]">Today&apos;s events</h3>
        {events.length > 0 && (
          <span className="ml-auto text-xs text-[var(--text-3)]">{events.length}</span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">No events today.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex-shrink-0 text-right w-16">
                <span className="text-xs font-mono text-[var(--teal)]">
                  {event.allDay ? "All day" : format(new Date(event.start), "HH:mm")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{event.title}</p>
                {event.location && (
                  <p className="text-xs text-[var(--text-3)] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
