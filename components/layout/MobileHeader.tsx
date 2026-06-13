"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETTINGS_ITEM } from "./nav-items";

/**
 * Mobile-only top bar with a hamburger that opens a drawer listing every page.
 * The bottom nav keeps the 5 most-used pages for one-tap switching; this is
 * the way to reach everything else.
 */
export function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation happens
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = [...NAV_ITEMS, SETTINGS_ITEM];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 px-4 pt-3 pb-1">
        <div className="glass flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-[var(--cream)]">
            Life<span className="text-[var(--accent)]">OS</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 -mr-1.5 rounded-xl text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--glass)] transition-colors"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              className="absolute right-0 top-0 bottom-0 w-[78%] max-w-xs bg-[var(--surface)] border-l border-[var(--glass-border)] flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              aria-label="All pages"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <span className="text-lg font-semibold tracking-tight text-[var(--cream)]">
                  Life<span className="text-[var(--accent)]">OS</span>
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--glass)] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-6">
                {items.map((item, i) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i, type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                          isActive
                            ? "text-[var(--text)] bg-[var(--glass-strong)] border border-[var(--glass-border)]"
                            : "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--glass)]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4.5 h-4.5 flex-shrink-0",
                            isActive ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                          )}
                        />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
