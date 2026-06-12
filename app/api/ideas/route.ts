import { NextRequest, NextResponse } from "next/server";
import { getIdeas, createIdea } from "@/lib/ideas";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await getIdeas({
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const idea = await createIdea(input);
    return NextResponse.json(idea, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

