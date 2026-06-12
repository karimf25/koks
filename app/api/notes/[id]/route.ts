import { NextRequest, NextResponse } from "next/server";
import { getNote, updateNote, deleteNote } from "@/lib/notes";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  pinned: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    const note = await updateNote(id, input as any);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(note);
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
  await deleteNote(id);
  return new NextResponse(null, { status: 204 });
}
