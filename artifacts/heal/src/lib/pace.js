/**
 * src/lib/pace.js — קצב הפתרון מול הקצב הנדרש במבחן.
 *
 * למה זה חשוב פדגוגית: במבחן ממוחשב עם טיימר לכל פרק, תלמיד שעונה נכון אבל
 * לאט ייגמר לו הזמן ויאבד שאלות שהוא יודע לפתור. דיוק בלי קצב הוא חצי תמונה.
 *
 * המתחרה מציג את זה כטבלה של ממוצעים מול יעד לפי רמת קושי. אנחנו מציגים משפט
 * אחד בסיכום המנה, בלי לחשוף את רמת הקושי הפנימית (HANDOFF §8.4.1) ובלי
 * להפוך את זה למרוץ: הניסוח מתאר, לא נוזף.
 *
 * היעדים נגזרים מזמן הפרק חלקי מספר השאלות בבחינה, עם מרווח לקריאת הקטע
 * בהבנת הנקרא. הם הערכה סבירה ולא מספר רשמי — לעדכן אם יתפרסם מבנה מדויק.
 */

/** שניות ליעד, לפי מודול. */
export const PACE_TARGET_SEC = {
  sc: 45,
  rephrase: 60,
  affix: 45,
  reading: 75,
};

/** @param {number} ms @returns {string} m:ss */
export function fmtSec(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * משפט אחד על הקצב. מחזיר '' כשאין מספיק נתונים — משפט על סמך שאלה אחת
 * הוא רעש.
 *
 * @param {string} module
 * @param {number} totalMs סך הזמן שנמדד
 * @param {number} count כמה שאלות נמדדו
 * @returns {string} HTML
 */
export function paceLine(module, totalMs, count) {
  if (!count || count < 3 || !totalMs) return '';
  const target = PACE_TARGET_SEC[module];
  if (!target) return '';

  const avgMs = totalMs / count;
  const avgSec = avgMs / 1000;
  const ratio = avgSec / target;

  let verdict;
  if (ratio <= 0.75) verdict = 'מהר מהקצב שהמבחן דורש — יש לך מרווח לבדוק את עצמך לפני שאתה עונה.';
  else if (ratio <= 1.05) verdict = 'בדיוק בקצב שהמבחן דורש.';
  else if (ratio <= 1.4) verdict = 'קצת מעל הקצב של המבחן. עדיין בסדר, אבל שווה לשים לב.';
  else verdict = 'מעל הקצב שהמבחן דורש. הדיוק חשוב יותר עכשיו, והמהירות תבוא מהתרגול.';

  return `<div class="pace-line">
    <b>${fmtSec(avgMs)}</b> לשאלה בממוצע · קצב היעד ${fmtSec(target * 1000)} —
    <span class="pace-verdict">${verdict}</span>
  </div>`;
}
