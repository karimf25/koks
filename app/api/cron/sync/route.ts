import { NextRequest, NextResponse } from "next/server";
import { syncMicrosoftTodo } from "@/lib/microsoft/sync";
import { getIntegration } from "@/lib/integrations";

// Triggered by Vercel Cron (daily). Vercel sends `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET env var is set.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integ = await getIntegration("microsoft");
  if (!integ) return NextResponse.json({ skipped: "Microsoft not connected" });

  const result = await syncMicrosoftTodo();
  return NextResponse.json(result);
}
