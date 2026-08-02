import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(resolve(__dirname, '../../../env.scripts.txt'), 'utf8');
const env = {};
for (const line of text.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const ids = [
  '6b0950e0-ea79-4cf2-9e54-22d878ef0c95',
  '6cc9a9f3-29f3-4068-a16b-79b15ec1f45b',
  '81cea951-1155-4aba-816a-d9b08198d9f3',
];
const paths = ids.map(id => `listening/${id}.mp3`);

console.log('Deleting:', paths);
const { data, error } = await sb.storage.from('audio').remove(paths);
if (error) { console.error('Error:', error.message); process.exit(1); }
console.log('Deleted files:', data?.length ?? 0);
data?.forEach(f => console.log(' ✓', f.name));
