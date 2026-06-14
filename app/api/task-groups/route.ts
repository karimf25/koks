import { NextRequest, NextResponse } from "next/server";
import { getTaskGroups, createTaskGroup } from "@/lib/task-groups";
import { serializeTaskGroup } from "@/lib/serialize";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function GET() {
  const groups = await getTaskGroups();
  return NextResponse.json(groups.map(serializeTaskGroup));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const group = await createTaskGroup(input);
    return NextResponse.json(serializeTaskGroup(group), { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
