/**
 * src/lib/keys.js
 *
 * The Rephrase module's LABEL VOCABULARY — a solving strategy (where to look in
 * the sentence), not a taxonomy of error types. Pure logic: no side effects, no
 * imports from screens/ or data/.
 *
 * ONE vocabulary, FIVE labels, identical in all three layers (SITEMAP §2). The
 * same five are the block titles in rephrase-learn.js — change a label here and
 * you must change it there, or Learn and Practice start teaching different words
 * for the same thing.
 *
 * Source of truth in the DB: trigger_category_1/2/3 (+ trigger_word_1/2/3) and
 * mechanism_1/2/3 on restatement_questions. This file maps the RAW tagging to
 * the student-facing label. Retagging content is never needed to change a label
 * — that is exactly what the double-tagging rule (SITEMAP §2) buys us.
 *
 * FOUR things a future reader must NOT "fix":
 *
 * (a) Composite mechanism codes are CONCATENATED with NO separator in the DB
 *     ('R1R7', 'R9R2', 'R6R7') — they are NOT comma-separated. Parse with
 *     /R\d+/g and NEVER split on ','; a comma split silently misses every
 *     composite (this replaced a live bug that did exactly that).
 *
 * (b) The DB category 'unstated' maps to the label "פעולה קרובה אך שונה", NOT to
 *     "מידע שלא נאמר". This looks backwards and is deliberate. Measured
 *     2026-08-05 over all 1272 slots: every single one of the 448 slots tagged
 *     'unstated' is mechanism R7 (a swapped-for-a-near-one action), and ZERO are
 *     R3. The R3 slots — the ones that really do add unsaid information — carry
 *     no category at all and reach their label through the mechanism fallback.
 *     The DB column name is legacy; the mechanism is the truth.
 *
 * (c) 'causal' and 'logical' both map to ONE label, "כיוון היחס". They are two
 *     flavours of the same student move (find the two halves, check the
 *     direction survived). The DB keeps them apart for generation; the student
 *     never sees the split.
 *
 * (d) 'anchor' stays its OWN label even though it is only 12 slots in the whole
 *     pool (Lion, 2026-08-05). It is not folded into anything.
 *
 * Every mechanism code in the corpus (R1 R2 R3 R5 R6 R7 R9) resolves to exactly
 * one label, so unlike the previous model there is no "unresolvable" case and no
 * slot is left without a label.
 */

// The five student-facing labels. `cue` is the one-line check shown in the hint
// box and in practice feedback. Wording is Lion-approved — do not reword here
// without changing rephrase-learn.js in the same commit.
//
// `avoid` (added 1.9.2026) is the short how-to-avoid guide that opens inside a
// mistake type on the Analyze screen. Two steps, in the order to do them. It
// lives here and not in the screen so that every surface naming a key can also
// explain it, without a second copy drifting out of sync.
const KEY_DEFS = {
  direction: {
    id: 'direction',
    label: 'כיוון היחס',
    cue: 'זהה את שני החלקים, הבן את הכיוון, ודא שהתשובה שומרת עליהם — באותו כיוון',
    avoid: [
      'מצאו את שני החלקים של המשפט ואת המילה שמחברת ביניהם (but, because, although).',
      'בדקו שבתשובה החיבור נשאר באותו כיוון — שהסיבה לא הפכה לתוצאה, ושהניגוד לא נעלם.',
    ],
  },
  ratio: {
    id: 'ratio',
    label: 'יחס',
    cue: 'לא הכיוון, המידה — גם החלשה היא שגיאה, לא רק הגזמה',
    avoid: [
      'שימו לב למילים שמודדות כמות או עוצמה: most, some, rarely, always, slightly.',
      'השוו אותן למקור. גם החלשה היא שינוי — ״רוב״ שהפך ל״חלק״ שגוי בדיוק כמו ״תמיד״.',
    ],
  },
  anchor: {
    id: 'anchor',
    // שם המפתח שונה מ"עוגן" ל"ישות קבועה" (ליאון, 1.9.2026): "עוגן" הוא
    // מונח פנימי שלא אומר לתלמיד כלום. ה-id נשאר anchor כי הוא מפתח נתונים.
    label: 'ישות קבועה',
    cue: 'שם, מספר או תאריך שהמבחן לא יכול לשנות — השאלה היא מה נטען עליו',
    avoid: [
      'סמנו את הפרטים שאי אפשר לשנות: שמות, מספרים, תאריכים ומקומות.',
      'ודאו שכל אחד נשאר צמוד לאותו דבר כמו במקור. אותו מספר במקום אחר הוא שינוי משמעות.',
    ],
  },
  added: {
    id: 'added',
    label: 'מידע שלא נאמר',
    cue: 'כל פרט, שם או פעולה — בדוק שהם נתמכים במשפט המקורי',
    avoid: [
      'קראו את התשובה וחפשו פרט שלא הופיע במקור — סיבה, מסקנה, שם או פעולה נוספת.',
      'אם פרט נשמע סביר אבל לא נאמר במפורש, הוא לא שייך לשם. סביר אינו זהה לנאמר.',
    ],
  },
  nearmiss: {
    id: 'nearmiss',
    label: 'פעולה קרובה אך שונה',
    cue: 'הפעולה נשמעת כמו במקור — בדוק שהיא אותה פעולה, לא רק שכנה שלה',
    avoid: [
      'זהו את הפועל המרכזי במקור, ואת הפועל שבתשובה.',
      'בדקו אם זו באמת אותה פעולה. suggested ו-proved שכנים במשמעות אבל לא זהים.',
    ],
  },
};

