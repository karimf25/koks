import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

// Read hash directly from .env.local
const env = readFileSync('.env.local', 'utf8');
const hashLine = env.split('\n').find(l => l.startsWith('APP_PASSWORD_HASH='));
const hash = hashLine.split('=')[1].trim();

console.log('Hash from file:', hash);
const result = await bcrypt.compare('koks', hash);
console.log('Matches "koks":', result);
