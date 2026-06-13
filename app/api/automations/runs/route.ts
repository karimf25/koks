import { NextResponse } from "next/server";
import { getRecentRuns } from "@/lib/automations";

export async function GET() {
  return NextResponse.json(await getRecentRuns());
}
