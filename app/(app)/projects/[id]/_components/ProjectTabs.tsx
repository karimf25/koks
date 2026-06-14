"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileDrop } from "@/components/FileDrop";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { TaskList } from "@/app/(app)/tasks/_components/TaskList";
import { GlassCard } from "@/components/glass";
import { format, parseISO } from "date-fns";
import { MapPin, Repeat, CalendarDays } from "lucide-react";
import type { SerializedTask, SerializedProject, SerializedTaskGroup, SerializedEvent, SerializedNote } from "@/lib/serialize";

const TABS = [
  { value: "tasks", label: "Tasks" },
  { value: "files", label: "Files" },
  { value: "notes", label: "Notes" },
  { value: "events", label: "Events" },
] as const;

interface Props {
  projectId: string;
  tasks: SerializedTask[];
  projects: SerializedProject[];
  groups: SerializedTaskGroup[];
  events: SerializedEvent[];
  notes: SerializedNote[];
}

export function ProjectTabs({ projectId, tasks, projects, groups, events, notes }: Props) {
  const [tab, setTab] = useState<"tasks" | "files" | "notes" | "events">("tasks");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--glass-border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{ color: tab === t.value ? "var(--accent)" : "var(--text-3)" }}
          >
            {t.label}
            {tab === t.value && (
              <motion.div
                layoutId="proj-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "tasks" && (
          <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TaskList initialTasks={tasks} projects={projects} initialGroups={groups} />
          </motion.div>
        )}

        {tab === "files" && (
          <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FileDrop ownerType="project" ownerId={projectId} />
          </motion.div>
        )}

        {tab === "notes" && (
          <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {notes.length === 0 ? (
              <p className="text-sm text-[var(--text-3)] text-center py-12">No notes linked to this project.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <GlassCard key={note.id} className="p-4">
                    <p className="text-sm font-medium text-[var(--text)] mb-2">{note.title}</p>
                    <MarkdownEditor
                      value={note.content}
                      onChange={() => {}}
                      defaultMode="preview"
                      bodyClassName="max-h-40"
                    />
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "events" && (
          <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {events.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <CalendarDays className="w-8 h-8 text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-3)]">No events linked to this project.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <GlassCard key={e.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {e.recurrence && <Repeat className="w-3 h-3 text-[var(--text-3)]" />}
                          <p className="text-sm font-medium text-[var(--text)] truncate">{e.title}</p>
                        </div>
                        <p className="text-xs text-[var(--text-3)]">
                          {e.allDay
                            ? format(parseISO(e.start), "MMM d, yyyy")
                            : `${format(parseISO(e.start), "MMM d · HH:mm")} – ${format(parseISO(e.end), "HH:mm")}`}
                        </p>
                        {e.location && (
                          <p className="flex items-center gap-1 text-xs text-[var(--text-3)] mt-0.5">
                            <MapPin className="w-3 h-3" /> {e.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
