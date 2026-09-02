/**
 * guestAttempts.data.js — שמירת תשובות של מי שמתרגל בלי חשבון.
 *
 * הרקע (2.9.2026): 14 מתוך 35 מבקרים מהפוסט בפייסבוק בחרו במצב אורח
 * ותרגלו בפועל. logAttempt של כל בנק מתחיל ב"אם אין userId — אל תשמור
 * כלום", ולכן **אף תשובה שלהם לא נשמרה**. נשארה ספירת עמודים בלבד, שלא
 * מלמדת על אילו שאלות נופלים, איפה עוזבים, או אם ההסבר אחרי טעות עזר.
 *
 * המזהה: מחרוזת אקראית שנוצרת פעם אחת בדפדפן ונשמרת ב-localStorage.
 * אין בה שום פרט אישי, אין דרך לקשר אותה לאדם, והיא נעלמת כשמנקים את
 * הדפדפן. המטרה היא למדוד את המוצר, לא לעקוב אחרי אדם.
 *
 * ⚠️ כלל: כישלון כתיבה כאן לעולם לא עוצר תרגול. הפונקציה בולעת שגיאות
 * ומחזירה בשקט. תלמיד לא אמור להיתקע בגלל מדידה — זה בדיוק סוג הכשל
 * שהקפיא את מסך ההרשמה באותו יום.
 */
import { supabase } from '../supabase.js';

const GUEST_ID_KEY = 'heal:guest:aid';

/** מזהה אקראי ויציב לדפדפן הזה. נוצר בפעם הראשונה שצריך אותו. */
export function getGuestAnalyticsId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch (_) {
    // גלישה פרטית או אחסון חסום — מודדים את הסשן ולא שומרים מזהה.
    return null;
  }
}

/**
 * שומרת ניסיון של אורח. fire-and-forget: לא ממתינים לה ולא בודקים תוצאה.
 * @param {'rephrase'|'sc'} module
 */
export function logGuestAttempt(module, {
  questionId = null,
  isCorrect = null,
  chosenIndex = null,
  responseTimeMs = null,
  hintUsed = null,
} = {}) {
  try {
    const guestId = getGuestAnalyticsId();
    if (!guestId || !supabase) return;
    supabase.from('guest_attempts').insert({
      guest_id: guestId,
      module,
      question_id: questionId,
      is_correct: isCorrect,
      chosen_index: chosenIndex,
      response_time_ms: responseTimeMs,
      hint_used: hintUsed,
    }).then(({ error }) => {
      if (error) console.warn('guestAttempts insert failed:', error.message);
    }, (err) => console.warn('guestAttempts insert threw:', err));
  } catch (err) {
    console.warn('guestAttempts.logGuestAttempt:', err);
  }
}

/**
 * תובנות אורח למסך הבית — אגרגציה בלבד (לא שורות גולמיות), דרך פונקציית
 * DB בשם get_guest_insights. guest_attempts הוא INSERT-בלבד ב-RLS בכוונה
 * (אין policy ל-SELECT בכלל): מדיניות SELECT גורפת הייתה מאפשרת לכל אחד
 * לסרוק את השורות של כל אורח, לא רק את שלו. הפונקציה מחזירה ספירות בלבד
 * לפי guest_id ספציפי שהקורא כבר מחזיק ב-localStorage (ראו המיגרציה
 * guest_insights_rpc, 2.9.2026).
 *
 * מחזיר { status, modules }. status:
 *   'no-guest'  — אין guestId זמין (localStorage חסום).
 *   'empty'     — יש guestId אבל אין עדיין אף ניסיון שמור.
 *   'error'     — הקריאה נכשלה.
 *   'ok'        — modules הוא מערך { module, label, attempts, correct, accuracyPct }.
 */
const GUEST_MODULE_LABEL = { rephrase: 'ניסוח מחדש', sc: 'השלמת משפטים' };

export async function getGuestInsights() {
  const guestId = getGuestAnalyticsId();
  if (!guestId || !supabase) return { status: 'no-guest', modules: [] };
  try {
    const { data, error } = await supabase.rpc('get_guest_insights', { p_guest_id: guestId });
    if (error) return { status: 'error', modules: [] };
    if (!data || !data.length) return { status: 'empty', modules: [] };
    const modules = data
      .filter((m) => m.attempts > 0)
      .map((m) => ({
        module: m.module,
        label: GUEST_MODULE_LABEL[m.module] || m.module,
        attempts: Number(m.attempts) || 0,
        correct: Number(m.correct) || 0,
        accuracyPct: m.attempts ? Math.round((Number(m.correct) / Number(m.attempts)) * 100) : 0,
      }));
    return { status: modules.length ? 'ok' : 'empty', modules };
  } catch (err) {
    console.warn('guestAttempts.getGuestInsights:', err);
    return { status: 'error', modules: [] };
  }
}
