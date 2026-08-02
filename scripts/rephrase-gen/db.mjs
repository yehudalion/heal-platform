/**
 * scripts/rephrase-gen/db.mjs
 *
 * Read-only DB access for the factory via Supabase PostgREST + the service key
 * (no new dependency; global fetch). Used to load existing CAL seeds for dedup
 * and to rebuild the full-level scanner input after inserts. Inserts themselves
 * go through the committed .sql file applied via the Supabase MCP tool.
 */

import { loadEnv } from './lib.mjs';

const ENV = loadEnv();
const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_KEY = ENV.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY missing from env.scripts.txt');
  process.exit(1);
}

const COLS =
  'original_sentence,correct_answer,distractor_1,distractor_2,distractor_3,' +
  'mechanism_1,mechanism_2,mechanism_3,proximity_1,proximity_2,proximity_3,generation_batch';

/** Fetch the CAL golden rows for a level with full metadata, sorted by stem
 *  (deterministic → byte-identical frozen prompt → prompt cache stays valid). */
export async function getLevelGoldens(difficulty) {
  const cols =
    'original_sentence,correct_answer,distractor_1,distractor_2,distractor_3,' +
    'mechanism_1,mechanism_2,mechanism_3,proximity_1,proximity_2,proximity_3,' +
    'transformations,relation_count,hard_word_count,topic';
  const url =
    `${SUPABASE_URL}/rest/v1/restatement_questions` +
    `?select=${cols}&difficulty_level=eq.${difficulty}&generation_batch=like.CAL-*&order=original_sentence.asc`;
  const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return rows.map((r) => ({
    stem: r.original_sentence,
    correct: r.correct_answer,
    distractors: [r.distractor_1, r.distractor_2, r.distractor_3],
    mechanisms: [r.mechanism_1, r.mechanism_2, r.mechanism_3],
    proximities: [r.proximity_1, r.proximity_2, r.proximity_3],
    transformations: r.transformations ? r.transformations.split(',') : [],
    relation_count: r.relation_count,
    hard_word_count: r.hard_word_count,
    topic: r.topic,
  }));
}

/** Fetch all rows for a difficulty level, mapped to scanner-item shape. */
export async function getLevelItems(difficulty) {
  const url =
    `${SUPABASE_URL}/rest/v1/restatement_questions` +
    `?select=${COLS}&difficulty_level=eq.${difficulty}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return rows.map((r) => ({
    stem: r.original_sentence,
    correct: r.correct_answer,
    distractors: [r.distractor_1, r.distractor_2, r.distractor_3],
    mechanisms: [r.mechanism_1, r.mechanism_2, r.mechanism_3],
    proximities: [r.proximity_1, r.proximity_2, r.proximity_3],
    generation_batch: r.generation_batch,
  }));
}
