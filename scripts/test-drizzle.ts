import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  if (!line.startsWith('#') && line.includes('=')) {
    const key = line.split('=')[0];
    const val = line.slice(key.length + 1).trim().replace(/\\(\$)/g, '$1');
    process.env[key] = val;
  }
});

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { tasks, projects } from '../db/schema';
import { asc, desc } from 'drizzle-orm';

(async () => {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require', prepare: false });
  const db = drizzle(client, { schema }); // same as app

  try {
    console.log('Running getTasks()...');
    const result = await db.select().from(tasks).orderBy(asc(tasks.priority), desc(tasks.createdAt));
    console.log('getTasks OK:', result.length, 'rows');
    console.log('First row:', JSON.stringify(result[0]));
  } catch (e: any) {
    console.error('getTasks FAILED:', e.message);
    console.error(e.stack);
  }

  try {
    console.log('\nRunning getProjects()...');
    const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
    console.log('getProjects OK:', result.length, 'rows');
  } catch (e: any) {
    console.error('getProjects FAILED:', e.message);
    console.error(e.stack);
  }

  await client.end();
})();
