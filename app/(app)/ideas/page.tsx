import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { Lightbulb } from "lucide-react";

export const metadata: Metadata = { title: "Ideas — LifeOS" };

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Ideas</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Capture and triage your ideas</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <Lightbulb className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Ideas inbox coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
