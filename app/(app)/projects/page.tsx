import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { FolderOpen } from "lucide-react";

export const metadata: Metadata = { title: "Projects — LifeOS" };

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Projects</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">All projects grouped by area</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <FolderOpen className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Projects coming in Phase 1</p>
      </GlassPanel>
    </div>
  );
}
