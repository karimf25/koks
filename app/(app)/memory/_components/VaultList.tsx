"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Plus, BookOpen, Cpu, FileText, Lightbulb, Search, Trash2, ChevronRight, ChevronLeft, Download, Loader2 } from "lucide-react";
import type { SerializedMemoryFile } from "@/lib/serialize";
type MemoryFile = SerializedMemoryFile;
import { MEMORY_KINDS } from "@/lib/memory-constants";
import { MarkdownEditor } from "@/components/MarkdownEditor";

const KIND_ICONS: Record<string, React.ElementType> = {
  conversation: BookOpen,
  decision: Cpu,
  spec: FileText,
  reference: Lightbulb,
};

const KIND_COLORS: Record<string, string> = {
  conversation: "var(--teal)",
  decision: "var(--accent)",
  spec: "var(--ice)",
  reference: "var(--gold)",
};

interface Props {
  initialFiles: MemoryFile[];
}

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function VaultList({ initialFiles }: Props) {
  const [files, setFiles] = useState(initialFiles);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [editContent, setEditContent] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [form, setForm] = useState({ path: "", title: "", kind: "conversation", summary: "", contentText: "" });
  const [pending, startTransition] = useTransition();
  const [searchResults, setSearchResults] = useState<MemoryFile[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/memory/search?q=${encodeURIComponent(search.trim())}`);
        if (res.ok) {
          const rows = await res.json();
          // Map snake_case SQL result to camelCase MemoryFile shape
          setSearchResults(
            rows.map((r: any) => ({
              id: r.id,
              path: r.path,
              title: r.title,
              summary: r.summary ?? null,
              contentText: r.content_text ?? "",
              kind: r.kind ?? "conversation",
              projectId: r.project_id ?? null,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }))
          );
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectFile = (f: MemoryFile) => {
    setSelected(f);
    setEditContent(f.contentText);
    setContentDirty(false);
  };

  const saveContent = useCallback((file: MemoryFile, content: string) => {
    setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, contentText: content } : f));
    setContentDirty(false);
    startTransition(async () => {
      await fetch(`/api/memory/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentText: content }),
      });
    });
  }, []);

  const downloadFile = (file: MemoryFile) => {
    const blob = new Blob([file.contentText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.path.replace(/\//g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = searchResults !== null
    ? searchResults.filter((f) => kindFilter === "all" || f.kind === kindFilter)
    : files.filter((f) => kindFilter === "all" || f.kind === kindFilter);

  const save = () => {
    if (!form.path.trim() || !form.title.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const f: MemoryFile = await res.json();
        setFiles((prev) => [f, ...prev]);
        setForm({ path: "", title: "", kind: "conversation", summary: "", contentText: "" });
        setShowForm(false);
      }
    });
  };

  const del = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/memory/${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (selected?.id === id) setSelected(null);
    });
  };

  // On mobile, the right pane (viewer/form) replaces the list when active.
  const detailActive = showForm || !!selected;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-12rem)]">
      {/* Left: list — full width on mobile, hidden when a file/form is open */}
      <div
        className={`w-full lg:w-72 flex-shrink-0 flex-col gap-3 ${
          detailActive ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Search + filter */}
        <div className="glass-card p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 border-b border-[var(--glass-border)] pb-2">
            {isSearching
              ? <Loader2 className="w-3.5 h-3.5 text-[var(--text-3)] animate-spin" />
              : <Search className="w-3.5 h-3.5 text-[var(--text-3)]" />}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vault…"
              className="bg-transparent text-sm outline-none flex-1 text-[var(--text)] placeholder:text-[var(--text-3)]"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {["all", ...MEMORY_KINDS.map((k) => k.value)].map((k) => (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  kindFilter === k
                    ? "bg-[var(--accent)] text-[var(--navy)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                }`}
              >
                {k === "all" ? "All" : MEMORY_KINDS.find((m) => m.value === k)?.label}
              </button>
            ))}
          </div>
        </div>

        <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New file
        </GlassButton>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
          <AnimatePresence>
            {filtered.map((f) => {
              const Icon = KIND_ICONS[f.kind] ?? BookOpen;
              const color = KIND_COLORS[f.kind] ?? "var(--text-3)";
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={spring}
                >
                  <GlassCard
                    interactive
                    className={`p-3 cursor-pointer group ${selected?.id === f.id ? "border-[var(--accent)]" : ""}`}
                    onClick={() => selectFile(f)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">{f.title}</p>
                        <p className="text-xs text-[var(--text-3)] truncate mt-0.5">{f.path}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); del(f.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-[var(--text-3)] hover:text-red-400" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <p className="text-xs text-[var(--text-3)] text-center py-8">No files found</p>
          )}
        </div>
      </div>

      {/* Right: viewer or form — full height on mobile, replaces the list */}
      <div
        className={`lg:flex-1 lg:overflow-hidden h-[calc(100dvh-12rem)] lg:h-full ${
          detailActive ? "block" : "hidden lg:block"
        }`}
      >
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring}
              className="glass-card p-5 h-full flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">New memory file</h2>
                <GlassButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</GlassButton>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--text-3)]">Path (unique key)</label>
                  <input
                    value={form.path}
                    onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                    placeholder="decisions/auth-2026"
                    className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--text-3)]">Kind</label>
                  <select
                    value={form.kind}
                    onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
                    className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                  >
                    {MEMORY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-3)]">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="File title"
                  className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-3)]">Summary (optional)</label>
                <input
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                  placeholder="One-line summary"
                  className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-[var(--text-3)]">Content (markdown)</label>
                <textarea
                  value={form.contentText}
                  onChange={(e) => setForm((p) => ({ ...p, contentText: e.target.value }))}
                  placeholder="Write your content here…"
                  className="flex-1 bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none resize-none font-mono"
                />
              </div>
              <GlassButton variant="primary" onClick={save} disabled={pending || !form.path || !form.title}>
                Save file
              </GlassButton>
            </motion.div>
          ) : selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring}
              className="glass-card p-5 h-full flex flex-col gap-3"
            >
              <button
                onClick={() => setSelected(null)}
                className="lg:hidden flex items-center gap-1 -ml-1 text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors w-fit"
                aria-label="Back to files"
              >
                <ChevronLeft className="w-4 h-4" /> Files
              </button>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-3)] font-mono truncate">{selected.path}</p>
                  <h2 className="text-lg font-semibold text-[var(--text)] mt-1">{selected.title}</h2>
                  {selected.summary && <p className="text-sm text-[var(--text-2)] mt-1">{selected.summary}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => downloadFile(selected)}
                    className="p-1.5 rounded-lg hover:bg-[var(--glass-strong)] transition-colors"
                    title="Download .md"
                  >
                    <Download className="w-4 h-4 text-[var(--text-3)]" />
                  </button>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--glass-strong)", color: KIND_COLORS[selected.kind] }}
                  >
                    {selected.kind}
                  </span>
                </div>
              </div>
              <div className="border-t border-[var(--glass-border)] pt-3 flex-1 overflow-hidden flex flex-col">
                <MarkdownEditor
                  value={editContent}
                  onChange={(v) => { setEditContent(v); setContentDirty(true); }}
                  onBlur={() => { if (contentDirty) saveContent(selected, editContent); }}
                  placeholder="Write content here… (Markdown supported)"
                  bodyClassName="flex-1 min-h-[200px]"
                  className="flex-1 flex flex-col"
                  toolbarRight={
                    contentDirty ? (
                      <button
                        onClick={() => saveContent(selected, editContent)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        Save
                      </button>
                    ) : undefined
                  }
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card h-full flex flex-col items-center justify-center gap-3"
            >
              <ChevronRight className="w-6 h-6 text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-3)]">Select a file to view it</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
