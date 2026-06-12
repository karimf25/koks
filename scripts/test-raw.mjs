import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  if (!line.startsWith('#') && line.includes('=')) {
    const key = line.split('=')[0];
    const val = line.slice(key.length + 1).trim().replace(/\\(\$)/g, '$1');
    process.env[key] = val;
  }
});

const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require', prepare: false });

const rows = await sql`SELECT * FROM tasks LIMIT 1`;
console.log('Row count:', rows.length);
if (rows[0]) {
  for (const [k, v] of Object.entries(rows[0])) {
    console.log(`  ${k}: ${JSON.stringify(v)} (${typeof v}, ${v === null ? 'null' : v === undefined ? 'undefined' : v?.constructor?.name})`);
  }
}

await sql.end();
