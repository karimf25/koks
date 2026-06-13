import { NextRequest, NextResponse } from "next/server";
import { getAttachmentUrl, deleteAttachment } from "@/lib/attachments";

// GET → 302 redirect to a short-lived signed URL (used as an <a href> for view/download).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = await getAttachmentUrl(id);
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(url);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteAttachment(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
