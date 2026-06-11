"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hot)] shadow-[0_0_20px_rgba(242,116,5,0.25)]",
  secondary:
    "bg-[var(--glass)] border border-[var(--glass-border)] text-[var(--text)] hover:bg-[var(--glass-strong)]",
  ghost:
    "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--glass)]",
  danger:
    "bg-[#E53E3E22] border border-[#E53E3E44] text-[#FC8181] hover:bg-[#E53E3E44]",
};

const sizeStyles = {
  sm: "h-8 px-3 text-sm rounded-xl gap-1.5",
  md: "h-10 px-4 text-sm rounded-2xl gap-2",
  lg: "h-12 px-6 text-base rounded-2xl gap-2",
};

export function GlassButton({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ice)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
