"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Plus, Lightbulb, TrendingUp, Archive, X, Bookmark, Pencil, Check, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedIdea } from "@/lib/serialize";

type Idea = SerializedIdea;

interface Props {
  initialIdeas: Idea[];
}

const STATUS_CONFIG = {
  inbox: { label: "Inbox", icon: Lightbulb, color: "var(--accent)" },
  promoted: { label: "Promoted", icon: TrendingUp, color: "var(--teal)" },
  parked: { label: "Parked", icon: Bookmark, color: "var(--amber)" },
  dropped: { label: "Dropped", icon: Archive, color: "var(--slate)" },
} as const;

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function IdeasBoard({ initialIdeas }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [activeTab, setActiveTab] = useState<keyof typeof STATUS_CONFIG>("inbox");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [verdictLoadingId, setVerdictLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const getVerdict = async (id: string) => {
    setVerdictLoadingId(id);
    try {
      const res = await fetch(`/api/ideas/${id}/verdict`, { method: "POST" });
      if (res.ok) {
        const { verdict } = await res.json();
        setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, aiVerdict: verdict } : i));
      }
    } finally {
      setVerdictLoadingId(null);
    }
  };

  const startEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body ?? "");
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, title: editTitle.trim(), body: editBody.trim() || null } : i));
    setEditingId(null);
    startTransition(async () => {
      await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() || null }),
      });
    });
  };

  const visible = ideas.filter((i) => i.status === activeTab);

  const addIdea = async () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined }),
      });
      if (res.ok) {
        const idea: Idea = await res.json();
        setIdeas((prev) => [idea, ...prev]);
        setTitle("");
        setBody("");
        setShowForm(false);
        setActiveTab("inbox");
      }
    });
  };

  const moveIdea = (id: string, status: keyof typeof STATUS_CONFIG) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    startTransition(async () => {
      await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    });
  };

  const deleteIdea = (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    });
  };

  return (
    <div className="space-y-4">
      {/* Capture form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 space-y-3">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addIdea()}
                placeholder="What's the idea?"
                className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--glass-border)] pb-2 font-medium"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Details (optional)…"
                rows={2}
                className="w-full bg-transparent text-sm text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none resize-none"
              />
              <div className="flex gap-2 justify-end">
                <GlassButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="primary" size="sm" onClick={addIdea} disabled={!title.trim()}>
                  Capture
                </GlassButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs + action */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = ideas.filter((i) => i.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
              style={
                activeTab === s
                  ? { background: cfg.color, color: "#fff" }
                  : { background: "var(--glass)", color: "var(--text-2)", border: "1px solid var(--glass-border)" }
              }
            >
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
              {count > 0 && <span className="opacity-70">{count}</span>}
            </button>
          );
        })}
        <div className="ml-auto">
          <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Capture
          </GlassButton>
        </div>
      </div>

      {/* Ideas list */}
      {visible.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 gap-3">
          <Lightbulb className="w-8 h-8 text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-3)]">Nothing in {STATUS_CONFIG[activeTab].label.toLowerCase()}.</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <ul className="space-y-3">
            {visible.map((idea) => (
              <motion.li
                key={idea.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={spring}
              >
                <GlassCard className="p-4">
                  {editingId === idea.id ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) saveEdit(idea.id); if (e.key === "Escape") setEditingId(null); }}
                        className="w-full bg-transparent text-sm font-medium text-[var(--text)] outline-none border-b border-[var(--glass-border)] pb-1"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={2}
                        placeholder="Details (optional)…"
                        className="w-full bg-transparent text-xs text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">Cancel</button>
                        <button onClick={() => saveEdit(idea.id)} disabled={!editTitle.trim()} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>
                          <Check className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)]">{idea.title}</p>
                        {idea.body && (
                          <p className="text-xs text-[var(--text-3)] mt-1 line-clamp-2">{idea.body}</p>
                        )}
                        {idea.aiVerdict && (
                          <p className="text-xs text-[var(--text-2)] mt-2 italic leading-relaxed border-l-2 border-[var(--accent)] pl-2">
                            {idea.aiVerdict}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-3)] mt-2">
                          {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {activeTab === "inbox" && (
                          <>
                            <ActionBtn label="Promote" color="var(--teal)" onClick={() => moveIdea(idea.id, "promoted")} />
                            <ActionBtn label="Park" color="var(--amber)" onClick={() => moveIdea(idea.id, "parked")} />
                            <ActionBtn label="Drop" color="var(--slate)" onClick={() => moveIdea(idea.id, "dropped")} />
                          </>
                        )}
                        {activeTab !== "inbox" && (
                          <ActionBtn label="Inbox" color="var(--accent)" onClick={() => moveIdea(idea.id, "inbox")} />
                        )}
                        {activeTab === "inbox" && (
                          <button
                            onClick={() => getVerdict(idea.id)}
                            disabled={verdictLoadingId === idea.id}
                            className="p-1 rounded hover:text-[var(--accent)] transition-colors"
                            style={{ color: "var(--text-3)" }}
                            title="Get AI verdict"
                          >
                            {verdictLoadingId === idea.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Sparkles className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button onClick={() => startEdit(idea)} className="p-1 rounded hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-3)" }} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteIdea(idea.id)} className="p-1 rounded hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-3)" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
      style={{ background: "var(--glass-strong)", color, border: `1px solid ${color}33` }}
    >
      {label}
    </button>
  );
}
