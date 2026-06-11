import { Metadata } from "next";
import { FocusStrip } from "./_components/FocusStrip";
import { TodaySection } from "./_components/TodaySection";
import { StatNumber } from "@/components/glass";

export const metadata: Metadata = { title: "Dashboard — LifeOS" };

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="flex items-start gap-2 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">
            Good morning
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Focus Strip — signature element */}
      <FocusStrip />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value="0" label="Tasks today" />
        <StatCard value="0" label="Due this week" />
        <StatCard value="0" label="Projects active" />
        <StatCard value="0" label="Ideas inbox" accent />
      </div>

      {/* Today's view */}
      <TodaySection />
    </div>
  );
}

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="glass-card p-4">
      <StatNumber value={value} label={label} accent={accent} />
    </div>
  );
}
