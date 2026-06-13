import { NextRequest, NextResponse } from "next/server";
import { syncMicrosoftTodo } from "@/lib/microsoft/sync";
import { getIntegration } from "@/lib/integrations";
import { runDueAutomations } from "@/lib/automations";

// Triggered by Vercel Cron (daily). Vercel sends `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET env var is set. Runs the Microsoft sync (if connected)
// and any due automations.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integ = await getIntegration("microsoft");
  const sync = integ ? await syncMicrosoftTodo() : { skipped: "Microsoft not connected" };

  const automations = await runDueAutomations();

  return NextResponse.json({ sync, automations });
}
