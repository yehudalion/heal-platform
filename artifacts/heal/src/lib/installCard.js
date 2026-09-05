/**
 * src/lib/installCard.js — "הוסיפו כאפליקציה": הכרטיס הבולט. 5.9.2026 (מוצ"ש),
 * לבקשת יהודה: "בא נוסיף את ה'הוסף כאפליקציה' שיהיה ממש בולט".
 *
 * ניסוח קצר (יהודה, 5.9): פס אחד לחיץ, בלי כותרת ותת-כותרת.
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

const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
.ins-bar{position:relative;display:block;width:100%;margin:0 0 1.1rem;padding:.95rem 2.6rem;
  border:0;border-radius:14px;font:inherit;font-size:1.02rem;font-weight:800;color:#fff;cursor:pointer;text-align:center;
  background:linear-gradient(135deg,var(--green-dark,#16412F),#1f5a41);
  box-shadow:0 8px 24px rgba(20,32,26,.18);transition:transform .12s,box-shadow .12s}
.ins-bar:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(20,32,26,.24)}
.ins-bar:active{transform:translateY(0)}
.ins-bar .ins-go{opacity:.9;font-weight:800}
.ins-x{position:absolute;left:.5rem;top:50%;transform:translateY(-50%);background:none;border:0;color:#fff;
  opacity:.6;font-size:1.15rem;line-height:1;cursor:pointer;padding:.25rem .4rem;border-radius:8px}
.ins-x:hover{opacity:1;background:rgba(255,255,255,.14)}
@media (max-width:400px){.ins-bar{font-size:.92rem}}
`;
  document.head.appendChild(s);
}

/** HTML של הפס, או '' אם אין מה להציג. */
export function installCardHtml() {
  if (isStandalone() || dismissed()) return '';
  // ניסוח קצר בכוונה (יהודה, 5.9): שורה אחת שאומרת מה עושים, לא כרטיס מסביר.
  const cta = canInstall() ? 'מומלץ להתקין כאפליקציה' : 'מומלץ להוסיף כאפליקציה';
  return `<div style="position:relative" data-brand="${esc(BRAND)}">
    <button class="ins-bar" id="hsInstallCard" type="button" data-ins="go">
      📲 ${cta} <span class="ins-go">←</span>
    </button>
    <button class="ins-x" type="button" data-ins="later" aria-label="לא עכשיו" title="לא עכשיו">×</button>
  </div>`;
}

/** מחבר את הפס אחרי ש-innerHTML הוצב. */
export function wireInstallCard(root) {
  const bar = root.querySelector('#hsInstallCard');
  if (!bar) return;
  ensureStyles();
  const wrap = bar.parentElement;
  bar.addEventListener('click', async () => {
    if (canInstall()) {
      const ok = await promptInstall();
      if (ok) wrap?.remove();
      return;
    }
    navigate('/install');
  });
  wrap?.querySelector('[data-ins="later"]')?.addEventListener('click', () => { dismiss(); wrap.remove(); });
}
