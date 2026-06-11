"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface StatNumberProps {
  value: string | number;
  label: string;
  sublabel?: string;
  className?: string;
  accent?: boolean;
}

export function StatNumber({ value, label, sublabel, className, accent }: StatNumberProps) {
  return (
    <motion.div
      className={cn("flex flex-col gap-1", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <span
        className={cn(
          "text-4xl font-semibold tracking-tight leading-none",
          accent ? "text-gradient-orange" : "text-[var(--cream)]"
        )}
      >
        {value}
      </span>
      <span className="text-sm text-[var(--text-2)] font-medium">{label}</span>
      {sublabel && <span className="text-xs text-[var(--text-3)]">{sublabel}</span>}
    </motion.div>
  );
}
