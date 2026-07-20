/**
 * src/lib/keys.js
 *
 * Official mapping from the v4 distractor mechanism codes (R-codes) to the five
 * student-facing "keys" (מפתחות). Pure logic — NO side effects and NO imports
 * from screens/ or data/.
 *
 * Single source of truth: docs/CONTENT_GUIDELINES.md §1.3
 * ("מיפוי רשמי — 7 מנגנוני R → 5 מפתחות"). Do not encode a different mapping
 * elsewhere — every screen and the data layer must translate through here.
 */

const MECHANISM_TO_KEY = {
  R2: { key: 'כיוון', code: 'direction_flip' }, // היפוך כיוון/סיבתיות
  R1: { key: 'עוצמה', code: 'extremism' },       // הקצנה, כולל most→all
  R3: { key: 'היקף', code: 'scope_change' },     // נוסף פרט/סיבה
  R9: { key: 'היקף', code: 'scope_change' },     // נוסף יחס-זמן
  R6: { key: 'אחיזה', code: 'subject_swap' },     // מי עשה למי
  R7: { key: 'דמיון', code: 'hallucination' },   // מילה כוזבת
  R5: { key: 'דמיון', code: 'hallucination' },   // רכיב שהושמט
};

const FALLBACK = { key: 'כללי', code: 'unknown' };

/**
 * Translate a mechanism R-code to its student-facing key.
 * @param {string|null|undefined} rCode - e.g. 'R2', or a combined 'R7,R3'
 *   (the FIRST code is used). Case-insensitive.
 * @returns {{ key: string, code: string }} a fresh object; never throws.
 *   Unknown / empty / null → { key: 'כללי', code: 'unknown' }.
 */
export function keyForMechanism(rCode) {
  if (!rCode || typeof rCode !== 'string') return { ...FALLBACK };
  const first = rCode.split(',')[0].trim().toUpperCase();
  return { ...(MECHANISM_TO_KEY[first] || FALLBACK) };
}
