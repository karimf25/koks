import { GlassPanel } from "@/components/glass";
import { CheckSquare, Calendar } from "lucide-react";

export function TodaySection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassPanel>
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-2)]">Today&apos;s tasks</h3>
        </div>
        <p className="text-sm text-[var(--text-3)]">No tasks scheduled for today.</p>
      </GlassPanel>

      <GlassPanel>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[var(--teal)]" />
          <h3 className="text-sm font-semibold text-[var(--text-2)]">Today&apos;s events</h3>
        </div>
        <p className="text-sm text-[var(--text-3)]">No events today.</p>
      </GlassPanel>
    </div>
  );
}
