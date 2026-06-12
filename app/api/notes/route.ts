import { NextRequest, NextResponse } from "next/server";
import { getNotes, createNote } from "@/lib/notes";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  projectId: z.string().uuid().optional(),
  pinned: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const rows = await getNotes({ projectId, search });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const note = await createNote(input);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
