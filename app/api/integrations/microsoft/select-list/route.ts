import { NextRequest, NextResponse } from "next/server";
import { updateIntegrationMetadata } from "@/lib/integrations";

export async function POST(request: NextRequest) {
  const { listId, listName } = await request.json();
  if (!listId) return NextResponse.json({ error: "listId is required" }, { status: 400 });
  const row = await updateIntegrationMetadata("microsoft", { listId, listName: listName ?? null });
  if (!row) return NextResponse.json({ error: "Not connected to Microsoft" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
