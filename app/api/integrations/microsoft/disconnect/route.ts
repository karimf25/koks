import { NextResponse } from "next/server";
import { deleteIntegration } from "@/lib/integrations";

export async function POST() {
  await deleteIntegration("microsoft");
  return NextResponse.json({ ok: true });
}
