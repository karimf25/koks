import { NextResponse } from "next/server";
import { syncMicrosoftTodo } from "@/lib/microsoft/sync";

export async function POST() {
  const result = await syncMicrosoftTodo();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
