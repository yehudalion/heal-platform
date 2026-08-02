/**
 * Validate the JS feature port (features.mjs) against the Python scanner:
 * building the accumulator from the golden CAL batches must reproduce the same
 * divergences the Python scanner reported (L2 stem_overlap/max, L5 consensus_overlap/max).
 */
import { getLevelItems } from './db.mjs';
import { newAcc, addToAcc, loadTruthRates, divergences } from './features.mjs';

for (const [level, diff] of [['L2', 2], ['L5', 5]]) {
  const items = await getLevelItems(diff);
  const acc = newAcc();
  for (const it of items) addToAcc(acc, it);
  const real = loadTruthRates(level);
  const divs = divergences(acc, real);
  console.log(`${level} (${items.length} golden): divergences = ${JSON.stringify(divs)}`);
  // show a few real rates for sanity
  console.log(`   real stem_overlap max=${real.stem_overlap.maxRate.toFixed(0)}% (n=${real.stem_overlap.maxN}), consensus_overlap max=${real.consensus_overlap.maxRate.toFixed(0)}% (n=${real.consensus_overlap.maxN})`);
}
