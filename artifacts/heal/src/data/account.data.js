/**
 * src/data/account.data.js — פעולות על החשבון עצמו.
 *
 * שכבת נתונים בלבד: מסכים לא קוראים ל-supabase ישירות (ראו כלל הפרדת השכבות
 * ב-ARCHITECTURE.md). הקובץ הזה קיים כדי ש-layout.js לא יכיר את פרטי הקריאה
 * לפונקציית הקצה.
 */
import { supabase } from '../supabase.js';

/**
 * מחיקת החשבון של המשתמש המחובר, לצמיתות.
 *
 * המחיקה חייבת לרוץ בשרת: הרשאות שירות דרושות כדי למחוק שורה ב-auth.users,
 * ולקוח לעולם לא מחזיק אותן. הפונקציה 'delete-account' מזהה את הקורא לפי
 * ה-JWT שלו בלבד — לא לפי גוף הבקשה — ולכן אי אפשר למחוק חשבון של מישהו אחר
 * גם אם משנים את הקריאה בדפדפן.
 *
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export async function deleteMyAccount() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'לא מחובר' };

    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) {
      console.error('account.data.deleteMyAccount:', error.message);
      return { ok: false, error: 'שגיאת שרת' };
    }
    if (!data?.ok) {
      return { ok: false, error: data?.error || 'שגיאה לא ידועה' };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.error('account.data.deleteMyAccount:', err);
    return { ok: false, error: 'שגיאת רשת' };
  }
}
