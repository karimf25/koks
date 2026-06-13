import { NextRequest, NextResponse } from "next/server";
import { getAutomation, updateAutomation, deleteAutomation } from "@/lib/automations";
import { updateAutomationSchema } from "@/lib/automation-schemas";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(automation);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = updateAutomationSchema.parse(await request.json());
    const automation = await updateAutomation(id, input);
    if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(automation);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteAutomation(id);
  return NextResponse.json({ ok: true });
}
