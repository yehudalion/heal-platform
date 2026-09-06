/**
 * betaConsent.data.js — הסכמה לקבלת עדכונים במייל.
 *
 * ⚖️ למה זה קיים בכלל: המייל של התלמיד כבר נמצא אצלנו אוטומטית מהתחברות
 * גוגל, אבל **הרשמה למוצר אינה הסכמה לקבל ממנו דיוור**. חוק התקשורת
 * (תיקון 40) דורש הסכמה מראש לדבר פרסומת, ויש בו פיצוי בלי הוכחת נזק.
 * לכן הרשימה החוקית היחידה היא מי שאמר כן במפורש כאן.
 *
 * מה שנשמר הוא לא רק "כן" אלא **הנוסח המדויק שהוצג לו**. אם הניסוח ישתנה
 * בעתיד, ההסכמות הישנות עדיין יעידו על מה שנאמר בפועל באותו רגע.
 *
 * הסרת הסכמה = עדכון ל-false, לעולם לא מחיקת השורה: מחיקה הייתה מוחקת גם
 * את העדות שההסכמה ניתנה, וגם את הידיעה שהתלמיד כבר נשאל.
 */
import { supabase } from '../supabase.js';

/** הנוסח המדויק שהתלמיד רואה. כל שינוי כאן משנה את מה שנשמר מכאן והלאה. */
export const CONSENT_TEXT =
  'אני מאשר/ת לקבל עדכונים במייל על חלקים חדשים ושיפורים באתר. אפשר להסיר את ההסכמה בכל רגע.';

/**
 * מחזיר { state, error } כאשר state הוא:
 *   'unknown'  — לא מחובר, או שהשאילתה נכשלה. לא שואלים.
 *   'unasked'  — מחובר ועוד לא הכריע. זה המצב היחיד שבו מציגים את השאלה.
 *   'yes'/'no' — כבר הכריע. לא שואלים שוב.
 * ההבחנה בין 'unasked' ל-'no' היא כל העניין: "ענה לא" ו"לא נשאל" נראים
 * אותו דבר בטבלה ריקה, ובלעדיה היינו שואלים את מי שסירב בכל כניסה.
 */
export async function getConsentState(userId) {
  if (!userId) return { state: 'unknown', error: null };
  try {
    const { data, error } = await supabase
      .from('beta_contact_consent')
      .select('consented')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { state: 'unknown', error };
    if (!data) return { state: 'unasked', error: null };
    return { state: data.consented ? 'yes' : 'no', error: null };
  } catch (err) {
    console.error('betaConsent.data.getConsentState:', err);
    return { state: 'unknown', error: err };
  }
}

/** שומר הכרעה. upsert לפי user_id כדי שאפשר יהיה לשנות דעה בלי כפילות. */
export async function setConsent(userId, consented, source = 'home') {
  if (!userId) return { error: new Error('not authenticated') };
  try {
    const { error } = await supabase
      .from('beta_contact_consent')
      .upsert({
        user_id: userId,
        consented: !!consented,
        consent_text: CONSENT_TEXT,
        source,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    return { error: error || null };
  } catch (err) {
    console.error('betaConsent.data.setConsent:', err);
    return { error: err };
  }
}
