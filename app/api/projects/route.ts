import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/projects";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  area: z.enum(["uni", "work", "sports", "side-project", "personal", "other"]).optional(),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await getProjects({
    status: searchParams.get("status") ?? undefined,
    area: searchParams.get("area") ?? undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createSchema.parse(body);
    const project = await createProject(input);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

