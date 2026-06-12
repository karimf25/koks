import { NextRequest, NextResponse } from "next/server";
import { getMemoryFile, updateMemoryFile, deleteMemoryFile } from "@/lib/memory";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  contentText: z.string().optional(),
  kind: z.enum(["conversation", "decision", "spec", "reference"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await getMemoryFile(id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(file);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    const file = await updateMemoryFile(id, input as any);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(file);
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
  await deleteMemoryFile(id);
  return new NextResponse(null, { status: 204 });
}
