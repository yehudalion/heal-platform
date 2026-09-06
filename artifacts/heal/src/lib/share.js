/**
 * src/lib/share.js — שיתוף תוצאה (🟩🟥), אותו דפוס כמו באתגר היומי.
 *
 * סשן שבת 6 (5.9.2026), פריט 52: הועתק מ-screens/daily.js לקובץ משותף כדי
 * שהספרינט והסימולציה ישתפו את אותה התנהגות: navigator.share בטלפון,
 * העתקה ללוח בדסקטופ, והכפתור מאשר "✓ הועתק" לשתי שניות. בלי לוח מובילים,
 * בלי דירוג מול אחרים — רק הטקסט שהתלמיד בוחר לשלוח.
 */
import { BRAND } from './brand.js';

export const SITE = 'https://highscore-eight.vercel.app';

/** מחרוזת ריבועים מרשימת בוליאנים. */
export function grid(results) {
  return (results || []).map((ok) => (ok ? '🟩' : '🟥')).join('');
}

/**
 * @param {string} text  הטקסט המלא לשיתוף
 * @param {HTMLElement|null} btn  הכפתור שלחץ — מקבל "✓ הועתק" בדסקטופ
 */
export function shareText(text, btn = null) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
    return;
  }
  const original = btn ? btn.textContent : '';
  navigator.clipboard?.writeText(text).then(() => {
    if (btn) { btn.textContent = '✓ הועתק'; setTimeout(() => { btn.textContent = original; }, 2000); }
  }).catch(() => {});
}

/** כותרת אחידה: "מעל הרף · <מה>". */
export function shareHeader(what) { return `${BRAND} · ${what}`; }
