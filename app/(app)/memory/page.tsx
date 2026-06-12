import { Metadata } from "next";
import { getMemoryFiles } from "@/lib/memory";
import { serializeMemoryFile } from "@/lib/serialize";
import { VaultList } from "./_components/VaultList";

export const metadata: Metadata = { title: "Memory Vault — LifeOS" };

export default async function MemoryPage() {
  const files = (await getMemoryFiles()).map(serializeMemoryFile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Memory Vault</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          {files.length} file{files.length !== 1 ? "s" : ""} · Project context for Claude
        </p>
      </div>
      <VaultList initialFiles={files} />
    </div>
  );
}
