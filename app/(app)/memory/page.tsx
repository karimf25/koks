import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Memory Vault — LifeOS" };

export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Memory Vault</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Project memory files for Claude</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <BookOpen className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Memory vault coming in Phase 2</p>
      </GlassPanel>
    </div>
  );
}
