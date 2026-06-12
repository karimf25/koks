import { NextRequest, NextResponse } from "next/server";
import { getMindmaps, createMindmap } from "@/lib/mindmaps";
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

const createSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().uuid().optional(),
  data: z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const rows = await getMindmaps({ projectId });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const map = await createMindmap(input as any);
    return NextResponse.json(map, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
