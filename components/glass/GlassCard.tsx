"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  noPadding?: boolean;
}

export function GlassCard({ children, className, interactive, noPadding, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "glass-card",
        !noPadding && "p-4",
        interactive && "glass-hover cursor-pointer",
        className
      )}
      whileHover={interactive ? { scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
