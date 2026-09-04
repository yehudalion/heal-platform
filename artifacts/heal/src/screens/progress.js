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
 * REVISED 2026-08-26 (Lion): "topic coverage first, precise stats after" —
 * each module card now leads with a coverage bar (how much of the material
 * you've touched: X/Y words, keys or lectures) and keeps the existing
 * weak-point sentence underneath it. This is still the SHALLOW layer: a bar
 * plus one headline, never a worked example. The real example for a key like
 * "עוגן" lives one click away, at that module's own Analyze screen — showing
 * it twice (here AND there) is the exact duplication the 3-layer split was
 * built to avoid. What changed here is that a bare label like "עוגן" now
 * carries its own one-line gloss (KEY_GLOSS, reused verbatim from
 * rephrase-learn.js's approved copy) so the headline means something on its
 * own, without upgrading this screen into a second Analyze.
 *
 * HARD rules honoured:
 *  - Zero direct Supabase. Data comes from data/weakpoints.data.js,
 *    data/coverage.data.js, data/listening.data.js and data/profiles.data.js.
 *    supabase.js is imported for AUTH ONLY, which is what SITEMAP §6 says it
 *    is for.
 *  - Zero invented numbers. A number is rendered only if it came back from the
 *    data layer; otherwise the block says so. A coverage bar with no data
 *    behind it is simply not rendered — never a fabricated percentage.
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
import { upsertProfile } from '../data/profiles.data.js';
import { buildStudyIcs, downloadIcs } from '../lib/ics.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';   // auth only
import { getWeakPoints } from '../data/weakpoints.data.js';
import { getProfile } from '../data/profiles.data.js';
import { getCoverage } from '../data/coverage.data.js';
import { getListeningOverview } from '../data/listening.data.js';
import { renderCoverageBar, ensureCoverageBarStyles } from '../lib/coverageBar.js';
import { LEARN_BLOCKS, KEY_GLOSS } from './rephrase-learn.js';
import { getGuestProfile } from './onboarding.js';
import { joinWaitlist } from '../data/waitlist.data.js';
import { track } from '../lib/analytics.js';
// סשן שבת 1 (5.9.2026): הווידג'טים שעברו ממסך הבית לכאן — הבית עונה רק על
// "מה עושים עכשיו", וכל מה שהוא דוח גר כאן. ראו progress-widgets.js.
import { getWeeklyActivity } from '../data/plan.data.js';
import { getGamificationState, getBadges } from '../data/gamification.data.js';
import { listAttempts } from '../data/simulation.data.js';
import { getAccuracyByModule, getCumulativeGrowth, getActivityCalendar } from '../data/insights.data.js';
import { ensureStyles as ensureInsightStyles } from './insights.js';
import { getDailyTip } from '../data/dailyTip.data.js';
import { weeklyPaceCard, gamificationCard, diagnosticBand, metricsSection, tipCard } from './progress-widgets.js';

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
  if (!userId) {
    return { userId: null, reports: [], profile: getGuestProfile(), coverage: null, listeningOverview: null,
             weekly: null, gmState: null, badgeCodes: [], lastSim: null, accuracyRes: null, growthRes: null, calendarRes: null, tipRes: null };
  }
  const [reports, profileRes, coverageRes, listeningRes,
         weeklyRes, gmState, badgeCodes, simRes, accuracyRes, growthRes, calendarRes] = await Promise.all([
    getWeakPoints(userId),
    getProfile(userId),
    getCoverage(userId),
    getListeningOverview(userId),
    getWeeklyActivity(userId),
    getGamificationState(),
    getBadges(userId),
    listAttempts(userId, 1),
    getAccuracyByModule(userId),
    getCumulativeGrowth(userId),
    getActivityCalendar(userId),
  ]);
  return {
    userId,
    reports,
    profile: profileRes.data ?? null,
    coverage: coverageRes.data ?? null,
    listeningOverview: listeningRes.data ?? null,
    weekly: weeklyRes?.data ?? null,
    gmState: gmState || null,
    badgeCodes: badgeCodes || [],
    lastSim: (simRes?.data ?? [])[0] ?? null,
    accuracyRes, growthRes, calendarRes,
    tipRes: getDailyTip(),
  };
}

// ─── Shared rendering ────────────────────────────────────────────────────────

// A module's own Analyze screen, where the depth (and the real example) lives.
// Modules without one show the summary only — never a fake link.
const ANALYZE_ROUTE = { rephrase: '#/rephrase-analyze', listening: '#/listening/analyze' };

/**
 * Pairs a weak-point label with its one-line gloss when we have Lion-approved
 * copy for it (today: 3 of rephrase's 5 keys — see KEY_GLOSS in
 * rephrase-learn.js). This is the fix for "עוגן חסר משמעות": the label still
 * shows, it just no longer shows ALONE. No gloss exists yet for other
 * modules' keys, so they render exactly as before — no regression, no
 * invented wording.
 */
function labelWithGloss(moduleId, p) {
  const gloss = moduleId === 'rephrase' ? KEY_GLOSS[p.id] : null;
  const name = `<strong>${esc(p.label)}</strong>`;
  return gloss ? `${name} <span class="wp-gloss">(${esc(gloss)})</span>` : name;
}

/**
 * A SUMMARY, deliberately shallow. The per-label breakdown with examples and next
 * steps belongs to the module's own Analyze screen; repeating it here produced the
 * same three cards on /progress, /gap and /rephrase-analyze, and none of the three
 * told the learner what to do. This one names the headline and hands over.
 */
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
  const names = notable.slice(0, 2).map((p) => labelWithGloss(r.moduleId, p)).join(' · ');
  return `<p class="wp-empty">חוזר בסשנים האחרונים יותר משאר הסוגים: ${names}</p>`;
}

