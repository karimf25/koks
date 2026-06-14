"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Settings, Search } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { CommandPalette } from "@/components/CommandPalette";

const navItems = NAV_ITEMS;

export function Sidebar() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-4 top-4 bottom-4 w-56 z-40"
      aria-label="Main navigation"
    >
      <div className="glass flex flex-col h-full py-4 px-3 rounded-[20px]">
        {/* Logo */}
        <div className="px-3 mb-4">
          <span className="text-lg font-semibold tracking-tight text-[var(--cream)]">
            Life<span className="text-[var(--accent)]">OS</span>
          </span>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="mx-0 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[var(--text-3)] bg-[var(--glass)] border border-[var(--glass-border)] hover:text-[var(--text-2)] transition-colors w-full"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left text-xs">Search…</span>
          <kbd className="text-[10px] font-mono bg-[var(--glass-strong)] px-1 rounded">⌘K</kbd>
        </button>

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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </aside>
  );
}
