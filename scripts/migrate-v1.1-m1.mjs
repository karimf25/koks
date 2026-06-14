/**
 * Idempotent migration for M1 — Tasks overhaul.
 * Adds: task_groups table, notes/groupId/isMyDay/myDayDate columns to tasks.
 * Run once: node scripts/migrate-v1.1-m1.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=\s]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false });

async function run() {
  console.log("Running M1 migration...");

  // 1. task_groups table
  await sql`
    CREATE TABLE IF NOT EXISTS task_groups (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name        text NOT NULL,
      color       text NOT NULL DEFAULT '#6366f1',
      position    integer NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ task_groups table");

  // 2. notes column on tasks
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text`;
  console.log("✓ tasks.notes");

  // 3. group_id FK on tasks
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES task_groups(id) ON DELETE SET NULL`;
  console.log("✓ tasks.group_id");

  // 4. is_my_day boolean on tasks
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_my_day boolean NOT NULL DEFAULT false`;
  console.log("✓ tasks.is_my_day");

  // 5. my_day_date date on tasks
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS my_day_date date`;
  console.log("✓ tasks.my_day_date");

  console.log("\nM1 migration complete.");
  await sql.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
