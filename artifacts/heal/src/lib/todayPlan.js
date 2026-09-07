/**
 * src/lib/todayPlan.js — כמה דקות ללמוד *היום*.
 *
 * 7.9.2026 — הבקשה של יהודה, אחרי משוב ממשתמש בבטא שחיפש איך לשנות את זמן
 * הלמידה ולא מצא. ההבחנה שהקובץ הזה מחזיק:
 *
 *   daily_time_minutes בפרופיל = ברירת המחדל הקבועה. משתנה רק בהגדרות.
 *   ההעדפה כאן                 = חריגה ליום אחד בלבד.
 *
 * למה יום אחד: "היום יש לי רק עשר דקות" הוא מצב, לא החלטה. אם בחירה כזאת
 * הייתה משנה את התוכנית לתמיד, כל יום עמוס היה מוריד לתלמיד את הרף בלי
 * שהתכוון. בחצות זה מתאפס חזרה למה שהוא באמת רצה.
 *
 * נשמר ב-localStorage ולא ב-DB בכוונה: זה מצב של מכשיר ליום אחד, לא נתון
 * שצריך לשרוד מעבר בין מכשירים או להיכנס לגיבוי.
 */
const KEY = 'hs:today:minutes';

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ההעדפה של היום, או null אם לא נבחרה (או שנבחרה ביום אחר). */
export function readTodayMinutes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || raw.day !== todayStamp()) return null;
    const n = Number(raw.minutes);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
}

/** כמה דקות לתכנן היום: הבחירה של היום, ואם אין — ברירת המחדל מהפרופיל. */
export function effectiveMinutes(defaultMinutes) {
  return readTodayMinutes() ?? defaultMinutes;
}

/** נשמר בגבולות סבירים: פחות מ-3 דקות זה לא מנה, ומעל 120 זה כבר לא יום. */
export function setTodayMinutes(minutes) {
  const n = Math.max(3, Math.min(120, Math.round(Number(minutes) || 0)));
  try { localStorage.setItem(KEY, JSON.stringify({ day: todayStamp(), minutes: n })); } catch { /* noop */ }
  return n;
}

export function clearTodayMinutes() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
