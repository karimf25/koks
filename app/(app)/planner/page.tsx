import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { TableProperties } from "lucide-react";

export const metadata: Metadata = { title: "Planner — LifeOS" };

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Planner</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Weekly planning view — drag tasks into days</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <TableProperties className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Weekly planner coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
