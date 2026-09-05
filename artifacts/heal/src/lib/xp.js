/**
 * src/lib/xp.js — כמה שווה כל פעולה, ואיך נקראות הדרגות והתגים.
 *
 * נבנה 3.9.2026 אחרי שליאון שינה עמדה במפורש: "הייתי יותר מידי קשוח מול להפוך
 * את האתר למשחק, אני עכשיו חושב שמדובר על דבר חיובי".
 *
 * ── שלושה כללים שנשמרים בתוך המנגנון עצמו, לא כהסתייגות ──────────────────────
 * 1. XP לעולם לא יורד. אין קנסות, אין "איבדת נקודות".
 * 2. גם תשובה שגויה מזכה בנקודות. תלמיד שטעה עדיין למד, והמערכת אומרת לו את זה.
 *    זה ההפך הישיר מהמתחרה (mypsychometric), שם טעות מורידה רייטינג ולוקחת לב.
 * 3. אין לבבות, אין חיים, אין "טעות אחת ואתה בחוץ".
 *
 * ⚠️ מינוח: הקידום כאן נקרא **דרגה**, לעולם לא "רמה". "רמה" שמורה לקושי הפנימי
 * של השאלה, שהוחלט (HANDOFF §8.4.1) שלא מוצג ללומד לעולם. שתי מילים שונות
 * לשני דברים שונים — אחרת תלמיד יחשוב שהדרגה שלו קובעת אילו שאלות הוא מקבל.
 */

/** כמה XP שווה כל פעולה. הערכים נמוכים בכוונה: הדרגה אמורה לקחת ימים, לא דקות. */
export const XP = {
  correct:           10,
  wrong:              3,   // למידה נספרת
  sessionComplete:   25,
  perfectSession:    25,   // בונוס על 100% במנה
  listeningLecture:  30,
  simulationSection: 50,
  simulationDone:   120,
  dailyChallenge:    40,
  mistakeFixed:      15,
  firstOfDay:        15,
};

/**
 * דרגות. הסף הוא XP מצטבר. סשן שבת 6 (5.9.2026), פריט 50: הסולם היה 300 קבוע
 * לדרגה, והדרגה העליונה (2,700) הושגה בכשלושה שבועות — מול 88 יום של הכנה.
 * עכשיו עקומה: מדרגות קטנות בהתחלה (הצלחה מהירה כשמתחילים), ארוכות בסוף.
 * 9,000 ≈ שלושה חודשים של תרגול יומי סביב התקרה. XP שכבר נצבר לא משתנה.
 * ⚠️ אותם ספים בדיוק יושבים ב-DB: public.rank_thresholds() (מיגרציה
 * gamification_rank_curve_10). לשנות — בשני המקומות יחד.
 */
export const RANK_THRESHOLDS = [0, 150, 400, 800, 1300, 2000, 3000, 4300, 6200, 9000];
export const RANKS = [
  { min: RANK_THRESHOLDS[0], name: 'מתחיל',        icon: '🌱' },
  { min: RANK_THRESHOLDS[1], name: 'מתאמן',        icon: '💪' },
  { min: RANK_THRESHOLDS[2], name: 'מתמיד',        icon: '🔁' },
  { min: RANK_THRESHOLDS[3], name: 'חד־עין',       icon: '👁️' },
  { min: RANK_THRESHOLDS[4], name: 'פותר',         icon: '🧩' },
  { min: RANK_THRESHOLDS[5], name: 'מיומן',        icon: '🎯' },
  { min: RANK_THRESHOLDS[6], name: 'שולט',         icon: '⚡' },
  { min: RANK_THRESHOLDS[7], name: 'מקצוען',       icon: '🏅' },
  { min: RANK_THRESHOLDS[8], name: 'אלוף',         icon: '🏆' },
  { min: RANK_THRESHOLDS[9], name: 'מוכן למבחן',   icon: '🚀' },
];

/** @param {number} xp @returns {{index:number,name:string,icon:string}} */
export function rankFor(xp = 0) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].min) i = k;
  return { index: i + 1, name: RANKS[i].name, icon: RANKS[i].icon };
}

/**
 * תגים. ההגדרות כאן ולא ב-DB בכוונה: להוסיף תג חדש = שורה בקובץ הזה, בלי מיגרציה.
 * ה-DB שומר רק את הקוד ואת מועד ההשגה (user_badges).
 *
 * שימו לב ל-comeback: הוא מתגמל דווקא את מי שחזר אחרי הפסקה. רצף שנשבר הוא
 * הרגע שבו תלמיד נוטש, ולכן זה בדיוק הרגע שבו המוצר צריך לומר "טוב שחזרת".
 */
export const BADGES = {
  first_step:   { icon: '👣', name: 'צעד ראשון',      desc: 'סיימת את התרגול הראשון שלך' },
  streak_3:     { icon: '🔥', name: '3 ימים ברצף',    desc: 'תרגלת שלושה ימים ברציפות' },
  streak_7:     { icon: '🔥', name: 'שבוע שלם',       desc: 'שבעה ימי תרגול ברציפות' },
  streak_21:    { icon: '🔥', name: '21 יום',         desc: 'שלושה שבועות ברצף — זה כבר הרגל' },
  comeback:     { icon: '🤝', name: 'חזרת',           desc: 'חזרת לתרגל אחרי הפסקה. זה החלק הקשה' },
  perfect_pack: { icon: '💯', name: 'מנה מושלמת',     desc: 'ענית נכון על כל השאלות במנה' },
  corners_all:  { icon: '🧭', name: 'סיור מלא',       desc: 'תרגלת בכל חמש הפינות' },
  words_100:    { icon: '📚', name: '100 מילים',      desc: 'חזרת על 100 מילים באוצר המילים' },
  sim_first:    { icon: '📝', name: 'אבחון ראשון',    desc: 'השלמת סימולציה מלאה' },
  daily_3:      { icon: '📅', name: '3 אתגרים',       desc: 'שלושה אתגרים יומיים' },
  daily_10:     { icon: '📅', name: '10 אתגרים',      desc: 'עשרה אתגרים יומיים' },
  affix_first:  { icon: '🔤', name: 'מפרק מילים',     desc: 'סיימת מנה בפינת התחיליות והסופיות' },
};

/** @param {string} code @returns {{icon:string,name:string,desc:string}|null} */
export function badgeInfo(code) {
  return BADGES[code] || null;
}
