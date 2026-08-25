/**
 * src/screens/progress.js — two cross-module screens, one data source.
 *
 *   renderProgress → /progress   "ההתקדמות שלי" — the whole screen
 *   renderGap      → /gap        redirect only, kept for old links
 *
 * Rewritten 2026-08-05. The previous version hardcoded every number it showed
 * (68% restatement accuracy, "~25 נקודות לסגירה", a 30%→70% before/after chart)
 * and called getProgressStats() straight out of supabase.js.
 *
 * HARD rules honoured:
 *  - Zero direct Supabase. Data comes from data/weakpoints.data.js and
 *    data/profiles.data.js. supabase.js is imported for AUTH ONLY, which is what
 *    SITEMAP §6 says it is for.
 *  - Zero invented numbers. A number is rendered only if it came back from the
 *    data layer; otherwise the block says so.
 *  - Descriptive phrasing (SITEMAP §2): every sentence describes the SESSIONS.
 *    Never "יש לך חולשה ב-", never second-person judgement. This is the only file
 *    that turns weak-point numbers into words — keep it that way.
 *
 * DELIBERATELY UNTOUCHED (product decisions, not this refactor's call):
 *  - the "⏰ X ימים נותרו" urgency banner
 *  - the "🔒 ₪99 לספרינט" paywall
 * Both are reproduced verbatim below. The banner needs a real exam date, which now
 * arrives through profiles.data.js; with no date on the profile it renders a
 * neutral placeholder rather than the old invented 86-day default.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';   // auth only
import { getWeakPoints } from '../data/weakpoints.data.js';
import { getProfile } from '../data/profiles.data.js';
import { getGuestProfile } from './onboarding.js';
import { joinWaitlist } from '../data/waitlist.data.js';
import { track } from '../lib/analytics.js';

// A point whose lift clears this is worth calling out. Below it the differences
// are not meaningful enough to name (lift ≈ 1 means "nothing to report").
const NOTABLE_LIFT = 1.25;

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

async function load() {
  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  // Guests get the same local exam-date/minutes cold-start home.js already uses —
  // without this the countdown banner below wrongly claimed no exam date was set.
  if (!userId) return { userId: null, reports: [], profile: getGuestProfile() };
  const [reports, profileRes] = await Promise.all([
    getWeakPoints(userId),
    getProfile(userId),
  ]);
  return { userId, reports, profile: profileRes.data ?? null };
}

// ─── Shared rendering ────────────────────────────────────────────────────────

// A module's own Analyze screen, where the depth lives. Modules without one show
// the summary only.
const ANALYZE_ROUTE = { rephrase: '#/rephrase-analyze' };

/**
 * A SUMMARY, deliberately shallow. The per-label breakdown with examples and next
 * steps belongs to the module's own Analyze screen; repeating it here produced the
 * same three cards on /progress, /gap and /rephrase-analyze, and none of the three
 * told the learner what to do. This one names the headline and hands over.
 */
function moduleCard(r) {
  const deep = ANALYZE_ROUTE[r.moduleId] ?? null;
  return `<div class="wp-card">
    <div class="wp-head">
      <span class="wp-module">${esc(r.moduleLabel)}</span>
      ${r.attempts ? `<span class="wp-count">${r.attempts} תרגולים</span>` : ''}
    </div>
    ${moduleBody(r)}
    ${deep ? `<a class="wp-deep" href="${deep}">ראה ניתוח מלא ←</a>` : ''}
  </div>`;
}

function moduleBody(r) {
  if (r.status === 'not_started') {
    return `<p class="wp-empty">התרגול במודול הזה עוד לא התחיל.</p>`;
  }
  if (r.status === 'insufficient_data') {
    const left = Math.max(0, r.minAttempts - r.attempts);
    return `<p class="wp-empty">עוד ${left} תרגולים ואפשר יהיה לתאר מגמה.</p>`;
  }
  const notable = r.points.filter((p) => p.lift !== null && p.lift >= NOTABLE_LIFT);
  if (!notable.length) {
    return `<p class="wp-empty">בסשנים האחרונים אף סוג לא בלט על פני האחרים.</p>`;
  }
  const names = notable.slice(0, 2).map((p) => esc(p.label)).join(' · ');
  return `<p class="wp-empty">חוזר בסשנים האחרונים יותר משאר הסוגים: <strong>${names}</strong></p>`;
}

function signedOut() {
  return `<p class="wp-empty">יש להתחבר כדי לראות את הנתונים. <a href="#/home">← דף הבית</a></p>`;
}

// ─── /progress — the one implementation ──────────────────────────────────────

