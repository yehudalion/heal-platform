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
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession, isGuest } from '../supabase.js';
import { getProfile } from '../data/profiles.data.js';
import { getSessionStats } from '../data/srs.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { getListeningOverview } from '../data/listening.data.js';
import { getWeeklyActivity, getDailyPlan, nextLeg } from '../data/plan.data.js';
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
  const [profileRes, srsRes, weakReports, listeningRes, weeklyRes] = await Promise.all([
    userId ? getProfile(userId)           : Promise.resolve({ data: getGuestProfile() }),
    userId ? getSessionStats(userId)      : Promise.resolve({ data: null }),
    userId ? getWeakPoints(userId)        : Promise.resolve([]),
    userId ? getListeningOverview(userId) : Promise.resolve({ data: null }),
    userId ? getWeeklyActivity(userId)    : Promise.resolve({ data: { activeDays: [], target: 5 } }),
  ]);

  const profile   = profileRes?.data ?? null;
  const srs       = srsRes?.data ?? null;
  const rephrase  = weakReports.find((r) => r.moduleId === 'rephrase') ?? null;
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
  const lisAnswered = listening?.questionsAnswered ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">${GREETING()}, ${name}</div>
      <div class="page-sub">${daysLeft !== null
        ? `הבחינה בעוד ${daysLeft} ימים.`
        : 'אפשר להגדיר תאריך בחינה בכל רגע.'}</div>

      <!-- Weekly pace (replaces the streak — wellbeing rule) -->
      <div class="wk-card">
        <div class="wk-top">
          <span class="wk-lbl">השבוע</span>
          <span class="wk-count">${activeCount} מתוך ${weekly.target} ימים</span>
        </div>
        <div class="wk-dots">${dots}</div>
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
          <span class="mc-icon">🎧</span>
          <div class="mc-name">האזנה</div>
          <div class="mc-pct">${lisAnswered
            ? `${lisAnswered} שאלות שענית · דיוק ${listening?.accuracyPct ?? '—'}%`
            : '250 קטעים מחכים לך'}</div>
        </div>
        <div class="mc mc-g" data-nav="/card">
          <span class="mc-icon">🗂️</span>
          <div class="mc-name">אוצר מילים</div>
          <div class="mc-pct">${dueCount
            ? `${dueCount} מילים לחזרה היום`
            : (acquired ? `${acquired} מילים נרכשו` : 'עוד לא התחלת')}</div>
        </div>
        <div class="mc mc-p" data-nav="/rephrasing">
          <span class="mc-icon">✍️</span>
          <div class="mc-name">ניסוח מחדש</div>
          <div class="mc-pct">${rpAttempts ? `${rpAttempts} שאלות שתרגלת` : 'עוד לא התחלת'}</div>
        </div>
        <div class="mc mc-o mc-locked">
          <span class="lock-tag">🔒 בקרוב</span>
          <span class="mc-icon">✏️</span>
          <div class="mc-name">השלמת משפטים</div>
          <div class="mc-pct">בקרוב</div>
        </div>
      </div>
    </div>`;

  const daily = el.querySelector('#btn-daily');
  if (ctaRoute) daily.addEventListener('click', () => navigate(ctaRoute));
  el.querySelectorAll('[data-nav]').forEach(tile => {
    tile.addEventListener('click', () => navigate(tile.dataset.nav));
  });
}
