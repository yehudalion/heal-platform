/**
 * scripts/rephrase-gen/solve.mjs
 *
 * Gate B — build-time blind solver. For each item, present ONLY the stem and
 * four shuffled options (spec §1 prompt verbatim) to claude-sonnet-4-6, five
 * independent times at temperature ~1.0. Pass only if all five pick the
 * intended key. This is generation-time content QA, NOT a live-app API call.
 *
 * Cache by item hash in out/solver-cache.json — reruns are free.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { callClaude, callClaudeFull, textOf, mapPool, addUsage, shuffledOptions, itemHash, OUT_DIR } from './lib.mjs';

const SOLVER_MODEL = 'claude-opus-4-8'; // Lion: uniform top quality — Opus everywhere
const RUNS = 5;
const CACHE_PATH = resolve(OUT_DIR, 'solver-cache.json');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}
function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function buildPrompt(stem, options) {
  return (
    'Here is a sentence followed by four restatements. Exactly one preserves its meaning\n' +
    'with no added or altered information. Reply with ONLY the number (1-4).\n' +
    `Sentence: ${stem}\n` +
    options.map((o, i) => `${i + 1}) ${o}`).join('  ')
  );
}

function parseChoice(text) {
  const m = String(text).match(/[1-4]/);
  return m ? Number(m[0]) : null;
}

// ─── Solver system (frozen; tiny, so it does not itself cache) ───────────────
const SOLVER_SYS = 'Here is a sentence followed by four restatements. Exactly one preserves its meaning with no added or altered information. Reply with ONLY the number (1-4).';

/**
 * Synchronous Gate B: for each uncached item, 5 blind solves at 5 DIFFERENT
 * deterministic shuffles (independence without temperature, which Opus 4.8
 * rejects), fired through a concurrency pool. Item-hash cached → reruns free.
 * Returns { results:[{item,result}], usage }.
 */
export async function solveSyncAll(items, { concurrency = 40 } = {}) {
  const cache = loadCache();
  const usage = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
  const system = [{ type: 'text', text: SOLVER_SYS, cache_control: { type: 'ephemeral', ttl: '1h' } }];

  const tasks = [];
  for (const item of items) {
    const key = itemHash(item);
    if (cache[key]) continue;
    for (let r = 0; r < RUNS; r++) tasks.push({ item, key, r });
  }
  const votesByKey = {};
  await mapPool(tasks, concurrency, async (t) => {
    const { options, correctIndex, order } = shuffledOptions(t.item, `s${t.r}`);
    const data = await callClaudeFull({
      model: SOLVER_MODEL, max_tokens: 8, thinking: { type: 'disabled' }, system,
      messages: [{ role: 'user', content: `Sentence: ${t.item.stem}\n` + options.map((o, i) => `${i + 1}) ${o}`).join('  ') }],
    });
    addUsage(usage, data.usage);
    (votesByKey[t.key] ||= []).push({ run: t.r, choice: parseChoice(textOf(data)), correctSlot: correctIndex + 1, order, mechanisms: t.item.mechanisms });
    return null;
  });

  const out = [];
  for (const item of items) {
    const key = itemHash(item);
    let result = cache[key];
    if (!result) {
      const runs = (votesByKey[key] || []).sort((a, b) => a.run - b.run);
      const votes = runs.map((x) => x.choice);
      const fooledMechanisms = [];
      for (const x of runs) {
        if (x.choice !== null && x.choice !== x.correctSlot) {
          const oi = x.order[x.choice - 1];
          const m = Array.isArray(x.mechanisms) ? x.mechanisms[oi - 1] : undefined;
          if (m) fooledMechanisms.push(m);
        }
      }
      const pass = votes.length === RUNS && runs.every((x) => x.choice === x.correctSlot);
      result = { pass, votes, fooledMechanisms };
      cache[key] = result;
    }
    out.push({ item, result });
  }
  saveCache(cache);
  return { results: out, usage };
}

/**
 * Build blind-solver batch requests: 5 per item, each a DIFFERENT deterministic
 * shuffle (salt s0..s4) so the 5 solves are independent without temperature.
 * Skips items already in the cache. Returns { requests, meta, cached }.
 */
