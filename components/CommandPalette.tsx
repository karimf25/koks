"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, CheckSquare, FolderOpen, Lightbulb, FileText, Loader2 } from "lucide-react";

type SearchResult = {
  tasks: { id: string; title: string; status: string; priority: number }[];
  projects: { id: string; title: string; status: string }[];
  ideas: { id: string; title: string; status: string }[];
  notes: { id: string; title: string }[];
};

type FlatResult = { type: "task" | "project" | "idea" | "note"; id: string; title: string; href: string };

function flatten(data: SearchResult): FlatResult[] {
  return [
    ...data.tasks.map((t) => ({ type: "task" as const, id: t.id, title: t.title, href: "/tasks" })),
    ...data.projects.map((p) => ({ type: "project" as const, id: p.id, title: p.title, href: `/projects/${p.id}` })),
    ...data.ideas.map((i) => ({ type: "idea" as const, id: i.id, title: i.title, href: "/ideas" })),
    ...data.notes.map((n) => ({ type: "note" as const, id: n.id, title: n.title, href: "/notes" })),
  ];
}

const TYPE_META = {
  task: { label: "Task", Icon: CheckSquare, color: "var(--accent)" },
  project: { label: "Project", Icon: FolderOpen, color: "var(--teal)" },
  idea: { label: "Idea", Icon: Lightbulb, color: "var(--amber)" },
  note: { label: "Note", Icon: FileText, color: "var(--ice)" },
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlatResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResult = await res.json();
        const flat = flatten(data);
        setResults(flat);
        setActive(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  const navigate = (item: FlatResult) => {
    router.push(item.href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { navigate(results[active]); }
    else if (e.key === "Escape") { onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
          >
            <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-[var(--glass-border)]">
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
                {loading
                  ? <Loader2 className="w-4 h-4 text-[var(--text-3)] animate-spin flex-shrink-0" />
                  : <Search className="w-4 h-4 text-[var(--text-3)] flex-shrink-0" />}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search tasks, projects, ideas, notes…"
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
                />
                <kbd className="text-[10px] text-[var(--text-3)] bg-[var(--glass-strong)] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <ul className="py-2 max-h-80 overflow-y-auto">
                  {results.map((item, i) => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.Icon;
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ background: i === active ? "var(--glass-strong)" : "transparent" }}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => navigate(item)}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                          <span className="flex-1 text-sm text-[var(--text)] truncate">{item.title}</span>
                          <span className="text-[10px] text-[var(--text-3)] bg-[var(--glass)] px-1.5 py-0.5 rounded-full">
                            {meta.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {query.length >= 2 && !loading && results.length === 0 && (
                <p className="text-xs text-[var(--text-3)] text-center py-8">No results for "{query}"</p>
              )}

              {/* Footer hint */}
              <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--glass-border)]">
                <span className="text-[10px] text-[var(--text-3)]">↑↓ navigate</span>
                <span className="text-[10px] text-[var(--text-3)]">↵ open</span>
                <span className="text-[10px] text-[var(--text-3)]">Esc close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
