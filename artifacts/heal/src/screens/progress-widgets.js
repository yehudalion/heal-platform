/**
 * src/screens/progress-widgets.js — הווידג'טים שעברו ממסך הבית ל"ההתקדמות שלי".
 *
 * סשן שבת 1 (5.9.2026), לפי החלטת יהודה על מסך הבית: הבית עונה על שאלה
 * אחת — "מה עושים עכשיו" — וכל מה שהוא דוח עובר לכאן. וגם: "התקדמות אמיתית
 * נוכחת יותר, המשחקיות קיימת אבל פחות מובלטת" — ולכן כרטיס הדרגה/XP/תגים
 * יושב כאן, בגודל צנוע, ולא בראש הבית.
 *
 * הפונקציות הועתקו מ-home.js בלי שינוי לוגי; ה-CSS שלהן (gm-*, wk-*, diag-*,
 * dg-*, metrics-grid, dd-*) נשאר ב-styles.css תחת אותם שמות.
 */
import { rankFor, RANKS, badgeInfo } from '../lib/xp.js';
import { SECTION_LABELS } from '../data/simulation.data.js';
import {
  accuracyByModuleCard,
  cumulativeGrowthCard,
  activityCalendarCard,
} from './insights.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** הקצב השבועי — "למדת X מתוך 5 ימים השבוע", מתאפס כל שבוע, שום דבר לא "נשבר". */
export function weeklyPaceCard(weekly) {
  if (!weekly) return '';
  const activeCount = weekly.activeDays?.length ?? 0;
  const dots = Array.from({ length: weekly.target || 5 }, (_, i) =>
    `<i class="wk-dot${i < activeCount ? ' on' : ''}"></i>`).join('');
  return `
    <div class="wk-card" style="max-width:none;margin:0 0 1rem">
      <div class="wk-top">
        <span class="wk-lbl">השבוע</span>
        <span class="wk-count">${activeCount} מתוך ${weekly.target || 5} ימים</span>
      </div>
      <div class="wk-dots">${dots}</div>
    </div>`;
}

/**
 * כרטיס המשחוק: דרגה, פס לדרגה הבאה, רצף ותגים.
 *  · "דרגה" ולא "רמה". · רצף 0 = "מתחילים רצף חדש". · מדברים על מה שיש.
 *  · המגן מוזכר רק ביום שבו הוא רלוונטי (אתמול הוחמץ).
 */
export function gamificationCard(gm, badgeCodes = []) {
  if (!gm) return '';
  const r = rankFor(gm.xp || 0);
  const into = gm.xp_into_rank ?? 0;
  const per = gm.xp_per_rank || 300;
  const pct = Math.max(2, Math.min(100, Math.round((into / per) * 100)));
  const isTop = r.index >= RANKS.length;
  const streak = gm.streak || 0;

  const streakHtml = streak > 0
    ? `<div class="gm-streak">🔥 ${streak} ${streak === 1 ? 'יום' : 'ימים'} ברצף</div>`
    : `<div class="gm-streak gm-streak--off">מתחילים רצף חדש היום</div>`;

  const shieldHtml = gm.streak_at_risk
    ? `<div class="gm-shield gm-shield--now">🛡️ יום מוגן — תרגול היום שומר על הרצף שלך. מחר המגן כבר לא יחזיק אותו.</div>`
    : '';

  const earned = new Set(badgeCodes || []);
  const badgesHtml = earned.size
    ? `<div class="gm-badges">${[...earned].slice(-6).map((c) => {
        const b = badgeInfo(c);
        return b ? `<span class="gm-badge" title="${esc(b.desc)}">${b.icon} <b>${esc(b.name)}</b></span>` : '';
      }).join('')}</div>`
    : '';

  return `
    <div class="gm-card">
      <div class="gm-rank">
        <span class="gm-rank-icon">${r.icon}</span>
        <div>
          <div class="gm-rank-name">${esc(r.name)}</div>
          <div class="gm-rank-sub">${gm.xp || 0} נקודות ניסיון</div>
        </div>
      </div>
      <div class="gm-bar-wrap">
        <div class="gm-bar"><div class="gm-fill" style="width:${isTop ? 100 : pct}%"></div></div>
        <div class="gm-bar-lbl">
          <span>${isTop ? 'הדרגה הגבוהה ביותר' : `עוד ${per - into} נקודות לדרגה הבאה`}</span>
          <span>${isTop ? '' : `${into}/${per}`}</span>
        </div>
      </div>
      ${streakHtml}
    </div>
    ${shieldHtml || badgesHtml ? `<div style="margin:-.55rem 0 1rem">${shieldHtml}${badgesHtml}</div>` : ''}
  `;
}

