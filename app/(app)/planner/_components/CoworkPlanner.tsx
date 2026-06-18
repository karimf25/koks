"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassPanel, GlassButton } from "@/components/glass";
import { Bot, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface Props {
  hasApiKey: boolean;
}

export function CoworkPlanner({ hasApiKey }: Props) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/planner/cowork", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");
      setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-4 h-4 text-[var(--teal)]" />
        <h2 className="text-sm font-semibold text-[var(--text-2)]">Claude Code Co-work</h2>
        <span className="ml-auto text-[10px] text-[var(--text-3)] bg-[var(--glass-strong)] px-2 py-0.5 rounded-full">
          AI planner
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!plan && !loading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 py-8"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--glass-strong)" }}
            >
              <Sparkles className="w-6 h-6 text-[var(--teal)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-2)]">Plan my day</p>
              <p className="text-xs text-[var(--text-3)] mt-1 max-w-[220px]">
                I&apos;ll review your tasks, events, and ideas and create a structured plan for you.
              </p>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={generate}
              disabled={!hasApiKey}
              title={!hasApiKey ? "ANTHROPIC_API_KEY not configured" : undefined}
            >
              <Bot className="w-3.5 h-3.5 mr-1.5" />
              Plan my day
            </GlassButton>
            {!hasApiKey && (
              <p className="text-xs text-[var(--text-3)]">API key not configured</p>
            )}
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 py-8"
          >
            <Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
            <p className="text-xs text-[var(--text-3)]">Reviewing your day…</p>
          </motion.div>
        )}

        {plan && !loading && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col gap-3"
          >
            <div
              className="flex-1 rounded-xl p-4 overflow-y-auto text-sm text-[var(--text-2)] leading-relaxed markdown-body"
              style={{ background: "var(--glass-strong)" }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(plan) }}
            />
            <GlassButton variant="ghost" size="sm" onClick={generate} disabled={loading} className="self-start">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerate
            </GlassButton>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-[#FC8181] mt-2">{error}</p>
      )}
    </GlassPanel>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
