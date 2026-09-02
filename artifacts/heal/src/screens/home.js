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
import { listAttempts, SECTION_LABELS } from '../data/simulation.data.js';
// שלושת המחוונים שליאון בחר למסך הבית (1.9.2026): דיוק לפי מודול, צמיחה
// מצטברת, והימים הפעילים. הכרטיסים עצמם מיובאים מ-insights.js ולא משוכפלים
// כאן — מקור אמת אחד, וגם מצב ה"נבנה" מגיע איתם.
// שימו לב: plan.data.js מייצא getWeeklyActivity במשמעות אחרת לגמרי (קצב
// שבועי מול יעד). לוח הפעילות כאן הוא דבר אחר — מפת חום יומית.
import {
  getAccuracyByModule,
  getCumulativeGrowth,
  getActivityCalendar,
} from '../data/insights.data.js';
import {
  accuracyByModuleCard,
  cumulativeGrowthCard,
  activityCalendarCard,
  ensureStyles as ensureInsightStyles,
} from './insights.js';
import { GUIDES } from './guides.js';
import { getWordOfDay } from '../data/wordOfDay.data.js';

// home.js לא החזיק esc() עד עכשיו כי כל הטקסט בו היה קבוע. המילה של היום
// היא התוכן הראשון שמגיע מהמסד, ולכן חייבת בריחה.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
  // האבחון האחרון — מזין את פס המדדים. אורח לא שומר ניסיונות, ולכן ריק.
  const [{ data: simAttempts }, accuracyRes, growthRes, calendarRes, wodRes] = await Promise.all([
    listAttempts(userId, 1),
    userId ? getAccuracyByModule(userId) : Promise.resolve({ status: 'guest', modules: [] }),
    userId ? getCumulativeGrowth(userId) : Promise.resolve({ status: 'guest' }),
    userId ? getActivityCalendar(userId) : Promise.resolve({ status: 'guest' }),
    getWordOfDay(),   // לא תלוי במשתמש — גם אורח מקבל אותה
  ]);
  const lastSim = (simAttempts || [])[0] ?? null;
  ensureInsightStyles();

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

      ${wordOfDaySection(wodRes)}

      ${diagnosticBand(lastSim)}

      ${metricsSection(accuracyRes, growthRes, calendarRes)}
      ${guidesSection()}
    </div>`;

  const daily = el.querySelector('#btn-daily');
  if (ctaRoute) daily.addEventListener('click', () => navigate(ctaRoute));
  el.querySelectorAll('[data-nav]').forEach(tile => {
    tile.addEventListener('click', () => navigate(tile.dataset.nav));
  });

  // האסוציאציה מקופלת בברירת מחדל — אותו דפוס data-block-toggle שבשאר האתר.
  el.querySelector('[data-block-toggle].wod-mnem-head')?.addEventListener('click', (e) => {
    const sec = e.currentTarget.closest('.wod-card');
    const open = sec.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  el.querySelectorAll('.wod-audio').forEach((btn) => {
    btn.addEventListener('click', () => playWodAudio(btn.dataset.src));
  });
}

// הקראה: הפניה אחת ששומרים כדי שאפשר יהיה לעצור אותה. שתי לחיצות רצופות
// לא מנגנות זו על גבי זו, ומעבר מסך עוצר. אותו תיקון שנעשה בכרטיסיות.
let wodAudio = null;
function playWodAudio(url) {
  if (!url) return;
  if (wodAudio) { try { wodAudio.pause(); wodAudio.currentTime = 0; } catch (_) {} }
  try { wodAudio = new Audio(url); wodAudio.play(); } catch (_) { wodAudio = null; }
}
if (!window.__wodAudioStopper) {
  window.__wodAudioStopper = true;
  window.addEventListener('hashchange', () => {
    if (!wodAudio) return;
    try { wodAudio.pause(); wodAudio.currentTime = 0; } catch (_) {}
    wodAudio = null;
  });
}

/**
 * פס המדדים — תוצאות האבחון האחרון, מיומנות-מיומנות.
 *
 * מכוון: **אין כאן מצב אפס עם אפסים.** מי שעוד לא עשה אבחון מקבל הזמנה
 * לעשות אותו, ולא ארבעה עיגולים על 0% — לוח מחוונים מלא אפסים נראה פחות
 * רציני, לא יותר, והוא גם מעניש תלמיד על כך שרק הגיע.
 */
function diagnosticBand(last) {
  if (!last || !Array.isArray(last.section_stats) || !last.section_stats.length) {
    return `
      <div class="diag-empty" data-nav="/simulation">
        <div class="de-text">
          <div class="de-title">עוד לא עשית אבחון רמה</div>
          <div class="de-sub">כ-25 דקות, ובסוף דוח שמראה בדיוק באיזו מיומנות אתה חזק ואיפה הפער</div>
        </div>
        <span class="de-btn">לאבחון ←</span>
      </div>`;
  }

  const overall = last.total_answered
    ? Math.round((last.total_correct / last.total_answered) * 100) : 0;

  const tiles = last.section_stats
    .filter((st) => st.accuracy != null)
    .map((st) => `
      <div class="dg-tile">
        <div class="dg-val">${st.accuracy}%</div>
        <div class="dg-lbl">${SECTION_LABELS[st.kind] || st.kind}</div>
        <div class="dg-bar"><div class="dg-bar-fill" style="width:${st.accuracy}%"></div></div>
      </div>`).join('');

  return `
    <div class="sec-title diag-sec-title" style="margin-top:1.6rem">האבחון האחרון שלך</div>
    <div class="diag-grid" data-nav="/simulation">
      <div class="dg-tile dg-tile-main">
        <div class="dg-val dg-val-big">${overall}%</div>
        <div class="dg-lbl">דיוק כללי</div>
      </div>
      ${tiles}
    </div>`;
}

/**
 * שלושת המחוונים שליאון בחר. אורח לא מקבל אותם בכלל — אין לו שורות
 * במסד, וקיר של כרטיסי "נבנה" למי שרק נכנס הוא בדיוק ההפך מרציני.
 */
function metricsSection(accuracy, growth, calendar) {
  if (!accuracy || accuracy.status === 'guest') return '';
  return `
    <div class="sec-title metrics-sec-title" style="margin-top:1.8rem">
      המספרים שלך
      <span class="ms-all" data-nav="/insights">כל התובנות ←</span>
    </div>
    <div class="metrics-grid">
      ${accuracyByModuleCard(accuracy)}
      ${cumulativeGrowthCard(growth)}
      ${activityCalendarCard(calendar)}
    </div>`;
}

/** מדור המדריכים — שלושת המסומנים featured ב-guides.js. */
/**
 * המילה של היום — הדבר היחיד במסך הבית שהוא תוכן ולא מדידה, וזו הנקודה:
 * סיבה להיכנס גם ביום שלא תרגלת, בדיוק היום שבו מסך של גרפים ריקים מרחיק.
 * המילה נבחרת לפי התאריך ולכן זהה לכולם ויציבה לאורך היום (ראו
 * wordOfDay.data.js). בלי תוכן — הפינה לא מצוירת בכלל.
 */
function wordOfDaySection(res) {
  const w = res?.word;
  if (!w) return '';
  return `
    <div class="sec-title wod-sec-title" style="margin-top:1.8rem">המילה של היום</div>
    <div class="wod-card">
      <div class="wod-top">
        <span class="wod-w" dir="ltr">${esc(w.headword)}</span>
        ${w.audio_word_url ? `<button class="wod-audio" data-src="${esc(w.audio_word_url)}" title="השמע" aria-label="השמע את המילה">🔊</button>` : ''}
        <span class="wod-def">${esc(w.definition_he)}</span>
      </div>
      <div class="wod-sent-row">
        <p class="wod-sent" dir="ltr">${esc(w.surface_1)}</p>
        ${w.audio_sentence_url ? `<button class="wod-audio" data-src="${esc(w.audio_sentence_url)}" title="השמע משפט" aria-label="השמע את המשפט">🔊</button>` : ''}
      </div>
      <button type="button" class="wod-mnem-head" data-block-toggle aria-expanded="false">
        <span>איך לזכור את זה</span>
        <span class="wod-chev">▾</span>
      </button>
      <div class="wod-mnem-body">
        <p class="wod-mnem-hint">חפשו במשפט את הצליל שדומה למילה באנגלית — הוא הגשר לזכירה</p>
        <p class="wod-mnem">${esc(w.mnemonic)}</p>
      </div>
      <a class="wod-more" href="#/dictionary">עוד מילים במילון ←</a>
    </div>`;
}

function guidesSection() {
  const featured = GUIDES.filter((g) => g.featured);
  const cards = featured.map((g) => `
    <a class="hg-card" href="${g.href}">
      <div class="hg-title">${g.title}</div>
      <div class="hg-desc">${g.desc}</div>
      <div class="hg-more">לקריאה ←</div>
    </a>`).join('');

  return `
    <div class="sec-title guides-sec-title" style="margin-top:1.8rem">
      מדריכים למבחן
      <span class="hg-all" data-nav="/guides">כל ${GUIDES.length} המדריכים ←</span>
    </div>
    <div class="guides-grid">${cards}</div>`;
}
