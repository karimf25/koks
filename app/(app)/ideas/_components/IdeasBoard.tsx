"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassButton } from "@/components/glass";
import {
  Plus, Lightbulb, TrendingUp, Archive, Bookmark, Pencil, Check,
  Sparkles, Loader2, Trash2, MoreVertical, RotateCcw, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedIdea } from "@/lib/serialize";

type Idea = SerializedIdea;

interface Props {
  initialIdeas: Idea[];
  openId?: string;
}

const STATUS_CONFIG = {
  inbox:    { label: "Inbox",    icon: Lightbulb,  color: "var(--accent)" },
  promoted: { label: "Promoted", icon: TrendingUp,  color: "var(--teal)" },
  parked:   { label: "Parked",   icon: Bookmark,    color: "var(--amber)" },
  dropped:  { label: "Dropped",  icon: Archive,     color: "var(--p3)" },
} as const;

const spring = { type: "spring", stiffness: 280, damping: 28 } as const;

export function IdeasBoard({ initialIdeas, openId }: Props) {
  const openIdea = openId ? initialIdeas.find((i) => i.id === openId) : undefined;
  const [ideas, setIdeas] = useState(initialIdeas);
  const [activeTab, setActiveTab] = useState<keyof typeof STATUS_CONFIG>(
    (openIdea?.status as keyof typeof STATUS_CONFIG) ?? "inbox"
  );
  const [highlightId] = useState<string | undefined>(openId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [verdictLoadingId, setVerdictLoadingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visible = ideas.filter((i) => i.status === activeTab);

  const getVerdict = async (id: string) => {
    setOpenMenuId(null);
    setVerdictLoadingId(id);
    try {
      const res = await fetch(`/api/ideas/${id}/verdict`, { method: "POST" });
      if (res.ok) {
        const { verdict } = await res.json();
        setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, aiVerdict: verdict } : i)));
      }
    } finally {
      setVerdictLoadingId(null);
    }
  };

  const startEdit = (idea: Idea) => {
    setOpenMenuId(null);
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body ?? "");
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, title: editTitle.trim(), body: editBody.trim() || null } : i))
    );
    setEditingId(null);
    startTransition(async () => {
      await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() || null }),
      });
    });
  };

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
        setActiveTab("inbox");
      }
    });
  };

  const moveIdea = (id: string, status: keyof typeof STATUS_CONFIG) => {
    setOpenMenuId(null);
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
    setOpenMenuId(null);
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    });
  };

  return (
    <div className="space-y-4" onClick={() => setOpenMenuId(null)}>
      {/* Capture input */}
      <div className="glass-card p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addIdea()}
          placeholder="💡 What's the idea?"
          className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--glass-border)] pb-2 font-medium"
        />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details (optional)…"
          rows={2}
          className="w-full bg-transparent text-sm text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none resize-y min-h-[3rem] max-h-64"
        />
        <div className="flex justify-end">
          <GlassButton variant="primary" size="sm" onClick={addIdea} disabled={!title.trim() || pending}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Capture
          </GlassButton>
        </div>
      </div>

      {/* Status tabs */}
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
              {count > 0 && <span className="opacity-70 ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Ideas list */}
      {visible.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 gap-3">
          <Lightbulb className="w-8 h-8 text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-3)]">Nothing in {STATUS_CONFIG[activeTab].label.toLowerCase()}.</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <ul className="space-y-2">
            {visible.map((idea) => (
              <motion.li
                key={idea.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={spring}
              >
                <div
                  className="glass-card p-4"
                  onClick={(e) => e.stopPropagation()}
                  style={highlightId === idea.id ? { outline: "2px solid var(--accent)", outlineOffset: "2px" } : undefined}
                >
                  {editingId === idea.id ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) saveEdit(idea.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full bg-transparent text-sm font-medium text-[var(--text)] outline-none border-b border-[var(--glass-border)] pb-1"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        placeholder="Details (optional)…"
                        className="w-full bg-transparent text-xs text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none resize-y min-h-[3rem]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(idea.id)}
                          disabled={!editTitle.trim()}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: "var(--accent)", color: "#fff" }}
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      {/* Status dot */}
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: STATUS_CONFIG[activeTab].color }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] leading-snug">{idea.title}</p>
                        {idea.body && (
                          <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">{idea.body}</p>
                        )}
                        {idea.aiVerdict && (
                          <p className="text-xs text-[var(--text-2)] mt-2 italic leading-relaxed border-l-2 border-[var(--accent)] pl-2">
                            {idea.aiVerdict}
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--text-3)] mt-1.5">
                          {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* AI verdict spinner */}
                      {verdictLoadingId === idea.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--text-3)] flex-shrink-0 mt-0.5" />
                      )}

                      {/* 3-dot menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === idea.id ? null : idea.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--glass-strong)] transition-colors"
                          style={{ color: "var(--text-3)" }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {openMenuId === idea.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.92, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-[var(--glass-border)] overflow-hidden shadow-2xl"
                              style={{ background: "var(--surface-2)" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MenuItem icon={Pencil} label="Edit" onClick={() => startEdit(idea)} />
                              {activeTab === "inbox" && (
                                <>
                                  <MenuItem icon={Sparkles} label="AI Verdict" onClick={() => getVerdict(idea.id)} color="var(--accent)" />
                                  <MenuItem icon={TrendingUp} label="Promote" onClick={() => moveIdea(idea.id, "promoted")} color="var(--teal)" />
                                  <MenuItem icon={Bookmark} label="Park" onClick={() => moveIdea(idea.id, "parked")} color="var(--amber)" />
                                  <MenuItem icon={Archive} label="Drop" onClick={() => moveIdea(idea.id, "dropped")} color="var(--p3)" />
                                </>
                              )}
                              {activeTab !== "inbox" && (
                                <MenuItem icon={RotateCcw} label="Move to Inbox" onClick={() => moveIdea(idea.id, "inbox")} color="var(--accent)" />
                              )}
                              <div className="h-px bg-[var(--glass-border)]" />
                              <MenuItem icon={Trash2} label="Delete" onClick={() => deleteIdea(idea.id)} color="#FC8181" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--glass-strong)]"
      style={{ color: color ?? "var(--text-2)" }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}
