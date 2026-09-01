/**
 * Dashboard — "primary button + module grid" template (SITEMAP §1, chosen by
 * Lion 2026-08-17 from three mockups in docs/mockups/dashboard-options.html).
 *
 * Top to bottom:
 *   1. Greeting + days-to-exam (information, not a threat).
 *   2. Weekly pace — "learned X of 5 days this week", five dots. Resets weekly
 *      by construction; nothing ever "breaks". REPLACES the streak (wellbeing
 *      rule): loss-aversion is the streak's engine, and its failure mode —
 *      churn after a busy week — is worst for students with a real exam date.
 *   3. One primary CTA — start / resume today's plan (plan.data.js composes it
 *      adaptively; the start-vs-resume distinction is internal state, not a
 *      student choice).
 *   4. Module grid — direct access with REAL state per tile, not a static menu.
 *
 * All data flows through src/data/*.data.js (ARCHITECTURE §2.11).
 *
 * Sentence Completion tile unlocked 2026-08-25 (SITEMAP §3/§4 — the module's
 * three layers are built and routed). Its attempt count comes for free from
 * getWeakPoints(), which already fetches a 'sentenceCompletion' report now
 * that weakpoints.data.js registers that module's collector — no extra fetch.
 * NOT yet a leg in plan.data.js's daily plan (that composer currently splits
 * time between exactly two modules; turning it into a three-way split is an
 * architecture change of its own, flagged separately, not decided here).
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession, isGuest } from '../supabase.js';
import { getProfile } from '../data/profiles.data.js';
import { getSessionStats } from '../data/srs.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { getListeningOverview } from '../data/listening.data.js';
import { getWeeklyActivity, getDailyPlan, nextLeg } from '../data/plan.data.js';
import { getCoverage } from '../data/coverage.data.js';
import { LEARN_BLOCKS } from './rephrase-learn.js';
import { getGuestProfile } from './onboarding.js';

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 18) return 'צהריים טובים';
  return 'ערב טוב';
};

export async function renderHome(root) {
  await renderLayout(root, '/home');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  const guest   = isGuest() && !userId;
  const name    = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';

  // ── Data (guests get cold-start defaults — no per-user rows exist) ──────────
  const [profileRes, srsRes, weakReports, listeningRes, weeklyRes, coverageRes] = await Promise.all([
    userId ? getProfile(userId)           : Promise.resolve({ data: getGuestProfile() }),
    userId ? getSessionStats(userId)      : Promise.resolve({ data: null }),
    userId ? getWeakPoints(userId)        : Promise.resolve([]),
    userId ? getListeningOverview(userId) : Promise.resolve({ data: null }),
    userId ? getWeeklyActivity(userId)    : Promise.resolve({ data: { activeDays: [], target: 5 } }),
    userId ? getCoverage(userId)          : Promise.resolve({ data: null }),
  ]);

  const profile   = profileRes?.data ?? null;
  const srs       = srsRes?.data ?? null;
  const rephrase  = weakReports.find((r) => r.moduleId === 'rephrase') ?? null;
  const sc        = weakReports.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
  const listening = listeningRes?.data ?? null;
  const weekly    = weeklyRes?.data ?? { activeDays: [], target: 5 };

  const minutes = profile?.daily_time_minutes ?? 20;
  const planRes = userId ? await getDailyPlan(userId, minutes) : { data: null };
  const plan    = planRes?.data ?? null;

  // ── Derived display state ───────────────────────────────────────────────────
  const examDate = profile?.exam_date ?? null;
  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null;

  const activeCount = weekly.activeDays.length;
  const dots = Array.from({ length: weekly.target }, (_, i) =>
    `<i class="wk-dot${i < activeCount ? ' on' : ''}"></i>`).join('');

  const leg = plan ? nextLeg(plan) : null;
  let ctaTitle, ctaSub, ctaRoute;
  if (!plan || (!plan.started && leg)) {
    ctaTitle = 'התחל את המנה של היום';
    ctaSub   = plan
      ? `${plan.legs.map(l => l.label).join(' · ')} · כ-${plan.totalMinutes} דקות`
      : `כ-${minutes} דקות`;
    ctaRoute = leg?.route ?? '/card';
  } else if (leg) {
    ctaTitle = 'המשך מהמקום שעצרת';
    ctaSub   = `${leg.label} · נשארו כ-${plan.remainingMinutes} דקות מהמנה של היום`;
    ctaRoute = leg.route;
  } else {
    ctaTitle = 'המנה של היום הושלמה ✓';
    ctaSub   = 'רוצה עוד? בחר מודול מלמטה';
    ctaRoute = null;
  }

  const acquired  = srs?.in_review ?? 0;
  const dueCount  = plan?.legs?.find(l => l.moduleId === 'vocab')?.targetItems ?? null;
  const rpAttempts = rephrase?.attempts ?? 0;
  const scAttempts = sc?.attempts ?? 0;
  const lisAnswered = listening?.questionsAnswered ?? 0;

  // Coverage bars (Lion, 2026-08-27: "fill the empty home screen with graphs").
  // Same source of truth as /progress (data/coverage.data.js + weakpoints.data.js
  // reports) — never a second, inconsistent number. total<=0 or missing data
  // renders no bar at all, never a fabricated percentage (coverageBar.js rule).
  const coverage = coverageRes?.data ?? null;
  const modPct = (done, total) =>
    (Number.isFinite(total) && total > 0) ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : null;
  const vocabPct = coverage?.vocab ? modPct(coverage.vocab.done, coverage.vocab.total) : null;
  const listenPct = coverage?.listening ? modPct(coverage.listening.done, coverage.listening.total) : null;
  const rephrasePct = (rephrase?.status === 'ok')
    ? modPct((rephrase.points?.length ?? 0) + (rephrase.suppressed?.length ?? 0), LEARN_BLOCKS.length)
    : null;
  const bar = (pct) => (pct === null ? '' : `<div class="mc-bar"><div class="mc-fill" style="width:${pct}%"></div></div>`);

  // ── Render ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">${GREETING()}, ${name}</div>
      <div class="page-sub">${daysLeft !== null
        ? `הבחינה בעוד ${daysLeft} ימים.`
        : 'אפשר להגדיר תאריך בחינה בכל רגע.'}</div>

      <!-- Weekly pace (replaces the streak — wellbeing rule).
           2026-08-30 (Lion): also the home screen's entry point to
           "ההתקדמות שלי" — data-nav is wired for free by the existing
           [data-nav] click handler below, same one the module tiles use. -->
      <div class="wk-card" data-nav="/progress">
        <div class="wk-top">
          <span class="wk-lbl">השבוע</span>
          <span class="wk-count">${activeCount} מתוך ${weekly.target} ימים</span>
        </div>
        <div class="wk-dots">${dots}</div>
        <div class="wk-more">לצפייה בהתקדמות המלאה ←</div>
      </div>

      <!-- One primary CTA -->
      <button class="daily-cta" id="btn-daily" ${ctaRoute ? '' : 'disabled'}>
        <span class="daily-cta-title">${ctaTitle}</span>
        <span class="daily-cta-sub">${ctaSub}</span>
      </button>

      <!-- Module grid — real state per tile -->
      <div class="sec-title" style="margin-top:1.4rem">או תרגל נושא מסוים</div>
      <div class="module-grid">
        <div class="mc mc-g" data-nav="/listening">
          <div class="mc-icon-wrap"><span class="mc-icon">🎧</span></div>
          <div class="mc-name">האזנה</div>
          ${bar(listenPct)}
          <div class="mc-pct">${lisAnswered
            ? `${lisAnswered} שאלות שענית · דיוק ${listening?.accuracyPct ?? '—'}%`
            : '250 קטעים מחכים לך'}</div>
        </div>
        <div class="mc mc-b" data-nav="/card">
          <div class="mc-icon-wrap"><span class="mc-icon">🗂️</span></div>
          <div class="mc-name">אוצר מילים</div>
          ${bar(vocabPct)}
          <div class="mc-pct">${dueCount
            ? `${dueCount} מילים לחזרה היום`
            : (acquired ? `${acquired} מילים נרכשו` : 'עוד לא התחלת')}</div>
        </div>
        <div class="mc mc-p" data-nav="/rephrasing">
          <div class="mc-icon-wrap"><span class="mc-icon">✍️</span></div>
          <div class="mc-name">ניסוח מחדש</div>
          ${bar(rephrasePct)}
          <div class="mc-pct">${rpAttempts ? `${rpAttempts} שאלות שתרגלת` : 'עוד לא התחלת'}</div>
        </div>
        <div class="mc mc-o" data-nav="/sentence-completion">
          <div class="mc-icon-wrap"><span class="mc-icon">✏️</span></div>
          <div class="mc-name">השלמת משפטים</div>
          <div class="mc-pct">${scAttempts ? `${scAttempts} שאלות שתרגלת` : 'עוד לא התחלת'}</div>
        </div>
      </div>

      <!-- 2026-09-01 (Lion): תשעת המדריכים היו נגישים רק דרך גוגל — משתמש
           שכבר בפנים לא נתקל בהם בשום מקום. זה הילד השביעי בפריסת הבית,
           ולכן נוסף לו כלל grid-row מפורש ב-styles.css (שורה 6); בלעדיו
           הוא היה מוצב אוטומטית ושובר את הפריסה בדסקטופ. -->
      <div class="guides-strip" data-nav="/guides">
        <span class="gs-icon">📖</span>
        <div class="gs-text">
          <div class="gs-title">מדריכים למבחן</div>
          <div class="gs-sub">מה זה הלאל, מה ההבדל מאמירם, ומה נבדק בכל חלק — בלי הרשמה</div>
        </div>
        <span class="gs-arrow">←</span>
      </div>
    </div>`;

  const daily = el.querySelector('#btn-daily');
  if (ctaRoute) daily.addEventListener('click', () => navigate(ctaRoute));
  el.querySelectorAll('[data-nav]').forEach(tile => {
    tile.addEventListener('click', () => navigate(tile.dataset.nav));
  });
}
