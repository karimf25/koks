import { NextRequest, NextResponse } from "next/server";
import { listAttachments, recordAttachment, type OwnerType } from "@/lib/attachments";
import { serializeAttachment } from "@/lib/serialize";
import { z } from "zod";

const ownerType = z.enum(["task", "project"]);

const recordSchema = z.object({
  ownerType,
  ownerId: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ot = ownerType.safeParse(searchParams.get("ownerType"));
  const ownerId = searchParams.get("ownerId");
  if (!ot.success || !ownerId) {
    return NextResponse.json({ error: "ownerType and ownerId are required" }, { status: 400 });
  }
  const rows = await listAttachments(ot.data as OwnerType, ownerId);
  return NextResponse.json(rows.map(serializeAttachment));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = recordSchema.parse(body);
    const row = await recordAttachment(input);
    return NextResponse.json(serializeAttachment(row), { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
