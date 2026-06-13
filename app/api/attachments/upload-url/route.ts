import { NextRequest, NextResponse } from "next/server";
import { prepareUpload, type OwnerType } from "@/lib/attachments";
import { z } from "zod";

const schema = z.object({
  ownerType: z.enum(["task", "project"]),
  ownerId: z.string().uuid(),
  fileName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = schema.parse(body);
    const result = await prepareUpload(input.ownerType as OwnerType, input.ownerId, input.fileName);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
