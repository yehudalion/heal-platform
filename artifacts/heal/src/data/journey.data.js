/**
 * src/data/journey.data.js — מפת המסלול + "התובנה שלך השבוע".
 *
 * סשן שבת 5 (5.9.2026), פריטים 29-30 מרשימת המתחרה. הנחיית יהודה: "החלפנו
 * מדידת התקדמות אמיתית בגימיק של משחקים — אני רוצה שהתקדמות אמיתית תהיה
 * נוכחת יותר והמשחקיות קיימת אבל פחות מובלטת." לכן המפה מודדת את שלוש
 * השכבות של כל פינה (למידה / תרגול / ניתוח — כלל שלוש השכבות) ומשפט אחד על
 * הצעד הבא מהדאטה האמיתי. בלי נעילה, בלי ענישה, בלי מספרי רמה.
 *
 *   getJourney(userId, { plan }) → { data: { corners: [Corner...] } }
 *   Corner = { id, label, icon, tone, route, learn, practice, analyze, next, nextRoute }
 *     learn/practice/analyze ∈ 'done' | 'active' | 'todo'
 *
 *   getWeeklyInsight(userId) → { data: Insight|null }
 *   Insight = { moduleId, moduleLabel, keyId, keyLabel, misses, exposures, practiceRoute }
 *     המפתח עם הכי הרבה טעויות ב-14 יום, בכל הפינות שיש להן מפתחות
 *     (ניסוח, השלמה, תחיליות). null כשאין מספיק דאטה — ואז המסך אומר זאת.
 *
 * "למידה" נמדדת מדגלי המדריך במכשיר (אותם מפתחות localStorage שמסכי ה-learn
 * כבר כותבים) — לא מושלם (מכשיר חדש = "לא נקרא"), אבל זה מה שנמדד ואין
 * כאן המצאה. "ניתוח" = יש מספיק דאטה כדי שמסך הניתוח יגיד משהו (ok), או
 * בתהליך (insufficient_data) — לא "האם נכנסת למסך".
 *
 * אפס Supabase ישיר: הכול דרך שכבות הדאטה הקיימות.
 */
import { getSessionStats } from './srs.data.js';
import { getWeakPoints } from './weakpoints.data.js';
import { getListeningOverview } from './listening.data.js';
import { getCoverage } from './coverage.data.js';
import { fetchRecentAttempts as fetchReadingAttempts } from './reading.data.js';
import { LEARN_BLOCKS } from '../screens/rephrase-learn.js';

const MIN_ANALYZE_READING = 5;      // reading-analyze מדבר אחרי 5 קטעים
const MIN_ANALYZE_LISTENING = 5;    // listening/analyze — אחרי 5 קטעים
const MIN_ANALYZE_VOCAB = 20;       // vocab-analyze — אחרי 20 מילים בסבב
const INSIGHT_DAYS = 14;
const INSIGHT_MIN_MISSES = 2;

function seen(key) {
  try { return !!localStorage.getItem(key); } catch { return false; }
}

/** שלוש השכבות → 'done' | 'active' | 'todo'. */
function tri(done, active) { return done ? 'done' : (active ? 'active' : 'todo'); }

/** מצב הניתוח מדוח weakpoints: ok → done, יש ניסיונות → active, אחרת todo. */
function analyzeFromReport(r) {
  if (!r) return 'todo';
  if (r.status === 'ok') return 'done';
  return r.attempts > 0 ? 'active' : 'todo';
}

