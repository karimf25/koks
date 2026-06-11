import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";

export const metadata: Metadata = { title: "Project — LifeOS" };

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <div className="space-y-6">
      <GlassPanel>
        <p className="text-[var(--text-3)] text-sm">Project {id} — coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
