/**
 * scripts/rephrase-gen/smoke-batch.mjs
 *
 * ONE small L2 batch end-to-end on the Batch API (Opus 4.8 everywhere) to
 * measure ACTUAL per-item cost before scaling to the full 600. Reports the
 * token breakdown (cache_read vs input) and $ at Opus 4.8 batch rates, then
 * STOPS. Nothing is inserted; nothing is published.
 *
 *   node scripts/rephrase-gen/smoke-batch.mjs
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { OUT_DIR, loadEnv } from './lib.mjs';
import { RECIPES } from './recipes.mjs';
import { frozenGenSystem, buildGenRequests, parseGenItem } from './generate.mjs';
import { buildSolveRequests, tallySolve } from './solve.mjs';
import { runBatch, costOf } from './batch.mjs';
import { runScanner } from './gate-a.mjs';
import { getLevelGoldens } from './db.mjs';

const ENV = loadEnv();
const KEY = ENV.ANTHROPIC_API_KEY;
const level = 'L2';
const recipe = RECIPES[level];
const GEN_COUNT = 15;

async function countTokens(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-8', system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`count_tokens ${res.status}: ${await res.text()}`);
  return (await res.json()).input_tokens;
}

const fmt$ = (d) => `$${d.toFixed(4)}`;
const tick = (label) => (b) => console.log(`  [${label}] batch ${b.id} status=${b.processing_status} counts=${JSON.stringify(b.request_counts || {})}`);

console.log(`\n=== Batch smoke: ${level}, ${GEN_COUNT} items, Opus 4.8 everywhere ===`);

// ── frozen system + cache eligibility ───────────────────────────────────────
const goldens = await getLevelGoldens(recipe.difficulty);
const frozen = frozenGenSystem(recipe, goldens);
const sysTokens = await countTokens(
  [{ type: 'text', text: frozen }],
  'Write restatement item #1.1. Output the single JSON object only.'
);
console.log(`Frozen gen system: ${sysTokens} tokens (${goldens.length} goldens). Cache floor for Opus 4.8 = 4096 → caching ${sysTokens >= 4096 ? 'ENGAGES ✅' : 'WILL NOT engage ⚠️ (prefix < 4096)'}`);

// ── warmup (1 request writes the cache) then main gen batch (reads it) ───────
console.log('Submitting warmup gen batch (1)…');
const { results: warmRes } = await runBatch(buildGenRequests(recipe, { count: 1, round: 0, avoidSubjects: [], goldens }), { onTick: tick('warmup') });

console.log(`Submitting main gen batch (${GEN_COUNT})…`);
const { results: genRes } = await runBatch(buildGenRequests(recipe, { count: GEN_COUNT, round: 1, avoidSubjects: [], goldens }), { onTick: tick('gen') });

// ── parse items ─────────────────────────────────────────────────────────────
const items = [];
let genErrored = 0;
for (let i = 0; i < GEN_COUNT; i++) {
  const r = genRes[`gen-${level}-r1-i${i}`];
  if (!r || r.type !== 'succeeded') { genErrored++; continue; }
  const text = (r.message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const it = parseGenItem(text);
  if (it) items.push(it); else genErrored++;
}
console.log(`Parsed ${items.length}/${GEN_COUNT} items (${genErrored} errored/malformed).`);

// ── Gate A structural (local) ───────────────────────────────────────────────
let survivorsA = items;
if (items.length) {
  const res = runScanner(items, level, 'smoke');
  const drop = new Set(res.structuralItems);
  survivorsA = items.filter((_, i) => !drop.has(i + 1));
  console.log(`Gate A structural: ${survivorsA.length}/${items.length} pass (${res.structuralItems.length} structural fails).`);
}

// ── Gate B (blind solver, batch, 5 seeded shuffles/item) ────────────────────
let solveRes = {};
let solved = [];
if (survivorsA.length) {
  const { requests, meta, cached } = buildSolveRequests(survivorsA);
  console.log(`Submitting solver batch (${requests.length} requests = ${survivorsA.length} items × 5)…`);
  if (requests.length) ({ results: solveRes } = await runBatch(requests, { onTick: tick('solve') }));
  solved = tallySolve(survivorsA, solveRes, meta, cached);
}
const accepted = solved.filter((s) => s.result.pass).map((s) => s.item);
console.log(`Gate B: ${accepted.length}/${survivorsA.length} items passed 5/5.`);

// ── cost ────────────────────────────────────────────────────────────────────
const cWarm = costOf(warmRes), cGen = costOf(genRes), cSolve = costOf(solveRes);
const totalTok = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
for (const c of [cWarm, cGen, cSolve]) for (const k of Object.keys(totalTok)) totalTok[k] += c.tok[k];
const totalDollars = cWarm.dollars + cGen.dollars + cSolve.dollars;

const phase = (name, c) =>
  `  ${name.padEnd(14)} input=${c.tok.input}  cache_read=${c.tok.cache_read}  cache_write=${c.tok.cache_write}  output=${c.tok.output}  → ${fmt$(c.dollars)}  (${c.ok} ok, ${c.errored} err)`;

const perAccepted = accepted.length ? totalDollars / accepted.length : 0;
const perAttempted = totalDollars / GEN_COUNT;

console.log('\n──────── COST (Opus 4.8, Batch API 50% off; cache read 0.1×, write 1.25×) ────────');
console.log(phase('warmup gen', cWarm));
console.log(phase('main gen', cGen));
console.log(phase('solver', cSolve));
console.log(`  ${'TOTAL'.padEnd(14)} input=${totalTok.input}  cache_read=${totalTok.cache_read}  cache_write=${totalTok.cache_write}  output=${totalTok.output}  → ${fmt$(totalDollars)}`);
console.log(`\n  Main gen cache_read vs input: ${cGen.tok.cache_read} cached vs ${cGen.tok.input} uncached input tokens` +
  (cGen.tok.input + cGen.tok.cache_read ? ` (${Math.round((100 * cGen.tok.cache_read) / (cGen.tok.cache_read + cGen.tok.input))}% of input served from cache)` : ''));
console.log(`\n  Per accepted item: ${fmt$(perAccepted)}   ·   Per attempted item: ${fmt$(perAttempted)}`);
console.log(`  Naive extrapolation to 600 accepted: ${fmt$(perAccepted * 600)} (UPPER BOUND — the full run's cross-round cache reads push this LOWER; this cold smoke under-caches).`);

writeFileSync(resolve(OUT_DIR, 'smoke-L2.json'), JSON.stringify({ sysTokens, accepted, allItems: items, cost: { warmup: cWarm, gen: cGen, solve: cSolve, totalDollars, perAccepted } }, null, 2));
console.log(`\nWrote ${resolve(OUT_DIR, 'smoke-L2.json')}. Nothing inserted, nothing published.`);
console.log('\nSTOP — awaiting Lion\'s confirmation of per-item cost before scaling to the full 600.');
