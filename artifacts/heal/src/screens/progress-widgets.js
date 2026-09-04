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
