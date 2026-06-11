import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { Calendar } from "lucide-react";

export const metadata: Metadata = { title: "Calendar — LifeOS" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Calendar</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Your schedule at a glance</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <Calendar className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Calendar coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
