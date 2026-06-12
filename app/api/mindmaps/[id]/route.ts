import { NextRequest, NextResponse } from "next/server";
import { getMindmap, updateMindmap, deleteMindmap } from "@/lib/mindmaps";
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({ label: z.string(), color: z.string().optional() }),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
  data: z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const map = await getMindmap(id);
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(map);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    const map = await updateMindmap(id, input as any);
    if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(map);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteMindmap(id);
  return new NextResponse(null, { status: 204 });
}
