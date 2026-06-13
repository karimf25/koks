"use client";

import { useState } from "react";
import { GlassPanel, GlassButton } from "@/components/glass";
import type { SerializedAutomation, SerializedAgentRun } from "@/lib/serialize";
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Loader2,
  CalendarClock,
  AlarmClock,
  Lightbulb,
  ListTodo,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Trigger =
  | { type: "schedule"; frequency: "daily" }
  | { type: "schedule"; frequency: "weekly"; weekday: number }
  | { type: "tasks_overdue"; minCount: number }
  | { type: "ideas_stale"; days: number };

type Action =
  | { type: "create_task"; title: string; priority?: number; dueInDays?: number }
  | { type: "run_focus_engine" }
  | { type: "ai_note"; prompt: string; noteTitle: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function triggerLabel(t: Trigger): string {
  if (t.type === "schedule")
    return t.frequency === "daily" ? "Every day" : `Every ${WEEKDAYS[t.weekday] ?? "week"}`;
  if (t.type === "tasks_overdue") return `When ≥ ${t.minCount} task${t.minCount > 1 ? "s are" : " is"} overdue`;
  if (t.type === "ideas_stale") return `When ideas sit in inbox > ${t.days} days`;
  return "Unknown trigger";
}

function actionLabel(a: Action): string {
  if (a.type === "create_task") return `Create task “${a.title}”`;
  if (a.type === "run_focus_engine") return "Run the Focus Engine";
  if (a.type === "ai_note") return `AI writes note “${a.noteTitle}”`;
  return "Unknown action";
}

function TriggerIcon({ t }: { t: Trigger }) {
  if (t.type === "schedule") return <CalendarClock className="w-3.5 h-3.5" />;
  if (t.type === "tasks_overdue") return <AlarmClock className="w-3.5 h-3.5" />;
  return <Lightbulb className="w-3.5 h-3.5" />;
}

function ActionIcon({ a }: { a: Action }) {
  if (a.type === "create_task") return <ListTodo className="w-3.5 h-3.5" />;
  if (a.type === "run_focus_engine") return <Sparkles className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

const inputCls =
  "w-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)] placeholder:text-[var(--text-3)]";

// ── Builder form ──────────────────────────────────────────────────────────────

function NewAutomationForm({
  onCreated,
  onCancel,
}: {
  onCreated: (a: SerializedAutomation) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("schedule_daily");
  const [weekday, setWeekday] = useState(1);
  const [minCount, setMinCount] = useState(1);
  const [staleDays, setStaleDays] = useState(7);
  const [actionType, setActionType] = useState<string>("create_task");
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState(2);
  const [dueInDays, setDueInDays] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildTrigger = (): Trigger => {
    if (triggerType === "schedule_daily") return { type: "schedule", frequency: "daily" };
    if (triggerType === "schedule_weekly") return { type: "schedule", frequency: "weekly", weekday };
    if (triggerType === "tasks_overdue") return { type: "tasks_overdue", minCount };
    return { type: "ideas_stale", days: staleDays };
  };

  const buildAction = (): Action => {
    if (actionType === "create_task") return { type: "create_task", title: taskTitle, priority, dueInDays };
    if (actionType === "run_focus_engine") return { type: "run_focus_engine" };
    return { type: "ai_note", prompt, noteTitle };
  };

  const valid =
    name.trim().length > 0 &&
    (actionType !== "create_task" || taskTitle.trim().length > 0) &&
    (actionType !== "ai_note" || (prompt.trim().length > 0 && noteTitle.trim().length > 0));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), trigger: buildTrigger(), action: buildAction() }),
      });
      if (!res.ok) throw new Error("Failed to create automation");
      const created = await res.json();
      onCreated({ ...created, lastRunAt: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create automation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassPanel>
      <h2 className="text-sm font-semibold text-[var(--text-2)] mb-4">New automation</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[var(--text-3)] block mb-1">Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning focus briefing"
            autoFocus
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Trigger */}
          <div className="space-y-3">
            <label className="text-xs text-[var(--text-3)] block">When…</label>
            <select className={inputCls} value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
              <option value="schedule_daily">Every day</option>
              <option value="schedule_weekly">Every week (pick a day)</option>
              <option value="tasks_overdue">Tasks are overdue</option>
              <option value="ideas_stale">Ideas go stale in the inbox</option>
            </select>
            {triggerType === "schedule_weekly" && (
              <select className={inputCls} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            )}
            {triggerType === "tasks_overdue" && (
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">At least this many overdue</label>
                <input
                  type="number" min={1} className={inputCls} value={minCount}
                  onChange={(e) => setMinCount(Math.max(1, Number(e.target.value)))}
                />
              </div>
            )}
            {triggerType === "ideas_stale" && (
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">Older than (days)</label>
                <input
                  type="number" min={1} className={inputCls} value={staleDays}
                  onChange={(e) => setStaleDays(Math.max(1, Number(e.target.value)))}
                />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="space-y-3">
            <label className="text-xs text-[var(--text-3)] block">Then…</label>
            <select className={inputCls} value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="create_task">Create a task</option>
              <option value="run_focus_engine">Run the Focus Engine</option>
              <option value="ai_note">Let AI write a note</option>
            </select>
            {actionType === "create_task" && (
              <>
                <input
                  className={inputCls} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title — {{overdueCount}} works as a placeholder"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputCls} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                    <option value={1}>High priority</option>
                    <option value={2}>Medium priority</option>
                    <option value={3}>Low priority</option>
                  </select>
                  <div>
                    <input
                      type="number" min={0} className={inputCls} value={dueInDays}
                      onChange={(e) => setDueInDays(Math.max(0, Number(e.target.value)))}
                      title="Due in N days (0 = today)"
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-3)]">Due in {dueInDays === 0 ? "0 days (today)" : `${dueInDays} day(s)`}</p>
              </>
            )}
            {actionType === "ai_note" && (
              <>
                <input
                  className={inputCls} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title (date is appended)"
                />
                <textarea
                  className={`${inputCls} min-h-20 resize-y`} value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What should Claude write? e.g. “Review my stale ideas: {{staleTitles}} — suggest which to promote or drop.”"
                />
              </>
            )}
            {actionType === "run_focus_engine" && (
              <p className="text-xs text-[var(--text-3)]">
                Generates a fresh focus briefing — the same one shown on the Dashboard.
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-[#FC8181]">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <GlassButton variant="primary" size="sm" onClick={save} disabled={!valid || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Create automation
          </GlassButton>
          <GlassButton variant="ghost" size="sm" onClick={onCancel}>Cancel</GlassButton>
        </div>
      </div>
    </GlassPanel>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function AutomationsView({
  initialAutomations,
  initialRuns,
}: {
  initialAutomations: SerializedAutomation[];
  initialRuns: SerializedAgentRun[];
}) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [runs, setRuns] = useState(initialRuns);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const refreshRuns = async () => {
    const res = await fetch("/api/automations/runs");
    if (res.ok) setRuns(await res.json());
  };

  const toggle = async (a: SerializedAutomation) => {
    setAutomations((list) => list.map((x) => (x.id === a.id ? { ...x, enabled: !a.enabled } : x)));
    await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !a.enabled }),
    });
  };

  const remove = async (a: SerializedAutomation) => {
    if (!confirm(`Delete automation “${a.name}”?`)) return;
    setAutomations((list) => list.filter((x) => x.id !== a.id));
    await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
  };

  const runNow = async (a: SerializedAutomation) => {
    setRunningId(a.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/automations/${a.id}/run`, { method: "POST" });
      const r = await res.json();
      if (r.status === "success") {
        setBanner({ kind: "ok", text: `“${a.name}” ran — ${r.output?.title ?? "done"}.` });
        setAutomations((list) =>
          list.map((x) => (x.id === a.id ? { ...x, lastRunAt: new Date().toISOString() } : x))
        );
      } else {
        setBanner({ kind: "error", text: `“${a.name}” failed: ${r.detail}` });
      }
      await refreshRuns();
    } catch {
      setBanner({ kind: "error", text: "Run failed — network error." });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Automations</h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Rules that run every morning with the daily sync — or on demand
          </p>
        </div>
        {!showForm && (
          <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New automation
          </GlassButton>
        )}
      </div>

      {banner && (
        <div
          className="flex items-start gap-2 text-xs rounded-xl px-3 py-2"
          style={{
            background: banner.kind === "ok" ? "rgba(32,135,142,0.12)" : "rgba(229,62,62,0.12)",
            color: banner.kind === "ok" ? "var(--ice)" : "#FC8181",
            border: `1px solid ${banner.kind === "ok" ? "rgba(32,135,142,0.3)" : "rgba(229,62,62,0.3)"}`,
          }}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          )}
          <span className="break-words">{banner.text}</span>
        </div>
      )}

      {showForm && (
        <NewAutomationForm
          onCreated={(a) => {
            setAutomations((list) => [a, ...list]);
            setShowForm(false);
            setBanner({ kind: "ok", text: `Automation “${a.name}” created.` });
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Automation list */}
      {automations.length === 0 && !showForm ? (
        <GlassPanel className="flex flex-col items-center justify-center py-16 gap-3">
          <Zap className="w-8 h-8 text-[var(--text-3)]" />
          <p className="text-[var(--text-3)] text-sm">No automations yet — create your first rule.</p>
          <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New automation
          </GlassButton>
        </GlassPanel>
      ) : (
        <div className="grid gap-3">
          {automations.map((a) => {
            const trigger = a.trigger as Trigger;
            const action = a.action as Action;
            return (
              <GlassPanel key={a.id} className="!p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => toggle(a)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                      a.enabled ? "bg-[var(--accent)]" : "bg-[var(--glass-strong)]"
                    }`}
                    title={a.enabled ? "Enabled — click to pause" : "Paused — click to enable"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        a.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${a.enabled ? "text-[var(--text)]" : "text-[var(--text-3)]"}`}>
                      {a.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-3)] flex-wrap">
                      <span className="flex items-center gap-1">
                        <TriggerIcon t={trigger} /> {triggerLabel(trigger)}
                      </span>
                      <span className="text-[var(--glass-border)]">→</span>
                      <span className="flex items-center gap-1">
                        <ActionIcon a={action} /> {actionLabel(action)}
                      </span>
                      {a.lastRunAt && (
                        <span>· last ran {formatDistanceToNow(new Date(a.lastRunAt), { addSuffix: true })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <GlassButton variant="ghost" size="sm" onClick={() => runNow(a)} disabled={runningId === a.id}>
                      {runningId === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span className="ml-1.5">Run now</span>
                    </GlassButton>
                    <GlassButton variant="ghost" size="sm" onClick={() => remove(a)} className="hover:!text-[#FC8181]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </GlassButton>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {/* Run history */}
      {runs.length > 0 && (
        <GlassPanel>
          <h2 className="text-sm font-semibold text-[var(--text-2)] mb-4">Recent runs</h2>
          <div className="space-y-2">
            {runs.map((r) => {
              const auto = automations.find((a) => a.id === r.automationId);
              const output = (r.output ?? {}) as Record<string, unknown>;
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)] flex-shrink-0" />
                  ) : r.status === "error" ? (
                    <XCircle className="w-3.5 h-3.5 text-[#FC8181] flex-shrink-0" />
                  ) : (
                    <MinusCircle className="w-3.5 h-3.5 text-[var(--text-3)] flex-shrink-0" />
                  )}
                  <span className="text-[var(--text-2)] truncate">
                    {auto?.name ?? r.kind}
                    {typeof output.title === "string" && (
                      <span className="text-[var(--text-3)]"> — {output.title}</span>
                    )}
                    {r.error && <span className="text-[#FC8181]"> — {r.error}</span>}
                  </span>
                  <span className="text-[var(--text-3)] ml-auto flex-shrink-0">
                    {formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
