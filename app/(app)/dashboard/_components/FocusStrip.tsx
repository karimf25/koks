"use client";

import { motion } from "motion/react";
import { GlassCard, GlassButton } from "@/components/glass";
import { Zap } from "lucide-react";

interface FocusPick {
  rank: 1 | 2 | 3;
  title: string;
  rationale: string;
  taskId?: string;
}

// Static placeholder picks until Phase 2 Focus Engine is wired
const PLACEHOLDER_PICKS: FocusPick[] = [
  {
    rank: 1,
    title: "No focus items yet",
    rationale: "Add tasks and run the Focus Engine to get AI-powered priorities.",
  },
];

export function FocusStrip() {
  const picks = PLACEHOLDER_PICKS;

  return (
    <section aria-label="Today's focus">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wider">
            Focus today
          </h2>
        </div>
        <GlassButton size="sm" variant="ghost" className="text-xs">
          Refresh
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {picks.map((pick, i) => (
          <FocusCard key={i} pick={pick} index={i} />
        ))}
        {picks.length < 3 &&
          Array.from({ length: 3 - picks.length }).map((_, i) => (
            <EmptyFocusSlot key={`empty-${i}`} index={picks.length + i} />
          ))}
      </div>
    </section>
  );
}

function FocusCard({ pick, index }: { pick: FocusPick; index: number }) {
  const isTop = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 26,
        delay: index * 0.08,
      }}
    >
      <GlassCard
        className="relative overflow-hidden"
        style={{
          boxShadow: isTop
            ? "0 0 30px rgba(242,116,5,0.15), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 0 20px rgba(217,141,48,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Edge glow */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: isTop
              ? "linear-gradient(90deg, transparent, var(--accent), transparent)"
              : "linear-gradient(90deg, transparent, var(--amber), transparent)",
            opacity: isTop ? 0.7 : 0.4,
          }}
        />

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: isTop ? "var(--accent)" : "var(--amber)" }}
            >
              #{index + 1}
            </span>
          </div>

          <p className="text-sm font-semibold text-[var(--text)] leading-snug">
            {pick.title}
          </p>
          <p className="text-xs text-[var(--text-3)] leading-relaxed">
            {pick.rationale}
          </p>

          {pick.taskId && (
            <GlassButton size="sm" variant="primary" className="w-full mt-1">
              Start now
            </GlassButton>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function EmptyFocusSlot({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      transition={{ delay: index * 0.08 + 0.1 }}
      className="glass-card border-dashed flex items-center justify-center min-h-[120px]"
    >
      <span className="text-xs text-[var(--text-3)]">Focus slot {index + 1}</span>
    </motion.div>
  );
}
