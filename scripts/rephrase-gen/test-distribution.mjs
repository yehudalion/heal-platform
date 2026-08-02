/**
 * Cheap validation: generate N items with the current control and measure, per
 * answer-predicting feature, how often the CORRECT answer holds the unique
 * max/min — compared to the real NITE rate. If the generator now balances the
 * options, GEN rates sit near real (|Δ|<28) instead of ~80-90%.
 */
import { RECIPES } from './recipes.mjs';
import { generateSync } from './generate.mjs';
import { getLevelGoldens } from './db.mjs';
import { accFromItems, loadTruthRates, NUMF } from './features.mjs';
import { costUSD } from './lib.mjs';

const level = process.argv[2] || 'L2';
const N = Number(process.argv[3] || 40);
const recipe = RECIPES[level];
const goldens = await getLevelGoldens(recipe.difficulty);
const real = loadTruthRates(level);

console.log(`Generating ${N} ${level} items with STRUCTURAL_PARITY…`);
const { items, usage } = await generateSync(recipe, { count: N, round: 1, goldens, concurrency: 25 });
console.log(`Got ${items.length} valid items. $${costUSD({ input: usage.input, cache_read: usage.cache_read, cache_write: usage.cache_write, output: usage.output }).toFixed(2)}\n`);

const acc = accFromItems(items);
const KEY = ['word_count', 'commas', 'special_punct', 'stem_overlap', 'stem_run', 'consensus_overlap', 'novel_content', 'avg_word_len'];
console.log('feature            GEN max%(n)   real max%   Δmax    GEN min%(n)   real min%   Δmin   flag');
for (const f of KEY) {
  const a = acc[f], r = real[f];
  const gMax = a.tm ? (100 * a.hm) / a.tm : 0, gMin = a.tn ? (100 * a.hn) / a.tn : 0;
  const dMax = Math.abs(gMax - r.maxRate), dMin = Math.abs(gMin - r.minRate);
  const flag = ((a.tm >= 4 && r.maxN >= 8 && dMax >= 28) || (a.tn >= 4 && r.minN >= 8 && dMin >= 28)) ? '  <-- DIVERGES' : '';
  console.log(`${f.padEnd(18)} ${gMax.toFixed(0).padStart(3)}%(${String(a.tm).padStart(2)})     ${r.maxRate.toFixed(0).padStart(3)}%     ${dMax.toFixed(0).padStart(3)}    ${gMin.toFixed(0).padStart(3)}%(${String(a.tn).padStart(2)})     ${r.minRate.toFixed(0).padStart(3)}%     ${dMin.toFixed(0).padStart(3)}${flag}`);
}
