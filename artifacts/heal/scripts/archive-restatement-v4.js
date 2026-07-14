/**
 * artifacts/heal/scripts/archive-restatement-v4.js
 *
 * Archive every row of restatement_questions to CSV before the v4 clean-slate reset.
 * Read-only against the DB. Writes docs/archive/restatement_questions_pre_v4_<DATE>.csv
 *
 * Exports ALL columns as they exist at archive time (including the v3.1 columns that
 * the v4 migration is about to drop) — the whole point is a faithful pre-reset snapshot.
 *
 * Usage (from repo root):
 *   node artifacts/heal/scripts/archive-restatement-v4.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEAL_ROOT = resolve(__dirname, '..');        // artifacts/heal
const REPO_ROOT = resolve(HEAL_ROOT, '..', '..');  // repo root

const ARCHIVE_DATE = '2026-07-14';
const OUT_PATH = resolve(REPO_ROOT, 'docs', 'archive', `restatement_questions_pre_v4_${ARCHIVE_DATE}.csv`);

// ─── Load env from env.scripts.txt ───────────────────────────────────────────
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
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('FATAL: SUPABASE_URL / SUPABASE_SERVICE_KEY missing from env.scripts.txt');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── RFC4180 CSV encoding ────────────────────────────────────────────────────
function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s;
  if (typeof value === 'object') s = JSON.stringify(value); // jsonb columns
  else s = String(value);
  // Always quote; escape embedded quotes by doubling. Safe for Hebrew, commas, newlines.
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  // Authoritative count straight from the DB.
  const { count: dbCount, error: countErr } = await sb
    .from('restatement_questions')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('FATAL: count query failed:', countErr.message);
    process.exit(1);
  }

  // Paginate so we never rely on the default 1000-row cap.
  const PAGE = 500;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('restatement_questions')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('FATAL: fetch failed:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  if (rows.length === 0) {
    console.error('FATAL: zero rows fetched — refusing to write an empty archive.');
    process.exit(1);
  }

  // Union of keys across all rows, so no column is silently dropped.
  const cols = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);

  const lines = [cols.map(csvCell).join(',')];
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  // UTF-8 BOM so Excel renders the Hebrew correctly.
  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  writeFileSync(OUT_PATH, csv, 'utf8');

  const published = rows.filter((r) => r.is_published === true).length;

  console.log('─── ARCHIVE COMPLETE ───────────────────────────────');
  console.log(`DB count (authoritative) : ${dbCount}`);
  console.log(`Rows fetched             : ${rows.length}`);
  console.log(`  of which is_published  : ${published}`);
  console.log(`Columns exported         : ${cols.length}`);
  console.log(`Bytes written            : ${Buffer.byteLength(csv, 'utf8')}`);
  console.log(`Output                   : ${OUT_PATH}`);
  console.log('');
  console.log(`COLUMNS: ${cols.join(', ')}`);
  console.log('');

  if (dbCount !== rows.length) {
    console.error(`GATE FAILED: db count ${dbCount} !== fetched ${rows.length}. DO NOT PROCEED.`);
    process.exit(1);
  }
  console.log(`GATE PASSED: db count === fetched === ${rows.length}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
