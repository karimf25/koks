import { cn } from "@/lib/utils";

interface PriorityDotProps {
  priority: 1 | 2 | 3;
  className?: string;
  size?: "sm" | "md";
}

const priorityConfig = {
  1: { color: "bg-[var(--accent)]", label: "High", glow: "shadow-[0_0_6px_rgba(242,116,5,0.6)]" },
  2: { color: "bg-[var(--amber)]", label: "Medium", glow: "" },
  3: { color: "bg-[var(--slate)]", label: "Low", glow: "" },
} as const;

const sizeStyles = { sm: "w-1.5 h-1.5", md: "w-2 h-2" };

export function PriorityDot({ priority, className, size = "md" }: PriorityDotProps) {
  const config = priorityConfig[priority];
  return (
    <span
      className={cn(
        "inline-block rounded-full flex-shrink-0",
        config.color,
        config.glow,
        sizeStyles[size],
        className
      )}
      aria-label={`${config.label} priority`}
      title={`${config.label} priority`}
    />
  );
}