/**
 * A weakpoints.data.js report → one card. Rephrase (once it clears the
 * attempts bar) leads with a coverage bar — done = keys actually seen at all
 * (ranked + thin-exposure), total = LEARN_BLOCKS.length, the module's real key
 * count. Any other module report (sentenceCompletion, once shipped; anything
 * added later) falls back to the plain header — we don't know its key count
 * here, and a fabricated denominator is worse than no bar.
 */
function reportCard(r) {
  const deep = ANALYZE_ROUTE[r.moduleId] ?? null;
  const bar = (r.moduleId === 'rephrase' && r.status === 'ok')
    ? renderCoverageBar({
        label: r.moduleLabel,
        done: r.points.length + r.suppressed.length,
        total: LEARN_BLOCKS.length,
        unit: 'מפתחות',
      })
    : '';
  const head = bar ? '' : `<div class="wp-head">
      <span class="wp-module">${esc(r.moduleLabel)}</span>
      ${r.attempts ? `<span class="wp-count">${r.attempts} תרגולים</span>` : ''}
    </div>`;
  return `<div class="wp-card">
    ${head}${bar}
    ${moduleBody(r)}
    ${deep ? `<a class="wp-deep" href="${deep}">ראה ניתוח מלא ←</a>` : ''}
  </div>`;
}

/** Vocab has no weak-point collector yet (TODO T044+ in weakpoints.data.js) —
 * this card is coverage-only until one exists. */
// Two independent bars, never one (Lion, 2026-08-31: "הפס חייב רק להתקדם").
// A combined bar would drop a learner from 100% to ~21% the moment they open
// the extension pool. Core keeps its finished state as an achievement; the
// extension bar starts its own climb. See data/coverage.data.js for why the
// denominators are frozen per learner rather than counted from the library.
function vocabCard(coverage) {
  const core = coverage?.vocabCore ?? coverage?.vocab;
  if (!core) return '';
  const parts = [];

  if (core.complete) {
    parts.push(`<p class="wp-achieved">✓ סיימתם את כל ${core.total} מילות הליבה</p>`);
  } else {
    parts.push(renderCoverageBar({
      label: 'מילות הליבה', done: core.done, total: core.total, unit: 'מילים בסבב חזרות',
      reachable: core.reachable,
    }));
    if (Number.isFinite(core.reachable) && core.reachable < core.total) {
      parts.push(`<p class="wp-locked">${core.total - core.reachable} מילים נוספות נפתחות בגרסה המלאה.</p>`);
    }
  }

  const ext = coverage?.vocabExtension;
  if (ext) {
    parts.push(renderCoverageBar({
      label: 'מילות הרחבה', done: ext.done, total: ext.total, unit: 'מילים בסבב חזרות',
    }));
  }

  return `<div class="wp-card">${parts.join('')}</div>`;
}

/**
 * Listening has no weak-point collector yet either, but getListeningOverview
 * already computes a real per-type accuracy split (Lion, 2026-08-26: the two
 * exercise types split apart) — used here instead of inventing a headline.
 */
