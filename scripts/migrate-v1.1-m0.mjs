// v1.1 M0 migration: tasks.position column + attachments table + position backfill.
// Idempotent — safe to re-run. Mirrors db/schema.ts. Run: node scripts/migrate-v1.1-m0.mjs
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
env.split("\n").forEach((line) => {
  if (!line.startsWith("#") && line.includes("=")) {
    const key = line.split("=")[0];
    const val = line.slice(key.length + 1).trim().replace(/\\(\$)/g, "$1");
    process.env[key] = val;
  }
});

const postgres = (await import("postgres")).default;
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require", prepare: false });

try {
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0`;
  console.log("✓ tasks.position column");

  await sql`
    CREATE TABLE IF NOT EXISTS attachments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_type text NOT NULL,
      owner_id uuid NOT NULL,
      name text NOT NULL,
      path text NOT NULL,
      mime_type text,
      size_bytes integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS attachments_owner_idx ON attachments (owner_type, owner_id)`;
  console.log("✓ attachments table + owner index");

  const res = await sql`
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM tasks
    )
    UPDATE tasks t SET position = o.rn FROM ordered o WHERE t.id = o.id`;
  console.log(`✓ backfilled position for ${res.count} task(s)`);

  console.log("DONE");
} catch (e) {
  console.error("MIGRATION FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
