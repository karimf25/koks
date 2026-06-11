import { GlassPanel } from "@/components/glass";

export default async function MemoryFilePage(props: { params: Promise<{ path: string[] }> }) {
  const { path } = await props.params;
  const filePath = path.join("/");
  return (
    <GlassPanel>
      <p className="text-[var(--text-3)] text-sm">Memory file: {filePath}</p>
    </GlassPanel>
  );
}
