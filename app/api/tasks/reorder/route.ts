import { NextRequest, NextResponse } from "next/server";
import { reorderTasks } from "@/lib/tasks";
import { z } from "zod";

const schema = z.object({ orderedIds: z.array(z.string().uuid()) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = schema.parse(body);
    await reorderTasks(orderedIds);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
