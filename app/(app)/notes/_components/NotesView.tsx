"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Plus, Search, Trash2, Pin, FileText, Eye, Pencil, Check, Loader2, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { AREA_COLORS } from "@/lib/project-constants";
import type { SerializedNote, SerializedProject } from "@/lib/serialize";

type Note = SerializedNote;
type Project = SerializedProject;

interface Props {
  initialNotes: Note[];
  projects: Project[];
}

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;
type SaveState = "idle" | "saving" | "saved";

export function NotesView({ initialNotes, projects }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  // Start on the list (null) so mobile shows the list first; on desktop both
  // panels are visible side by side regardless.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const filtered = notes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const createNote = () => {
    startTransition(async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note", content: "" }),
      });
      if (res.ok) {
        const note: Note = await res.json();
        setNotes((prev) => [note, ...prev]);
        setSelectedId(note.id);
      }
    });
  };

  const deleteNote = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) setSelectedId(null);
    });
  };

  const patchLocal = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const togglePin = (note: Note) => {
    const pinned = !note.pinned;
    patchLocal(note.id, { pinned });
    fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
  };

  // pinned first, then most-recently-updated (already sorted server-side, but keep stable on edits)
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-13rem)]">
      {/* Left: list — full width on mobile, hidden once a note is open */}
      <div
        className={`w-full lg:w-72 flex-shrink-0 flex-col gap-3 ${
          selected ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="glass-card p-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="bg-transparent text-sm outline-none flex-1 text-[var(--text)] placeholder:text-[var(--text-3)]"
          />
        </div>

        <GlassButton variant="primary" size="sm" onClick={createNote} disabled={pending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New note
        </GlassButton>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
          <AnimatePresence initial={false}>
            {sorted.map((n) => {
              const project = projects.find((p) => p.id === n.projectId);
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={spring}
                >
                  <GlassCard
                    interactive
                    className={`p-3 cursor-pointer group ${selectedId === n.id ? "!border-[var(--accent)]" : ""}`}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      {n.pinned ? (
                        <Pin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 fill-[var(--gold)] text-[var(--gold)]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--text-3)]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">
                          {n.title || "Untitled note"}
                        </p>
                        <p className="text-xs text-[var(--text-3)] truncate mt-0.5">
                          {n.content.replace(/[#*`>\-\n]/g, " ").trim().slice(0, 48) || "Empty"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {project && (
                            <span
                              className="text-[10px] px-1.5 py-px rounded-full"
                              style={{
                                background: "var(--glass-strong)",
                                color: AREA_COLORS[project.area] ?? "var(--text-3)",
                              }}
                            >
                              {project.name}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--text-3)] font-mono">
                            {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-3 h-3 text-[var(--text-3)] hover:text-[#FC8181]" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {sorted.length === 0 && (
            <p className="text-xs text-[var(--text-3)] text-center py-8">No notes found</p>
          )}
        </div>
      </div>

      {/* Right: editor — full height on mobile, replaces the list when open */}
      <div
        className={`lg:flex-1 lg:overflow-hidden h-[calc(100dvh-13rem)] lg:h-full ${
          selected ? "block" : "hidden lg:block"
        }`}
      >
        <AnimatePresence mode="wait">
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              projects={projects}
              onPatchLocal={patchLocal}
              onTogglePin={() => togglePin(selected)}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card h-full flex flex-col items-center justify-center gap-3"
            >
              <FileText className="w-6 h-6 text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-3)]">Select a note, or create a new one</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  projects,
  onPatchLocal,
  onTogglePin,
  onBack,
}: {
  note: Note;
  projects: Project[];
  onPatchLocal: (id: string, patch: Partial<Note>) => void;
  onTogglePin: () => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [projectId, setProjectId] = useState<string | null>(note.projectId);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When a different note is selected, this component remounts (key=note.id),
  // so local state is correctly re-initialized from props.

  const persist = useCallback(
    (patch: { title?: string; content?: string; projectId?: string | null }) => {
      setSaveState("saving");
      fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
        .then(() => {
          onPatchLocal(note.id, { ...patch, updatedAt: new Date().toISOString() });
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        })
        .catch(() => setSaveState("idle"));
    },
    [note.id, onPatchLocal]
  );

  const scheduleSave = useCallback(
    (patch: { title?: string; content?: string }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(patch), 900);
    },
    [persist]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={spring}
      className="glass-card p-5 h-full flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--glass-strong)] transition-colors flex-shrink-0"
          aria-label="Back to notes"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value, content });
          }}
          placeholder="Untitled note"
          className="flex-1 bg-transparent text-lg font-semibold text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
        />
        <SaveIndicator state={saveState} />
        <button
          onClick={onTogglePin}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-strong)] transition-colors"
          aria-label={note.pinned ? "Unpin" : "Pin"}
        >
          <Pin
            className={`w-4 h-4 ${note.pinned ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-3)]"}`}
          />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--glass-border)] pb-3">
        <div className="flex rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] p-0.5">
          <ToolbarToggle active={mode === "edit"} onClick={() => setMode("edit")} icon={Pencil} label="Edit" />
          <ToolbarToggle active={mode === "preview"} onClick={() => setMode("preview")} icon={Eye} label="Preview" />
        </div>
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <span className="text-xs text-[var(--text-3)] flex-shrink-0">Project</span>
          <select
            value={projectId ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setProjectId(v);
              persist({ projectId: v });
            }}
            className="min-w-0 max-w-[160px] bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave({ title, content: e.target.value });
            }}
            onBlur={() => {
              if (timer.current) clearTimeout(timer.current);
              persist({ title, content });
            }}
            placeholder="Start writing in Markdown…"
            className="w-full h-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none resize-none font-mono leading-relaxed focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
          />
        ) : (
          <div className="markdown-body h-full overflow-y-auto px-1 text-sm text-[var(--text-2)] leading-relaxed">
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-[var(--text-3)] italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ToolbarToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
        active ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
      {state === "saving" ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>
      ) : (
        <><Check className="w-3 h-3 text-[var(--teal)]" /> Saved</>
      )}
    </span>
  );
}
