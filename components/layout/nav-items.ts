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
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Every page in the app — single source of truth for all navigation surfaces. */
export const NAV_ITEMS: NavItem[] = [
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

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };
