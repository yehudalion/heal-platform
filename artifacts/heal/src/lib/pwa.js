/**
 * src/lib/pwa.js — התקנה כאפליקציה (PWA). סשן שבת 5 (5.9.2026), פריט 31.
 *
 * "אתר הוא טאב שנסגר; אפליקציה היא אייקון שרואים כל יום." שלושה חלקים:
 *   public/manifest.webmanifest — שם, צבעים, אייקונים (index.html מקשר)
 *   public/sw.js                 — service worker מינימלי (cache של קובצי
 *                                  האפליקציה בלבד; אף פעם לא קריאות API)
 *   הקובץ הזה                     — רישום ה-SW, ותפיסת beforeinstallprompt
 *                                  כדי שכפתור "להתקין" יופיע רק כשאפשר.
 *
 * הכפתור עצמו מצויר ב-layout.js (תחתית הסרגל הצדדי / מעל הסרגל התחתון)
 * ומחווט דרך wireInstallButton(). בדפדפן שלא תומך — שום דבר לא מופיע.
 */

let deferredPrompt = null;
const listeners = new Set();

function notify() { listeners.forEach((fn) => { try { fn(canInstall()); } catch { /* noop */ } }); }

export function canInstall() { return !!deferredPrompt; }

/** נרשם פעם אחת ב-main.js. בטוח להריץ בכל דפדפן. */
export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // בלי הבאנר האוטומטי של הדפדפן — הכפתור שלנו
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* אין SW — האתר עובד כרגיל */ });
    });
  }
}

/** מפעיל את חלון ההתקנה של הדפדפן. מחזיר true אם המשתמש אישר. */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const ev = deferredPrompt;
  deferredPrompt = null;
  ev.prompt();
  const choice = await ev.userChoice.catch(() => null);
  notify();
  return choice?.outcome === 'accepted';
}

/**
 * מחבר כפתור התקנה: מוסתר עד ש-beforeinstallprompt נורה, נעלם אחרי התקנה.
 * @param {HTMLElement|null} btn
 */
export function wireInstallButton(btn) {
  if (!btn) return;
  const sync = (ok) => { btn.hidden = !ok; };
  sync(canInstall());
  listeners.add(sync);
  btn.addEventListener('click', () => { promptInstall(); });
}
