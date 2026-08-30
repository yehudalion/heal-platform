import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';
import { getWeakPointsChart, getWeeklyActivity, getSrsGrowth, getVocabFunnel, getAccuracyByModule, getResponseTimeTrend, getHintWeaning, getListeningIndependence } from '../data/insights.data.js';

// "התובנות שלי" (מוצר/UX chat, 2026-08-30) — 8 of the 9 charts scoped in
// claude/PLAN_levels_analytics_corners.md §1, all following the same
// "מסגרת נוכחת, תוכן מתמלא" card pattern: מפתחות חלשים מדורגים (#9), מפת חום
// שבועית (#8), צמיחת הזיכרון (#6), משפך אוצר המילים (#7), דיוק לפי מודול
// (#2), מהירות תגובה (#3), גמילה מרמזים (#4), עצמאות בהאזנה (#5). Only #1
// (רמה לאורך זמן) is missing — blocked on the level-save wiring, see the
// plan doc §0/§1.
//
// Free for everyone: matches MONETIZATION_decisions.md's existing default
// ("אנליטיקס: בסיסי חינם, תרשימי עומק בתשלום") — these three are the basic
// tier. No tier gate baked into this file; if/when a paid split is drawn
// through this screen, it belongs in main.js/lib/modules.js like every other
// module gate, not hand-rolled here.

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

