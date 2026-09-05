/**
 * src/lib/scoreScale.js — ציון משוער בסולם 50–150 לסימולציה.
 *
 * למה בכלל: יהודה (4.9.2026) — "ציון 50-150 זה יעזור לנו". תלמיד שמסיים
 * סימולציה רוצה לדעת "איפה אני" במונחים של המבחן, לא רק באחוזים. ההחלטה
 * הקודמת (בלי סולם) התהפכה.
 *
 * מה זה כן ומה זה לא: אין לנו כיול פסיכומטרי של כל שאלה, ולכן המספר הוא
 * **הערכה** ומוצג תמיד עם המילה "משוער". הוא עקבי (אותו ביצוע → אותו ציון),
 * משוקלל לפי קושי (שאלה קשה שנענתה נכון שווה יותר), ומתייחס לשאלה שלא נענתה
 * כמו במבחן — כאל שאלה שלא נצברה עליה נקודה.
 *
 * העיגון (עיגון כוונה, לא כיול): ~60% משוקלל ≈ 100, ~85% ≈ 134, 100% = 150.
 * מדרגות CEFR לפי טווחי הציון שמפרסמים המוסדות לצורך סיווג לקורסי אנגלית.
 * אם יתפרסם כיול רשמי — לעדכן את ANCHORS בלבד.
 */

/** נקודות עיגון: [דיוק משוקלל, ציון]. ליניארי בין נקודה לנקודה. */
const ANCHORS = [
  [0.00, 50],
  [0.25, 70],
  [0.60, 100],
  [0.85, 134],
  [1.00, 150],
];

/** משקל שאלה לפי קושי (1–8). קושי חסר = משקל 1. */
function weightOf(difficulty) {
  const d = Number(difficulty);
  if (!Number.isFinite(d)) return 1;
  return 0.7 + 0.1 * Math.min(8, Math.max(1, d));
}

/** @param {number} x 0..1 @returns {number} 50..150 */
function interpolate(x) {
  const v = Math.min(1, Math.max(0, x));
  for (let i = 1; i < ANCHORS.length; i++) {
    const [x0, y0] = ANCHORS[i - 1];
    const [x1, y1] = ANCHORS[i];
    if (v <= x1) return Math.round(y0 + ((v - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 150;
}

/** מדרגות CEFR לפי ציון. הטווחים לפי הסיווג המקובל לקורסי אנגלית בתואר. */
export const CEFR_BANDS = [
  { min: 135, code: 'C2', label: 'פטור מלא', short: 'פטור' },
  { min: 120, code: 'C1', label: 'קורס מתקדמים ב׳', short: 'מתקדמים ב׳' },
  { min: 100, code: 'B2', label: 'קורס מתקדמים א׳', short: 'מתקדמים א׳' },
  { min: 85,  code: 'B1', label: 'קורס בסיסי', short: 'בסיסי' },
  { min: 50,  code: 'A2', label: 'קורס טרום-בסיסי', short: 'טרום-בסיסי' },
];

/** @param {number} score @returns {{code:string,label:string,short:string,min:number}} */
export function bandFor(score) {
  return CEFR_BANDS.find((b) => score >= b.min) || CEFR_BANDS[CEFR_BANDS.length - 1];
}

/**
 * הציון המשוער לניסיון.
 * @param {Array<{order:number,difficulty?:number}>} items   כל פריטי הטופס
 * @param {Map<number,{chosenIndex:number,isCorrect:boolean}>} answers  לפי order
 * @returns {{ score:number, weightedAccuracy:number, band:object, answered:number, total:number }|null}
 *   null כשאין פריטים בכלל.
 */
export function scaledScore(items, answers) {
  if (!Array.isArray(items) || !items.length) return null;
  let got = 0, max = 0, answered = 0;
  for (const it of items) {
    const w = weightOf(it.difficulty);
    max += w;
    const a = answers?.get?.(it.order);
    if (!a || a.chosenIndex == null) continue;
    answered += 1;
    if (a.isCorrect) got += w;
  }
  const weightedAccuracy = max ? got / max : 0;
  const score = interpolate(weightedAccuracy);
  return { score, weightedAccuracy, band: bandFor(score), answered, total: items.length };
}

/**
 * ההפרש מול ניסיון קודם, כמשפט קצר. '' כשאין קודם.
 * "מספר עם כיוון קורא כמו התקדמות" — PRINCIPLE_north_star.
 * @param {number} score @param {number|null|undefined} prevScore
 */
export function deltaLine(score, prevScore) {
  if (prevScore == null || !Number.isFinite(Number(prevScore))) return '';
  const d = score - Number(prevScore);
  if (d > 0) return `↑ ${d} נקודות מהסימולציה הקודמת (${prevScore})`;
  if (d < 0) return `${Math.abs(d)} נקודות פחות מהסימולציה הקודמת (${prevScore}) — סימולציה אחת היא תמונה, לא מגמה`;
  return `אותו ציון כמו בסימולציה הקודמת`;
}