// RAW DB trigger_category → label id. See notes (b) and (c) above before editing.
const CATEGORY_TO_KEY = {
  causal:   'direction',
  logical:  'direction',
  measure:  'ratio',
  anchor:   'anchor',
  unstated: 'nearmiss',
};

// Mechanism R-code → label id. Used when a slot carries no explicit DB category.
// Complete for the corpus: R1 R2 R3 R5 R6 R7 R9 (R4 / R8 do not occur).
const MECHANISM_TO_KEY = {
  R2: 'direction',
  R9: 'direction',
  R1: 'ratio',
  R5: 'ratio',
  R6: 'ratio',
  R3: 'added',
  R7: 'nearmiss',
};

/** The five labels, in teaching order — for the Learn and Analyze screens. */
export const CATEGORIES = [
  KEY_DEFS.direction,
  KEY_DEFS.ratio,
  KEY_DEFS.anchor,
  KEY_DEFS.added,
  KEY_DEFS.nearmiss,
];

/**
 * A raw DB category id → { id, label, cue }.
 * Unknown / null / non-string → null. Never throws.
 */
export function triggerForCategory(categoryId) {
  if (!categoryId || typeof categoryId !== 'string') return null;
  const def = KEY_DEFS[CATEGORY_TO_KEY[categoryId]];
  return def ? { ...def } : null;
}

/** Extract R-codes from a mechanism value. Composites are concatenated with NO
 *  separator ('R1R7') — parse with a regex, never split on ','. */
function parseCodes(rCode) {
  if (!rCode || typeof rCode !== 'string') return [];
  return rCode.toUpperCase().match(/R\d+/g) || [];
}

/**
 * Resolve a mechanism value: scan the extracted codes in order and return the
 * FIRST one that maps. On a composite the leading code wins — it is the primary
 * mechanism ('R7R5' → nearmiss, 'R5R7' → ratio). Null on null/garbage input.
 * Never throws.
 */
export function triggerFromMechanism(rCode) {
  for (const code of parseCodes(rCode)) {
    const key = MECHANISM_TO_KEY[code];
    if (key) return { ...KEY_DEFS[key] };
  }
  return null;
}

/**
 * The single entry point screens should call. The explicit DB category wins over
 * the mechanism because it is the more specific tag: an R7 slot tagged 'anchor'
 * is an anchor question, not a near-miss one.
 * @param {{ category?: string|null, mechanism?: string|null }} slot
 * @returns {{ id: string, label: string, cue: string }|null}
 */
export function resolveTrigger({ category = null, mechanism = null } = {}) {
  return triggerForCategory(category) || triggerFromMechanism(mechanism) || null;
}

// DEPRECATED — the old 5-key model, unrelated to the five labels above. Kept only
// so rephrase.data.js's aggregateWeakestKeys doesn't break at import time.
// aggregateWeakestKeys is dead code (no screen calls it — Analyze/T044 isn't
// built). Do NOT extend or fix this function. T044 deletes both.
const LEGACY_MECHANISM_TO_KEY = {
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
  return { ...(LEGACY_MECHANISM_TO_KEY[first] || KEY_FALLBACK) };
}