// ─── Card 1: מפתחות חלשים מדורגים ───
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
    return `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(it.label)} <span class="ins-hbar-mod">· ${esc(it.moduleLabel)}</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  return cardShell(TITLE, 'מדורג לפי כמה פעמים זה מבלבל אתכם יחסית לשאר', bars);
}

// ─── Card 2: הקצב השבועי שלכם ───
function weeklyActivityCard(res) {
  const TITLE = 'הקצב השבועי שלכם';
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

// ─── Card 3: צמיחת הזיכרון ───
function srsGrowthCard(res) {
  const TITLE = 'צמיחת הזיכרון';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה חזרות ותוכלו לראות כאן איך המרווחים בין החזרות שלכם מתארכים (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.series.map(s => s.avg));
  const bars = res.series.map(s => {
    const pct = Math.max(4, Math.round((s.avg / max) * 100));
    return `<div class="ins-vbar-col"><div class="ins-vbar-track"><div class="ins-vbar-fill ins-vbar-fill--alt" style="height:${pct}%"></div></div></div>`;
  }).join('');
  const highlight = res.best?.word
    ? `<p class="ins-note">המילה שהתבססה הכי הרבה: <b>${esc(res.best.word)}</b> — מרווח החזרה גדל מ-${fmtDays(res.best.prev)} ל-${fmtDays(res.best.next)}.</p>`
    : `<p class="ins-note">כל חזרה נכונה מרחיקה את המילה הבאה — עוד מוקדם לראות כאן דוגמה בולטת.</p>`;
  return cardShell(TITLE, 'ממוצע מרווח בין חזרות, שבוע אחר שבוע', `<div class="ins-vbars ins-vbars--growth">${bars}</div>${highlight}`);
}

// ─── Card 4: משפך אוצר המילים ───
function vocabFunnelCard(res) {
  const TITLE = 'משפך אוצר המילים';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה מילים בתרגול ותראו כאן איפה כל מילה עומדת (${res.total}/${res.min}).`));
  }
  const order = ['new', 'learning', 'review', 'relearning'];
  const labels = { new: 'חדשות', learning: 'בלימוד', review: 'בחזרה', relearning: 'לומדות מחדש' };
  const max = Math.max(1, ...order.map(k => res.counts[k]));
  const bars = order.map(k => {
    const c = res.counts[k];
    const pct = Math.max(4, Math.round((c / max) * 100));
    return `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(labels[k])} <span class="ins-hbar-mod">· ${c}</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill ins-hbar-fill--alt" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  return cardShell(TITLE, `${res.total} מילים בסבב החזרות שלכם כרגע`, bars);
}

// ─── Card 5: דיוק לפי מודול ───
function accuracyByModuleCard(res) {
  const TITLE = 'דיוק לפי מודול';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  const rows = res.modules.map(m => {
    if (m.status === 'building') {
      return `<div class="ins-hbar-row"><div class="ins-hbar-lbl" style="color:var(--muted)">${esc(m.label)} — עוד ${m.min - m.attempts} תרגולים ותוצג כאן רמת הדיוק (${m.attempts}/${m.min})</div></div>`;
    }
    return `<div class="ins-hbar-row">
      <div class="ins-hbar-lbl">${esc(m.label)} <span class="ins-hbar-mod">· ${m.accuracy}%</span></div>
      <div class="ins-hbar-track"><div class="ins-hbar-fill" style="width:${Math.max(4, m.accuracy)}%"></div></div>
    </div>`;
  }).join('');
  return cardShell(TITLE, '30 הימים האחרונים, לפי מודול', rows);
}

// ─── Card 6: מהירות התגובה שלכם ───
function responseTimeCard(res) {
  const TITLE = 'מהירות התגובה שלכם';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה תרגולים ותראו כאן איך הקצב שלכם משתנה עם הזמן (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.series.map(s => s.avgMs));
  const bars = res.series.map(s => {
    const pct = Math.max(4, Math.round((s.avgMs / max) * 100));
    return `<div class="ins-vbar-col"><div class="ins-vbar-track"><div class="ins-vbar-fill" style="height:${pct}%"></div></div></div>`;
  }).join('');
  const note = (res.pctFaster !== null && res.pctFaster >= 5)
    ? `<p class="ins-note">אתם עונים מהר יותר ב-${res.pctFaster}% מאשר בהתחלה — הבחינה עצמה מתוזמנת, וזה בדיוק מה שעוזר שם.</p>`
    : `<p class="ins-note">כל תרגול עוזר לכם למצוא את הקצב שמתאים לכם. אין כאן "נכון" ו"לא נכון" — רק תרגול.</p>`;
  return cardShell(TITLE, 'זמן תגובה ממוצע, שבוע אחר שבוע (עמודה נמוכה = תשובה מהירה)', `<div class="ins-vbars">${bars}</div>${note}`);
}

// ─── Card 7: גמילה מרמזים ───
function hintWeaningCard(res) {
  const TITLE = 'גמילה מרמזים';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה תרגולים ותראו כאן איך השימוש ברמז 💡 משתנה עם הזמן (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.series.map(s => s.pct));
  const bars = res.series.map(s => {
    const pct = Math.max(4, Math.round((s.pct / max) * 100));
    return `<div class="ins-vbar-col"><div class="ins-vbar-track"><div class="ins-vbar-fill ins-vbar-fill--gold" style="height:${pct}%"></div></div></div>`;
  }).join('');
  const first = res.series[0].pct, last = res.series[res.series.length - 1].pct;
  const note = (res.pointsDropped !== null && res.pointsDropped > 0)
    ? `<p class="ins-note">השימוש ברמז ירד מ-${first}% מהתשובות ל-${last}% — סימן לשליטה גדלה.</p>`
    : `<p class="ins-note">עדיין מוקדם לראות מגמה ברורה. הרמז תמיד שם כשצריך אותו.</p>`;
  return cardShell(TITLE, 'אחוז התשובות שנעזרו ברמז, שבוע אחר שבוע', `<div class="ins-vbars">${bars}</div>${note}`);
}

// ─── Card 8: עצמאות בהאזנה ───
function listeningIndependenceCard(res) {
  const TITLE = 'עצמאות בהאזנה';
  if (res.status === 'guest') return cardShell(TITLE, '', buildingBlock('התחברו כדי לראות את זה.'));
  if (res.status === 'error') return cardShell(TITLE, '', buildingBlock('אין כרגע נתונים להצגה.'));
  if (res.status === 'building') {
    return cardShell(TITLE, '',
      buildingBlock(`עוד כמה שאלות האזנה ותראו כאן כמה פעמים אתם חוזרים על ההקלטה (${res.total}/${res.min}).`));
  }
  const max = Math.max(1, ...res.series.map(s => s.avgReplays));
  const bars = res.series.map(s => {
    const pct = Math.max(4, Math.round((s.avgReplays / max) * 100));
    return `<div class="ins-vbar-col"><div class="ins-vbar-track"><div class="ins-vbar-fill ins-vbar-fill--alt" style="height:${pct}%"></div></div></div>`;
  }).join('');
  return cardShell(TITLE, 'ממוצע האזנות חוזרות לשאלה, שבוע אחר שבוע',
    `<div class="ins-vbars">${bars}</div><p class="ins-note">צפיתם בתמלול ב-${res.transcriptPct}% מהשאלות עד כה — כלי עזר לגיטימי, לא "רמאות".</p>`);
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

  const [weak, weekly, srs, funnel, accuracy, respTime, hints, listening] = await Promise.all([
    getWeakPointsChart(userId),
    getWeeklyActivity(userId),
    getSrsGrowth(userId),
    getVocabFunnel(userId),
    getAccuracyByModule(userId),
    getResponseTimeTrend(userId),
    getHintWeaning(userId),
    getListeningIndependence(userId),
  ]);

  const gridEl = el.querySelector('#insGrid');
  gridEl.innerHTML = weakPointsCard(weak) + weeklyActivityCard(weekly) + srsGrowthCard(srs) + vocabFunnelCard(funnel)
    + accuracyByModuleCard(accuracy) + responseTimeCard(respTime) + hintWeaningCard(hints) + listeningIndependenceCard(listening);
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
