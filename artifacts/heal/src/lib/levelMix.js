/**
 * src/lib/levelMix.js
 *
 * Difficulty MIXING and drift. Pure logic: no I/O, no imports, no side effects.
 *
 * ── Why this file exists (Lion, 2026-08-29) ──────────────────────────────────
 * The old model pinned a learner to ONE difficulty level: a pack was fetched at
 * `level`, and level jumped ±1 whole step. Lion's correction:
 *
 *   "a student shouldn't be practising only one level at a time — what should
 *    progress is the AVERAGE of what he's learning."
 *
 * So the learner's state is no longer an integer level but a numeric CENTER
 * (e.g. 3.4). Every pack draws a MIX of levels around that center, and the
 * center drifts in small fractional steps rather than jumping whole levels.
 *
 * ⚠️ The center is INTERNAL. Lion, same conversation: "I don't want the student
 * to know the level of the question in front of him." Nothing in this file is
 * meant to be rendered — no label, no number, no chip. If you find yourself
 * printing a value from here into the DOM, that is the bug.
 *
 * Two exported functions, both pure and both unit-testable:
 *   levelMix(center, opts)  → [{ level, count }] summing to packSize
 *   driftCenter(center, accuracy, opts) → new center
 */

// Triangular kernel half-width, in levels. A pack therefore spans at most the
// center level ±1. Wider than this and an early learner meets level-5 items in
// their first session; narrower and it collapses back to a single level.
const HALF_WIDTH = 1.5

/**
 * Turn a numeric center into a concrete mix of levels for one pack.
 *
 * Weight for a level is a triangular kernel around the center:
 *   w(l) = max(0, 1 - |l - center| / HALF_WIDTH)
 * Counts are allocated by largest remainder, so they always sum to exactly
 * packSize with no drift from rounding.
 *
 * Worked examples (packSize 10, min 2, max 5):
 *   center 3.0  → 2×level2, 6×level3, 2×level4   (a clear middle, real spread)
 *   center 3.5  → 5×level3, 5×level4             (an even straddle)
 *   center 2.0  → 8×level2, 2×level3             (clamped at the floor)
 *
 * @param {number} center
 * @param {{min:number, max:number, packSize:number}} opts
 * @returns {Array<{level:number, count:number}>} never empty; counts sum to packSize
 */
export function levelMix(center, { min, max, packSize } = {}) {
  const lo = Number.isFinite(min) ? min : 1
  const hi = Number.isFinite(max) ? max : 8
  const size = Math.max(1, Math.floor(packSize) || 1)
  const c = clamp(Number(center), lo, hi)

  const mid = Math.round(c)
  const candidates = []
  for (let l = mid - 1; l <= mid + 1; l++) {
    if (l < lo || l > hi) continue
    const w = 1 - Math.abs(l - c) / HALF_WIDTH
    if (w > 0) candidates.push({ level: l, weight: w })
  }
  // Degenerate guard: a center sitting exactly on a clamped edge can zero out
  // every neighbour. Fall back to the nearest legal level rather than returning [].
  if (!candidates.length) return [{ level: clamp(mid, lo, hi), count: size }]

  const total = candidates.reduce((s, x) => s + x.weight, 0)
  const exact = candidates.map((x) => ({ ...x, want: (x.weight / total) * size }))

  const out = exact.map((x) => ({ level: x.level, count: Math.floor(x.want), rem: x.want % 1 }))
  let left = size - out.reduce((s, x) => s + x.count, 0)
  out.sort((a, b) => b.rem - a.rem)
  for (let i = 0; left > 0; i = (i + 1) % out.length, left--) out[i].count += 1

  return out
    .filter((x) => x.count > 0)
    .map(({ level, count }) => ({ level, count }))
    .sort((a, b) => a.level - b.level)
}

/**
 * Move the center after a window of answers.
 *
 * Fractional on purpose: the center is an average, so it should slide, not jump.
 * At STEP 0.25 a learner needs four consecutive strong windows to gain a whole
 * level — which is roughly the pace the old ±1 rule produced, minus the cliff.
 *
 * Deliberately asymmetric: down-steps are gentler than up-steps (0.6×). A bad
 * session is usually noise — tiredness, a hard topic — while a good run is
 * evidence. This also serves the wellbeing rule: the floor should never fall out
 * from under someone after one rough evening.
 *
 * @param {number} center current center
 * @param {number} accuracy 0..1 over the rolling window
 * @param {{min:number, max:number, step?:number, up?:number, down?:number}} opts
 * @returns {number} new center, clamped and rounded to 2dp
 */
export function driftCenter(center, accuracy, { min, max, step = 0.25, up = 0.8, down = 0.4 } = {}) {
  const lo = Number.isFinite(min) ? min : 1
  const hi = Number.isFinite(max) ? max : 8
  const c = clamp(Number(center), lo, hi)
  if (!Number.isFinite(accuracy)) return c

  let next = c
  if (accuracy >= up) next = c + step
  else if (accuracy <= down) next = c - step * 0.6

  return Math.round(clamp(next, lo, hi) * 100) / 100
}

/**
 * Did the learner cross into a new difficulty BAND between two centers?
 *
 * The center drifts in 0.25 steps, so it must not announce anything on every
 * nudge. A band is the rounded center: 2.90 → 3.15 stays band 3 and says
 * nothing; 3.40 → 3.65 crosses into band 4 and is worth announcing. At the
 * default step that lands roughly every four strong windows — earned, not spam.
 *
 * ⚠️ Scope of what may be announced (Lion, 2026-08-29): telling the learner they
 * moved up, BETWEEN packs or at the end of a session, is fine and welcome. What
 * must never appear is the difficulty of the question in front of them — and,
 * since a pack is now a MIX, any claim that "the next pack is at level N" is
 * simply false. Announce the move; never print the number.
 *
 * @param {number} prev center before
 * @param {number} next center after
 * @returns {'up'|'down'|null}
 */
export function levelBandChange(prev, next) {
  const a = Number(prev)
  const b = Number(next)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  const from = Math.round(a)
  const to = Math.round(b)
  if (to > from) return 'up'
  if (to < from) return 'down'
  return null
}

function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}