function cornersFrom({ srs, reports, listening, coverage, readingPassages }) {
  const rephrase = reports.find((r) => r.moduleId === 'rephrase') ?? null;
  const sc       = reports.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
  const affix    = reports.find((r) => r.moduleId === 'affix') ?? null;

  // ── אוצר מילים ──
  const inReview = srs?.in_review ?? 0;
  const learning = srs?.learning ?? 0;
  const core = coverage?.vocabCore ?? coverage?.vocab ?? null;
  const vocabDue = srs?.due_today ?? srs?.due ?? null;
  const vocab = {
    id: 'vocab', label: 'אוצר מילים', icon: '🗂️', tone: 'g', route: '/card',
    learn: tri(seen('hs_vocab_learn_seen'), false),
    practice: tri(core?.complete, inReview + learning > 0),
    analyze: tri(inReview >= MIN_ANALYZE_VOCAB, inReview > 0),
    next: !seen('hs_vocab_learn_seen') ? 'המדריך עוד לא נקרא'
      : (Number.isFinite(vocabDue) && vocabDue > 0) ? `${vocabDue} מילים לחזרה היום`
      : core ? `${core.done} מתוך ${core.total} בזיכרון` : 'מתחילים עם המילים החשובות באמת',
    nextRoute: !seen('hs_vocab_learn_seen') ? '/vocab-learn' : '/card',
  };

  // ── ניסוח מחדש ──
  const rephraseTop = rephrase?.status === 'ok' ? rephrase.points[0] : null;
  const rephraseNext = !seen('hs_rephrase_learn_seen') ? 'המדריך עוד לא נקרא'
    : rephrase?.status === 'insufficient_data' ? `הניתוח נפתח אחרי ${Math.max(0, rephrase.minAttempts - rephrase.attempts)} שאלות נוספות`
    : rephraseTop && rephraseTop.lift >= 1.25 ? `מפתח "${rephraseTop.label}" — ${rephraseTop.misses} מתוך ${rephraseTop.exposures} הפעמים`
    : rephrase?.attempts ? `${rephrase.attempts} שאלות תרגלת` : 'מתחילים מהמפתחות';
  const rephraseC = {
    id: 'rephrase', label: 'ניסוח מחדש', icon: '✍️', tone: 'o', route: '/rephrasing',
    learn: tri(seen('hs_rephrase_learn_seen'), false),
    practice: tri(rephrase?.status === 'ok' && (rephrase.points.length + rephrase.suppressed.length) >= LEARN_BLOCKS.length, (rephrase?.attempts ?? 0) > 0),
    analyze: analyzeFromReport(rephrase),
    next: rephraseNext,
    nextRoute: !seen('hs_rephrase_learn_seen') ? '/rephrase-learn'
      : rephraseTop && rephraseTop.lift >= 1.25 ? `/rephrase-practice?key=${encodeURIComponent(rephraseTop.id)}` : '/rephrasing',
  };

  // ── האזנה ──
  const lisDone = coverage?.listening?.done ?? 0;
  const lisTotal = coverage?.listening?.total ?? 0;
  const lisAnswered = listening?.questionsAnswered ?? 0;
  const listeningC = {
    id: 'listening', label: 'האזנה', icon: '🎧', tone: 'b', route: '/listening',
    learn: tri(seen('listening_intro_seen'), false),
    practice: tri(lisTotal > 0 && lisDone >= lisTotal, lisDone > 0 || lisAnswered > 0),
    analyze: tri(lisDone >= MIN_ANALYZE_LISTENING, lisDone > 0),
    next: !seen('listening_intro_seen') ? 'ההסבר עוד לא נקרא'
      : lisDone < MIN_ANALYZE_LISTENING ? `הניתוח נפתח אחרי ${MIN_ANALYZE_LISTENING - lisDone} קטעים נוספים`
      : `${lisDone} קטעים · דיוק ${listening?.accuracyPct ?? '—'}%`,
    nextRoute: '/listening',
  };

  // ── השלמת משפטים ──
  const scTop = sc?.status === 'ok' ? sc.points[0] : null;
  const scC = {
    id: 'sc', label: 'השלמת משפטים', icon: '✏️', tone: 'y', route: '/sentence-completion',
    learn: tri(seen('hs_sc_learn_seen'), false),
    practice: tri(false, (sc?.attempts ?? 0) > 0),
    analyze: analyzeFromReport(sc),
    next: !seen('hs_sc_learn_seen') ? 'המדריך עוד לא נקרא'
      : sc?.status === 'insufficient_data' ? `הניתוח נפתח אחרי ${Math.max(0, sc.minAttempts - sc.attempts)} שאלות נוספות`
      : scTop && scTop.lift >= 1.25 ? `מפתח "${scTop.label}" — ${scTop.misses} מתוך ${scTop.exposures} הפעמים`
      : sc?.attempts ? `${sc.attempts} שאלות תרגלת` : '800 שאלות במאגר',
    nextRoute: !seen('hs_sc_learn_seen') ? '/sc-learn'
      : scTop && scTop.lift >= 1.25 ? `/sc-practice?key=${encodeURIComponent(scTop.id)}` : '/sentence-completion',
  };

  // ── הבנת הנקרא ──
  const readingC = {
    id: 'reading', label: 'הבנת הנקרא', icon: '📖', tone: 'p', route: '/reading',
    learn: tri(seen('hs:reading:learn-seen'), false),
    practice: tri(false, readingPassages > 0),
    analyze: tri(readingPassages >= MIN_ANALYZE_READING, readingPassages > 0),
    next: !seen('hs:reading:learn-seen') ? 'המדריך עוד לא נקרא'
      : readingPassages < MIN_ANALYZE_READING ? `הניתוח נפתח אחרי ${MIN_ANALYZE_READING - readingPassages} קטעים נוספים`
      : `${readingPassages} קטעים תרגלת`,
    nextRoute: !seen('hs:reading:learn-seen') ? '/reading-learn' : '/reading',
  };

  // ── תחיליות וסופיות ──
  const afTop = affix?.status === 'ok' ? affix.points[0] : null;
  const affixC = {
    id: 'affix', label: 'תחיליות וסופיות', icon: '🔤', tone: 'c', route: '/affix',
    learn: tri(seen('hs_affix_learn_seen'), false),
    practice: tri(false, (affix?.attempts ?? 0) > 0),
    analyze: analyzeFromReport(affix),
    next: !seen('hs_affix_learn_seen') ? 'המדריך עוד לא נקרא'
      : affix?.status === 'insufficient_data' ? `הניתוח נפתח אחרי ${Math.max(0, affix.minAttempts - affix.attempts)} שאלות נוספות`
      : afTop && afTop.lift >= 1.25 ? `משפחת "${afTop.label}" — ${afTop.misses} מתוך ${afTop.exposures} הפעמים`
      : affix?.attempts ? `${affix.attempts} שאלות תרגלת` : 'לפענח מילה שלא הכרת',
    nextRoute: !seen('hs_affix_learn_seen') ? '/affix-learn'
      : afTop && afTop.lift >= 1.25 ? `/affix-practice?key=${encodeURIComponent(afTop.id)}` : '/affix',
  };

  return [vocab, rephraseC, listeningC, scC, readingC, affixC];
}

