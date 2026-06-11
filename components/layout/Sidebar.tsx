"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Lightbulb,
  Calendar,
  TableProperties,
  FolderOpen,
  BookOpen,
  FileText,
  GitBranch,
  MessageSquare,
  Play,
  Zap,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/planner", label: "Planner", icon: TableProperties },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/memory", label: "Memory Vault", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/mindmaps", label: "Mind Maps", icon: GitBranch },
  { href: "/chat", label: "Claude Chat", icon: MessageSquare },
  { href: "/recap", label: "Weekly Recap", icon: Play },
  { href: "/automations", label: "Automations", icon: Zap },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-4 top-4 bottom-4 w-56 z-40"
      aria-label="Main navigation"
    >
      <div className="glass flex flex-col h-full py-4 px-3 rounded-[20px]">
        {/* Logo */}
        <div className="px-3 mb-6">
          <span className="text-lg font-semibold tracking-tight text-[var(--cream)]">
            Life<span className="text-[var(--accent)]">OS</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group",
                  isActive
                    ? "text-[var(--text)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-[var(--glass-strong)] border border-[var(--glass-border)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 relative z-10 transition-colors",
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mt-2",
            pathname === "/settings"
              ? "text-[var(--text)] bg-[var(--glass-strong)]"
              : "text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--glass)]"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
