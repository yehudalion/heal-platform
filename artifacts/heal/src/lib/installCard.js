/**
 * src/lib/installCard.js — "הוסיפו כאפליקציה": הכרטיס הבולט. 5.9.2026 (מוצ"ש),
 * לבקשת יהודה: "בא נוסיף את ה'הוסף כאפליקציה' שיהיה ממש בולט".
 *
 * lib/pwa.js (סשן שבת 5) מציג כפתור רק כשהדפדפן ירה beforeinstallprompt —
 * כלומר רק בכרום/אנדרואיד. באייפון אין אירוע כזה בכלל, ולכן רוב התלמידים
 * לא ראו שום דבר. הכרטיס הזה מופיע בכל דפדפן:
 *   · כרום/אנדרואיד/דסקטופ עם prompt → לחיצה אחת פותחת את חלון ההתקנה.
 *   · אייפון / כל השאר → לחיצה פותחת את המדריך (#/install) עם הצעדים למכשיר.
 * לא מופיע כשכבר רצים כאפליקציה (display-mode: standalone), ונעלם אחרי
 * "לא עכשיו" (נשמר במכשיר; חוזר אחרי 14 יום — לא נודניק, אבל גם לא נעלם לנצח).
 *
 * עוזר UI בלבד — בלי Supabase.
 */
import { canInstall, promptInstall } from './pwa.js';
import { navigate } from '../router.js';
import { BRAND } from './brand.js';

const DISMISS_KEY = 'hs:install:dismissed';
const DISMISS_DAYS = 14;

export function isStandalone() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
}

/** 'ios' | 'android' | 'desktop' */
export function platform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function dismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch { return false; }
}
function dismiss() { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ } }

function ensureStyles() {
  if (document.getElementById('hs-install-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-install-css';
  s.textContent = `
.ins-card{display:flex;align-items:center;gap:.9rem;margin:0 0 1.1rem;padding:.9rem 1.05rem;border-radius:14px;
  background:linear-gradient(135deg,var(--green-dark,#16412F),#1f5a41);color:#fff;
  box-shadow:0 8px 24px rgba(20,32,26,.16)}
.ins-ico{font-size:1.9rem;line-height:1;flex:0 0 auto}
.ins-txt{flex:1;min-width:0}
.ins-t{font-weight:800;font-size:.98rem;line-height:1.3}
.ins-s{font-size:.8rem;opacity:.88;margin-top:.15rem;line-height:1.5}
.ins-acts{display:flex;flex-direction:column;gap:.35rem;align-items:stretch;flex:0 0 auto}
.ins-btn{background:#fff;color:var(--green-dark,#16412F);border:0;border-radius:99px;padding:.5rem .95rem;
  font:inherit;font-size:.84rem;font-weight:800;cursor:pointer;white-space:nowrap}
.ins-btn:hover{background:#f1f5f2}
.ins-later{background:none;border:0;color:#fff;opacity:.75;font:inherit;font-size:.74rem;cursor:pointer;padding:.1rem}
.ins-later:hover{opacity:1;text-decoration:underline}
@media (max-width:520px){.ins-card{flex-wrap:wrap}.ins-acts{flex-direction:row;width:100%;justify-content:flex-start;align-items:center}}
`;
  document.head.appendChild(s);
}

/** HTML של הכרטיס, או '' אם אין מה להציג. */
export function installCardHtml() {
  if (isStandalone() || dismissed()) return '';
  const p = platform();
  const sub = p === 'ios'
    ? 'אייקון במסך הבית, מסך מלא, בלי סרגל כתובת — 3 לחיצות בספארי, בלי חנות.'
    : p === 'android'
      ? 'אייקון במסך הבית ומסך מלא — לחיצה אחת, בלי חנות ובלי הורדה.'
      : 'חלון משלו בלי טאבים — לחיצה אחת בכרום או ב-Edge.';
  return `<div class="ins-card" id="hsInstallCard" role="region" aria-label="התקנה כאפליקציה">
    <div class="ins-ico">📲</div>
    <div class="ins-txt"><div class="ins-t">הוסיפו את ${BRAND} כאפליקציה</div><div class="ins-s">${sub}</div></div>
    <div class="ins-acts">
      <button class="ins-btn" type="button" data-ins="go">${canInstall() ? 'להתקין עכשיו' : 'איך מוסיפים ←'}</button>
      <button class="ins-later" type="button" data-ins="later">לא עכשיו</button>
    </div>
  </div>`;
}

/** מחבר את הכרטיס אחרי ש-innerHTML הוצב. */
export function wireInstallCard(root) {
  const card = root.querySelector('#hsInstallCard');
  if (!card) return;
  ensureStyles();
  card.querySelector('[data-ins="go"]')?.addEventListener('click', async () => {
    if (canInstall()) {
      const ok = await promptInstall();
      if (ok) card.remove();
      return;
    }
    navigate('/install');
  });
  card.querySelector('[data-ins="later"]')?.addEventListener('click', () => { dismiss(); card.remove(); });
}
