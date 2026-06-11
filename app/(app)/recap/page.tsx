import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { Play } from "lucide-react";

export const metadata: Metadata = { title: "Weekly Recap — LifeOS" };

export default function RecapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Weekly Recap</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Animated summary of your week</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <Play className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Weekly Recap (Remotion) coming in Phase 5</p>
      </GlassPanel>
    </div>
  );
}
