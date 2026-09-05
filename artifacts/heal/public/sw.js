/* Wordwise service worker — סשן שבת 5 (5.9.2026), פריט 31 (PWA).
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
