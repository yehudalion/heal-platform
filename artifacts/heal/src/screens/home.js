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
import { getWordOfDay } from '../data/wordOfDay.data.js';
import { getConsentState, setConsent, CONSENT_TEXT } from '../data/betaConsent.data.js';
import { loadCornerState, cornersGridHtml, wireCorners } from './corners.js';

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
  const minutes = profile?.daily_time_minutes ?? 20;

  const [planRes, corners, gmState, missions, wodRes, consentRes] = await Promise.all([
    userId ? getDailyPlan(userId, minutes) : Promise.resolve({ data: null }),
    loadCornerState(userId),
    getGamificationState(),
    getTodayMissions(),
    getWordOfDay(),
    getConsentState(userId),
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
  const dailyTxt = dDone
    ? `✓ האתגר היומי${dPrev && dPrev.date === dKey ? ` ${dPrev.correct}/${dPrev.total}` : ''}`
    : '🎯 האתגר היומי';
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
  const w = wodRes?.word;
  const wodHtml = w ? `
    <a class="hm-wod" href="#/word-of-day">
      <span>🔤 המילה של היום: <b dir="ltr">${esc(w.headword)}</b> — ${esc(w.definition_he)}</span>
      <span class="hm-wod-go">←</span>
    </a>` : '';

  el.innerHTML = `
    <div class="fade-in home2">
      <section class="hm-head">
        <div class="hm-hi">
          <span class="hm-name">${GREETING()}, ${esc(name)}.</span>
          <span class="hm-days">${daysLeft !== null ? `<b>${daysLeft}</b> ימים לבחינה` : 'אפשר להגדיר תאריך בחינה בהגדרות'}</span>
        </div>
        ${statusHtml}
        ${realHtml}
        <div class="hm-today">
          <div class="hm-today-txt">
            <div class="hm-eyebrow">${esc(eyebrow)}</div>
            <div class="hm-title">${esc(title)}</div>
            <div class="hm-meta">
              <a href="#/daily" class="hm-meta-link">${dailyTxt}</a>
              ${mTxt ? `<span class="hm-dot">·</span><span>${mTxt}</span>` : ''}
            </div>
          </div>
          <button class="hm-btn" id="btn-daily" type="button">${btn}</button>
        </div>
      </section>

      ${installCardHtml()}

      <div class="sec-title hm-sec">הפינות</div>
      ${cornersGridHtml(corners)}

      ${wodHtml}
      ${consentBand(consentRes)}
    </div>`;

  el.querySelector('#btn-daily')?.addEventListener('click', () => navigate(route));
  el.querySelectorAll('[data-nav]').forEach((t) => {
    t.addEventListener('click', () => navigate(t.dataset.nav));
  });
  wireCorners(el);
  wireInstallCard(el);
  el.querySelectorAll('.cb-btn').forEach((btnEl) => {
    btnEl.addEventListener('click', () => onConsent(el, btnEl.dataset.answer === 'yes'));
  });
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
