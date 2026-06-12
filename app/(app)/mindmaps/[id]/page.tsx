import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMindmap, type MindmapData } from "@/lib/mindmaps";
import { MindmapCanvas } from "./_components/MindmapCanvas";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const map = await getMindmap(id);
  return { title: map ? `${map.title} — LifeOS` : "Mind Map — LifeOS" };
}

export default async function MindmapDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const map = await getMindmap(id);
  if (!map) notFound();

  const data = (map.data as MindmapData) ?? { nodes: [], edges: [] };

  return (
    <MindmapCanvas
      id={map.id}
      title={map.title}
      initialNodes={data.nodes ?? []}
      initialEdges={data.edges ?? []}
    />
  );
}
