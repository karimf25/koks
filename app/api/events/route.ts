import { NextRequest, NextResponse } from "next/server";
import { getEvents, createEvent } from "@/lib/events";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
  location: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await getEvents({
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    projectId: searchParams.get("projectId") ?? undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const event = await createEvent(input);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

