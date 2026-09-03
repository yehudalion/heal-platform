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

// 2.9.2026 (ליאון: "לא מובן הטיפ היומי, צריך להרחיב על מה שאנחנו מדברים ומה
// הטיפ"): ה-cue לבדו נכתב כדי להיקרא בזמן פתרון שאלה, ליד המשפט עצמו — על
// מסך הבית, בלי הקשר, הוא נחת באוויר ("איזו פעולה? באיזה משפט?"). כל טיפ
// מקבל עכשיו גם `moduleLabel` (באיזו פינה המפתח הזה חי) ו-`intro` (משפט
// גישור אחד שממסגר על מה בדיוק מדובר), פלוס `learnHref` — קישור עומק לאותו
// בלוק בדיוק במסך הלמידה של הפינה (אותו דפוס שכבר קיים ב-rephrase-analyze.js
// / sc-analyze.js: '#/rephrase-learn#rl-block-<id>' ו-'#/sc-learn#sl-block-<id>'),
// כדי שמי שרוצה את ההסבר המלא עם דוגמה יגיע אליו בלחיצה אחת.
const TIPS = [
  ...REPHRASE_KEYS.map((k) => ({
    id: k.id,
    label: k.label,
    cue: k.cue,
    module: 'rephrase',
    moduleLabel: 'ניסוח מחדש',
    intro: 'כשבודקים אם משפט מנוסח מחדש שומר על המשמעות המקורית, אחד הדברים שכדאי לבדוק:',
    learnHref: `#/rephrase-learn#rl-block-${k.id}`,
  })),
  ...SC_KEYS.map((k) => ({
    id: k.id,
    label: k.label,
    cue: k.cue,
    module: 'sc',
    moduleLabel: 'השלמת משפטים',
    intro: 'כשבוחרים את המילה הנכונה למקום הריק במשפט, אחד הדברים שכדאי לבדוק:',
    learnHref: `#/sc-learn#sl-block-${k.id}`,
  })),
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
