import { Metadata } from "next";
import { getIdeas } from "@/lib/ideas";
import { serializeIdea } from "@/lib/serialize";
import { IdeasBoard } from "./_components/IdeasBoard";

export const metadata: Metadata = { title: "Ideas — LifeOS" };

export default async function IdeasPage() {
  const ideas = (await getIdeas()).map(serializeIdea);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cream)]">Ideas</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Capture, triage, and promote your ideas</p>
      </div>
      <IdeasBoard initialIdeas={ideas} />
    </div>
  );
}
