/**
 * src/screens/home.js — מסך הבית. שלושה בלוקים, לא שנים-עשר.
 *
 * נבנה מחדש בסשן שבת 1 (5.9.2026) לפי המוקאפ שיהודה אישר
 * (claude/MOCKUP_home_final.html) ולפי שתי הנחיות שלו מאותו ערב:
 *
 *   1. "מסך הבית עונה על שאלה אחת — מה אני עושה עכשיו. כל השאר הוא דוח,
 *      ודוחות גרים ב'ההתקדמות שלי'." שלושת הנרשמים האמיתיים הראשונים נכנסו,
 *      לא ידעו מה לעשות, ולא חזרו. הבלוק הראשון שרואים חייב לומר "זה מה
 *      שעושים עכשיו, 12 דקות" — עם כפתור אחד.
 *   2. "החלפנו מדידת התקדמות אמיתית בגימיק של משחקים. אני רוצה שהתקדמות
 *      אמיתית תהיה נוכחת יותר והמשחקיות קיימת אבל פחות מובלטת." ולכן:
 *      הרצף והדרגה הם שורה דקה אחת, ואריח ההתקדמות בכרטיס הפתיחה מראה דבר
 *      אמיתי — מילים בזיכרון, דיוק — לא XP.
 *
 * המבנה:
 *   · כרטיס הפתיחה — ברכה, ימים לבחינה, שורת רצף/דרגה, אריח התקדמות אמיתית,
 *     והפעולה של היום: משפט אחד מהתוכנית, כפתור אחד, ושורת מצב שבולעת את
 *     האתגר היומי ואת שלוש המשימות (הם משימות יומיות כמו השאר — לא כרטיסים).
 *   · הפינות — רשת שש הפינות בגוונים + הסימולציה כמשבצת רחבה (corners.js,
 *     משותף עם /practice). גבוה, כי תלמיד שלא רוצה את מה שהצענו צריך לראות
 *     את האלטרנטיבה בלי לגלול.
 *   · המילה של היום — שורת טקסט אחת. הטעימה הכי זולה בעמוד.
 *   · פס ההסכמה לדיוור נשאר, בתחתית, עד שעונים.
 *
 * מה עבר ל-/progress (progress-widgets.js): כרטיס הדרגה/XP/תגים, הקצב
 * השבועי, פס האבחון, שלושת המחוונים, והטיפ היומי. המדריכים — בסרגל.
 * שום פונקציית דאטה לא נמחקה; רק מי שקורא לה זז.
 *
 * הסימולציה: משבצת רחבה מתחת לשש הפינות ולא פינה שביעית שווה — במובייל
 * (שתי עמודות) פינה שביעית משאירה חור בגריד, ומשבצת רחבה עם הציון האחרון
 * בולטת יותר. סשן 3 ימלא בה ציון משוער בסולם 50-150.
 *
 * כל הדאטה דרך src/data/*.data.js (ARCHITECTURE §2.11).
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { installCardHtml, wireInstallCard } from '../lib/installCard.js';
import { getCurrentSession } from '../supabase.js';
import { getGamificationState, getTodayMissions } from '../data/gamification.data.js';
import { rankFor } from '../lib/xp.js';
import { todayKey, playedToday, lastResult } from '../data/daily.data.js';
import { getProfile } from '../data/profiles.data.js';
import { getDailyPlan, nextLeg } from '../data/plan.data.js';
import { readTodayMinutes, effectiveMinutes, setTodayMinutes, clearTodayMinutes } from '../lib/todayPlan.js';
import { getWordOfDay } from '../data/wordOfDay.data.js';
import { getConsentState, setConsent, CONSENT_TEXT } from '../data/betaConsent.data.js';
import { loadCornerState, cornersGridHtml, wireCorners } from './corners.js';
// 5.9 (יהודה): מסך הבית הרגיש ריק — שני הגרפים הכלליים ביותר מ-/insights
// עולים לכאן. הם מציירים "נבנה" בעצמם כשאין מספיק נתונים, אז אין מצב ריק.
import { getAccuracyByModule, getCumulativeGrowth } from '../data/insights.data.js';
import { accuracyByModuleCard, cumulativeGrowthCard, ensureStyles as ensureInsightsStyles } from './insights.js';

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

// נקבע בכל רינדור. ה-handler של פס ההסכמה הוא פונקציה ברמת המודול.
let currentUserId = null;

export async function renderHome(root) {
  await renderLayout(root, '/home');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  currentUserId = userId;
  const name    = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';

  const profileRes = await getProfile(userId);
  const profile = profileRes?.data ?? null;
  const defaultMinutes = profile?.daily_time_minutes ?? 20;
  const minutes = effectiveMinutes(defaultMinutes);
  const pickedToday = readTodayMinutes();

  const [planRes, corners, gmState, missions, wodRes, consentRes, accuracyRes, growthRes] = await Promise.all([
    userId ? getDailyPlan(userId, minutes) : Promise.resolve({ data: null }),
    loadCornerState(userId),
    getGamificationState(),
    getTodayMissions(),
    getWordOfDay(),
    getConsentState(userId),
    userId ? getAccuracyByModule(userId) : Promise.resolve(null),
    userId ? getCumulativeGrowth(userId) : Promise.resolve(null),
  ]);
  const plan = planRes?.data ?? null;

  // ── ימים לבחינה ─────────────────────────────────────────────────────────
  const examDate = profile?.exam_date ?? null;
  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null;

  // ── הפעולה של היום ─────────────────────────────────────────────────────
  const leg = plan ? nextLeg(plan) : null;
  let eyebrow, title, btn, route;
  if (!plan || (!plan.started && leg)) {
    eyebrow = plan ? `היום · כ-${plan.totalMinutes} דקות` : `היום · כ-${minutes} דקות`;
    title   = plan ? legsSentence(plan.legs) : 'המנה הראשונה שלך — מילים, ואז שאלה אחת מכל סוג';
    btn     = 'להתחיל ←';
    route   = leg?.route ?? '/card';
  } else if (leg) {
    eyebrow = `היום · נשארו כ-${plan.remainingMinutes} דקות`;
    title   = `להמשיך מהמקום שעצרת: ${leg.label}`;
    btn     = 'להמשיך ←';
    route   = leg.route;
  } else {
    eyebrow = 'היום';
    title   = 'המנה של היום הושלמה ✓';
    btn     = 'עוד תרגול ←';
    route   = '/practice';
  }

  // שורת המצב בתוך כרטיס היום: האתגר היומי + המשימות.
  const dKey = todayKey();
  const dDone = playedToday(dKey);
  const dPrev = dDone ? lastResult() : null;
  const mDone = (missions || []).filter((m) => m.done).length;
  const mTxt = missions?.length ? `${mDone} מתוך ${missions.length} משימות` : '';

  // ── שורת רצף/דרגה — דקה, לא כרטיס ──────────────────────────────────────
  const gm = gmState || null;
  const r = gm ? rankFor(gm.xp || 0) : null;
  const streak = gm?.streak || 0;
  const statusHtml = gm ? `
    <button class="hm-status" data-nav="/progress" type="button" title="ההתקדמות שלי">
      <span>${streak > 0 ? `🔥 ${streak} ${streak === 1 ? 'יום' : 'ימים'} ברצף` : '🔥 מתחילים רצף חדש היום'}</span>
      <span class="hm-dot">·</span>
      <span>${r.icon} דרגה ${r.index}: ${esc(r.name)}</span>
      ${gm.streak_at_risk ? `<span class="hm-dot">·</span><span class="hm-shield">🛡️ יום מוגן — תרגול היום שומר על הרצף</span>` : ''}
    </button>` : '';

  // ── אריח התקדמות אמיתית ─────────────────────────────────────────────────
  // המדד הכי משמעותי לפי מה שיש: מילים בזיכרון (עם מכנה), ואז דיוק בהאזנה.
  // בלי דאטה — האריח לא מצויר. לא מציגים אפסים.
  const realBits = [];
  if (corners.vocab.done != null && corners.vocab.total) {
    realBits.push(`<b>${corners.vocab.done}</b> מתוך ${corners.vocab.total} מילים בזיכרון`);
  } else if (corners.vocab.acquired) {
    realBits.push(`<b>${corners.vocab.acquired}</b> מילים בזיכרון`);
  }
  if (corners.listening.answered && corners.listening.accuracy != null) {
    realBits.push(`דיוק <b>${corners.listening.accuracy}%</b> בהאזנה`);
  }
  if (corners.rephrase.attempts) realBits.push(`<b>${corners.rephrase.attempts}</b> שאלות ניסוח`);
  const realHtml = realBits.length
    ? `<button class="hm-real" data-nav="/progress" type="button">
         <span class="hm-real-lbl">ההתקדמות שלך</span>
         <span class="hm-real-v">${realBits.slice(0, 2).join(' · ')}</span>
         <span class="hm-real-go">לפירוט ←</span>
       </button>`
    : '';

  // ── המילה של היום — שורה אחת ────────────────────────────────────────────
  // האתגר היומי — פס משלו מתחת למילה של היום (יהודה, 5.9). קודם הוא היה
  // שורה קטנה בתוך כרטיס היום ואף אחד לא ראה אותו.
  const dailyHtml = `
    <a class="hm-daily${dDone ? ' is-done' : ''}" href="#/daily">
      <span class="hm-daily-ico">${dDone ? '✓' : '🎯'}</span>
      <span class="hm-daily-txt">
        <b>האתגר היומי</b>
        <span class="hm-daily-sub">${dDone
          ? (dPrev && dPrev.date === dKey ? `נפתר היום · ${dPrev.correct} מתוך ${dPrev.total}` : 'נפתר היום')
          : '6 שאלות, 6 דקות'}</span>
      </span>
      <span class="hm-daily-go">${dDone ? 'לתוצאה ←' : 'להתחיל ←'}</span>
    </a>`;

  const w = wodRes?.word;
  const wodHtml = w ? `
    <a class="hm-wod" href="#/word-of-day">
      <span>🔤 המילה של היום: <b dir="ltr">${esc(w.headword)}</b> — ${esc(w.definition_he)}</span>
      <span class="hm-wod-go">←</span>
    </a>` : '';

  // שני הגרפים הכלליים ביותר. כל כרטיס מצייר בעצמו מצב "עוד נבנה" כשאין
  // מספיק תרגול, אז אין כאן ענף ריק — רק אורח לא מקבל אותם.
  // ── "כמה נלמד היום" ────────────────────────────────────────────────────
  // מוצג רק לפני שהתחילו. באמצע מנה זו הסחה, ואחרי שסיימו אין מה לתכנן.
  const PRESETS = [
    [5,  'חמש דקות', 'מנה קצרה'],
    [15, 'רבע שעה',  'המנה הרגילה'],
    [30, 'חצי שעה',  'יום פנוי'],
  ];
  const planStarted = Boolean(plan?.started);
  const timeHtml = (!userId || planStarted) ? '' : `
    <section class="hm-time" id="hmTime">
      <div class="hm-time-q">כמה נלמד היום?</div>
      <div class="hm-time-opts">
        ${PRESETS.map(([m, t, sub2]) => `
        <button type="button" class="hm-time-opt${m === minutes ? ' on' : ''}" data-min="${m}">
          <b>${t}</b><span>${sub2}</span>
        </button>`).join('')}
        <button type="button" class="hm-time-opt${pickedToday && !PRESETS.some(([m]) => m === minutes) ? ' on' : ''}" data-min="custom">
          <b>אחר</b><span>לבחירתך</span>
        </button>
      </div>
      <div class="hm-time-own" id="hmTimeOwn" hidden>
        <label for="hmTimeInput">כמה דקות?</label>
        <input id="hmTimeInput" type="number" inputmode="numeric" min="3" max="120" step="1" value="${minutes}">
        <button type="button" id="hmTimeGo">בונים מנה</button>
      </div>
      <div class="hm-time-foot">${pickedToday
        ? `היום בלבד · ברירת המחדל שלך היא ${defaultMinutes} דקות · <button type="button" class="hm-time-reset" id="hmTimeReset">חזרה אליה</button>`
        : `אפשר לשנות רק להיום. ברירת המחדל שלך: ${defaultMinutes} דקות.`}</div>
    </section>`;

  // ── כרטיס "בנה לי תוכנית עד הבחינה" ────────────────────────────────────
  // SPEC_entry_gate_final.md §4.2: שתי השאלות שהיו באונבורדינג ירדו מהשער
  // ועלו לכאן. הכרטיס בולט ולא מוסתר בהגדרות — "הגדרות זה מקום שאנשים לא
  // נכנסים אליו. התוכנית היא פיצ'ר." מי שכבר בנה תוכנית מקבל שורת עריכה
  // דקה במקום הכרטיס, כדי שהמסך לא ידחוף לו שוב משהו שכבר עשה.
  const hasPlan = Boolean(profile?.onboarding_complete);
  const planCardHtml = !userId ? '' : (hasPlan ? `
    <button class="hm-plan-edit" type="button" data-nav="/plan-setup">
      <span>התוכנית שלך · ${examDate ? `${daysLeft} ימים לבחינה` : 'לוח כללי לשלושה חודשים'} · ${profile?.daily_time_minutes ?? minutes} דק׳ ביום</span>
      <span class="hm-plan-edit-go">לשינוי ←</span>
    </button>` : `
    <button class="hm-plan" type="button" data-nav="/plan-setup">
      <span class="hm-plan-ico">🗓️</span>
      <span class="hm-plan-txt">
        <b>בנה לי תוכנית עד הבחינה</b>
        <span class="hm-plan-sub">שתי שאלות, ואז יש לך לוח למידה יומי שמתעדכן לפי הביצועים שלך.</span>
      </span>
      <span class="hm-plan-go">←</span>
    </button>`);

  ensurePlanStyles();

  if (timeHtml) ensureTimeStyles();

  const graphsHtml = userId && accuracyRes && growthRes ? `
      <div class="sec-title hm-sec">המספרים שלך<span class="ms-all" data-nav="/insights">כל התובנות ←</span></div>
      <div class="metrics-grid">${accuracyByModuleCard(accuracyRes)}${cumulativeGrowthCard(growthRes)}</div>` : '';

  if (graphsHtml) ensureInsightsStyles();

  el.innerHTML = `
    <div class="fade-in home2">
      <section class="hm-head">
        <div class="hm-hi">
          <span class="hm-name">${GREETING()}, ${esc(name)}.</span>
          <span class="hm-days">${daysLeft !== null ? `<b>${daysLeft}</b> ימים לבחינה` : 'עוד לא הגדרת תאריך בחינה'}</span>
        </div>
        ${statusHtml}
        ${realHtml}
        <div class="hm-today">
          <div class="hm-today-txt">
            <div class="hm-eyebrow">${esc(eyebrow)}</div>
            <div class="hm-title">${esc(title)}</div>
            ${mTxt ? `<div class="hm-meta"><span>${mTxt}</span></div>` : ''}
          </div>
          <button class="hm-btn" id="btn-daily" type="button">${btn}</button>
        </div>
      </section>

      ${planCardHtml}
      ${timeHtml}
      ${installCardHtml()}

      <div class="sec-title hm-sec">הפינות</div>
      ${cornersGridHtml(corners)}

      ${wodHtml}
      ${dailyHtml}
      ${graphsHtml}
      ${consentBand(consentRes)}
    </div>`;

  el.querySelector('#btn-daily')?.addEventListener('click', () => navigate(route));
  el.querySelectorAll('[data-nav]').forEach((t) => {
    t.addEventListener('click', () => navigate(t.dataset.nav));
  });
  el.querySelectorAll('.hm-time-opt').forEach((b) => {
    b.addEventListener('click', () => {
      const raw = b.dataset.min;
      if (raw === 'custom') {
        // שדה מוטמע ולא prompt של הדפדפן: באפליקציה מותקנת חלונית מערכת
        // נראית זרה, ובחלק מהדפדפנים היא פשוט חסומה.
        const own = el.querySelector('#hmTimeOwn');
        if (!own) return;
        own.hidden = !own.hidden;
        if (!own.hidden) el.querySelector('#hmTimeInput')?.focus();
        return;
      }
      setTodayMinutes(Number(raw));
      renderHome(root);
    });
  });
  const ownGo = () => {
    const n = Number(el.querySelector('#hmTimeInput')?.value);
    if (!Number.isFinite(n) || n <= 0) return;
    setTodayMinutes(n);
    renderHome(root);
  };
  el.querySelector('#hmTimeGo')?.addEventListener('click', ownGo);
  el.querySelector('#hmTimeInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ownGo(); }
  });

  el.querySelector('#hmTimeReset')?.addEventListener('click', () => {
    clearTodayMinutes();
    renderHome(root);
  });

  wireCorners(el);
  wireInstallCard(el);
  el.querySelectorAll('.cb-btn').forEach((btnEl) => {
    btnEl.addEventListener('click', () => onConsent(el, btnEl.dataset.answer === 'yes'));
  });
}

/** הסגנון של כרטיס הזמן. מוזרק פעם אחת, כמו שאר הכרטיסים שנוספו מאוחר. */
function ensureTimeStyles() {
  if (document.getElementById('hm-time-css')) return;
  const st = document.createElement('style');
  st.id = 'hm-time-css';
  st.textContent = `
.hm-time{margin:1rem 0 0;padding:.95rem 1rem;background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius);text-align:right}
.hm-time-q{font-weight:800;font-size:.92rem;margin-bottom:.65rem}
.hm-time-opts{display:grid;grid-template-columns:repeat(4,1fr);gap:.45rem}
.hm-time-opt{display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;
  padding:.55rem .3rem;border:1.5px solid var(--border);border-radius:10px;background:none;
  font:inherit;cursor:pointer;color:inherit;text-align:center}
.hm-time-opt b{font-size:.82rem;font-weight:800;line-height:1.2}
.hm-time-opt span{font-size:.68rem;color:var(--muted);line-height:1.2}
.hm-time-opt.on{border-color:var(--green-dark,#16412F);background:rgba(22,65,47,.06)}
.hm-time-opt.on b{color:var(--green-dark,#16412F)}
.hm-time-foot{margin-top:.6rem;font-size:.74rem;color:var(--muted);line-height:1.5}
.hm-time-reset{background:none;border:0;padding:0;font:inherit;font-size:.74rem;color:var(--green-dark,#16412F);
  text-decoration:underline;cursor:pointer}
.hm-time-own{display:flex;align-items:center;gap:.5rem;margin-top:.6rem;font-size:.82rem}
.hm-time-own input{width:5rem;padding:.4rem .5rem;border:1.5px solid var(--border);border-radius:8px;
  font:inherit;font-size:.86rem;text-align:center}
.hm-time-own button{background:var(--green-dark,#16412F);color:#fff;border:0;border-radius:99px;
  padding:.42rem 1rem;font:inherit;font-size:.8rem;font-weight:800;cursor:pointer}
@media (max-width:420px){.hm-time-opts{grid-template-columns:repeat(2,1fr)}}
`;
  document.head.appendChild(st);
}

