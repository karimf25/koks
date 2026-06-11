import { Metadata } from "next";
import { GlassPanel } from "@/components/glass";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Notes — LifeOS" };

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Notes</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Markdown notes linked to projects</p>
      </div>
      <GlassPanel className="flex flex-col items-center justify-center py-20 gap-3">
        <FileText className="w-8 h-8 text-[var(--text-3)]" />
        <p className="text-[var(--text-3)] text-sm">Notes coming in Phase 3</p>
      </GlassPanel>
    </div>
  );
}