export function buildSolveRequests(items) {
  const cache = loadCache();
  const requests = [];
  const meta = {};                 // custom_id -> { hash, run, correctSlot, order, mechanisms }
  const cached = {};               // hash -> cached result
  const system = [{ type: 'text', text: SOLVER_SYS, cache_control: { type: 'ephemeral', ttl: '1h' } }];
  for (const item of items) {
    const key = itemHash(item);
    if (cache[key]) { cached[key] = cache[key]; continue; }
    for (let r = 0; r < RUNS; r++) {
      const { options, correctIndex, order } = shuffledOptions(item, `s${r}`);
      const cid = `solve-${key}-r${r}`;
      meta[cid] = { hash: key, run: r, correctSlot: correctIndex + 1, order, mechanisms: item.mechanisms };
      requests.push({
        custom_id: cid,
        params: {
          model: SOLVER_MODEL,
          max_tokens: 8,
          thinking: { type: 'disabled' },
          system,
          messages: [{ role: 'user', content: `Sentence: ${item.stem}\n` + options.map((o, i) => `${i + 1}) ${o}`).join('  ') }],
        },
      });
    }
  }
  return { requests, meta, cached };
}

/**
 * Merge batch results + cached results into per-item { pass, votes, fooledMechanisms }.
 * Persists newly-solved items to the cache. Returns [{ item, result }] in input order.
 */
export function tallySolve(items, resultsMap, meta, cached) {
  const cache = loadCache();
  // Group batch votes by item hash.
  const byHash = {};
  for (const [cid, m] of Object.entries(meta)) {
    const r = resultsMap[cid];
    const choice = r && r.type === 'succeeded' ? parseChoice((r.message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')) : null;
    (byHash[m.hash] ||= []).push({ ...m, choice });
  }
  const out = [];
  for (const item of items) {
    const key = itemHash(item);
    let result = cached[key] || cache[key];
    if (!result) {
      const runs = (byHash[key] || []).sort((a, b) => a.run - b.run);
      const votes = runs.map((x) => x.choice);
      const fooledMechanisms = [];
      for (const x of runs) {
        if (x.choice !== null && x.choice !== x.correctSlot) {
          const origIndex = x.order[x.choice - 1];
          const mech = Array.isArray(x.mechanisms) ? x.mechanisms[origIndex - 1] : undefined;
          if (mech) fooledMechanisms.push(mech);
        }
      }
      const pass = votes.length === RUNS && votes.every((v, i) => v === runs[i].correctSlot);
      result = { pass, votes, fooledMechanisms };
      cache[key] = result;
    }
    out.push({ item, result });
  }
  saveCache(cache);
  return out;
}

/**
 * Solve one item 5x. Returns
 * { pass, correctSlot, votes:[1-4|null], fooledMechanisms:[Rcode...] }.
 * fooledMechanisms lists the mechanism of each distractor a solver wrongly chose.
 */
export async function solveItem(item) {
  const { options, correctIndex, order } = shuffledOptions(item);
  const correctSlot = correctIndex + 1;
  const prompt = buildPrompt(item.stem, options);

  // The 5 runs are independent — fire them concurrently.
  const texts = await Promise.all(
    Array.from({ length: RUNS }, () =>
      callClaude({
        model: SOLVER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8,
        temperature: 1.0,
        thinking: { type: 'disabled' },
      })
    )
  );
  const votes = texts.map(parseChoice);
  const fooledMechanisms = [];
  for (const choice of votes) {
    if (choice !== null && choice !== correctSlot) {
      const origIndex = order[choice - 1]; // 1..3 -> distractors[origIndex-1]
      const mech = Array.isArray(item.mechanisms) ? item.mechanisms[origIndex - 1] : undefined;
      if (mech) fooledMechanisms.push(mech);
    }
  }
  const pass = votes.length === RUNS && votes.every((v) => v === correctSlot);
  return { pass, correctSlot, votes, fooledMechanisms };
}

/**
 * Solve a list of items with a small concurrency pool, using and updating the
 * on-disk cache. Cache is written once at the end (solveAll is called once per
 * round; a mid-run crash just re-solves that batch — cheap). Returns
 * [{ item, result }] in the same order as `items`.
 */
export async function solveAll(items, { concurrency = 6 } = {}) {
  const cache = loadCache();
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      const item = items[i];
      const key = itemHash(item);
      let result = cache[key];
      if (!result) {
        result = await solveItem(item);
        cache[key] = result;
      }
      results[i] = { item, result };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  saveCache(cache);
  return results;
}
