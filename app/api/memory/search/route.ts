import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  // Full-text search across title, summary, and content using PostgreSQL tsvector.
  // Returns ranked results (ts_rank DESC).
  const rows = await db.execute(sql`
    SELECT
      id, path, title, summary, kind, created_at, updated_at,
      left(content_text, 300) AS content_text,
      ts_rank(
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content_text,'')),
        plainto_tsquery('english', ${q})
      ) AS rank
    FROM memory_files
    WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content_text,''))
          @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT 20
  `);

  return NextResponse.json(Array.from(rows));
}
