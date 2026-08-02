/**
 * scripts/rephrase-gen/finalize.mjs
 *
 * After the GEN-V4-Lx.sql has been applied, rebuild the FULL-level scanner input
 * from the DB (existing CAL + new GEN rows) and run Gate A on it — larger n than
 * any single 15-item batch, so this is the authoritative divergence line for the
 * per-level report.  Usage: node scripts/rephrase-gen/finalize.mjs L2
 */

import { RECIPES } from './recipes.mjs';
import { getLevelItems } from './db.mjs';
import { runScanner } from './gate-a.mjs';

const level = process.argv[2];
if (!RECIPES[level]) {
  console.error('Usage: node finalize.mjs <L2|L3|L4|L5>');
  process.exit(1);
}

const items = await getLevelItems(RECIPES[level].difficulty);
console.log(`Full-level scan for ${level}: ${items.length} rows (CAL + GEN).`);
const res = runScanner(items, level, 'full');
console.log(res.stdout);
console.log(`\nFINAL DIVERGENCE LINE: ${res.divergingLine}`);
process.exit(res.code === 0 ? 0 : res.code || 1);
