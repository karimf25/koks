"use client";

import { useState, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton, PriorityDot } from "@/components/glass";
import { Plus, Check, Trash2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import type { SerializedTask, SerializedProject } from "@/lib/serialize";

type Task = SerializedTask;
type Project = SerializedProject;

interface Props {
  initialTasks: Task[];
  projects: Project[];
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function TaskList({ initialTasks, projects }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState(2);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: null,
      projectId: null,
      status: "todo",
      priority: newPriority,
      aiScore: null,
      aiRationale: null,
      isFocus: false,
      dueDate: null,
      scheduledDate: null,
      recurrence: null,
      msTodoId: null,
      msListId: null,
      source: "app",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    setTasks((prev) => [optimistic, ...prev]);
    setNewTitle("");
    startTransition(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title, priority: newPriority }),
      });
      if (res.ok) {
        const real: Task = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? real : t)));
      }
    });
    inputRef.current?.focus();
  };

  const toggleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = t.status === "done" ? "todo" : "done";
        return { ...t, status: next as Task["status"], completedAt: next === "done" ? new Date().toISOString() : null };
      })
    );
    const task = tasks.find((t) => t.id === id)!;
    const newStatus = task.status === "done" ? "todo" : "done";
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="glass-card p-3 flex gap-2 items-center">
        <div className="flex gap-1">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              onClick={() => setNewPriority(p)}
              className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{
                background:
                  newPriority === p
                    ? p === 1
                      ? "var(--accent)"
                      : p === 2
                      ? "var(--amber)"
                      : "var(--slate)"
                    : "var(--glass-strong)",
                border: newPriority === p ? "none" : "1px solid var(--glass-border)",
              }}
            />
          ))}
        </div>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task… press Enter"
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
        />
        <GlassButton variant="primary" size="sm" onClick={addTask} disabled={!newTitle.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </GlassButton>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="text-xs px-3 py-1.5 rounded-full transition-colors"
            style={
              filter === f.value
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--glass)", color: "var(--text-2)", border: "1px solid var(--glass-border)" }
            }
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--text-3)] self-center">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Task rows */}
      <AnimatePresence initial={false}>
        {filtered.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-[var(--text-3)] text-center py-12"
          >
            No tasks here.
          </motion.p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projects={projects}
                onToggle={() => toggleStatus(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskRow({
  task,
  projects,
  onToggle,
  onDelete,
}: {
  task: Task;
  projects: Project[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  const project = projects.find((p) => p.id === task.projectId);
  const isDone = task.status === "done";
  const isOverdue =
    task.dueDate && !isDone && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={spring}
    >
      <GlassCard
        interactive
        className="flex items-center gap-3 px-4 py-3"
        style={isDone ? { opacity: 0.5 } : {}}
      >
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all"
          style={
            isDone
              ? { background: "var(--teal)", borderColor: "var(--teal)" }
              : { borderColor: "var(--glass-border)" }
          }
        >
          {isDone && <Check className="w-3 h-3 text-white" />}
        </button>

        <PriorityDot priority={task.priority as 1 | 2 | 3} />

        <span
          className="flex-1 text-sm text-[var(--text)] truncate"
          style={isDone ? { textDecoration: "line-through" } : {}}
        >
          {task.title}
        </span>

        {project && (
          <span className="text-xs text-[var(--text-3)] hidden sm:block truncate max-w-[100px]">
            {project.name}
          </span>
        )}

        {task.dueDate && (
          <span
            className="text-xs font-mono hidden sm:block"
            style={{ color: isOverdue ? "var(--accent)" : "var(--text-3)" }}
          >
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded transition-opacity hover:text-[var(--accent)]"
          style={{ color: "var(--text-3)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </GlassCard>
    </motion.li>
  );
}