/** פס האבחון האחרון — בלי מצב אפס עם אפסים. */
export function diagnosticBand(last) {
  if (!last || !Array.isArray(last.section_stats) || !last.section_stats.length) {
    return `
      <div class="diag-empty" data-nav="/simulation">
        <div class="de-text">
          <div class="de-title">עוד לא עשית סימולציה</div>
          <div class="de-sub">קצרה (רבע שעה) או מלאה (כ-48 דקות), ובסוף ציון משוער בסולם 50–150 וסקירה של כל שאלה</div>
        </div>
        <span class="de-btn">לסימולציות ←</span>
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
    <div class="sec-title diag-sec-title" style="margin-top:1.6rem">הסימולציה האחרונה שלך</div>
    <div class="diag-grid" data-nav="/simulation">
      <div class="dg-tile dg-tile-main">
        <div class="dg-val dg-val-big">${last.scaled_score != null ? last.scaled_score : overall + '%'}</div>
        <div class="dg-lbl">${last.scaled_score != null ? 'ציון משוער' : 'דיוק כללי'}</div>
      </div>
      ${tiles}
    </div>`;
}

/** שלושת המחוונים שיהודה בחר (1.9): דיוק לפי מודול, צמיחה מצטברת, ימים פעילים. */
export function metricsSection(accuracy, growth, calendar) {
  if (!accuracy) return '';
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
 * הטיפ היומי — אחד משמונת ה"מפתחות" הקיימים (dailyTip.data.js).
 * ⚠️ מיקום זמני: המקום הנכון שלו הוא מסך ההגדרות שלפני מנה (פריט 28 ברשימה,
 * סשן 5) — טיפ על ניסוח מחדש שווה הרבה יותר שנייה לפני שמתחילים ניסוח מחדש.
 * עד אז הוא מוצג כאן, לא בבית.
 */
export function tipCard(tipRes) {
  const tip = tipRes?.tip;
  if (!tip) return '';
  return `
    <div class="dd-card dd-tip" style="margin-bottom:1rem">
      <div class="dd-head">
        <span class="dd-badge dd-badge-tip">טיפ</span>
        <span class="dd-tip-module">${esc(tip.moduleLabel)}</span>
      </div>
      <p class="dd-tip-intro">${esc(tip.intro)}</p>
      <div class="dd-tip-label">${esc(tip.label)}</div>
      <p class="dd-tip-cue">${esc(tip.cue)}</p>
      <a class="dd-more-link" href="${esc(tip.learnHref)}">ההסבר המלא + דוגמה ←</a>
    </div>`;
}

// ─── סשן שבת 5 (5.9.2026): מפת המסלול + התובנה שלך השבוע ────────────────────
// פריטים 29-30 מרשימת המתחרה. המפה היא הבלוק הראשון ב-/progress: שורה לכל
// פינה, שלוש נקודות לפי כלל שלוש השכבות (מלאה = בוצע, זהב = בתהליך, ריקה =
// טרם), ומשפט אחד על הצעד הבא מהדאטה האמיתי (data/journey.data.js).
// אין נעילה, אין בוסים, אין מספרי רמה — "התקדמות אמיתית נוכחת יותר".

const TONE_BG = { g: 'var(--green-light)', o: 'var(--orange-light)', b: 'var(--blue-light)',
                  y: 'var(--gold-light)', p: 'var(--purple-light)', c: 'var(--sky-light)' };

function dots(c) {
  const d = (state, title) => `<i class="jm-dot ${state === 'done' ? 'is-done' : state === 'active' ? 'is-active' : ''}" title="${esc(title)}"></i>`;
  return `<span class="jm-dots" aria-label="למידה ${c.learn}, תרגול ${c.practice}, ניתוח ${c.analyze}">
    ${d(c.learn, 'למידה')}${d(c.practice, 'תרגול')}${d(c.analyze, 'ניתוח')}</span>`;
}

/** מפת המסלול — שורה לכל פינה. לחיצה על שורה → הצעד הבא בפינה. */
export function journeyMap(journey) {
  ensureJourneyStyles();
  const corners = journey?.corners ?? [];
  if (!corners.length) return '';
  const rows = corners.map((c) => `
    <div class="jm-row" data-nav="${esc(c.nextRoute || c.route)}" role="link" tabindex="0">
      <span class="jm-ic" style="background:${TONE_BG[c.tone] || 'var(--bg)'}">${c.icon}</span>
      <span class="jm-body"><b>${esc(c.label)}</b><span class="jm-next">${esc(c.next)}</span></span>
      ${dots(c)}
    </div>`).join('');
  return `
    <section class="jm-card">
      <div class="jm-head"><span class="jm-title">המסלול שלך</span><span class="jm-legend">למידה → תרגול → ניתוח</span></div>
      ${rows}
      <div class="jm-foot"><i class="jm-dot is-done"></i> בוצע &nbsp; <i class="jm-dot is-active"></i> בתהליך &nbsp; <i class="jm-dot"></i> טרם</div>
    </section>`;
}

/**
 * "התובנה שלך השבוע" — משפט אחד, לא דוח: המפתח עם הכי הרבה טעויות ב-14 יום,
 * וכפתור אחד לתרגול ממוקד בו. בלי תובנה — אומרים זאת, לא ממציאים.
 */
export function insightCard(insight) {
  ensureJourneyStyles();
  if (!insight) {
    return `
    <section class="jm-ins jm-ins-empty">
      <div class="jm-lbl">התובנה שלך השבוע</div>
      <p>עוד אין תבנית ברורה בשבועיים האחרונים. אחרי עוד כמה מנות של ניסוח, השלמה או תחיליות — תופיע כאן עצה אחת ממוקדת.</p>
    </section>`;
  }
  const where = insight.moduleId === 'affix' ? `משפחת <b>${esc(insight.keyLabel)}</b>` : `מפתח <b>${esc(insight.keyLabel)}</b>`;
  return `
    <section class="jm-ins">
      <div class="jm-lbl">התובנה שלך השבוע</div>
      <p>ב${esc(insight.moduleLabel)}, ${where} חזר בטעויות שלך ${insight.misses} פעמים
         מתוך ${insight.exposures} בשבועיים האחרונים — יותר מכל מפתח אחר. מנה ממוקדת אחת סוגרת את הפער הזה מהר יותר מכל דבר אחר.</p>
      <button class="btn-primary jm-go" data-nav="${esc(insight.practiceRoute)}">לתרגול ממוקד על ${esc(insight.keyLabel)} ←</button>
    </section>`;
}

function ensureJourneyStyles() {
  if (document.getElementById('jm-css')) return;
  const s = document.createElement('style');
  s.id = 'jm-css';
  s.textContent = `
.jm-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:.9rem 1rem;margin-bottom:1rem;display:grid;gap:.45rem}
.jm-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.2rem}
.jm-title{font-weight:900;font-size:1rem}
.jm-legend{font-size:.7rem;color:var(--muted);font-weight:700;letter-spacing:.03em}
.jm-row{display:grid;grid-template-columns:auto 1fr auto;gap:.65rem;align-items:center;padding:.5rem .6rem;border:1px solid var(--border);border-radius:10px;cursor:pointer;background:var(--card);transition:border-color .15s}
.jm-row:hover,.jm-row:focus-visible{border-color:var(--green)}
.jm-ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:1rem}
.jm-body{display:grid;gap:1px;min-width:0}
.jm-body b{font-size:.9rem}
.jm-next{font-size:.76rem;color:var(--muted);line-height:1.4}
.jm-dots{display:flex;gap:.28rem}
.jm-dot{width:9px;height:9px;border-radius:50%;background:var(--border);display:inline-block}
.jm-dot.is-done{background:var(--green)}
.jm-dot.is-active{background:var(--gold,#B08442)}
.jm-foot{font-size:.7rem;color:var(--muted);margin-top:.2rem}
.jm-ins{border:1.5px dashed var(--gold,#B08442);background:rgba(176,132,66,.08);border-radius:12px;padding:.8rem .95rem;margin-bottom:1rem}
.jm-ins p{margin:.3rem 0 .7rem;font-size:.9rem;line-height:1.65}
.jm-ins-empty{border-style:dotted;opacity:.9}
.jm-ins-empty p{margin-bottom:0;color:var(--muted);font-size:.84rem}
.jm-lbl{font-size:.7rem;font-weight:800;color:var(--muted);letter-spacing:.04em}
.jm-go{width:100%}
`;
  document.head.appendChild(s);
}
