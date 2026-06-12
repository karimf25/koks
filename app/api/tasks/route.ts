import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/tasks";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  recurrence: z.string().optional(),
  source: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tasks = await getTasks({
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    priority: searchParams.get("priority") ? Number(searchParams.get("priority")) : undefined,
    scheduled: searchParams.get("scheduled") ?? undefined,
    dueToday: searchParams.get("dueToday") === "true",
    dueThisWeek: searchParams.get("dueThisWeek") === "true",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const task = await createTask(input);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

