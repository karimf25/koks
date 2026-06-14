"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassPanel, GlassButton } from "@/components/glass";
import { AREA_COLORS } from "@/lib/project-constants";
import type { SerializedEvent, SerializedTask, SerializedProject } from "@/lib/serialize";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  X,
  Loader2,
  CalendarDays,
  CheckSquare,
  Repeat,
  Link2,
} from "lucide-react";

const RECURRENCE_OPTIONS = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "RRULE:FREQ=DAILY" },
  { label: "Every weekday", value: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Weekly", value: "RRULE:FREQ=WEEKLY" },
  { label: "Monthly", value: "RRULE:FREQ=MONTHLY" },
  { label: "Yearly", value: "RRULE:FREQ=YEARLY" },
] as const;
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";

type Ev = SerializedEvent;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

const inputCls =
  "w-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)] placeholder:text-[var(--text-3)]";

function monthRange(anchor: Date) {
  return {
    from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  };
}

/** True when the event touches the given day (handles multi-day spans). */
function eventOnDay(e: Ev, day: Date) {
  return parseISO(e.start) <= endOfDay(day) && parseISO(e.end) >= startOfDay(day);
}

function taskOnDay(t: SerializedTask, day: Date) {
  if (t.scheduledDate && isSameDay(parseISO(t.scheduledDate), day)) return true;
  if (t.dueDate && isSameDay(parseISO(t.dueDate), day)) return true;
  return false;
}

// ── Event editor modal ────────────────────────────────────────────────────────

type ModalState = { mode: "create"; day: Date } | { mode: "edit"; event: Ev } | null;

