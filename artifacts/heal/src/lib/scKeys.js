/**
 * src/lib/scKeys.js
 *
 * The Sentence Completion module's LABEL VOCABULARY — where in the sentence the
 * answer comes from, not a taxonomy of grammar topics. Pure logic: no side
 * effects, no imports from screens/ or data/. Modelled directly on
 * src/lib/keys.js (the Rephrase module) — same double-tagging split (SITEMAP §2):
 * the DB keeps the exact generation-time clue code, this file maps it to the
 * one word the student sees, in all three layers.
 *
 * THREE labels — decided by Lion 2026-08-23 ("סולם השלמה קרובה", SITEMAP §3):
 *
 *   השלמה קרובה        (COLLOC, GRAM)         — ~31% of the bank
 *   מילת הקישור קובעת   (CONTRAST, CAUSE)      — ~16% of the bank
 *   המשפט כולו          (SEM, DEF, EX)         — ~53% of the bank
 *
 * DEF gets a highlighted sub-move inside "המשפט כולו" (SITEMAP §3): a DEF item
 * is answered by spotting a definition or explicit gloss inside the sentence,
 * not by reading the whole thing for general sense the way a SEM/EX item is.
 * subMoveForCode() surfaces that distinction; the label itself does not split.
 *
 * COMPOUND CODES — 4 of 800 items carry two codes joined with '+' in the DB
 * (e.g. 'COLLOC+CAUSE'). Two of the four cross the label boundary (COLLOC is
 * "השלמה קרובה", CAUSE is "מילת הקישור קובעת" — same for COLLOC+SEM and
 * CONTRAST+GRAM). This was an open decision (flagged in SITEMAP §7) until
 * Lion resolved it 2026-08-25: the FIRST code in the string wins, exactly the
 * "leading code wins" rule already used for Rephrase's composite mechanism
 * codes in keys.js (`triggerFromMechanism`). Do not average, do not special
 * case — parseCode() below is the entire rule.
 *
 * A future reader must NOT "fix" the above two things — they are both
 * deliberate, both approved by Lion, and both narrow (4 items / 800 total,
 * nowhere close to the §2 display-threshold floor of 8–10).
 */

// The three student-facing labels. `cue` is the one-line check shown in the
// hint box and in practice feedback — wording approved by Lion 2026-08-25,
// alongside sc-learn.js in the same commit. Do not reword one without the other.
const KEY_DEFS = {
  closeCompletion: {
    id: 'closeCompletion',
    label: 'השלמה קרובה',
    cue: 'המילים הצמודות למקום הריק כבר קובעות את התשובה — צירוף קבוע או צורת דקדוק מחייבת. אין צורך בכל המשפט.',
  },
  connectorDecides: {
    id: 'connectorDecides',
    label: 'מילת הקישור קובעת',
    cue: 'מילת הקישור (but / because / although / so…) קובעת את הכיוון ההגיוני — ניגוד, סיבה או תוצאה. היא נותנת את התשובה, לא המשמעות הכללית.',
  },
  wholeSentence: {
    id: 'wholeSentence',
    label: 'המשפט כולו',
    cue: 'המילים הצמודות לא מספיקות — צריך להבין את המשפט בשלמותו כדי לדעת מה חסר.',
  },
};

// RAW DB clue_code → label id. See the file header before editing either map.
const CODE_TO_KEY = {
  COLLOC:    'closeCompletion',
  GRAM:      'closeCompletion',
  CONTRAST:  'connectorDecides',
  CAUSE:     'connectorDecides',
  SEM:       'wholeSentence',
  DEF:       'wholeSentence',
  EX:        'wholeSentence',
};

/** The three labels, in teaching order — for the Learn and Analyze screens. */
export const CATEGORIES = [
  KEY_DEFS.closeCompletion,
  KEY_DEFS.connectorDecides,
  KEY_DEFS.wholeSentence,
];

/**
 * Split a raw clue_code on '+' and return the segments, uppercased and
 * trimmed. A plain code ('SEM') comes back as a single-element array.
 * Null/non-string input → []. Never throws.
 */
function parseCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return [];
  return rawCode.split('+').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * Resolve a raw clue_code to its student-facing label. On a compound code the
 * FIRST segment wins (see file header) — this is the entire compound rule,
 * there is no averaging or special-casing beyond it.
 * @param {string|null} clueCode
 * @returns {{ id: string, label: string, cue: string }|null}
 */
export function resolveKey(clueCode) {
  const [first] = parseCode(clueCode);
  if (!first) return null;
  const keyId = CODE_TO_KEY[first];
  return keyId ? { ...KEY_DEFS[keyId] } : null;
}

/**
 * The DEF sub-move flag (SITEMAP §3 — "עם DEF מודגש כתת-מהלך בפנים"). True only
 * when the FIRST (winning) code segment is literally DEF — a DEF riding second
 * in a compound loses to the leading code like everything else, by design.
 * @param {string|null} clueCode
 * @returns {boolean}
 */
export function isDefinitionMove(clueCode) {
  return parseCode(clueCode)[0] === 'DEF';
}
