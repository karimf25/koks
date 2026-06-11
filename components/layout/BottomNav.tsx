"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  TableProperties,
  MessageSquare,
} from "lucide-react";

const bottomItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/planner", label: "Planner", icon: TableProperties },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="glass rounded-t-none rounded-b-none rounded-[20px] mx-auto mb-4 px-2 py-2 flex items-center justify-around">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[56px]",
                isActive ? "text-[var(--accent)]" : "text-[var(--text-3)]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
