"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Plus, FolderOpen, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { AREAS, AREA_COLORS } from "@/lib/project-constants";
import type { Project } from "@/db";

interface ProjectWithCount extends Project {
  taskCount: number;
}

interface Props {
  initialProjects: ProjectWithCount[];
}

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function ProjectGrid({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("personal");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const grouped = AREAS.map((a) => ({
    ...a,
    projects: projects.filter((p) => p.area === a.value),
  })).filter((g) => g.projects.length > 0 || showForm);

  const createProject = async () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), area }),
      });
      if (res.ok) {
        const p: ProjectWithCount = { ...(await res.json()), taskCount: 0 };
        setProjects((prev) => [p, ...prev]);
        setName("");
        setShowForm(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* New project form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                placeholder="Project name…"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none border-b border-[var(--glass-border)] pb-1"
              />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="bg-[var(--surface)] text-sm text-[var(--text-2)] rounded-lg px-3 py-1.5 border border-[var(--glass-border)] outline-none"
              >
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <GlassButton variant="primary" size="sm" onClick={createProject} disabled={!name.trim()}>
                  Create
                </GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </GlassButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <GlassButton variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New project
        </GlassButton>
      </div>

      {projects.length === 0 && !showForm && (
        <div className="glass-card flex flex-col items-center justify-center py-20 gap-3">
          <FolderOpen className="w-8 h-8 text-[var(--text-3)]" />
          <p className="text-[var(--text-3)] text-sm">No projects yet. Create your first one.</p>
        </div>
      )}

      {AREAS.map((a) => {
        const areaProjects = projects.filter((p) => p.area === a.value);
        if (areaProjects.length === 0) return null;
        return (
          <section key={a.value}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: AREA_COLORS[a.value] }}
              />
              <h2 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wider">
                {a.label}
              </h2>
              <span className="text-xs text-[var(--text-3)]">{areaProjects.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {areaProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => router.push(`/projects/${project.id}`)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
}: {
  project: ProjectWithCount;
  onClick: () => void;
}) {
  const color = AREA_COLORS[project.area] ?? "var(--slate)";
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
      <GlassCard
        interactive
        className="p-4 cursor-pointer"
        onClick={onClick}
        style={{ borderTop: `2px solid ${color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">{project.name}</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "var(--glass-strong)", color: "var(--text-2)" }}
          >
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="text-xs text-[var(--text-3)] mt-1 line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center gap-1 mt-3">
          <CheckSquare className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          <span className="text-xs text-[var(--text-3)]">
            {project.taskCount} open task{project.taskCount !== 1 ? "s" : ""}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
