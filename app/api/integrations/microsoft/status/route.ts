import { NextResponse } from "next/server";
import { getIntegration, type MicrosoftMeta } from "@/lib/integrations";
import { isMicrosoftConfigured } from "@/lib/microsoft/graph";

export async function GET() {
  const integ = await getIntegration("microsoft");
  const meta = (integ?.metadata as MicrosoftMeta) ?? {};
  return NextResponse.json({
    configured: isMicrosoftConfigured(),
    connected: !!integ,
    account: meta.account ?? null,
    listId: meta.listId ?? null,
    listName: meta.listName ?? null,
    lastSyncedAt: meta.lastSyncedAt ?? null,
    lastResult: meta.lastResult ?? null,
  });
}