function listeningCard(coverage, overview) {
  const l = coverage?.listening;
  if (!l) return '';
  const bar = renderCoverageBar({ label: 'האזנה', done: l.done, total: l.total, unit: 'הרצאות שהושלמו' });
  const cont = overview?.byType?.continuation;
  const lec = overview?.byType?.lecture_qa;
  const parts = [];
  if (cont?.accuracyPct !== null && cont?.questionsAnswered > 0) parts.push(`השלמת משפט: ${cont.accuracyPct}%`);
  if (lec?.accuracyPct !== null && lec?.questionsAnswered > 0) parts.push(`הבנת קטע: ${lec.accuracyPct}%`);
  const body = parts.length ? `<p class="wp-empty">${parts.join(' · ')}</p>` : '';
  return `<div class="wp-card">${bar}${body}
    <a class="wp-deep" href="${ANALYZE_ROUTE.listening}">ראה ניתוח מלא ←</a>
  </div>`;
}

function signedOut() {
  return `<p class="wp-empty">יש להתחבר כדי לראות את הנתונים. <a href="#/home">← דף הבית</a></p>`;
}

// ─── /progress — the one implementation ──────────────────────────────────────

/**
 * תוכנית שבועית + ייצוא ליומן.
 *
 * הדבר היחיד במוצר שפועל מחוץ לאתר: אירוע חוזר ביומן עם תזכורת מביא אנשים
 * בחזרה בלי שנשלח להם הודעה אחת. הרעיון נלקח מהמתחרה (יש להם "הוסף ליומן"),
 * והוא זול ומשמעותי.
 *
 * ההעדפות נשמרות ב-user_profiles.study_plan (jsonb) — לא טבלה חדשה, כי זו
 * העדפה אחת של משתמש אחד בלי היסטוריה.
 */
