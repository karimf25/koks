import { NextRequest, NextResponse } from "next/server";
import { getAutomations, createAutomation } from "@/lib/automations";
import { createAutomationSchema } from "@/lib/automation-schemas";
import { z } from "zod";

export async function GET() {
  return NextResponse.json(await getAutomations());
}

export async function POST(request: NextRequest) {
  try {
    const input = createAutomationSchema.parse(await request.json());
    const automation = await createAutomation(input);
    return NextResponse.json(automation, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
