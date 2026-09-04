/**
 * src/lib/sound.js — נקודה אחת שאחראית לעצור צליל.
 *
 * למה (4.9.2026, תלונה של תלמיד דרך יהודה): "בכל האתר כשעוברים שאלה עם
 * צליל הצליל לא מפסיק". הסיבה: כל מסך ניגן לעצמו. המילון, מחברת הטעויות
 * והמילה של היום יצרו `new Audio(url)` בלי לשמור הפניה, ולכן לא היה למי לומר
 * "עצור"; ונגן ההרצאות (AudioPlayer, Howler) נהרס רק כשהמסך עצמו החליף פריט —
 * לא כשהתלמיד לחץ על "יציאה", על הסרגל, או על "אחורה" באמצע הרצאה.
 *
 * הפתרון: שני מנגנונים באותו קובץ.
 *   1. playClip(url) — הקראה קצרה (מילה/משפט). תמיד עוצרת את הקודמת לפני
 *      שהיא מתחילה, כך ששתי לחיצות רצופות לא מנגנות זו על גבי זו.
 *   2. registerStopper(fn) — כל נגן ארוך (AudioPlayer) נרשם כאן בבנייה
 *      ומוסר את עצמו בהריסה. stopAll() עוצר את כולם.
 * ומאזין אחד ל-hashchange שקורא ל-stopAll: כל ניווט, מכל מקור, משתיק.
 */

let clip = null;
const stoppers = new Set();

export function stopClip() {
  if (!clip) return;
  try { clip.pause(); clip.currentTime = 0; } catch (_) { /* ignore */ }
  clip = null;
}

export function playClip(url) {
  stopClip();
  if (!url) return null;
  try {
    clip = new Audio(url);
    clip.play().catch(() => {});
  } catch (_) { clip = null; }
  return clip;
}

export function registerStopper(fn) {
  stoppers.add(fn);
  return () => stoppers.delete(fn);
}

export function stopAll() {
  stopClip();
  for (const fn of [...stoppers]) {
    try { fn(); } catch (_) { /* ignore */ }
  }
}

window.addEventListener('hashchange', stopAll);
