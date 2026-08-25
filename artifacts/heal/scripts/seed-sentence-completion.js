/**
 * artifacts/heal/scripts/seed-sentence-completion.js
 *
 * Loads the 800-item Sentence Completion bank into
 * public.sentence_completion_questions, all rows is_published=false.
 * Source: sc_rows_for_db.json (built locally from twins_all_current.json +
 * explanations_master.json — see /docs/SC_DESIGN.md §6).
 *
 * Usage (from repo root):
 *   node artifacts/heal/scripts/seed-sentence-completion.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEAL_ROOT  = resolve(__dirname, '..');          // artifacts/heal
const REPO_ROOT  = resolve(HEAL_ROOT, '..', '..');    // repo root

function loadEnv(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(REPO_ROOT, 'env.scripts.txt'));
const SUPABASE_URL         = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  SUPABASE_URL or SUPABASE_SERVICE_KEY missing from env.scripts.txt\n');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const DATA_PATH = resolve(__dirname, 'sc_rows_for_db.json');
const rows = JSON.parse(readFileSync(DATA_PATH, 'utf8')).map((r) => ({
  ...r,
  is_published: false,
}));

console.log(`Loaded ${rows.length} rows from ${DATA_PATH}`);

const BATCH = 50;

async function main() {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb.from('sentence_completion_questions').insert(chunk);
    if (error) {
      console.error(`Batch ${i / BATCH + 1} FAILED:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`Batch ${i / BATCH + 1}: inserted ${chunk.length} (total ${inserted}/${rows.length})`);
  }

  const { count, error: countError } = await sb
    .from('sentence_completion_questions')
    .select('*', { count: 'exact', head: true });
  if (countError) {
    console.error('Count check failed:', countError.message);
    process.exit(1);
  }
  console.log(`\n✅ Done. Row count in table now: ${count}`);
}

main();
