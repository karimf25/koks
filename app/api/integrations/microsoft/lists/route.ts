import { NextResponse } from "next/server";
import { getValidAccessToken, listTodoLists } from "@/lib/microsoft/graph";

export async function GET() {
  const token = await getValidAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected to Microsoft" }, { status: 401 });
  try {
    const lists = await listTodoLists(token);
    return NextResponse.json(
      lists.map((l) => ({ id: l.id, name: l.displayName, wellknown: l.wellknownListName ?? null }))
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
