/**
 * src/lib/keys.js
 *
 * Trigger-category model for the Rephrase module — a SOLVING STRATEGY (where to
 * look in the sentence), not a taxonomy of error types. Pure logic: no side
 * effects, no imports from screens/ or data/.
 *
 * Source of truth: the DB columns trigger_category_1/2/3 (+ trigger_word_1/2/3)
 * on restatement_questions. This file maps category ids → student-facing labels
 * and provides an R-code fallback for slots without an explicit DB category.
 *
 * THREE things a future reader must NOT "fix":
 * (a) Composite mechanism codes are CONCATENATED with NO separator in the DB
 *     ('R1R7', 'R9R2', 'R6R7') — they are NOT comma-separated. Parse with
 *     /R\d+/g and NEVER split on ','; a comma split silently misses every
 *     composite (this replaced a live bug that did exactly that).
 * (b) 'anchor' is merged into 'unstated' for DISPLAY (~12 of 1272 slots — too
 *     rare to teach as its own concept). The merge lives in ONE place
 *     (DISPLAY_MERGE) so it can be undone by editing a single line.
 * (c) R2 / R5 / R7 alone are UNRESOLVABLE from the code — R2 (causal|logical),
 *     R7 (anchor|unstated), R5 (omission: logical|measure|anchor). We return
 *     null and show NO label rather than guess: a wrong label teaches a wrong
 *     technique, which is worse than no label.
 */

// The four student-facing display categories.
const CATEGORY_DEFS = {
  causal:   { id: 'causal',   label: 'כיוון סיבתי',   cue: 'מי גרם למי — בדוק שהכיוון לא התהפך' },
  logical:  { id: 'logical',  label: 'יחס לוגי',      cue: 'מילת הקישור, הזמן או הניגוד — בדוק שסוג הקשר נשמר' },
  measure:  { id: 'measure',  label: 'מידה',          cue: 'כמה / כמה חזק — בדוק שהמידה לא הוקצנה, הוחלשה או נמחקה' },
  unstated: { id: 'unstated', label: 'לא נאמר במקור', cue: 'כל פרט, שם או פעולה — בדוק שהם נתמכים במשפט המקורי' },
};

// DISPLAY-only merge: the DB stores 5 category ids, the UI shows 4. Edit (or
// remove) this single line to give 'anchor' its own label back.
const DISPLAY_MERGE = { anchor: 'unstated' };

// R-code → category fallback, used ONLY when a slot has no explicit DB category.
// Certain codes map to exactly one category. R2/R5/R7 are intentionally absent
// (unresolvable — see header note (c)).
const MECHANISM_FALLBACK = {
  R1: 'measure',
  R6: 'measure',
  R9: 'logical',
  R3: 'unstated',
};

/** The four display categories — for the future Learn and Analyze screens. */
export const CATEGORIES = Object.values(CATEGORY_DEFS);

/**
 * A DB category id → { id, label, cue } with the anchor→unstated merge applied.
 * Unknown / null / non-string → null. Never throws.
 */
export function triggerForCategory(categoryId) {
  if (!categoryId || typeof categoryId !== 'string') return null;
  const merged = DISPLAY_MERGE[categoryId] || categoryId;
  const def = CATEGORY_DEFS[merged];
  return def ? { ...def } : null;
}

/** Extract R-codes from a mechanism value. Composites are concatenated with NO
 *  separator ('R1R7') — parse with a regex, never split on ','. */
function parseCodes(rCode) {
  if (!rCode || typeof rCode !== 'string') return [];
  return rCode.toUpperCase().match(/R\d+/g) || [];
}

/**
 * Resolve a mechanism value via the R-code fallback: scan the extracted codes
 * in order, return the FIRST CERTAIN one; null if none is certain (or input is
 * null/garbage). Never throws. e.g. 'R1R7' → measure (via R1); 'R7R5' → null.
 */
export function triggerFromMechanism(rCode) {
  for (const code of parseCodes(rCode)) {
    const cat = MECHANISM_FALLBACK[code];
    if (cat) return triggerForCategory(cat);
  }
  return null;
}

/**
 * The single entry point screens should call. Prefers the explicit DB category;
 * falls back to the R-code; returns null if neither resolves.
 * @param {{ category?: string|null, mechanism?: string|null }} slot
 * @returns {{ id: string, label: string, cue: string }|null}
 */
export function resolveTrigger({ category = null, mechanism = null } = {}) {
  return triggerForCategory(category) || triggerFromMechanism(mechanism) || null;
}

// DEPRECATED — old 5-key model. Kept only so rephrase.data.js's aggregateWeakestKeys
// doesn't break at import time. aggregateWeakestKeys is currently dead code (no screen
// calls it — Analyze/T044 isn't built). Do NOT extend or fix this function further.
// Remove this shim when T044 rewrites aggregateWeakestKeys against trigger_category_n.
const MECHANISM_TO_KEY = {
  R2: { key: 'כיוון', code: 'direction_flip' },
  R1: { key: 'עוצמה', code: 'extremism' },
  R3: { key: 'היקף', code: 'scope_change' },
  R9: { key: 'היקף', code: 'scope_change' },
  R6: { key: 'אחיזה', code: 'subject_swap' },
  R7: { key: 'דמיון', code: 'hallucination' },
  R5: { key: 'דמיון', code: 'hallucination' },
};
const KEY_FALLBACK = { key: 'כללי', code: 'unknown' };
export function keyForMechanism(rCode) {
  if (!rCode || typeof rCode !== 'string') return { ...KEY_FALLBACK };
  const first = rCode.split(',')[0].trim().toUpperCase();
  return { ...(MECHANISM_TO_KEY[first] || KEY_FALLBACK) };
}
