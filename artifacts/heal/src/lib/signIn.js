/**
 * signIn.js — התחברות Google מכל מקום באפליקציה.
 *
 * 🔴 הבאג שזה מתקן (2.9.2026, נמצא בבדיקה בטלפון): הקירות בפינות שדורשות
 * חשבון (אוצר מילים, האזנה) הציגו כפתור "כניסה לחשבון" שעשה
 * `location.hash = '/'` — כלומר ניווט למסך הפתיחה, לא התחברות.
 *
 * לאורח זה נסגר ללולאה אינסופית: קיר -> מסך הפתיחה -> "להתחיל לתרגל"
 * (שמחזיר אותו לבית כאורח) -> פינה -> אותו קיר. **תלמיד לא יכול היה
 * לצאת מזה בשום שלב, ולא הייתה שום שגיאה בקונסול** — כל מסך עבד כמו
 * שנכתב, והלולאה נוצרה מהחיבור ביניהם.
 *
 * התיקון: כפתור שמפעיל את זרימת ה-OAuth בפועל.
 *
 * נחשף גם כ-window.__hsSignIn כדי שקירות שכתובים כ-onclick בתוך תבנית
 * מחרוזת יוכלו לקרוא לו בלי לשכתב את כל המסך. זה מכוון ומתועד — לא
 * להעתיק את הדפוס הזה למקומות חדשים; במסך חדש יש לייבא ולחבר מאזין.
 */
import { supabase } from '../supabase.js';

/** מתחיל התחברות Google. מחזיר { error } אם נכשל לפני ההפניה. */
export async function startGoogleSignIn() {
  if (!supabase) {
    console.warn('signIn: supabase not configured');
    return { error: new Error('supabase not configured') };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) console.warn('signIn failed:', error.message);
    return { error: error || null };
  } catch (err) {
    console.warn('signIn threw:', err);
    return { error: err };
  }
}

if (typeof window !== 'undefined') window.__hsSignIn = startGoogleSignIn;
