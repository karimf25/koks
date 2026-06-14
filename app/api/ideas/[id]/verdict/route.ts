import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getIdea, updateIdea } from "@/lib/ideas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  }
  const { id } = await params;
  const idea = await getIdea(id);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = [
    `Evaluate this idea in 1-2 sentences. Be direct and honest — say if it's strong, weak, or needs more thought. End with a clear signal: 🟢 Promote, 🟡 Park, or 🔴 Drop.`,
    `Idea: ${idea.title}`,
    idea.body ? `Details: ${idea.body}` : "",
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const verdict = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  await updateIdea(id, { aiVerdict: verdict });

  return NextResponse.json({ verdict });
}
