import postgres from 'postgres';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getVal = (key) => {
  const line = env.split('\n').find(l => l.startsWith(key + '='));
  if (!line) return undefined;
  // unescape \$ → $
  return line.slice(key.length + 1).trim().replace(/\\(\$)/g, '$1');
};

const url = getVal('DATABASE_URL');
console.log('DATABASE_URL prefix:', url?.slice(0, 40) + '...');

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  const result = await sql`SELECT count(*) FROM tasks`;
  console.log('Query OK, tasks count:', result[0].count);
} catch (err) {
  console.error('Query failed:');
  console.error('  message:', err.message);
  console.error('  code:', err.code);
  console.error('  detail:', err.detail);
  console.error('  hint:', err.hint);
  console.error('  full:', err);
} finally {
  await sql.end();
}
