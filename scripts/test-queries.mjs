import { readFileSync } from 'fs';

// Load env vars manually
const env = readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  if (!line.startsWith('#') && line.includes('=')) {
    const key = line.split('=')[0];
    const val = line.slice(key.length + 1).trim().replace(/\\(\$)/g, '$1');
    process.env[key] = val;
  }
});

const { drizzle } = await import('drizzle-orm/postgres-js');
const postgres = (await import('postgres')).default;
const schema = await import('../db/schema.js');

const client = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require', prepare: false });
const db = drizzle(client, { schema });

try {
  console.log('Testing getTasks...');
  const tasks = await db.select().from(schema.tasks);
  console.log('Tasks OK:', tasks.length);
  console.log('Sample task:', JSON.stringify(tasks[0], null, 2));
} catch (e) {
  console.error('getTasks FAILED:', e.message);
  console.error(e.stack);
}

try {
  console.log('\nTesting getProjects...');
  const projects = await db.select().from(schema.projects);
  console.log('Projects OK:', projects.length);
} catch (e) {
  console.error('getProjects FAILED:', e.message);
}

await client.end();