function plannerCard(profile) {
  const plan = profile?.study_plan || {};
  const days = Array.isArray(plan.days) ? plan.days : [0, 2, 4];
  const hour = plan.hour || '18:00';
  const minutes = plan.minutes || profile?.daily_time_minutes || 20;
  const NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return `
    <section class="pl-card">
      <div class="pl-title">מתי אתם מתרגלים?</div>
      <p class="pl-sub">בחרו ימים ושעה, ואפשר לייצא את זה כאירוע חוזר ליומן —
        עם תזכורת עשר דקות לפני. תוכנית שיושבת ביומן נשמרת הרבה יותר טוב
        מתוכנית שיושבת בראש.</p>

      <div class="pl-days">
        ${NAMES.map((n, i) => `
          <button class="pl-day ${days.includes(i) ? 'is-on' : ''}" data-day="${i}"
                  aria-pressed="${days.includes(i)}">${n}</button>`).join('')}
      </div>

      <div class="pl-row">
        <label class="pl-lbl" for="plHour">שעה</label>
        <input class="pl-inp" type="time" id="plHour" value="${hour}" />
        <label class="pl-lbl" for="plMin">אורך</label>
        <select class="pl-inp" id="plMin">
          ${[10, 15, 20, 30, 45, 60].map((m) =>
            `<option value="${m}" ${m === minutes ? 'selected' : ''}>${m} דק'</option>`).join('')}
        </select>
      </div>

      <div class="pl-btns">
        <button class="btn-primary" id="plSave">שמירת התוכנית</button>
        <button class="pl-ghost" id="plIcs">📅 הוספה ליומן (.ics)</button>
      </div>
      <div class="pl-msg" id="plMsg"></div>
    </section>`;
}

/** מחבר את הפקדים של התוכנית. נפרד מהציור, כמו שאר המסך. */
function wirePlanner(el, userId, profile) {
  const card = el.querySelector('.pl-card');
  if (!card) return;
  const sel = new Set((profile?.study_plan?.days) || [0, 2, 4]);

  card.querySelectorAll('.pl-day').forEach((b) => {
    b.addEventListener('click', () => {
      const d = Number(b.dataset.day);
      if (sel.has(d)) sel.delete(d); else sel.add(d);
      b.classList.toggle('is-on');
      b.setAttribute('aria-pressed', sel.has(d) ? 'true' : 'false');
    });
  });

  const read = () => ({
    days: [...sel].sort(),
    hour: card.querySelector('#plHour').value || '18:00',
    minutes: Number(card.querySelector('#plMin').value) || 20,
  });
  const msg = card.querySelector('#plMsg');

  card.querySelector('#plSave').addEventListener('click', async () => {
    const plan = read();
    if (!plan.days.length) { msg.textContent = 'בחרו לפחות יום אחד.'; return; }
    msg.textContent = 'שומר…';
    const { error } = await upsertProfile(userId, { study_plan: plan });
    msg.textContent = error ? 'השמירה נכשלה — אפשר לנסות שוב.' : 'נשמר ✓';
  });

  card.querySelector('#plIcs').addEventListener('click', () => {
    const plan = read();
    if (!plan.days.length) { msg.textContent = 'בחרו לפחות יום אחד.'; return; }
    const ics = buildStudyIcs({ ...plan, examDate: profile?.exam_date || null });
    downloadIcs(ics);
    msg.textContent = 'הקובץ ירד — פתחו אותו ביומן Google, Apple או Outlook.';
  });
}

export async function renderProgress(root) {
  await renderLayout(root, '/progress');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  ensureStyles();
  ensureCoverageBarStyles();
  ensureInsightStyles();

  const { userId, reports, profile, coverage, listeningOverview,
          weekly, gmState, badgeCodes, lastSim, accuracyRes, growthRes, calendarRes, tipRes } = await load();
  const target = profile?.target_score ?? null;
  const examDate = profile?.exam_date ?? null;
  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null;

  const cardsHtml = [
    vocabCard(coverage),
    ...reports.map(reportCard),
    listeningCard(coverage, listeningOverview),
  ].filter(Boolean).join('');

  el.innerHTML = `
    <div class="fade-in" style="max-width:680px">
      <div class="page-title">ההתקדמות שלי</div>
      <div class="page-sub">${target ? `מה עלה בסשנים האחרונים. היעד שהגדרת: ${target}.` : 'מה עלה בסשנים האחרונים, לפי סוג השאלה.'}</div>

      ${userId ? weeklyPaceCard(weekly) : ''}
      ${userId ? tipCard(tipRes) : ''}

      ${!userId ? signedOut()
        : cardsHtml || `<p class="wp-empty">אין עדיין נתונים להצגה.</p>`}

      ${userId ? diagnosticBand(lastSim) : ''}
      ${userId ? metricsSection(accuracyRes, growthRes, calendarRes) : ''}

      ${userId ? `<div class="sec-title" style="margin-top:1.8rem">הדרגה שלך</div>${gamificationCard(gmState, badgeCodes)}` : ''}
      ${userId ? `<p style="margin:.2rem 0 1rem"><a class="wp-deep" href="#/mistake-notebook">📓 מחברת הטעויות — לתרגל שוב את מה שפספסת ←</a></p>` : ''}

      ${userId && cardsHtml ? `<p style="text-align:center;margin-top:.4rem"><a class="wp-deep" href="#/insights">תובנות מפורטות על כל הפעילות שלכם ←</a></p>` : ''}

      <p class="wp-foot">המספרים מתארים את הסשנים שנאספו, לא הערכה כוללת.</p>

      ${userId ? plannerCard(profile) : ''}

      <!-- PRODUCT DECISION — reproduced verbatim, not this refactor's call -->
      <div class="lock-upsell">
        <div style="font-size:1.8rem;margin-bottom:.5rem">🔒</div>
        <h4 style="font-size:.95rem;font-weight:900;margin-bottom:.4rem">הניתוח המלא — בקרוב</h4>
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

  wirePlanner(el, userId, profile);
  // הווידג'טים שעברו מהבית משתמשים ב-data-nav (פס האבחון, "כל התובנות").
  el.querySelectorAll('[data-nav]').forEach((t) => {
    t.addEventListener('click', () => navigate(t.dataset.nav));
  });

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
.wp-empty{font-size:.88rem;color:var(--muted);line-height:1.7;margin-top:.7rem}
.wp-empty a{color:var(--green-dark);font-weight:700}
.wp-empty strong{color:var(--text)}
.wp-gloss{font-weight:400;color:var(--muted)}
.wp-deep{display:inline-block;margin-top:.8rem;font-size:.83rem;font-weight:700;color:var(--green-dark);text-decoration:none}
.wp-achieved{margin:0 0 .7rem;font-size:.88rem;font-weight:800;color:var(--green-dark)}
.wp-locked{margin:-.3rem 0 .7rem;font-size:.76rem;color:var(--muted)}
.wp-deep:hover{text-decoration:underline}
.wp-foot{font-size:.75rem;color:var(--muted);margin-top:1.2rem;text-align:center}
`;
  document.head.appendChild(s);
}
