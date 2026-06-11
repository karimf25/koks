"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function GlassPanel({ children, className, noPadding, ...props }: GlassPanelProps) {
  return (
    <motion.div
      className={cn("glass", !noPadding && "p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
