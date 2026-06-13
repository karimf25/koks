import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getWeekRecap } from "@/lib/recap";
import { z } from "zod";

const schema = z.object({ week: z.number().int().max(0).default(0) });

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  }

  try {
    const { week } = schema.parse(await request.json().catch(() => ({})));
    const data = await getWeekRecap(week);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Write a 2–3 sentence recap of this person's week in LifeOS. Warm, direct, second person ("you"). Mention the standout number or project. No emojis, no markdown, no preamble — just the sentences.

Week data: ${JSON.stringify(data)}`,
        },
      ],
    });

    const summary = response.content.find((c) => c.type === "text")?.text?.trim() ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
