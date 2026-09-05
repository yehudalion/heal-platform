/**
 * src/lib/sessionSetup.js — "לפני שמתחילים": שלוש בחירות לפני מנה.
 *
 * סשן שבת 5 (5.9.2026), פריטים 27-28 מרשימת המתחרה, לפי הכרעת יהודה:
 * מסך הגדרות קצר לפני מנה בכל פינת תרגול, שמחליף את בחירת "קצר/ארוך".
 *   טיימר    — בלי / 20 דק׳ / 30 דק׳ (לא מעניש: כשהזמן נגמר, רק שורה שקטה)
 *   משוב     — אחרי כל שאלה / בסוף המנה (כמו במבחן)
 *   גודל מנה — 5 / 10 / 20
 *
 * הבחירות נשמרות במכשיר; מי שלא נוגע מקבל ברירות מחדל ומתחיל בלחיצה אחת.
 * גודל המנה נשמר דרך sessionPrefs.setSessionLength — אותו מפתח שמסכי
 * התרגול כבר קוראים, כך שלא נגענו בקוראים הקיימים.
 *
 * הטיפ היומי (dailyTip.data.js) עבר לכאן מ-/progress — סשן 1 סימן שזה
 * מקומו האמיתי: רגע לפני שמתחילים, לא בדוח.
 *
 * עוזר UI בלבד — בלי Supabase, מותר לייבא מכל מסך.
 */
import { getSessionLength, setSessionLength } from './sessionPrefs.js';
import { getDailyTip } from '../data/dailyTip.data.js';

const KEY = 'hs:sessionSetup';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
}
function write(module, patch) {
  try {
    const all = readAll();
    all[module] = { ...(all[module] || {}), ...patch };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* מצב פרטי: הבחירה פשוט לא תישמר */ }
}

