/* מעל הרף — service worker — סשן שבת 5 (5.9.2026), פריט 31 (PWA).
 * מינימלי בכוונה: cache של קובצי האפליקציה בלבד (HTML, JS, CSS, אייקונים,
 * גופנים סטטיים). קריאות API (Supabase, אנליטיקה, שמע מהבאקט) לעולם לא
 * נשמרות — network only. שינוי VERSION מנקה את כל ה-cache הישן.
 */
const VERSION = 'ww-2026-09-05-1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];
const NEVER_CACHE = [/supabase\.co/, /supabase\.in/, /googleapis\.com\/(?!css)/, /gstatic\.com/, /google-analytics/, /googletagmanager/, /plausible/, /heal-audio/, /\.mp3(\?|$)/];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                 // צד שלישי: לא נוגעים
  if (NEVER_CACHE.some((rx) => rx.test(req.url))) return;
  const isAsset = url.pathname.startsWith('/assets/') || /\.(js|css|svg|png|webmanifest|woff2?)$/.test(url.pathname);
  const isNav = req.mode === 'navigate';
  if (!isAsset && !isNav) return;

  if (isAsset) {
    // קובצי build עם hash בשם: cache-first, ואז רשת.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  // ניווט: network-first, ואם אין רשת — ה-shell מה-cache.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) caches.open(VERSION).then((c) => c.put('/index.html', res.clone()));
    return res;
  }).catch(() => caches.match('/index.html')));
});

// ─── Web Push (6.9.2026) ────────────────────────────────────────────────────
// תזכורת אחת ביום למי שביקש אותה, ורק אם באמת מחכות לו חזרות. הטקסט מגיע
// מה-Edge Function (send-daily-push) — ה-SW רק מציג. אין כאן שום שפה מענישה:
// לא "הרצף שלך נגמר" ולא "פספסת" — רק מה מחכה, ולחיצה שמביאה ישר לתרגול.

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  const title = d.title || 'זמן לתרגול קצר';
  const opts = {
    body: d.body || 'המנה של היום מחכה.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: d.tag || 'daily-reminder',   // התראה חדשה מחליפה ישנה, לא נערמת
    renotify: false,
    requireInteraction: false,
    data: { url: d.url || '/#/home' },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || '/#/home';
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // אם האפליקציה כבר פתוחה — לא פותחים חלון שני, רק מביאים אותה לפנים.
    for (const c of all) {
      if (c.url.includes(self.location.origin)) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(target); } catch { /* noop */ } }
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
