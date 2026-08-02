/**
 * scripts/rephrase-gen/features.mjs
 *
 * Faithful JS port of the answer-predicting numeric features in
 * scripts/qa_scan_v4.py, used for IN-PROCESS admission control so the
 * accumulated accepted set (CAL seeds + new GEN items) stays inside the real
 * NITE distribution. The Python scanner remains the final authority; this is a
 * fast, scanner-faithful oracle for steering acceptance during the loop.
 *
 * The scanner flags a feature's max (or min) when: batch n>=4, real n>=8, and
 * |batchRate - realRate| >= 28. Our correct answer is always option index 0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ROOT } from './lib.mjs';

/** Minimal RFC-4180 CSV parser (handles quoted fields, "" escapes, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const set = (s) => new Set(s.split(' '));
const ABS = set('all every never always only none entire entirely complete completely impossible certainly must exclusively sole solely');
const HEDGE = set('may might can could some often usually generally likely tend tends almost nearly most many sometimes perhaps');
const NEG = set("not never no nothing none cannot n't without");
const ER_STOP = set('other another after over under never ever water matter together whether rather former latter order however moreover per number');
const CMP = set('more most less least better best worse worst faster slower greater');

const stripEnds = (w) => w.replace(/^[.,;:"'()]+/, '').replace(/[.,;:"'()]+$/, '');
const nrm = (s) => s.split(/\s+/).map((w) => stripEnds(w.toLowerCase())).filter((x) => x.length);
const alpha = (s) => s.match(/[A-Za-z][A-Za-z'-]*/g) || [];
const content = (s) => new Set(alpha(s).map((w) => w.toLowerCase()).filter((w) => w.length >= 4));

