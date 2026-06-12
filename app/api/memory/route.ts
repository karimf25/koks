import { NextRequest, NextResponse } from "next/server";
import { getMemoryFiles, createMemoryFile } from "@/lib/memory";
import { z } from "zod";

const createSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  contentText: z.string().optional(),
  kind: z.enum(["conversation", "decision", "spec", "reference"]).optional(),
  projectId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const files = await getMemoryFiles({ kind, search });
  return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const file = await createMemoryFile(input);
    return NextResponse.json(file, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
