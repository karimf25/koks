import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { CheckSquare } from "lucide-react";

export const metadata: Metadata = { title: "Tasks — LifeOS" };

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Tasks</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Manage all your tasks across projects</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <CheckSquare className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Tasks coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
