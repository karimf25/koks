import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { GitBranch } from "lucide-react";

export const metadata: Metadata = { title: "Mind Maps — LifeOS" };

export default function MindmapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Mind Maps</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Visual thinking with React Flow</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <GitBranch className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Mind maps coming in Phase 3</p>
      </GlassPanel>
    </div>
  );
}