function EventModal({
  state,
  projects,
  tasks,
  onClose,
  onSaved,
  onDeleted,
}: {
  state: NonNullable<ModalState>;
  projects: SerializedProject[];
  tasks: SerializedTask[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const editing = state.mode === "edit" ? state.event : null;
  const baseDay = editing ? parseISO(editing.start) : state.mode === "create" ? state.day : new Date();

  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(format(baseDay, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(editing ? format(parseISO(editing.start), "HH:mm") : "09:00");
  const [endTime, setEndTime] = useState(editing ? format(parseISO(editing.end), "HH:mm") : "10:00");
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [projectId, setProjectId] = useState(editing?.projectId ?? "");
  const [taskId, setTaskId] = useState(editing?.taskId ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [recurrence, setRecurrence] = useState(editing?.recurrence ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const start = allDay ? startOfDay(parseISO(date)) : new Date(`${date}T${startTime}`);
    const end = allDay ? endOfDay(parseISO(date)) : new Date(`${date}T${endTime}`);
    if (end < start) {
      setError("End time is before start time.");
      setBusy(false);
      return;
    }
    const payload = {
      title: title.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      projectId: projectId || undefined,
      taskId: taskId || undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      recurrence: recurrence || undefined,
    };
    const res = editing
      ? await fetch(`/api/events/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setBusy(false);
    if (res.ok) onSaved();
    else setError("Could not save the event.");
  };

  const remove = async () => {
    if (!editing || !confirm(`Delete “${editing.title}”?`)) return;
    setBusy(true);
    await fetch(`/api/events/${editing.id}`, { method: "DELETE" });
    setBusy(false);
    onDeleted();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-6 shadow-2xl"
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16, opacity: 0 }}
        transition={spring}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--text-2)]">
            {editing ? "Edit event" : "New event"}
          </h2>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
          />

          <div className="flex items-center gap-3">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-[var(--text-2)] whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              All day
            </label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">Start</label>
                <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">End</label>
                <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <select className={inputCls} value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            className={inputCls}
            value={location ?? ""}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
          />
          <textarea
            className={`${inputCls} min-h-16 resize-y`}
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />

          {/* M3.1 — Recurrence */}
          <div className="flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5 text-[var(--text-3)] flex-shrink-0" />
            <select className={`${inputCls} flex-1`} value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* M3.2 — Link to task */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-[var(--text-3)] flex-shrink-0" />
              <select className={`${inputCls} flex-1`} value={taskId ?? ""} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No linked task</option>
                {tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-[#FC8181]">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <GlassButton variant="primary" size="sm" onClick={save} disabled={busy || !title.trim()}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              {editing ? "Save changes" : "Add event"}
            </GlassButton>
            {editing && (
              <GlassButton variant="danger" size="sm" onClick={remove} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
              </GlassButton>
            )}
            <GlassButton variant="ghost" size="sm" onClick={onClose}>Cancel</GlassButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CalendarView({
  initialEvents,
  tasks,
  projects,
}: {
  initialEvents: Ev[];
  tasks: SerializedTask[];
  projects: SerializedProject[];
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<Ev[]>(initialEvents);
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);

  const projectColor = useCallback(
    (projectId: string | null) => {
      if (!projectId) return "var(--teal)";
      const p = projects.find((x) => x.id === projectId);
      return p?.color || AREA_COLORS[p?.area ?? "other"] || "var(--teal)";
    },
    [projects]
  );

  const days = useMemo(() => {
    const { from, to } = monthRange(anchor);
    return eachDayOfInterval({ start: from, end: to });
  }, [anchor]);

  const fetchMonth = useCallback(async (a: Date) => {
    setLoading(true);
    const { from, to } = monthRange(a);
    const res = await fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`);
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }, []);

  const goMonth = (delta: number) => {
    const next = delta === 0 ? new Date() : addMonths(anchor, delta);
    setAnchor(next);
    if (delta === 0) setSelected(new Date());
    fetchMonth(next);
  };

  const refresh = () => fetchMonth(anchor);

  const selectedEvents = events
    .filter((e) => eventOnDay(e, selected))
    .sort((a, b) => a.start.localeCompare(b.start));
  const selectedTasks = tasks.filter((t) => taskOnDay(t, selected) && t.status !== "cancelled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Calendar</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">Your schedule at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton variant="ghost" size="sm" onClick={() => goMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => goMonth(0)}>
            Today
          </GlassButton>
          <GlassButton variant="ghost" size="sm" onClick={() => goMonth(1)} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </GlassButton>
          <span className="text-sm font-medium text-[var(--text)] min-w-28 sm:min-w-32 text-center whitespace-nowrap">
            {format(anchor, "MMMM yyyy")}
            {loading && <Loader2 className="inline w-3 h-3 ml-2 animate-spin text-[var(--text-3)]" />}
          </span>
          <GlassButton variant="primary" size="sm" onClick={() => setModal({ mode: "create", day: selected })} className="whitespace-nowrap">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New event
          </GlassButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Month grid */}
        <GlassPanel className="!p-3">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[var(--text-3)] py-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = events
                .filter((e) => eventOnDay(e, day))
                .sort((a, b) => a.start.localeCompare(b.start));
              const dayTasks = tasks.filter((t) => taskOnDay(t, day) && t.status !== "cancelled");
              const inMonth = isSameMonth(day, anchor);
              const isSelected = isSameDay(day, selected);
              const shown = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - shown.length;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  onDoubleClick={() => setModal({ mode: "create", day })}
                  className={`relative min-h-[58px] sm:min-h-[92px] rounded-lg sm:rounded-xl p-1 sm:p-1.5 text-left align-top transition-colors border ${
                    isSelected
                      ? "border-[var(--ice)] bg-[var(--glass-strong)]"
                      : "border-transparent hover:bg-[var(--glass)]"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${
                        isToday(day)
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--text-2)]"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayTasks.length > 0 && (
                      <span
                        className="flex items-center gap-0.5 text-[10px] text-[var(--amber)]"
                        title={`${dayTasks.length} task(s) due`}
                      >
                        <CheckSquare className="w-2.5 h-2.5" />
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {shown.map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded-md px-1.5 py-0.5 text-[10px] leading-4 text-[var(--text)]"
                        style={{
                          background: `color-mix(in srgb, ${projectColor(e.projectId)} 22%, transparent)`,
                          borderLeft: `2px solid ${projectColor(e.projectId)}`,
                        }}
                        title={e.title}
                      >
                        {e.recurrence && <Repeat className="inline w-2.5 h-2.5 mr-0.5 opacity-60" />}
                        {!e.allDay && (
                          <span className="text-[var(--text-2)] mr-1">{format(parseISO(e.start), "HH:mm")}</span>
                        )}
                        {e.title}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="text-[10px] text-[var(--text-3)] px-1.5">+{overflow} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassPanel>

        {/* Day panel */}
        <GlassPanel className="lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {isToday(selected) ? "Today" : format(selected, "EEEE")}
              </h2>
              <p className="text-xs text-[var(--text-3)]">{format(selected, "MMMM d, yyyy")}</p>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setModal({ mode: "create", day: selected })}
              aria-label="Add event on this day"
            >
              <Plus className="w-4 h-4" />
            </GlassButton>
          </div>

          {selectedEvents.length === 0 && selectedTasks.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <CalendarDays className="w-6 h-6 text-[var(--text-3)]" />
              <p className="text-xs text-[var(--text-3)]">Nothing scheduled.<br />Double-click a day to add an event.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {selectedEvents.map((e) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="group rounded-xl p-3 mb-2"
                style={{
                  background: `color-mix(in srgb, ${projectColor(e.projectId)} 12%, transparent)`,
                  borderLeft: `3px solid ${projectColor(e.projectId)}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{e.title}</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">
                      {e.allDay
                        ? "All day"
                        : `${format(parseISO(e.start), "HH:mm")} – ${format(parseISO(e.end), "HH:mm")}`}
                    </p>
                    {e.location && (
                      <p className="flex items-center gap-1 text-xs text-[var(--text-3)] mt-0.5">
                        <MapPin className="w-3 h-3" /> {e.location}
                      </p>
                    )}
                    {e.description && (
                      <p className="text-xs text-[var(--text-2)] mt-1 line-clamp-2">{e.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ mode: "edit", event: e })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-[var(--text)] flex-shrink-0"
                    aria-label="Edit event"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {selectedTasks.length > 0 && (
            <div className={selectedEvents.length > 0 ? "mt-4 pt-3 border-t border-[var(--glass-border)]" : ""}>
              <p className="text-xs font-medium text-[var(--text-3)] mb-2">Tasks due</p>
              {selectedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs py-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      t.status === "done" ? "bg-[var(--teal)]" : "bg-[var(--amber)]"
                    }`}
                  />
                  <span
                    className={`truncate ${
                      t.status === "done" ? "line-through text-[var(--text-3)]" : "text-[var(--text-2)]"
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      <AnimatePresence>
        {modal && (
          <EventModal
            state={modal}
            projects={projects}
            tasks={tasks}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); refresh(); }}
            onDeleted={() => { setModal(null); refresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
