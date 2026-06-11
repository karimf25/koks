import { GlassPanel } from "@/components/glass";

export default async function MindmapDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <GlassPanel>
      <p className="text-[var(--text-3)] text-sm">Mind map {id} — coming in Phase 3</p>
    </GlassPanel>
  );
}
