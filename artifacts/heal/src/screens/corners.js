/**
 * src/screens/corners.js — "הפינות": רשת שש הפינות + משבצת הסימולציה.
 *
 * למה קובץ נפרד (סשן שבת 1, 5.9.2026): הרשת מופיעה בשני מקומות — במסך הבית,
 * מיד אחרי כרטיס הפתיחה, ובמסך /practice (הטאב "תרגול" בסרגל התחתון של
 * המובייל, שפותר פער ישן: מהמסכים הפנימיים לא היה איך להגיע להבנת הנקרא,
 * להשלמת משפטים ולתחיליות בלי לחזור הביתה). מקור אמת אחד לשני המסכים —
 * אותו דאטה, אותם גוונים, אותו סדר.
 *
 * גוון קבוע לכל פינה (החלטת יהודה, 4.9): אוצר מילים ירוק, ניסוח כתום, האזנה
 * כחול, השלמת משפטים זהב, הבנת הנקרא סגול, תחיליות תכלת. אותם גוונים בסרגל
 * הצדדי, כדי שהעין תלמד פעם אחת "כתום = ניסוח".
 *
 * כל המספרים מגיעים משכבת הדאטה. אין פס בלי מכנה אמיתי (כלל coverageBar).
 */
import { getSessionStats } from '../data/srs.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { getListeningOverview } from '../data/listening.data.js';
import { getCoverage } from '../data/coverage.data.js';
import { fetchRecentAttempts as fetchReadingAttempts } from '../data/reading.data.js';
import { fetchAffixAttempts } from '../data/affix.data.js';
import { listAttempts } from '../data/simulation.data.js';
import { LEARN_BLOCKS } from './rephrase-learn.js';

const pct = (done, total) =>
  (Number.isFinite(total) && total > 0) ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : null;

/**
 * טוען את מצב שש הפינות + הסימולציה האחרונה. `plan` (מ-plan.data.js) הוא
 * אופציונלי — הבית מעביר אותו כדי להציג "N מילים לחזרה היום".
 */
export async function loadCornerState(userId, { plan = null } = {}) {
  const [srsRes, weakReports, listeningRes, coverageRes, readingRes, affixRes, simRes] = await Promise.all([
    getSessionStats(userId),
    getWeakPoints(userId),
    getListeningOverview(userId),
    getCoverage(userId),
    fetchReadingAttempts(userId, { limit: 300 }),
    fetchAffixAttempts(userId, { limit: 300 }).catch(() => ({ data: [] })),
    listAttempts(userId, 1),
  ]);

  const srs       = srsRes?.data ?? null;
  const rephrase  = weakReports.find((r) => r.moduleId === 'rephrase') ?? null;
  const sc        = weakReports.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
  const listening = listeningRes?.data ?? null;
  const coverage  = coverageRes?.data ?? null;

  const dueCount = plan?.legs?.find((l) => l.moduleId === 'vocab')?.targetItems ?? null;

  return {
    vocab: {
      acquired: srs?.in_review ?? 0,
      due: dueCount,
      pct: coverage?.vocab ? pct(coverage.vocab.done, coverage.vocab.total) : null,
      done: coverage?.vocab?.done ?? null,
      total: coverage?.vocab?.total ?? null,
    },
    rephrase: {
      attempts: rephrase?.attempts ?? 0,
      pct: rephrase?.status === 'ok'
        ? pct((rephrase.points?.length ?? 0) + (rephrase.suppressed?.length ?? 0), LEARN_BLOCKS.length)
        : null,
    },
    listening: {
      answered: listening?.questionsAnswered ?? 0,
      accuracy: listening?.accuracyPct ?? null,
      pct: coverage?.listening ? pct(coverage.listening.done, coverage.listening.total) : null,
    },
    sc: { attempts: sc?.attempts ?? 0 },
    // קריאה נספרת בקטעים, לא בשאלות — קטע אחד הוא בלוק של רבע שעה.
    reading: { passages: new Set((readingRes?.data ?? []).map((r) => r.passage_id)).size },
    affix: { attempts: (affixRes?.data ?? []).length },
    lastSim: (simRes?.data ?? [])[0] ?? null,
  };
}

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'היום';
  if (d === 1) return 'אתמול';
  return `לפני ${d} ימים`;
};

function tile(cls, route, icon, name, sub, p) {
  const bar = p === null ? '' : `<div class="mc-bar"><div class="mc-fill" style="width:${p}%"></div></div>`;
  return `
    <div class="mc ${cls}" data-nav="${route}" role="link" tabindex="0">
      <div class="mc-top"><span class="mc-icon">${icon}</span><span class="mc-name">${name}</span></div>
      ${bar}
      <div class="mc-pct">${sub}</div>
    </div>`;
}

/** רשת שש הפינות + הסימולציה כמשבצת רחבה. */
export function cornersGridHtml(s) {
  const v = s.vocab;
  const vocabSub = v.due
    ? `${v.due} מילים לחזרה היום`
    : (v.acquired ? `${v.acquired} מילים בזיכרון` : 'מתחילים עם המילים החשובות באמת');
  const lisSub = s.listening.answered
    ? `${s.listening.answered} שאלות · דיוק ${s.listening.accuracy ?? '—'}%`
    : '250 קטעים מחכים לך';

  const sim = s.lastSim;
  const simScore = sim?.scaled_score ?? null;                       // סשן 3 מוסיף סולם 50-150
  const simAcc = sim?.total_answered ? Math.round((sim.total_correct / sim.total_answered) * 100) : null;
  const simSub = sim
    ? (simScore != null
        ? `ציון משוער אחרון: <b>${simScore}</b> · ${daysAgo(sim.created_at)}`
        : `האבחון האחרון: <b>${simAcc}%</b> דיוק · ${daysAgo(sim.created_at)}`)
    : 'כ-25 דקות, ובסוף דוח לפי מיומנות';

  return `
    <div class="module-grid corners-grid">
      ${tile('mc-g', '/card',                '🗂️', 'אוצר מילים',      vocabSub, v.pct)}
      ${tile('mc-o', '/rephrasing',          '✍️', 'ניסוח מחדש',      s.rephrase.attempts ? `${s.rephrase.attempts} שאלות תרגלת` : 'מתחילים מהמפתחות', s.rephrase.pct)}
      ${tile('mc-b', '/listening',           '🎧', 'האזנה',           lisSub, s.listening.pct)}
      ${tile('mc-y', '/sentence-completion', '✏️', 'השלמת משפטים',    s.sc.attempts ? `${s.sc.attempts} שאלות תרגלת` : '800 שאלות במאגר', null)}
      ${tile('mc-p', '/reading',             '📖', 'הבנת הנקרא',      s.reading.passages ? `${s.reading.passages} קטעים תרגלת` : '100 קטעים מחכים לך', null)}
      ${tile('mc-c', '/affix',               '🔤', 'תחיליות וסופיות', s.affix.attempts ? `${s.affix.attempts} שאלות תרגלת` : 'לפענח מילה שלא הכרת', null)}
      <div class="mc mc-sim" data-nav="/simulation" role="link" tabindex="0">
        <div class="mc-top"><span class="mc-icon">🧪</span><span class="mc-name">סימולציה</span></div>
        <div class="mc-pct">${simSub}</div>
        <span class="mc-go">${sim ? 'לסימולציה הבאה ←' : 'להתחיל ←'}</span>
      </div>
    </div>`;
}

/** מחבר לחיצה + Enter על כל משבצת. */
export function wireCorners(el) {
  el.querySelectorAll('.corners-grid [data-nav]').forEach((t) => {
    t.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
    });
  });
}
