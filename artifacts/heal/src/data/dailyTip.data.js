/**
 * dailyTip.data.js — "הטיפ של היום" למסך הבית.
 *
 * לא תוכן חדש: שולף אחד משמונת ה"מפתחות" הקיימים כבר באתר (חמישה של ניסוח
 * מחדש ב-lib/keys.js, שלושה של השלמת משפטים ב-lib/scKeys.js) — אותו טקסט
 * cue שהתלמיד רואה כבר במסך הרמזים ובניתוח הטעויות. אין כאן מאגר טקסט
 * נפרד לתחזק: לשנות ניסוח למפתח, משנים אותו במקור והטיפ היומי מתעדכן ממילא.
 *
 * דטרמיניסטי לפי תאריך — אותו טיפ לכל אורך היום, בדיוק כמו wordOfDay.data.js
 * (אותה סיבה: יציבות, לא הפתעה בכל רענון). האינדקס מוזז ב-3 יחסית ל-dayIndex
 * הגולמי כדי שהטיפ לא יתחלף בו-זמנית עם המילה של היום בכל פעם שהמונים
 * מתיישרים — לא קריטי, אבל חינם.
 */
import { CATEGORIES as REPHRASE_KEYS } from '../lib/keys.js';
import { CATEGORIES as SC_KEYS } from '../lib/scKeys.js';

const TIPS = [
  ...REPHRASE_KEYS.map((k) => ({ id: k.id, label: k.label, cue: k.cue, module: 'rephrase' })),
  ...SC_KEYS.map((k) => ({ id: k.id, label: k.label, cue: k.cue, module: 'sc' })),
];

/** מספר הימים מאז 1.1.1970 בזמן מקומי — זהה ל-wordOfDay.data.js. */
function dayIndex(d = new Date()) {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86400000);
}

/**
 * מחזיר { tip }. tip הוא null רק אם שני קבצי המפתחות ריקים (לא אמור לקרות) —
 * המסך פשוט לא מצייר את הפינה.
 */
export function getDailyTip() {
  if (!TIPS.length) return { tip: null };
  const idx = ((dayIndex() + 3) % TIPS.length + TIPS.length) % TIPS.length;
  return { tip: TIPS[idx] };
}
