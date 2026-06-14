import { NextRequest, NextResponse } from "next/server";
import { updateTaskGroup, deleteTaskGroup } from "@/lib/task-groups";
import { serializeTaskGroup } from "@/lib/serialize";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  position: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSchema.parse(body);
    const group = await updateTaskGroup(id, input);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeTaskGroup(group));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteTaskGroup(id);
  return new NextResponse(null, { status: 204 });
}