/** מפת המסלול. לעולם לא זורק; בלי משתמש — data: null. */
export async function getJourney(userId) {
  if (!userId) return { data: null, error: null };
  try {
    const [srsRes, reports, listeningRes, coverageRes, readingRes] = await Promise.all([
      getSessionStats(userId),
      getWeakPoints(userId),
      getListeningOverview(userId),
      getCoverage(userId),
      fetchReadingAttempts(userId, { limit: 300 }),
    ]);
    const readingPassages = new Set((readingRes?.data ?? []).map((r) => r.passage_id)).size;
    const corners = cornersFrom({
      srs: srsRes?.data ?? null,
      reports: reports || [],
      listening: listeningRes?.data ?? null,
      coverage: coverageRes?.data ?? null,
      readingPassages,
    });
    return { data: { corners }, error: null };
  } catch (error) {
    console.error('journey.data.getJourney:', error);
    return { data: null, error };
  }
}

const PRACTICE_ROUTE = {
  rephrase: (k) => `/rephrase-practice?key=${encodeURIComponent(k)}`,
  sentenceCompletion: (k) => `/sc-practice?key=${encodeURIComponent(k)}`,
  affix: (k) => `/affix-practice?key=${encodeURIComponent(k)}`,
};

/**
 * "התובנה שלך השבוע": המפתח עם הכי הרבה טעויות ב-14 הימים האחרונים, בכל
 * הפינות שיש להן מפתחות. הספים של weakpoints (15 ניסיונות, 8 חשיפות) אינם
 * חלים כאן בכוונה — התובנה היא עצה על השבוע האחרון, לא דוח — אבל פחות
 * משתי טעויות זו לא תבנית, ואז מחזירים null והמסך אומר שעוד אין תובנה.
 */
export async function getWeeklyInsight(userId) {
  if (!userId) return { data: null, error: null };
  try {
    const reports = await getWeakPoints(userId, { sinceDays: INSIGHT_DAYS, thresholds: { minAttempts: 5, minExposures: 3 } });
    let best = null;
    for (const r of reports) {
      if (!PRACTICE_ROUTE[r.moduleId]) continue;
      for (const p of [...(r.points || []), ...(r.suppressed || [])]) {
        const misses = p.misses ?? 0;
        if (misses < INSIGHT_MIN_MISSES) continue;
        if (!best || misses > best.misses || (misses === best.misses && (p.missRate ?? 0) > (best.missRate ?? 0))) {
          best = { moduleId: r.moduleId, moduleLabel: r.moduleLabel, keyId: p.id, keyLabel: p.label,
                   misses, exposures: p.exposures ?? 0, missRate: p.missRate ?? null,
                   practiceRoute: PRACTICE_ROUTE[r.moduleId](p.id) };
        }
      }
    }
    return { data: best, error: null };
  } catch (error) {
    console.error('journey.data.getWeeklyInsight:', error);
    return { data: null, error };
  }
}
