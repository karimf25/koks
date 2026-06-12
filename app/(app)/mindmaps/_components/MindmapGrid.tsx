"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { GlassCard, GlassButton } from "@/components/glass";
import { Plus, GitBranch, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AREA_COLORS } from "@/lib/project-constants";
import type { SerializedMindmap, SerializedProject } from "@/lib/serialize";
import type { MindmapData } from "@/lib/mindmaps";

type Mindmap = SerializedMindmap;
type Project = SerializedProject;

interface Props {
  initialMaps: Mindmap[];
  projects: Project[];
}

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function MindmapGrid({ initialMaps, projects }: Props) {
  const [maps, setMaps] = useState<Mindmap[]>(initialMaps);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const create = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/mindmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), projectId: projectId || undefined }),
      });
      if (res.ok) {
        const map: Mindmap = await res.json();
        router.push(`/mindmaps/${map.id}`);
      }
    });
  };

  const del = (id: string) => {
    startTransition(async () => {
      await fetch(`/api/mindmaps/${id}`, { method: "DELETE" });
      setMaps((prev) => prev.filter((m) => m.id !== id));
    });
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            <GlassCard className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text)]">New mind map</h3>
                <button onClick={() => setShowForm(false)} aria-label="Cancel">
                  <X className="w-4 h-4 text-[var(--text-3)]" />
                </button>
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Map title…"
                className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)]"
              />
              <div className="flex items-center gap-2">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none flex-1"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <GlassButton variant="primary" onClick={create} disabled={pending || !title.trim()}>
                  Create
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New mind map
          </GlassButton>
        )}
      </AnimatePresence>

      {maps.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <GitBranch className="w-8 h-8 text-[var(--text-3)]" />
          <p className="text-sm text-[var(--text-3)]">No mind maps yet — create your first one above.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {maps.map((m) => {
              const project = projects.find((p) => p.id === m.projectId);
              const data = m.data as MindmapData;
              const nodeCount = data?.nodes?.length ?? 0;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                >
                  <GlassCard
                    interactive
                    className="p-4 group h-full"
                    onClick={() => router.push(`/mindmaps/${m.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--glass-strong)" }}
                      >
                        <GitBranch className="w-4 h-4 text-[var(--teal)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{m.title}</p>
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          {nodeCount} node{nodeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); del(m.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete map"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[var(--text-3)] hover:text-[#FC8181]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
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
                      <span className="text-[10px] text-[var(--text-3)] font-mono ml-auto">
                        {formatDistanceToNow(new Date(m.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
