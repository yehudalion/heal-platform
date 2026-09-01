/**
 * src/lib/errorLog.js — ניטור שגיאות צד-לקוח לתקופת הבטא.
 *
 * למה לא Sentry: בבטא של עשרות משתמשים לא צריך dashboards — צריך לדעת שמשהו
 * נשבר אצל שלושה אנשים. פתרון עצמי חוסך ספק חיצוני, סקריפט נוסף בעמוד, וסעיף
 * נוסף במדיניות הפרטיות. כשיהיו משלמים — שווה לשקול כלי אמיתי.
 *
 * הטבלה `client_errors` היא כתיבה-בלבד: אין מדיניות SELECT, ולכן שום לקוח לא
 * יכול לקרוא שגיאות של אחרים. קריאה רק דרך הדשבורד.
 *
 * הכללים ששומרים על זה שקט:
 *   - לעולם לא לזרוק מתוך מטפל השגיאות (לולאה אינסופית).
 *   - לא לשלוח את אותה שגיאה פעמיים באותו טעינה.
 *   - תקרה של 10 דיווחים לטעינה, כדי ששגיאה בלולאה לא תציף את הטבלה.
 *   - לא לאסוף טקסט חופשי שהמשתמש הקליד — רק ההודעה, המקור וה-stack.
 */
import { supabase } from '../supabase.js';

const MAX_PER_LOAD = 10;
const seen = new Set();
let sent = 0;

function truncate(v, n) {
  const s = typeof v === 'string' ? v : String(v ?? '');
  return s.length > n ? s.slice(0, n) : s;
}

async function report({ message, source, stack }) {
  try {
    if (sent >= MAX_PER_LOAD) return;

    const key = `${message}|${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;

    let userId = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch { /* אורח, או שהאימות עצמו נפל — לא מעניין כאן */ }

    await supabase.from('client_errors').insert({
      user_id:    userId,
      message:    truncate(message, 500),
      source:     truncate(source, 300),
      stack:      truncate(stack, 2000),
      route:      truncate(location.hash || '/', 200),
      user_agent: truncate(navigator.userAgent, 300),
    });
  } catch {
    // דיווח שנכשל נבלע בשקט. מטפל שגיאות שמייצר שגיאה גרוע מאין מטפל.
  }
}

/**
 * דיווח יזום מהתלמיד ("🚩 משהו לא בסדר") — לא שגיאת JS שנתפסה אוטומטית.
 * נכתב לאותה טבלת client_errors, עם source='user_report' כדי שאפשר יהיה
 * להבדיל בשאילתה בין קריסות לבין דיווחי תוכן/UX. ההערה אופציונלית ותמיד
 * מקוצרת; זה חריג מכוון לכלל "לא אוספים טקסט חופשי" — כאן זה בדיוק
 * הכוונה: פידבק שהתלמיד בחר לכתוב, לא טקסט שנתפס בטעות.
 * @param {string} note
 * @returns {Promise<boolean>} true אם נשלח בהצלחה
 */
export async function reportUserIssue(note) {
  try {
    let userId = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch { /* אורח */ }

    const { error } = await supabase.from('client_errors').insert({
      user_id:    userId,
      message:    truncate(note || '(בלי הערה)', 500),
      source:     'user_report',
      stack:      null,
      route:      truncate(location.hash || '/', 200),
      user_agent: truncate(navigator.userAgent, 300),
    });
    return !error;
  } catch {
    return false;
  }
}

let installed = false;

/** להתקין פעם אחת, מ-main.js. קריאה חוזרת לא עושה כלום. */
export function installErrorLog() {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (e) => {
    report({
      message: e.message || 'Unknown error',
      source:  `${e.filename || '?'}:${e.lineno || 0}:${e.colno || 0}`,
      stack:   e.error?.stack || null,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report({
      message: r?.message || String(r) || 'Unhandled rejection',
      source:  'promise',
      stack:   r?.stack || null,
    });
  });
}
