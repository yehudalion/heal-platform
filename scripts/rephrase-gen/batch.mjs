/**
 * scripts/rephrase-gen/batch.mjs
 *
 * Anthropic Message Batches transport (GA — no beta header). Submit a JSONL
 * batch of Messages requests, poll until ended, retrieve results, reconcile by
 * custom_id. Batches are ~50% cheaper than synchronous calls and stack with
 * prompt caching. Batch does NOT auto-retry failed entries — the caller keeps a
 * custom_id → item map and resubmits failures.
 */

import { loadEnv } from './lib.mjs';

const ENV = loadEnv();
const KEY = ENV.ANTHROPIC_API_KEY;
const BASE = 'https://api.anthropic.com/v1/messages/batches';
const HEADERS = { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(url, opts = {}, maxRetries = 5) {
  let attempt = 0;
  for (;;) {
    let res;
    try {
      res = await fetch(url, { headers: HEADERS, ...opts });
    } catch (err) {
      if (attempt++ >= maxRetries) throw err;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const ra = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** (attempt + 1));
      attempt++;
      continue;
    }
    throw new Error(`Batch API ${res.status}: ${await res.text()}`);
  }
}

/** Create a batch. requests = [{ custom_id, params }]. Returns the batch object. */
export async function submitBatch(requests) {
  const res = await req(BASE, { method: 'POST', body: JSON.stringify({ requests }) });
  return res.json();
}

/** Poll a batch until processing_status === 'ended'. Returns the batch object. */
export async function pollBatch(id, { intervalMs = 15000, onTick } = {}) {
  for (;;) {
    const res = await req(`${BASE}/${id}`);
    const b = await res.json();
    if (onTick) onTick(b);
    if (b.processing_status === 'ended') return b;
    await sleep(intervalMs);
  }
}

/** Retrieve results as a map custom_id → result object ({type, message?, error?}). */
export async function retrieveResults(batch) {
  const url = batch.results_url || `${BASE}/${batch.id}/results`;
  const res = await req(url);
  const text = await res.text();
  const map = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const obj = JSON.parse(t);
    map[obj.custom_id] = obj.result;
  }
  return map;
}

/** Submit → poll → retrieve in one call. */
export async function runBatch(requests, opts = {}) {
  const batch = await submitBatch(requests);
  const done = await pollBatch(batch.id, opts);
  const results = await retrieveResults(done);
  return { batch: done, results };
}

// ─── Cost accounting (Opus 4.8; batch = 50% off base input/output) ──────────
const OPUS_IN = 5, OPUS_OUT = 25; // $ per 1M tokens (base)
const BATCH = 0.5, CACHE_READ = 0.1, CACHE_WRITE = 1.25;

/** Sum usage across a results map and estimate $ at Opus 4.8 batch rates. */
export function costOf(resultsMap) {
  const tok = { input: 0, cache_read: 0, cache_write: 0, output: 0 };
  let ok = 0, errored = 0;
  for (const r of Object.values(resultsMap)) {
    if (r.type !== 'succeeded') { errored++; continue; }
    ok++;
    const u = r.message.usage || {};
    tok.input += u.input_tokens || 0;
    tok.cache_read += u.cache_read_input_tokens || 0;
    tok.cache_write += u.cache_creation_input_tokens || 0;
    tok.output += u.output_tokens || 0;
  }
  const inRate = OPUS_IN * BATCH; // $/1M
  const outRate = OPUS_OUT * BATCH;
  const dollars =
    (tok.input * inRate +
      tok.cache_read * inRate * CACHE_READ +
      tok.cache_write * inRate * CACHE_WRITE +
      tok.output * outRate) /
    1e6;
  return { tok, ok, errored, dollars, rates: { inRate, outRate } };
}
