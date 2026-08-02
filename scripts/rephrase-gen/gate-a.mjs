/**
 * scripts/rephrase-gen/gate-a.mjs
 *
 * Gate A wrapper: writes a batch to the scanner's JSON format and runs
 * scripts/qa_scan_v4.py from the repo root (its TRUTH path is repo-root-relative).
 * Exit 0 = PASS (DIVERGING FEATURES: NONE), 2 = structural failure, 3 = divergence.
 */

import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ROOT, OUT_DIR } from './lib.mjs';

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const PY = process.env.PYTHON || 'python';

/** Map items to the scanner's expected JSON objects. */
export function toScannerJson(items) {
  return items.map((it) => ({
    stem: it.stem,
    correct: it.correct,
    distractors: it.distractors,
    mechanisms: it.mechanisms || ['R7', 'R7', 'R7'],
    proximities: it.proximities || ['P2', 'P2', 'P2'],
  }));
}

/**
 * Run the scanner on `items` at the given level.
 * Returns { code, stdout, divergingLine, structuralItems:[1-based nums] }.
 */
export function runScanner(items, level, tag = 'batch') {
  const jsonPath = resolve(OUT_DIR, `scan-${level}-${tag}.json`);
  writeFileSync(jsonPath, JSON.stringify(toScannerJson(items), null, 2));

  const res = spawnSync(
    PY,
    ['scripts/qa_scan_v4.py', jsonPath, '--level', level],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const stdout = (res.stdout || '') + (res.stderr || '');

  const divLine =
    (stdout.match(/DIVERGING FEATURES:.*/) || [''])[0].trim() || '(no divergence line)';

  const structuralItems = new Set();
  for (const m of stdout.matchAll(/item (\d+):/g)) {
    structuralItems.add(Number(m[1]));
  }

  return {
    code: res.status,
    stdout,
    divergingLine: divLine,
    structuralItems: [...structuralItems],
  };
}
