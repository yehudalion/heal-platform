import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';
import { getWeakPointsChart, getWeeklyActivity, getSrsGrowth, getVocabFunnel, getAccuracyByModule, getCumulativeGrowth, getMistakeNotebookProgress } from '../data/insights.data.js';

// "התובנות שלי" (מוצר/UX chat, 2026-08-30) — 8 of the 9 charts scoped in
// claude/PLAN_levels_analytics_corners.md §1, all following the same
// "מסגרת נוכחת, תוכן מתמלא" card pattern: מפתחות חלשים מדורגים (#9), מפת חום
// שבועית (#8), צמיחת הזיכרון (#6), משפך אוצר המילים (#7), דיוק לפי מודול
// (#2). Only #1 (רמה לאורך זמן) is missing — blocked on the level-save
// wiring, see the plan doc §0/§1.
//
// 31.8 (Lion's per-card review): the screen is now SIX cards, not eight.
// Dropped — מהירות תגובה, גמילה מרמזים, עצמאות בהאזנה (rejected 30.8), and
// תיקון עצמי בהאזנה (Lion: "נוותר כרגע" — depends on a retry mechanic with
// zero rows today). Merged — משפך אוצר המילים into צמיחת הזיכרון, now titled
// המילים שנכנסו לזיכרון because the old name was not understandable.
// Kept and sharpened — המפתחות שכדאי לחזק now links each bar to targeted
// practice, and דיוק לפי מודול now shows direction rather than a bare grade.
//
// ⚠️ Lion, 31.8, explicitly: there is NO blanket rule against showing numbers
// or against telling the learner what is left. Judge every corner on its own.

const DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sunday..Saturday (JS getDay() order)

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function cardShell(title, sub, bodyHtml) {
  return `<div class="ins-card">
    <div class="ins-card-title">${esc(title)}</div>
    ${sub ? `<div class="ins-card-sub">${esc(sub)}</div>` : ''}
    <div class="ins-card-body">${bodyHtml}</div>
  </div>`;
}

function buildingBlock(text) {
  return `<div class="ins-building">
    <div class="ins-building-frame"></div>
    <p>${esc(text)}</p>
  </div>`;
}

function fmtDays(n) {
  const r = Math.round(n * 10) / 10;
  return `${r} ${r === 1 ? 'יום' : 'ימים'}`;
}

// Targeted-practice routes. Both practice screens already accept ?key=<id>
// (rephrase-practice.js:104, sc-practice.js:109) and CATEGORIES ids are the
// same ids weakpoints.data.js tallies on — verified 31.8. Listening has no
// per-key practice route, so its rows stay unlinked rather than guessing one.
const PRACTICE_ROUTE = { rephrase: '#/rephrase-practice', sc: '#/sc-practice' };

// ─── Card 1: המפתחות שכדאי לחזק ───
function weakPointsCard(res) {
  const TITLE = 'המפתחות שכדאי לחזק';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד קצת תרגול ויופיע כאן מה הכי משתלם לחזק (${res.attempts}/${res.minAttempts} בתרגול המתקדם ביותר שלכם).`));
  }
  if (res.status === 'ready_empty') {
    return cardShell(TITLE, '', `<p class="ins-note">אין כרגע מפתח שבולט לחיזוק — התשובות שלכם מפוזרות באופן דומה בכל הנושאים. כל הכבוד.</p>`);
  }
  const max = Math.max(...res.items.map(i => i.lift));
  const bars = res.items.map(it => {
    const pct = Math.max(8, Math.round((it.lift / max) * 100));
    const inner = `<div class="ins-hbar-lbl">${esc(it.label)} <span class="ins-hbar-mod">· ${esc(it.moduleLabel)}</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill" style="width:${pct}%"></div></div>`;
    const route = PRACTICE_ROUTE[it.moduleId];
    return route
      ? `<a class="ins-hbar-row ins-hbar-link" href="${route}?key=${encodeURIComponent(it.pointId)}">${inner}<span class="ins-go">תרגלו את זה ←</span></a>`
      : `<div class="ins-hbar-row">${inner}</div>`;
  }).join('');
  return cardShell(TITLE, 'מדורג לפי כמה פעמים זה מבלבל אתכם יחסית לשאר', bars);
}

