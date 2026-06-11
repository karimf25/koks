import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { Zap } from "lucide-react";

export const metadata: Metadata = { title: "Automations — LifeOS" };

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Automations</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Configure triggers and actions</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <Zap className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Automations coming in Phase 5</p>
      </GlassPanel>
    </div>
  );
}
