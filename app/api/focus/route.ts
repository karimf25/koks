import { NextResponse } from "next/server";
import { getLatestFocusRun, runFocusEngine } from "@/lib/focus";

export async function GET() {
  const run = await getLatestFocusRun();
  return NextResponse.json(run ?? null);
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 503 }
    );
  }
  try {
    const run = await runFocusEngine();
    return NextResponse.json(run);
  } catch (err) {
    console.error("Focus engine error:", err);
    return NextResponse.json({ error: "Focus engine failed" }, { status: 500 });
  }
}
