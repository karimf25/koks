"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Zap, CheckSquare, FolderOpen, Lightbulb, RefreshCw, AlertCircle } from "lucide-react";

type FocusPick = {
  kind: "task" | "project" | "idea";
  id: string;
  title: string;
  reason: string;
};

type FocusRun = {
  id: string;
  runAt: string;
  briefingMd: string;
  picks: FocusPick[];
};

const KIND_ICON = {
  task: CheckSquare,
  project: FolderOpen,
  idea: Lightbulb,
};

const KIND_COLOR = {
  task: "var(--accent)",
  project: "var(--teal)",
  idea: "var(--gold)",
};

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function FocusEngine({
  initialRun,
  hasApiKey,
}: {
  initialRun: FocusRun | null;
  hasApiKey: boolean;
}) {
  const [run, setRun] = useState(initialRun);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const trigger = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/focus", { method: "POST" });
      if (res.ok) {
        setRun(await res.json());
      } else {
        const data = await res.json();
        setError(data.error ?? "Focus engine failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Focus Engine</h2>
          {run && (
            <span className="text-xs text-[var(--text-3)]">
              Last run {new Date(run.runAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <GlassButton
          variant={run ? "ghost" : "primary"}
          size="sm"
          onClick={trigger}
          disabled={pending || !hasApiKey}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Thinking…" : run ? "Re-run" : "Run now"}
        </GlassButton>
      </div>

      {!hasApiKey && (
        <div className="glass-card p-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
          <p className="text-sm text-[var(--text-3)]">
            Add <code className="bg-[var(--glass-strong)] px-1 rounded text-xs">ANTHROPIC_API_KEY</code> to enable the Focus Engine
          </p>
        </div>
      )}

      {error && (
        <div className="glass-card p-4 flex items-center gap-3 border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {run ? (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="space-y-4"
          >
            {/* Briefing */}
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Morning Brief</p>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{run.briefingMd}</p>
            </GlassCard>

            {/* Picks */}
            {Array.isArray(run.picks) && run.picks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Today's Picks</p>
                {run.picks.map((pick, i) => {
                  const Icon = KIND_ICON[pick.kind] ?? CheckSquare;
                  const color = KIND_COLOR[pick.kind] ?? "var(--accent)";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: i * 0.05 }}
                    >
                      <GlassCard className="p-3 flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text)] truncate">{pick.title}</p>
                          <p className="text-xs text-[var(--text-3)] mt-0.5">{pick.reason}</p>
                        </div>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                        >
                          {pick.kind}
                        </span>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          !pending && hasApiKey && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card flex flex-col items-center justify-center py-16 gap-3"
            >
              <Zap className="w-7 h-7 text-[var(--text-3)]" />
              <p className="text-sm text-[var(--text-3)]">Run the focus engine to get your daily briefing</p>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
