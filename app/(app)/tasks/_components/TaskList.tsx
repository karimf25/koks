"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GlassCard, GlassButton, PriorityDot } from "@/components/glass";
import {
  Plus, Check, Trash2, ChevronDown, ChevronRight, GripVertical,
  Star, StarOff, Folder, FolderPlus, X, Paperclip, FileText, Calendar,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { FileDrop } from "@/components/FileDrop";
import type { SerializedTask, SerializedProject, SerializedTaskGroup } from "@/lib/serialize";

type Task = SerializedTask;
type Project = SerializedProject;
type TaskGroup = SerializedTaskGroup;

interface Props {
  initialTasks: Task[];
  projects: Project[];
  initialGroups: TaskGroup[];
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

const TABS = [
  { value: "all", label: "All Tasks" },
  { value: "my_day", label: "My Day" },
  { value: "groups", label: "Groups" },
] as const;

const TODAY = new Date().toISOString().split("T")[0];

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

// ── Group color palette ──────────────────────────────────────────────────────
const GROUP_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

export function TaskList({ initialTasks, projects, initialGroups }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [groups, setGroups] = useState<TaskGroup[]>(initialGroups);
  const [tab, setTab] = useState<"all" | "my_day" | "groups">("all");
  const [filter, setFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState(2);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // My Day: only tasks where isMyDay && myDayDate === today
  const myDayTasks = tasks.filter((t) => t.isMyDay && t.myDayDate === TODAY);

  const visibleTasks =
    tab === "my_day"
      ? myDayTasks.filter((t) => filter === "all" || t.status === filter)
      : tasks.filter((t) => filter === "all" || t.status === filter);

  // ── Quick-add task ─────────────────────────────────────────────────────────
  const addTask = async () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: null,
      notes: null,
      projectId: null,
      groupId: null,
      status: "todo",
      priority: newPriority,
      aiScore: null,
      aiRationale: null,
      isFocus: false,
      isMyDay: false,
      myDayDate: null,
      dueDate: null,
      scheduledDate: null,
      recurrence: null,
      msTodoId: null,
      msListId: null,
      source: "app",
      position: 0,
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

  // ── Status toggle ──────────────────────────────────────────────────────────
  const toggleStatus = useCallback((id: string) => {
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
  }, [tasks]);

  // ── Delete task ────────────────────────────────────────────────────────────
  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    });
  }, [expandedId]);

  // ── Patch helper ───────────────────────────────────────────────────────────
  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    });
  }, []);

  // ── My Day toggle ──────────────────────────────────────────────────────────
  const toggleMyDay = useCallback((id: string, current: boolean) => {
    const next = !current;
    patchTask(id, { isMyDay: next, myDayDate: next ? TODAY : null });
  }, [patchTask]);

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTasks((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === active.id);
      const newIdx = prev.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      // Persist in background
      fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
      });
      return reordered;
    });
  }, []);

  // ── Create group ───────────────────────────────────────────────────────────
  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    const res = await fetch("/api/task-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim(), color }),
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((prev) => [...prev, group]);
      setNewGroupName("");
      setShowNewGroup(false);
    }
  };

  // ── Delete group ───────────────────────────────────────────────────────────
  const deleteGroup = async (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setTasks((prev) => prev.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)));
    await fetch(`/api/task-groups/${id}`, { method: "DELETE" });
  };

  const toggleGroupCollapse = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--glass-border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{ color: tab === t.value ? "var(--accent)" : "var(--text-3)" }}
          >
            {t.label}
            {t.value === "my_day" && myDayTasks.length > 0 && (
              <span
                className="ml-1.5 text-xs rounded-full px-1.5 py-0.5"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {myDayTasks.length}
              </span>
            )}
            {tab === t.value && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Quick add */}
      {tab !== "my_day" && (
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
                      ? p === 1 ? "var(--accent)" : p === 2 ? "var(--amber)" : "var(--slate)"
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
      )}

      {/* Status filters (not shown in groups tab) */}
      {tab !== "groups" && (
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
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
            {visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── ALL TASKS tab (with drag-drop) ─────────────────────────────────── */}
      {tab === "all" && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {visibleTasks.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--text-3)] text-center py-12"
                >
                  No tasks here.
                </motion.p>
              ) : (
                <ul className="space-y-2">
                  {visibleTasks.map((task) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      projects={projects}
                      groups={groups}
                      isExpanded={expandedId === task.id}
                      onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                      onToggle={() => toggleStatus(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onPatch={(patch) => patchTask(task.id, patch)}
                      onToggleMyDay={() => toggleMyDay(task.id, task.isMyDay)}
                    />
                  ))}
                </ul>
              )}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      )}

      {/* ── MY DAY tab ─────────────────────────────────────────────────────── */}
      {tab === "my_day" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-3)]">
            {format(new Date(), "EEEE, MMMM d")} · Resets at midnight
          </p>
          <AnimatePresence initial={false}>
            {visibleTasks.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-[var(--text-3)] text-center py-12"
              >
                Nothing added to My Day. Star a task to add it.
              </motion.p>
            ) : (
              <ul className="space-y-2">
                {visibleTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projects={projects}
                    groups={groups}
                    isExpanded={expandedId === task.id}
                    onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onToggle={() => toggleStatus(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onPatch={(patch) => patchTask(task.id, patch)}
                    onToggleMyDay={() => toggleMyDay(task.id, task.isMyDay)}
                    showDragHandle={false}
                  />
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── GROUPS tab ─────────────────────────────────────────────────────── */}
      {tab === "groups" && (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupTasks = tasks.filter((t) => t.groupId === group.id);
            const isCollapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: group.color }}
                    />
                    <span className="text-sm font-medium text-[var(--text)]">{group.name}</span>
                    <span className="text-xs text-[var(--text-3)]">({groupTasks.length})</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="p-1 rounded opacity-0 hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-[var(--accent)]"
                    style={{ opacity: 0.4 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden pl-4"
                    >
                      {groupTasks.length === 0 ? (
                        <li className="text-xs text-[var(--text-3)] py-2">No tasks in this group.</li>
                      ) : (
                        groupTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            projects={projects}
                            groups={groups}
                            isExpanded={expandedId === task.id}
                            onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                            onToggle={() => toggleStatus(task.id)}
                            onDelete={() => deleteTask(task.id)}
                            onPatch={(patch) => patchTask(task.id, patch)}
                            onToggleMyDay={() => toggleMyDay(task.id, task.isMyDay)}
                            showDragHandle={false}
                          />
                        ))
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Ungrouped */}
          {(() => {
            const ungrouped = tasks.filter((t) => !t.groupId);
            const isCollapsed = collapsedGroups.has("__ungrouped__");
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleGroupCollapse("__ungrouped__")}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-[var(--glass-border)]" />
                    <span className="text-sm font-medium text-[var(--text-2)]">Ungrouped</span>
                    <span className="text-xs text-[var(--text-3)]">({ungrouped.length})</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden pl-4"
                    >
                      {ungrouped.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          projects={projects}
                          groups={groups}
                          isExpanded={expandedId === task.id}
                          onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                          onToggle={() => toggleStatus(task.id)}
                          onDelete={() => deleteTask(task.id)}
                          onPatch={(patch) => patchTask(task.id, patch)}
                          onToggleMyDay={() => toggleMyDay(task.id, task.isMyDay)}
                          showDragHandle={false}
                        />
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          {/* New group button */}
          {showNewGroup ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createGroup();
                  if (e.key === "Escape") { setShowNewGroup(false); setNewGroupName(""); }
                }}
                placeholder="Group name…"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--glass-border)] pb-1"
              />
              <GlassButton variant="primary" size="sm" onClick={createGroup} disabled={!newGroupName.trim()}>
                <Check className="w-3.5 h-3.5" />
              </GlassButton>
              <GlassButton size="sm" onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}>
                <X className="w-3.5 h-3.5" />
              </GlassButton>
            </div>
          ) : (
            <button
              onClick={() => setShowNewGroup(true)}
              className="flex items-center gap-2 text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New group
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sortable wrapper for drag-drop ──────────────────────────────────────────
function SortableTaskRow(props: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <TaskRow {...props} dragHandleProps={{ ...attributes, ...listeners }} showDragHandle />
    </li>
  );
}

// ── TaskRow ─────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task: Task;
  projects: Project[];
  groups: TaskGroup[];
  isExpanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<Task>) => void;
  onToggleMyDay: () => void;
  showDragHandle?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function TaskRow({
  task, projects, groups, isExpanded, onExpand, onToggle, onDelete,
  onPatch, onToggleMyDay, showDragHandle = true, dragHandleProps = {},
}: TaskRowProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const group = groups.find((g) => g.id === task.groupId);
  const isDone = task.status === "done";
  const isOverdue =
    task.dueDate && !isDone && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={spring}
    >
      <GlassCard
        className="overflow-hidden"
        style={isDone ? { opacity: 0.55 } : {}}
      >
        {/* Row */}
        <div className="flex items-center gap-2 px-3 py-2.5 group">
          {/* Drag handle */}
          {showDragHandle && (
            <button
              {...dragHandleProps}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-40 transition-opacity"
              tabIndex={-1}
            >
              <GripVertical className="w-3.5 h-3.5 text-[var(--text-3)]" />
            </button>
          )}

          {/* Status checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
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

          {/* Title — click to expand */}
          <button
            onClick={onExpand}
            className="flex-1 text-sm text-left text-[var(--text)] truncate"
            style={isDone ? { textDecoration: "line-through" } : {}}
          >
            {task.title}
          </button>

          {/* Meta chips */}
          {group && (
            <span
              className="text-xs px-1.5 py-0.5 rounded hidden sm:inline-flex items-center gap-1"
              style={{ background: group.color + "22", color: group.color }}
            >
              <Folder className="w-3 h-3" />
              {group.name}
            </span>
          )}

          {project && (
            <span className="text-xs text-[var(--text-3)] hidden sm:block truncate max-w-[80px]">
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

          {/* My Day star */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMyDay(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: task.isMyDay ? "var(--amber)" : "var(--text-3)" }}
            title={task.isMyDay ? "Remove from My Day" : "Add to My Day"}
          >
            {task.isMyDay ? <Star className="w-3.5 h-3.5 fill-current" /> : <Star className="w-3.5 h-3.5" />}
          </button>

          {/* Expand chevron */}
          <button onClick={onExpand} className="p-1 rounded text-[var(--text-3)]">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:text-[var(--accent)]"
            style={{ color: "var(--text-3)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expanded detail panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[var(--glass-border)]"
            >
              <TaskDetailPanel
                task={task}
                projects={projects}
                groups={groups}
                onPatch={onPatch}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// ── TaskDetailPanel ──────────────────────────────────────────────────────────
function TaskDetailPanel({
  task, projects, groups, onPatch,
}: {
  task: Task;
  projects: Project[];
  groups: TaskGroup[];
  onPatch: (patch: Partial<Task>) => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);

  // Sync if task changes externally
  useEffect(() => { setNotes(task.notes ?? ""); }, [task.id]);

  const saveNotes = useCallback(() => {
    if (!notesDirty) return;
    onPatch({ notes: notes || null });
    setNotesDirty(false);
  }, [notes, notesDirty, onPatch]);

  return (
    <div className="p-4 space-y-4">
      {/* Row 1: Status, Due date, Project, Group */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-3)]">Status</label>
          <select
            value={task.status}
            onChange={(e) => onPatch({ status: e.target.value as Task["status"] })}
            className="text-xs bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text)] outline-none"
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-3)]">Due date</label>
          <input
            type="date"
            value={task.dueDate ? task.dueDate.split("T")[0] : ""}
            onChange={(e) =>
              onPatch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
            className="text-xs bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text)] outline-none"
          />
        </div>

        {/* Project */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-3)]">Project</label>
          <select
            value={task.projectId ?? ""}
            onChange={(e) => onPatch({ projectId: e.target.value || null })}
            className="text-xs bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text)] outline-none max-w-[140px]"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-3)]">Group</label>
          <select
            value={task.groupId ?? ""}
            onChange={(e) => onPatch({ groupId: e.target.value || null })}
            className="text-xs bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text)] outline-none max-w-[140px]"
          >
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes (MarkdownEditor) */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <span className="text-xs text-[var(--text-3)]">Notes</span>
          {notesDirty && (
            <button
              onClick={saveNotes}
              className="ml-auto text-xs px-2 py-0.5 rounded"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Save
            </button>
          )}
        </div>
        <MarkdownEditor
          value={notes}
          onChange={(v) => { setNotes(v); setNotesDirty(true); }}
          onBlur={saveNotes}
          placeholder="Add notes… (Markdown supported)"
          bodyClassName="min-h-[80px] max-h-[240px]"
        />
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Paperclip className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <span className="text-xs text-[var(--text-3)]">Attachments</span>
        </div>
        <FileDrop ownerType="task" ownerId={task.id} />
      </div>
    </div>
  );
}
