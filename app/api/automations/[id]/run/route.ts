import { NextRequest, NextResponse } from "next/server";
import { getAutomation, runAutomation } from "@/lib/automations";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await runAutomation(automation, true);
  return NextResponse.json(result);
}
