/**
 * scripts/rephrase-gen/selftest.mjs
 *
 * Pre-flight: prove the gates work on known-good items before trusting them on
 * new ones.
 *   1. Gate A on the golden CAL batches (L2 diff 2, L5 diff 5) → expect NONE.
 *   2. Gate B smoke: solve one golden item 5x → expect a 5/5 pass.
 */

import { getLevelItems } from './db.mjs';
import { runScanner } from './gate-a.mjs';
import { solveItem } from './solve.mjs';

console.log('── Gate A self-test on golden batches ──');
for (const [level, diff] of [['L2', 2], ['L5', 5]]) {
  const items = await getLevelItems(diff);
  const res = runScanner(items, level, 'selftest');
  console.log(`${level}: ${items.length} golden items → ${res.divergingLine} (exit ${res.code})`);
}

console.log('\n── Gate B smoke test (one golden L2 item, 5 blind-solver calls) ──');
const l2 = await getLevelItems(2);
const item = l2[0];
console.log(`stem: ${item.stem}`);
const result = await solveItem(item);
console.log(`correct slot: ${result.correctSlot} | votes: ${JSON.stringify(result.votes)} | pass: ${result.pass}`);
if (result.fooledMechanisms.length) console.log(`fooled by: ${result.fooledMechanisms.join(', ')}`);