function lcr(a, b) {
  const A = nrm(a), B = nrm(b);
  let best = 0;
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < B.length; j++) {
      let k = 0;
      while (i + k < A.length && j + k < B.length && A[i + k] === B[j + k]) k++;
      if (k > best) best = k;
    }
  return best;
}
function opening(a, b) {
  const A = nrm(a), B = nrm(b);
  let n = 0;
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    if (A[i] === B[i]) n++;
    else break;
  }
  return n;
}
function pnSet(s) {
  const out = new Set();
  const t = s.split(/\s+/);
  for (let i = 0; i < t.length; i++) {
    const w = t[i].replace(/[^A-Za-z'-]/g, '');
    if (w && i > 0 && /[A-Z]/.test(w[0])) out.add(w.toLowerCase());
  }
  return out;
}
const cin = (s, v) => nrm(s).filter((w) => v.has(w)).length;
const inter = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
function comparatives(s) {
  let c = cin(s, CMP);
  for (const t of nrm(s)) {
    if (ER_STOP.has(t)) continue;
    if ((t.endsWith('est') && t.length > 4) || (t.endsWith('er') && t.length > 5)) c++;
  }
  return c;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const NUMF = [
  'word_count', 'commas', 'absolutes', 'hedges', 'negations', 'proper_nouns',
  'stem_overlap', 'stem_run', 'stem_opening', 'consensus_overlap', 'novel_content',
  'avg_word_len', 'comparatives', 'special_punct',
];

/** Feature vectors (length-4, one per option) for a (stem, opts) pair. */
function numf(stem, opts) {
  const sc = content(stem);
  const oc = opts.map(content);
  const f = {};
  f.word_count = opts.map((o) => o.split(/\s+/).filter(Boolean).length);
  f.commas = opts.map((o) => (o.match(/,/g) || []).length);
  f.absolutes = opts.map((o) => cin(o, ABS));
  f.hedges = opts.map((o) => cin(o, HEDGE));
  f.negations = opts.map((o) => cin(o, NEG));
  f.proper_nouns = opts.map((o) => pnSet(o).size);
  f.stem_overlap = oc.map((c) => inter(c, sc));
  f.stem_run = opts.map((o) => lcr(stem, o));
  f.stem_opening = opts.map((o) => opening(stem, o));
  f.consensus_overlap = opts.map((_, i) =>
    mean(opts.map((__, j) => (j === i ? null : inter(oc[i], oc[j]))).filter((x) => x !== null))
  );
  f.novel_content = oc.map((c) => { let n = 0; for (const x of c) if (!sc.has(x)) n++; return n; });
  f.avg_word_len = opts.map((o) => { const a = alpha(o); return a.length ? mean(a.map((w) => w.length)) : 0; });
  f.comparatives = opts.map((o) => comparatives(o));
  f.special_punct = opts.map((o) => (o.match(/[–—"();:]/g) || []).length);
  return f;
}

/** Per-item, per-feature: does option 0 (correct) uniquely hold max / min? */
export function itemExtremes(item) {
  const opts = [item.correct, ...item.distractors];
  const f = numf(item.stem, opts);
  const ex = {};
  for (const feat of NUMF) {
    const v = f[feat];
    const mx = Math.max(...v), mn = Math.min(...v);
    const maxUnique = v.filter((x) => x === mx).length === 1;
    const minUnique = v.filter((x) => x === mn).length === 1;
    ex[feat] = {
      maxUnique,
      maxIsCorrect: maxUnique && v.indexOf(mx) === 0,
      minUnique,
      minIsCorrect: minUnique && v.indexOf(mn) === 0,
    };
  }
  return ex;
}

/** Accumulator: per feature {tm,hm,tn,hn} (t=denominator, h=correct-holds count). */
export function newAcc() {
  const acc = {};
  for (const feat of NUMF) acc[feat] = { tm: 0, hm: 0, tn: 0, hn: 0 };
  return acc;
}
export function addToAcc(acc, item) {
  const ex = itemExtremes(item);
  for (const feat of NUMF) {
    const e = ex[feat];
    if (e.maxUnique) { acc[feat].tm++; if (e.maxIsCorrect) acc[feat].hm++; }
    if (e.minUnique) { acc[feat].tn++; if (e.minIsCorrect) acc[feat].hn++; }
  }
}
export function removeFromAcc(acc, item) {
  const ex = itemExtremes(item);
  for (const feat of NUMF) {
    const e = ex[feat];
    if (e.maxUnique) { acc[feat].tm--; if (e.maxIsCorrect) acc[feat].hm--; }
    if (e.minUnique) { acc[feat].tn--; if (e.minIsCorrect) acc[feat].hn--; }
  }
}
export function cloneAcc(acc) {
  const c = {};
  for (const feat of NUMF) c[feat] = { ...acc[feat] };
  return c;
}
export function accFromItems(items) {
  const acc = newAcc();
  for (const it of items) addToAcc(acc, it);
  return acc;
}

// ─── Real (truth-corpus) baseline rates per level ───────────────────────────
const LEVEL_POS = { L2: 9, L3: 10, L4: 11, L5: 12 };

export function loadTruthRates(level) {
  const csv = readFileSync(resolve(ROOT, 'docs/truth_corpus/truth_items_full.csv'), 'utf8');
  const rows = parseCsv(csv);
  const pos = LEVEL_POS[level];
  const acc = newAcc();
  for (const r of rows) {
    if (Number(r.position) !== pos) continue;
    const key = Number(r.official_key) - 1;
    const opts = [r.opt1, r.opt2, r.opt3, r.opt4];
    // Reorder so the correct answer is index 0 (matches our item shape).
    const item = {
      stem: r.stem,
      correct: opts[key],
      distractors: opts.filter((_, i) => i !== key),
    };
    addToAcc(acc, item);
  }
  const rates = {};
  for (const feat of NUMF) {
    const a = acc[feat];
    rates[feat] = {
      maxRate: a.tm ? (100 * a.hm) / a.tm : 0, maxN: a.tm,
      minRate: a.tn ? (100 * a.hn) / a.tn : 0, minN: a.tn,
    };
  }
  return rates;
}

/** Divergences of an accumulator vs the real baseline (scanner thresholds). */
export function divergences(acc, real) {
  const out = [];
  for (const feat of NUMF) {
    const a = acc[feat];
    const r = real[feat];
    if (a.tm >= 4 && r.maxN >= 8) {
      const bmx = (100 * a.hm) / a.tm;
      const d = Math.abs(bmx - r.maxRate);
      if (d >= 28) out.push({ feat, kind: 'max', delta: d });
    }
    if (a.tn >= 4 && r.minN >= 8) {
      const bmn = (100 * a.hn) / a.tn;
      const d = Math.abs(bmn - r.minRate);
      if (d >= 28) out.push({ feat, kind: 'min', delta: d });
    }
  }
  return out;
}
const badness = (divs) => ({ count: divs.length, sum: divs.reduce((s, d) => s + d.delta, 0) });
/** Scalar badness — prioritise reducing the number of diverging features. */
export function badnessScore(acc, real) {
  const divs = divergences(acc, real);
  return divs.length * 1000 + divs.reduce((s, d) => s + d.delta, 0);
}

/**
 * Admission test: would adding `item` keep the accumulated distribution no worse?
 * Returns true if the post-add divergence badness is <= current badness.
 */
export function admits(acc, item, real) {
  const before = badness(divergences(acc, real));
  const tent = cloneAcc(acc);
  addToAcc(tent, item);
  const after = badness(divergences(tent, real));
  if (after.count !== before.count) return after.count < before.count;
  return after.sum <= before.sum + 1e-9;
}
