import { NextRequest, NextResponse } from "next/server";
import { getIdea, updateIdea, deleteIdea } from "@/lib/ideas";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  status: z.enum(["inbox", "promoted", "parked", "dropped"]).optional(),
  aiVerdict: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    const idea = await updateIdea(id, input as any);
    if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(idea);
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
  await deleteIdea(id);
  return new NextResponse(null, { status: 204 });
}
