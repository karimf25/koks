import { Metadata } from "next";
import { getMindmaps } from "@/lib/mindmaps";
import { getProjects } from "@/lib/projects";
import { serializeMindmap, serializeProject } from "@/lib/serialize";
import { MindmapGrid } from "./_components/MindmapGrid";

export const metadata: Metadata = { title: "Mind Maps — LifeOS" };

export default async function MindmapsPage() {
  const [rawMaps, rawProjects] = await Promise.all([getMindmaps(), getProjects()]);
  const maps = rawMaps.map(serializeMindmap);
  const projects = rawProjects.map(serializeProject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Mind Maps</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {maps.length} map{maps.length !== 1 ? "s" : ""} · Visual thinking canvas
        </p>
      </div>
      <MindmapGrid initialMaps={maps} projects={projects} />
    </div>
  );
}