/** "14 מילים לחזרה, ואז ניסוח מחדש" — משפט אחד מרגלי התוכנית. */
function legsSentence(legs) {
  const parts = (legs || []).filter((l) => !l.done).map((l) => {
    if (l.moduleId === 'vocab' && l.targetItems) return `${l.targetItems} מילים לחזרה`;
    return l.label;
  });
  if (!parts.length) return 'המנה של היום';
  if (parts.length === 1) return parts[0];
  return `${parts[0]}, ואז ${parts.slice(1).join(' ו')}`;
}

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
  band.classList.add('done');
  band.innerHTML = yes
    ? '<span class="cb-done">✓ תודה. אעדכן אתכם כשיהיה משהו חדש.</span>'
    : '<span class="cb-done">✓ נרשם. לא נשלח לכם מיילים.</span>';
}

/**
 * ⚖️ הסכמה לדיוור — נשאלת פעם אחת בלבד (חוק התקשורת, תיקון 40).
 * מוצג אך ורק במצב 'unasked'. הנוסח שמוצג הוא בדיוק המחרוזת שנשמרת.
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

let planStylesDone = false;
function ensurePlanStyles() {
  if (planStylesDone) return;
  planStylesDone = true;
  const st = document.createElement('style');
  st.textContent = `
    .hm-plan{display:flex;align-items:center;gap:.8rem;width:100%;text-align:right;
      margin:.9rem 0 0;padding:1rem 1.1rem;border:1.5px solid var(--green);
      border-radius:var(--radius);background:var(--green-light);cursor:pointer;font:inherit}
    .hm-plan-ico{font-size:1.5rem;line-height:1}
    .hm-plan-txt{flex:1;display:block}
    .hm-plan-txt b{display:block;font-size:1rem;font-weight:800;color:var(--green-dark)}
    .hm-plan-sub{display:block;font-size:.83rem;color:var(--text);opacity:.8;margin-top:.2rem;line-height:1.45}
    .hm-plan-go{font-size:1.15rem;color:var(--green-dark);font-weight:800}
    .hm-plan-edit{display:flex;align-items:center;gap:.6rem;width:100%;text-align:right;
      margin:.7rem 0 0;padding:.6rem .85rem;border:1px solid var(--border);
      border-radius:var(--radius-sm);background:var(--card);cursor:pointer;font:inherit;
      font-size:.83rem;color:var(--muted)}
    .hm-plan-edit span:first-child{flex:1}
    .hm-plan-edit-go{font-weight:700;color:var(--green-dark)}
  `;
  document.head.appendChild(st);
}