// ─── Card 2: הימים שבהם אתם הכי פעילים ───
// Renamed 31.8 — "הקצב השבועי" read as "this week" and collided with the home
// screen's weekly dots. This card is a day-of-week PATTERN over 8 weeks.
function weeklyActivityCard(res) {
  const TITLE = 'הימים שבהם אתם הכי פעילים';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה תרגולים ותראו כאן את הימים שבהם אתם הכי פעילים (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.counts);
  const bars = res.counts.map((c, i) => {
    const pct = Math.max(4, Math.round((c / max) * 100));
    return `<div class="ins-vbar-col">
      <div class="ins-vbar-track"><div class="ins-vbar-fill" style="height:${pct}%"></div></div>
      <div class="ins-vbar-lbl">${DOW[i]}</div>
    </div>`;
  }).join('');
  return cardShell(TITLE, 'פעולות תרגול ב-8 השבועות האחרונים, לפי יום בשבוע', `<div class="ins-vbars">${bars}</div>`);
}

// ─── Card 3: המילים שנכנסו לזיכרון ───
// Merge of the old "צמיחת הזיכרון" + "משפך אוצר המילים" (Lion, 31.8: the old
// title was not understandable, and the two told the same story twice).
// Plain-language state labels — no SRS jargon reaches the learner.
const SRS_STATE_LABEL = {
  new:        'עוד לא התחלתם',
  learning:   'בתהליך למידה',
  review:     'כבר בזיכרון',
  relearning: 'חוזרים אליהן שוב',
};
function memoryCard(srs, funnel) {
  const TITLE = 'המילים שנכנסו לזיכרון';
  const SUB = 'ככל שאתם זוכרים מילה טוב יותר, אנחנו מחכים יותר זמן לפני שנחזור אליה';
  if (funnel.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (funnel.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (funnel.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה מילים בתרגול ותראו כאן איפה כל מילה עומדת (${funnel.total}/${funnel.min}).`));
  }
  const order = ['review', 'learning', 'relearning', 'new'];
  const max = Math.max(1, ...order.map(k => funnel.counts[k]));
  const bars = order.filter(k => funnel.counts[k] > 0 || k === 'review').map(k => {
    const c = funnel.counts[k];
    const pct = Math.max(4, Math.round((c / max) * 100));
    return `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(SRS_STATE_LABEL[k])} <span class="ins-hbar-mod">· ${c}</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill ins-hbar-fill--alt" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  const avgNow = (srs.status === 'ready' && srs.series?.length)
    ? srs.series[srs.series.length - 1].avg
    : null;
  const highlight = (avgNow && avgNow > 0)
    ? `<p class="ins-note">בממוצע אנחנו מחכים עכשיו <b>${fmtDays(avgNow)}</b> לפני שחוזרים על מילה שאתם כבר יודעים — ככל שתזכרו אותה, המרווח הזה יגדל.</p>`
    : `<p class="ins-note">כל תשובה נכונה מרחיקה את הפעם הבאה שנציג לכם את המילה — זה הסימן שהיא נכנסה לזיכרון.</p>`;
  return cardShell(TITLE, SUB, bars + highlight);
}

// ─── Card 4: דיוק לפי מודול ───
// Lion, 31.8: a number is fine — a number with no context is what reads as a
// report card. So every module shows its own direction over the previous
// week, and a decline is stated as a plain fact with no red flag or verdict.
function accuracyByModuleCard(res) {
  const TITLE = 'הדיוק שלכם לפי מודול';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  const rows = res.modules.map(m => {
    if (m.status === 'building') {
      return `<div class="ins-hbar-row"><div class="ins-hbar-lbl" style="color:var(--muted)">${esc(m.label)} — עוד ${m.min - m.attempts} תרגולים ותוצג כאן רמת הדיוק (${m.attempts}/${m.min})</div></div>`;
    }
    let trend = '';
    if (m.direction === 'up')        trend = `<span class="ins-trend up">↑ עליתם מ-${m.prevAccuracy}%</span>`;
    else if (m.direction === 'same') trend = `<span class="ins-trend">יציב מול השבוע הקודם</span>`;
    else if (m.direction === 'down') trend = `<span class="ins-trend">בשבוע הקודם ${m.prevAccuracy}%</span>`;
    return `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(m.label)} <span class="ins-hbar-mod">· ${m.accuracy}%</span> ${trend}</div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill" style="width:${Math.max(4, m.accuracy)}%"></div></div>
    </div>`;
  }).join('');
  return cardShell(TITLE, 'השבוע האחרון, לעומת השבוע שלפניו', rows);
}

// ─── Card 5: הצמיחה המצטברת שלכם ───
function cumulativeGrowthCard(res) {
  const TITLE = 'הצמיחה המצטברת שלכם';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה תרגולים ותראו כאן איך הכמות הכוללת גדלה (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.series.map(x => x.cumulative));
  const bars = res.series.map(x => {
    const pct = Math.max(4, Math.round((x.cumulative / max) * 100));
    return `<div class="ins-vbar-col"><div class="ins-vbar-track"><div class="ins-vbar-fill" style="height:${pct}%"></div></div></div>`;
  }).join('');
  return cardShell(TITLE, `${res.total} פעולות תרגול מאז שהתחלתם — המספר הזה רק גדל`, `<div class="ins-vbars ins-vbars--growth">${bars}</div>`);
}

// ─── Card 6: התקדמות במחברת הטעויות ───
function mistakeProgressCard(res) {
  const TITLE = 'התקדמות במחברת הטעויות';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד קצת תרגול ותוכלו להתחיל לסגור טעויות במחברת הטעויות (${res.total}/${res.min}).`));
  }
  const pct = Math.max(4, Math.round((res.resolved / res.total) * 100));
  return cardShell(TITLE, 'כמה מהטעויות שתועדו נסגרו',
    `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">נסגרו <span class="ins-hbar-mod">· ${res.resolved} מתוך ${res.total}</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill ins-hbar-fill--alt" style="width:${pct}%"></div></div>
    </div>
    <p class="ins-note">${res.resolved > 0 ? 'כל טעות שסגרתם היא דבר שכבר לא יפתיע אתכם במבחן.' : 'סמנו טעות כ&quot;תוקנה&quot; כדי לראות אותה כאן.'}</p>
    <a class="ins-go ins-go--block" href="#/mistake-notebook">למחברת הטעויות ←</a>`);
}

export async function renderInsights(root) {
  await renderLayout(root, '/insights');
  ensureStyles();
  const el = getPageContent();

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  el.innerHTML = `
    <div class="fade-in ins-wrap">
      <div class="page-title">התובנות שלי</div>
      <div class="page-sub">מגמות אמיתיות מתוך התרגול שלכם — לא רק ציון, אלא תמונה של איך אתם לומדים.</div>
      ${!userId
        ? `<p class="ins-empty">התחברו כדי לראות את התובנות האישיות שלכם.</p>`
        : `<div class="ins-grid" id="insGrid"><div class="spinner-wrap"><div class="spinner"></div></div></div>`}
    </div>`;

  if (!userId) return;

  const [weak, weekly, srs, funnel, accuracy, growth, mistakes] = await Promise.all([
    getWeakPointsChart(userId),
    getWeeklyActivity(userId),
    getSrsGrowth(userId),
    getVocabFunnel(userId),
    getAccuracyByModule(userId),
    getCumulativeGrowth(userId),
    getMistakeNotebookProgress(userId),
  ]);

  // Ready cards first, still-filling ones after. Nothing is hidden and no number
  // is invented — but a new learner shouldn't open the screen onto a wall of
  // placeholders (Lion, 31.8).
  const isReady = (r) => r.status !== 'building';
  const cards = [
    [weakPointsCard(weak),                    isReady(weak)],
    [memoryCard(srs, funnel),                 isReady(funnel)],
    [accuracyByModuleCard(accuracy),          true],
    [cumulativeGrowthCard(growth),            isReady(growth)],
    [weeklyActivityCard(weekly),              isReady(weekly)],
    [mistakeProgressCard(mistakes),           isReady(mistakes)],
  ];
  const ordered = [...cards.filter(c => c[1]), ...cards.filter(c => !c[1])];

  el.querySelector('#insGrid').innerHTML = ordered.map(c => c[0]).join('');
}

function ensureStyles() {
  if (document.getElementById('ins-css')) return;
  const s = document.createElement('style');
  s.id = 'ins-css';
  s.textContent = `
.ins-wrap { max-width: 900px; }
.ins-empty { color:var(--muted); font-size:.9rem; text-align:center; padding:1rem 0; line-height:1.7; }
.ins-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin-top:1rem; }
.ins-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:1.1rem 1.2rem; }
.ins-card-title { font-weight:800; font-size:.95rem; color:var(--text); margin-bottom:.2rem; }
.ins-card-sub { font-size:.76rem; color:var(--muted); margin-bottom:.9rem; }
.ins-card-body { min-height:110px; }
.ins-building { display:flex; flex-direction:column; gap:.6rem; align-items:center; text-align:center; padding:.6rem 0; }
.ins-building-frame { width:100%; height:56px; border:1.5px dashed var(--border); border-radius:var(--radius-sm);
  background:repeating-linear-gradient(135deg,transparent,transparent 8px,var(--bg) 8px,var(--bg) 16px); }
.ins-building p { font-size:.8rem; color:var(--muted); line-height:1.6; margin:0; }
.ins-note { font-size:.82rem; color:var(--text); line-height:1.7; margin:.4rem 0 0; }
.ins-hbar-row { margin-bottom:.65rem; }
.ins-hbar-lbl { font-size:.8rem; color:var(--text); margin-bottom:.25rem; }
.ins-hbar-mod { color:var(--muted); font-weight:400; }
.ins-hbar-track { height:9px; border-radius:5px; background:var(--border); overflow:hidden; }
.ins-hbar-fill { height:100%; background:var(--orange); border-radius:5px; }
.ins-hbar-fill--alt { background:var(--purple); }
.ins-hbar-link { display:block; text-decoration:none; color:inherit; padding:.3rem .4rem; margin:0 -.4rem .35rem; border-radius:var(--radius-sm); }
.ins-hbar-link:hover { background:var(--bg); }
.ins-hbar-link:focus-visible { outline:2px solid var(--green); outline-offset:1px; }
.ins-go { display:inline-block; font-size:.74rem; font-weight:700; color:var(--green-dark); margin-top:.25rem; text-decoration:none; }
.ins-go--block { margin-top:.6rem; }
.ins-go:hover { text-decoration:underline; }
.ins-trend { font-size:.72rem; color:var(--muted); font-weight:700; }
.ins-trend.up { color:var(--green-dark); }
.ins-vbars { display:flex; align-items:flex-end; gap:.5rem; height:100px; padding-top:.5rem; }
.ins-vbars--growth { height:80px; }
.ins-vbar-col { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:.35rem; }
.ins-vbar-track { width:100%; max-width:26px; height:100%; display:flex; align-items:flex-end; }
.ins-vbar-fill { width:100%; background:var(--green); border-radius:3px 3px 0 0; min-height:3px; }
.ins-vbar-fill--alt { background:var(--blue); }
.ins-vbar-fill--gold { background: var(--yellow); }
.ins-vbar-lbl { font-size:.72rem; color:var(--muted); font-weight:700; }
`;
  document.head.appendChild(s);
}