/** 'each' | 'end' */
export function getFeedbackMode(module) {
  const v = readAll()[module]?.feedback;
  return v === 'end' ? 'end' : 'each';
}
/** דקות: 0 (בלי) | 20 | 30 */
export function getTimerMinutes(module) {
  const v = Number(readAll()[module]?.timer);
  return [20, 30].includes(v) ? v : 0;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function ensureStyles() {
  if (document.getElementById('hs-setup-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-setup-css';
  s.textContent = `
.hs-setup{display:grid;gap:.55rem;margin:0 0 1rem}
.hs-setup-lbl{font-size:.7rem;font-weight:800;color:var(--muted);letter-spacing:.04em}
.hs-setup-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap}
.hs-setup-row>span{font-size:.86rem;font-weight:700}
.hs-tog{display:flex;gap:.35rem;flex-wrap:wrap}
.hs-tog button{padding:.32rem .7rem;border:1.5px solid var(--border);border-radius:99px;background:var(--card);
  font:inherit;font-size:.78rem;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.hs-tog button.on{background:var(--green-dark,#16412F);color:#fff;border-color:var(--green-dark,#16412F)}
.hs-setup-note{font-size:.74rem;color:var(--muted)}
.hs-setup-tip{border:1.5px dashed var(--gold,#B08442);background:rgba(176,132,66,.08);border-radius:10px;
  padding:.55rem .75rem;font-size:.82rem;line-height:1.6;margin-top:.2rem}
.hs-setup-tip b{color:var(--green-dark,#16412F)}
.hs-timer{font-variant-numeric:tabular-nums;font-weight:800}
.hs-timer.is-over{color:var(--muted)}
`;
  document.head.appendChild(s);
}

/**
 * כרטיס ההגדרות. `sizes` — גודלי מנה מותרים לפינה (ברירת מחדל 5/10/20);
 * `defaultSize` — הגודל כשלא נבחר; `rows` — אילו שורות להציג
 * (למשל כרטיסיות: רק גודל, כי אין שם משוב וטיימר).
 * @returns {{html:string, wire:(root:HTMLElement, onSize?:(n:number)=>void)=>void}}
 */
export function setupCard(module, {
  sizes = [5, 10, 20], defaultSize = 5, rows = ['timer', 'feedback', 'size'], showTip = true,
} = {}) {
  const cur = {
    timer: getTimerMinutes(module),
    feedback: getFeedbackMode(module),
    size: getSessionLength(module, defaultSize),
  };
  const tog = (name, opts) => `<div class="hs-tog" data-set="${name}">${opts.map((o) =>
    `<button type="button" data-v="${o.v}" class="${String(o.v) === String(cur[name]) ? 'on' : ''}">${esc(o.label)}</button>`).join('')}</div>`;

  const parts = [`<div class="hs-setup-lbl">לפני שמתחילים</div>`];
  if (rows.includes('timer')) parts.push(`<div class="hs-setup-row"><span>טיימר</span>${tog('timer', [
    { v: 0, label: 'בלי' }, { v: 20, label: '20 דק׳' }, { v: 30, label: '30 דק׳' }])}</div>`);
  if (rows.includes('feedback')) parts.push(`<div class="hs-setup-row"><span>משוב</span>${tog('feedback', [
    { v: 'each', label: 'אחרי כל שאלה' }, { v: 'end', label: 'בסוף המנה' }])}</div>`);
  if (rows.includes('size')) parts.push(`<div class="hs-setup-row"><span>גודל מנה</span>${tog('size',
    sizes.map((n) => ({ v: n, label: String(n) })))}</div>`);
  parts.push(`<div class="hs-setup-note">ההגדרות נשמרות לפעם הבאה.</div>`);

  if (showTip) {
    let tip = null;
    try { tip = getDailyTip()?.tip ?? null; } catch { tip = null; }
    // הטיפ מוצג רק בפינה שהוא נוגע בה (tip.module) — טיפ על ניסוח מחדש
    // בפתיחת מנת תחיליות הוא רעש. פינות בלי מפתחות (כרטיסיות) לא מציגות טיפ.
    if (tip && tip.module === module) {
      parts.push(`<div class="hs-setup-tip"><b>💡 הטיפ של היום — ${esc(tip.label)}:</b> ${esc(tip.cue)}
        <a href="${esc(tip.learnHref)}" style="font-weight:700">ההסבר המלא ←</a></div>`);
    }
  }

  const html = `<div class="hs-setup" data-module="${esc(module)}">${parts.join('')}</div>`;

  /** @param {(size:number)=>void} [onSize] נקרא כשגודל המנה משתנה */
  function wire(root, onSize) {
    ensureStyles();
    const box = root.querySelector(`.hs-setup[data-module="${module}"]`);
    if (!box) return;
    box.querySelectorAll('.hs-tog').forEach((row) => {
      const name = row.dataset.set;
      row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        row.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        const v = b.dataset.v;
        if (name === 'size') { setSessionLength(module, Number(v)); if (onSize) onSize(Number(v)); }
        else if (name === 'timer') write(module, { timer: Number(v) });
        else if (name === 'feedback') write(module, { feedback: v });
      }));
    });
  }
  return { html, wire };
}

// ─── טיימר המנה ─────────────────────────────────────────────────────────────
// לא מעניש: כשהזמן נגמר לא קורה כלום מלבד שהשעון מפסיק והשורה משתנה
// ל"הזמן נגמר — אפשר להמשיך". מדידת הזמן בתוך השאלות נשמרת בנפרד (pace.js).

/**
 * @param {number} minutes  0 = בלי טיימר → מחזיר null
 * @returns {{html:()=>string, start:(root:HTMLElement)=>void, stop:()=>void}|null}
 */
export function packTimer(minutes) {
  if (!minutes) return null;
  const deadline = Date.now() + minutes * 60000;
  let handle = null;
  const fmt = () => {
    const left = Math.max(0, deadline - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const html = () => `<span class="hs-timer" data-hs-timer>⏱ ${fmt()}</span>`;
  function tick(root) {
    const el = root.querySelector('[data-hs-timer]');
    if (!el) return;
    const left = deadline - Date.now();
    if (left <= 0) { el.textContent = 'הזמן נגמר — אפשר להמשיך'; el.classList.add('is-over'); stop(); return; }
    el.textContent = `⏱ ${fmt()}`;
  }
  function start(root) { stop(); ensureStyles(); tick(root); handle = setInterval(() => tick(root), 1000); }
  function stop() { if (handle) { clearInterval(handle); handle = null; } }
  return { html, start, stop, minutes };
}