export async function renderProgress(root) {
  await renderLayout(root, '/progress');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  ensureStyles();

  const { userId, reports, profile } = await load();
  const target = profile?.target_score ?? null;
  const examDate = profile?.exam_date ?? null;
  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null;

  el.innerHTML = `
    <div class="fade-in" style="max-width:680px">
      <div class="page-title">ההתקדמות שלי</div>
      <div class="page-sub">${target ? `מה עלה בסשנים האחרונים. היעד שהגדרת: ${target}.` : 'מה עלה בסשנים האחרונים, לפי סוג השאלה.'}</div>

      ${!userId ? signedOut()
        : reports.length ? reports.map(moduleCard).join('')
        : `<p class="wp-empty">אין עדיין נתונים להצגה.</p>`}

      <p class="wp-foot">המספרים מתארים את הסשנים שנאספו, לא הערכה כוללת.</p>

      <!-- PRODUCT DECISION — reproduced verbatim, not this refactor's call -->
      <div class="lock-upsell">
        <div style="font-size:1.8rem;margin-bottom:.5rem">🔒</div>
        <h4 style="font-size:.95rem;font-weight:900;margin-bottom:.4rem">ניתוח מלא נעול — דרוש מסלול כסף</h4>
        <p style="font-size:.82rem;color:var(--muted);line-height:1.5;margin-bottom:.9rem">תוכנית אישית מדויקת — אילו מילים ללמוד, אילו שאלות לתרגל, מה לעשות כל יום. נפתח בקרוב.</p>
        <form id="waitForm" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <input id="waitEmail" type="email" required placeholder="המייל שלך" dir="ltr"
                 style="flex:1;min-width:180px;max-width:260px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:.85rem">
          <button class="btn-primary" type="submit">שמרו לי מקום במחיר השקה</button>
        </form>
        <p id="waitMsg" style="font-size:.78rem;color:var(--muted);margin-top:.6rem">בלי ספאם — עדכון אחד כשהמסלול נפתח, במחיר מוזל למצטרפים מוקדם.</p>
      </div>

      <!-- PRODUCT DECISION — reproduced verbatim. The old code invented a default of
           86 days when the profile had no exam date; with no date we now say so. -->
      <div style="background:var(--red-light);border:1.5px solid var(--red);border-radius:var(--radius-sm);padding:.9rem 1.1rem;margin-top:1rem;font-size:.83rem;color:var(--red);display:flex;align-items:center;gap:9px">
        <span style="font-size:1.1rem">⏰</span>
        <span>${daysLeft !== null
          ? `<strong>${daysLeft} ימים נותרו.</strong>`
          : 'לא הוגדר תאריך בחינה בפרופיל.'}</span>
      </div>
    </div>`;

  // Waitlist form — replaces the dead ₪99 button (Lion, 2026-08-25).
  const form = el.querySelector('#waitForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = el.querySelector('#waitMsg');
    const res = await joinWaitlist(el.querySelector('#waitEmail').value, 'progress');
    if (res.invalid) { msg.textContent = 'כתובת המייל לא נראית תקינה — בדקו אותה.'; return; }
    if (!res.ok)     { msg.textContent = 'השמירה נכשלה — נסו שוב עוד רגע.'; return; }
    track('waitlist_joined', { source: 'progress', already: !!res.already });
    form.style.display = 'none';
    msg.textContent = res.already
      ? '✓ המייל הזה כבר שמור אצלנו — נעדכן אתכם ראשונים.'
      : '✓ שמור לכם מקום — נעדכן במייל כשהמסלול נפתח.';
  });
}

// ─── /gap — redirect only ────────────────────────────────────────────────────

/**
 * Merged into /progress on 2026-08-05. The two screens rendered the same module
 * summary; /gap only added the target line, the paywall and the countdown, all of
 * which now live above. The route survives so existing links and bookmarks keep
 * working, but it holds NO rendering logic — there is exactly one implementation.
 *
 * location.replace, not navigate(): navigate() pushes a history entry, so Back from
 * /progress would land on /gap and be bounced forward again — a back-button trap.
 * replace() swaps the current entry instead, and still fires hashchange.
 */
export async function renderGap() {
  location.replace('#/progress');
}

// ─── Scoped styles ───────────────────────────────────────────────────────────
function ensureStyles() {
  if (document.getElementById('wp-css')) return;
  const s = document.createElement('style');
  s.id = 'wp-css';
  s.textContent = `
.wp-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem 1.3rem;margin-bottom:1rem}
.wp-head{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;margin-bottom:.9rem}
.wp-module{font-size:1rem;font-weight:800}
.wp-count{font-size:.75rem;color:var(--muted);font-weight:700}
.wp-empty{font-size:.88rem;color:var(--muted);line-height:1.7}
.wp-empty a{color:var(--green-dark);font-weight:700}
.wp-empty strong{color:var(--text)}
.wp-deep{display:inline-block;margin-top:.8rem;font-size:.83rem;font-weight:700;color:var(--green-dark);text-decoration:none}
.wp-deep:hover{text-decoration:underline}
.wp-foot{font-size:.75rem;color:var(--muted);margin-top:1.2rem;text-align:center}
`;
  document.head.appendChild(s);
}
