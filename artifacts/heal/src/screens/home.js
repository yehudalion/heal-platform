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
 * NOT yet a leg in plan.data.js's daily plan (that composer currently covers
 * vocab, listening, rephrase and reading; adding SC as a fifth leg is an
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
import { fetchRecentAttempts as fetchReadingAttempts } from '../data/reading.data.js';
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
import { getDailyTip } from '../data/dailyTip.data.js';
import { getGuestInsights } from '../data/guestAttempts.data.js';
import { getConsentState, setConsent, CONSENT_TEXT } from '../data/betaConsent.data.js';

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
  currentUserId = userId;   // ה-handler של פס ההסכמה רץ מחוץ לפונקציה הזו
  const guest   = isGuest() && !userId;
  const name    = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';

  // ── Data (guests get cold-start defaults — no per-user rows exist) ──────────
  const [profileRes, srsRes, weakReports, listeningRes, weeklyRes, coverageRes, readingRes] = await Promise.all([
    userId ? getProfile(userId)           : Promise.resolve({ data: getGuestProfile() }),
    userId ? getSessionStats(userId)      : Promise.resolve({ data: null }),
    userId ? getWeakPoints(userId)        : Promise.resolve([]),
    userId ? getListeningOverview(userId) : Promise.resolve({ data: null }),
    userId ? getWeeklyActivity(userId)    : Promise.resolve({ data: { activeDays: [], target: 5 } }),
    userId ? getCoverage(userId)          : Promise.resolve({ data: null }),
    userId ? fetchReadingAttempts(userId, { limit: 300 }) : Promise.resolve({ data: [] }),
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
  // Reading is counted in PASSAGES, not questions — one passage is one
  // 15-minute block, and "5 questions" would read as trivially small next to
  // the other tiles while representing far more work.
  const rdPassages  = new Set((readingRes?.data ?? []).map(r => r.passage_id)).size;

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
  const [{ data: simAttempts }, accuracyRes, growthRes, calendarRes, wodRes, tipRes, consentRes, guestInsightsRes] = await Promise.all([
    listAttempts(userId, 1),
    userId ? getAccuracyByModule(userId) : Promise.resolve({ status: 'guest', modules: [] }),
    userId ? getCumulativeGrowth(userId) : Promise.resolve({ status: 'guest' }),
    userId ? getActivityCalendar(userId) : Promise.resolve({ status: 'guest' }),
    getWordOfDay(),               // לא תלוי במשתמש — גם אורח מקבל אותה
    Promise.resolve(getDailyTip()), // סינכרוני (אין DB) — עטוף כדי לשמור על אותה תבנית Promise.all
    userId ? getConsentState(userId) : Promise.resolve({ state: 'unknown' }),
    guest ? getGuestInsights() : Promise.resolve({ status: 'ok', modules: [] }),
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
        <div class="mc mc-g" data-nav="/reading">
          <div class="mc-icon-wrap"><span class="mc-icon">📖</span></div>
          <div class="mc-name">הבנת הנקרא</div>
          <div class="mc-pct">${rdPassages ? `${rdPassages} קטעים שתרגלת` : '100 קטעים מחכים לך'}</div>
        </div>
      </div>

      ${consentBand(consentRes)}

      ${dailyDuoSection(wodRes, tipRes)}

      ${diagnosticBand(lastSim)}

      ${metricsSection(accuracyRes, growthRes, calendarRes, guest, guestInsightsRes)}
      ${guidesSection()}
    </div>`;

  const daily = el.querySelector('#btn-daily');
  if (ctaRoute) daily.addEventListener('click', () => navigate(ctaRoute));
  el.querySelectorAll('[data-nav]').forEach(tile => {
    tile.addEventListener('click', () => navigate(tile.dataset.nav));
  });

  // האסוציאציה מקופלת בברירת מחדל — אותו דפוס data-block-toggle שבשאר האתר.
  el.querySelector('[data-block-toggle].dd-more')?.addEventListener('click', (e) => {
    const sec = e.currentTarget.closest('.dd-card');
    const open = sec.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  el.querySelectorAll('.dd-audio').forEach((btn) => {
    btn.addEventListener('click', () => playWodAudio(btn.dataset.src));
  });

  el.querySelectorAll('.cb-btn').forEach((btn) => {
    btn.addEventListener('click', () => onConsent(el, btn.dataset.answer === 'yes'));
  });
}

// נקבע בכל רינדור של המסך. ה-handler של פס ההסכמה הוא פונקציה ברמת המודול
// ולכן אין לו גישה ל-userId המקומי של render.
let currentUserId = null;

/** שומר את ההכרעה ומחליף את הפס בהודעה. הפס לא חוזר — נשאלים פעם אחת. */
async function onConsent(el, yes) {
  const band = el.querySelector('.consent-band');
  if (!band) return;
  band.querySelectorAll('.cb-btn').forEach((b) => { b.disabled = true; });

  const { error } = await setConsent(currentUserId, yes, 'home');
  if (error) {
    console.warn('betaConsent.setConsent failed:', error);
    band.querySelectorAll('.cb-btn').forEach((b) => { b.disabled = false; });
    const err = band.querySelector('.cb-err');
    if (err) err.hidden = false;
    return;
  }
  // גם "לא" מקבל אישור ולא היעלמות שקטה — אחרת התלמיד לא יודע שנשמע.
  band.classList.add('done');
  band.innerHTML = yes
    ? '<span class="cb-done">✓ תודה. אעדכן אתכם כשיהיה משהו חדש.</span>'
    : '<span class="cb-done">✓ נרשם. לא נשלח לכם מיילים.</span>';
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
function metricsSection(accuracy, growth, calendar, guest, guestInsights) {
  if (guest) return guestMetricsSection(guestInsights);
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

/**
 * מדדי אורח (ליאון, 2.9.2026): "לאורח אנחנו צריכים להראות אנליטיקס של
 * התרגול הזה בלבד בגרפים פשוטים - 2 גרפים למשל והשאר יהיו באפור עם
 * 'דרושה השלמה'". המקור: guestAttempts.data.js (RPC בלבד, אף פעם לא שורות
 * גולמיות). לפני ניסיון ראשון אחד לפחות אין מה להראות, והפינה כולה לא
 * מצוירת — קיר של "דרושה השלמה" מיד בכניסה מרתיע יותר משהוא מזמין.
 */
function guestMetricsSection(res) {
  if (!res || res.status !== 'ok' || !res.modules.length) return '';

  const accRows = res.modules.map((m) => `
    <div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(m.label)} <span class="ins-hbar-mod">· ${m.accuracyPct}%</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill" style="width:${Math.max(4, m.accuracyPct)}%"></div></div>
    </div>`).join('');

  const totalAttempts = res.modules.reduce((s, m) => s + m.attempts, 0);
  const totalCorrect  = res.modules.reduce((s, m) => s + m.correct, 0);
  const overallPct = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const guestAccCard = `<div class="ins-card">
    <div class="ins-card-title">הדיוק שלך עד עכשיו</div>
    <div class="ins-card-sub">מהתרגול שעשית בלי חשבון, לפי מודול</div>
    <div class="ins-card-body">${accRows}</div>
  </div>`;

  const guestSplitCard = `<div class="ins-card">
    <div class="ins-card-title">כמה שאלות ענית</div>
    <div class="ins-card-sub">${totalAttempts} שאלות בסך הכל</div>
    <div class="ins-card-body">
      <div class="ins-hbar-row">
        <div class="ins-hbar-lbl">נכונות <span class="ins-hbar-mod">· ${totalCorrect} מתוך ${totalAttempts} (${overallPct}%)</span></div>
        <div class="ins-hbar-track"><div class="ins-hbar-fill ins-hbar-fill--alt" style="width:${Math.max(4, overallPct)}%"></div></div>
      </div>
      <p class="ins-note">התחברות שומרת את כל זה ומראה גם איך זה משתפר עם הזמן.</p>
    </div>
  </div>`;

  const lockedCard = (title) => `<div class="ins-card ins-card--locked">
    <div class="ins-card-title">${esc(title)}</div>
    <div class="ins-card-body">
      <div class="ins-building">
        <div class="ins-building-frame"></div>
        <p>דרושה השלמה — נפתח עם חשבון חינם</p>
      </div>
    </div>
  </div>`;

  return `
    <div class="sec-title metrics-sec-title" style="margin-top:1.8rem">המספרים שלך</div>
    <div class="metrics-grid">
      ${guestAccCard}
      ${guestSplitCard}
      ${lockedCard('הצמיחה המצטברת שלך')}
      ${lockedCard('לוח הפעילות שלך')}
    </div>`;
}

/**
 * ⚖️ הסכמה לדיוור — נשאלת פעם אחת בלבד.
 *
 * המייל של התלמיד כבר אצלנו מהתחברות גוגל, אבל הרשמה למוצר אינה הסכמה
 * לקבל ממנו דיוור (חוק התקשורת, תיקון 40). הפס הזה הוא המקום היחיד
 * שבו נוצרת רשימת תפוצה חוקית.
 *
 * מוצג אך ורק במצב 'unasked'. מי שענה — כן או לא — לא נשאל שוב, וגם
 * אורח לא נשאל: אין לו חשבון, אין מייל, ואין למה לשייך את ההסכמה.
 * הנוסח שמוצג הוא בדיוק המחרוזת שנשמרת (CONSENT_TEXT), לא ניסוח מקביל.
 */
function consentBand(res) {
  if (res?.state !== 'unasked') return '';
  return `
    <div class="consent-band">
      <p class="cb-text">${esc(CONSENT_TEXT)}</p>
      <div class="cb-actions">
        <button type="button" class="cb-btn cb-yes" data-answer="yes">כן, עדכנו אותי</button>
        <button type="button" class="cb-btn cb-no" data-answer="no">לא, תודה</button>
      </div>
      <p class="cb-err" hidden>לא הצלחנו לשמור. אפשר לנסות שוב.</p>
    </div>`;
}

/**
 * "היום" — מילה + טיפ אחד ליד השני, קטנים בהרבה מהכרטיס שהיה למילה לבדה
 * (ליאון, 2.9.2026: "המילה היומית... הרבה יותר קטנה ונשים ליד ה'טיפ
 * היומי'... ששניהם לא יתפסו כל כך הרבה מקום"). הטיפ אינו תוכן חדש — הוא
 * אחד משמונת ה"מפתחות" הקיימים כבר באתר (dailyTip.data.js). כל כרטיס
 * מצייר את עצמו רק אם יש לו תוכן; אם לשניהם אין תוכן, כל הפינה נעלמת.
 */
function dailyDuoSection(wodRes, tipRes) {
  const w = wodRes?.word;
  const tip = tipRes?.tip;
  if (!w && !tip) return '';

  const wordCard = w ? `
    <div class="dd-card dd-word">
      <div class="dd-head">
        <span class="dd-badge">מילה</span>
        ${w.audio_word_url ? `<button class="dd-audio" data-src="${esc(w.audio_word_url)}" title="השמע" aria-label="השמע את המילה">🔊</button>` : ''}
      </div>
      <div class="dd-word-row">
        <span class="dd-w" dir="ltr">${esc(w.headword)}</span>
        <span class="dd-def">${esc(w.definition_he)}</span>
      </div>
      <button type="button" class="dd-more" data-block-toggle aria-expanded="false">
        <span>עוד</span><span class="dd-chev">▾</span>
      </button>
      <div class="dd-word-body">
        <p class="dd-sent" dir="ltr">${esc(w.surface_1)}</p>
        <p class="dd-mnem">${esc(w.mnemonic)}</p>
        <a class="dd-more-link" href="#/dictionary">עוד מילים במילון ←</a>
      </div>
    </div>` : '';

  const tipCard = tip ? `
    <div class="dd-card dd-tip">
      <div class="dd-head">
        <span class="dd-badge dd-badge-tip">טיפ</span>
        <span class="dd-tip-module">${esc(tip.moduleLabel)}</span>
      </div>
      <p class="dd-tip-intro">${esc(tip.intro)}</p>
      <div class="dd-tip-label">${esc(tip.label)}</div>
      <p class="dd-tip-cue">${esc(tip.cue)}</p>
      <a class="dd-more-link" href="${esc(tip.learnHref)}">ההסבר המלא + דוגמה ←</a>
    </div>` : '';

  return `
    <div class="sec-title dd-sec-title" style="margin-top:1.8rem">היום</div>
    <div class="dd-grid">${wordCard}${tipCard}</div>`;
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
