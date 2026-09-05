/**
 * src/screens/simulation.js — בחירת סימולציה.
 *
 * זה העמוד שכל עמודי ה-SEO מפנים אליו, ולכן הוא עונה על שתי שאלות לפני
 * שמישהו לוחץ "התחלה": מה עומד לקרות כאן, ומה מקבלים בסוף.
 *
 * מאז 5.9.2026 יש כאן שני סוגי טפסים (listForms מחזיר רק מפורסמים):
 *   - מלאה (sim-*): 8 פרקים במבנה הבחינה, 32 שאלות, ~48 דק'.
 *   - קצרה (short-*): 3 פרקים, 12 שאלות, ~17 דק' — לימים שאין בהם שעה.
 * לכל טופס מוצג מה נעשה בו (ציון משוער אחרון), ואחד מסומן "מומלץ הבא":
 * הטופס המלא הראשון שעוד לא נעשה; אם כולם נעשו — הקצר הראשון שלא נעשה;
 * ואם הכול נעשה — הטופס שבו הציון היה הנמוך ביותר (שם יש הכי הרבה לשפר).
 *
 * הציון: משוער בסולם 50–150 (src/lib/scoreScale.js). ניסיונות ישנים ללא ציון
 * מוצגים באחוזים.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { listForms, listAttempts } from '../data/simulation.data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const isShortCode = (code) => String(code || '').startsWith('short');

function ensureStyles() {
  if (document.getElementById('sim-intro-css')) return;
  const s = document.createElement('style');
  s.id = 'sim-intro-css';
  s.textContent = `
.si-hero { background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:1.6rem 1.7rem; margin-bottom:1.4rem; }
.si-h1 { font-size:1.45rem; font-weight:900; margin-bottom:.5rem; }
.si-lede { color:var(--muted); line-height:1.8; margin-bottom:1.1rem; }
.si-facts { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1.2rem; }
.si-fact { background:var(--green-light); color:var(--green-dark); border-radius:99px;
  padding:.3rem .85rem; font-size:.82rem; font-weight:700; }
.si-map { width:100%; border-collapse:collapse; font-size:.9rem; margin:.4rem 0 0; }
.si-map th { text-align:right; font-size:.76rem; font-weight:800; color:var(--muted);
  padding:.4rem .6rem; border-bottom:1px solid var(--border); }
.si-map td { text-align:right; padding:.5rem .6rem; border-bottom:1px solid var(--border); }
.si-tag { font-size:.7rem; font-weight:800; border-radius:99px; padding:.1rem .5rem; margin-inline-start:.35rem; }
.si-tag-pilot { background:var(--orange-light,#F2E9D8); color:var(--orange,#B08442); }
.si-note { background:var(--orange-light,#F2E9D8); border-inline-start:3px solid var(--orange,#B08442);
  border-radius:8px; padding:.85rem 1.1rem; font-size:.88rem; line-height:1.75; margin:1.2rem 0; }
.si-btn { background:var(--green-dark); color:#fff; border:0; border-radius:8px;
  padding:.8rem 1.9rem; font-family:inherit; font-weight:800; font-size:1rem; cursor:pointer; }
.si-btn-sm { background:var(--green-dark); color:#fff; border:0; border-radius:8px;
  padding:.5rem 1.1rem; font-family:inherit; font-weight:800; font-size:.86rem; cursor:pointer; white-space:nowrap; }
.si-btn-sm.quiet { background:none; color:var(--green-dark); border:1px solid var(--green-dark); }
.si-h2 { font-size:1.05rem; font-weight:800; margin:1.6rem 0 .3rem; }
.si-sub { font-size:.86rem; color:var(--muted); margin-bottom:.8rem; line-height:1.7; }
.si-last { display:flex; flex-wrap:wrap; gap:1.2rem; align-items:baseline; margin-top:.2rem; }
.si-last b { font-size:1.6rem; color:var(--green-dark); font-variant-numeric:tabular-nums; }
.si-last small { color:var(--muted); font-size:.8rem; }
.si-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px,1fr)); gap:.7rem; }
.si-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:.9rem 1rem;
  display:flex; flex-direction:column; gap:.4rem; position:relative; }
.si-card.rec { border-color:var(--green-dark); box-shadow:0 0 0 2px var(--green-light); }
.si-card.done { background:color-mix(in srgb, var(--card) 88%, var(--green-light)); }
.si-card-t { font-weight:800; font-size:.95rem; }
.si-card-m { font-size:.8rem; color:var(--muted); }
.si-card-s { font-size:.84rem; font-weight:700; color:var(--green-dark); min-height:1.3em; }
.si-card-s .pct { font-weight:600; color:var(--muted); }
.si-card-a { margin-top:.3rem; display:flex; gap:.5rem; align-items:center; }
.si-rec { position:absolute; top:-.55rem; inset-inline-end:.8rem; background:var(--green-dark); color:#fff;
  font-size:.68rem; font-weight:800; border-radius:99px; padding:.15rem .6rem; }
.si-more { background:none; border:0; color:var(--green-dark); font-family:inherit; font-weight:800;
  cursor:pointer; padding:.6rem 0; font-size:.88rem; }
`;
  document.head.appendChild(s);
}

const FULL_STRUCTURE = [
  ['השלמת משפטים', 4, 4], ['השלמת משפטים', 4, 4], ['הבנת הנקרא', 5, 15],
  ['ניסוח מחדש', 3, 6], ['ניסוח מחדש', 3, 6], ['השלמת משפטים', 4, 4],
  ['השלמת קטע (האזנה)', 4, 6, true], ['קטעי שמיעה', 5, 7, true],
];

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }); } catch (_) { return ''; }
}

/** מה נעשה בטופס: הניסיון האחרון (הרשימה כבר ממוינת מהחדש לישן). */
function summarize(form, attempts) {
  const mine = attempts.filter((a) => a.form_id === form.id);
  if (!mine.length) return null;
  const last = mine[0];
  const pct = last.total_answered ? Math.round((last.total_correct / last.total_answered) * 100) : null;
  const best = Math.max(...mine.map((a) => a.scaled_score ?? -1));
  return { count: mine.length, score: last.scaled_score ?? null, pct, best: best >= 50 ? best : null, at: last.finished_at || last.created_at };
}

function pickRecommended(fullForms, shortForms, summaries) {
  const firstUndone = (list) => list.find((f) => !summaries.get(f.id));
  const rec = firstUndone(fullForms) || firstUndone(shortForms);
  if (rec) return rec.id;
  // הכול נעשה — הטופס עם הציון הנמוך ביותר (או האחוז הנמוך ביותר בניסיונות ישנים).
  let worst = null, worstVal = Infinity;
  for (const f of [...fullForms, ...shortForms]) {
    const s = summaries.get(f.id);
    const v = s?.score ?? (s?.pct != null ? s.pct + 50 : Infinity);
    if (v < worstVal) { worstVal = v; worst = f; }
  }
  return worst?.id ?? null;
}

function cardHtml(f, s, isRec) {
  const short = isShortCode(f.code);
  const status = s
    ? (s.score != null
      ? `ציון משוער ${s.score}${s.best != null && s.best > s.score ? ` <span class="pct">· הכי גבוה ${s.best}</span>` : ''}`
      : `<span class="pct">${s.pct != null ? s.pct + '%' : 'הושלם'}</span>`)
      + `<span class="pct"> · ${fmtDate(s.at)}${s.count > 1 ? ` · ${s.count} פעמים` : ''}</span>`
    : '';
  return `
    <div class="si-card${isRec ? ' rec' : ''}${s ? ' done' : ''}">
      ${isRec ? '<span class="si-rec">מומלץ הבא</span>' : ''}
      <div class="si-card-t">${esc(f.title)}</div>
      <div class="si-card-m">${f.total_questions} שאלות · כ-${f.estimated_minutes} דק'${short ? '' : ' · 8 פרקים'}</div>
      <div class="si-card-s">${status}</div>
      <div class="si-card-a">
        <button class="si-btn-sm${s ? ' quiet' : ''}" data-start="${esc(f.code)}">${s ? 'שוב' : 'התחלה'}</button>
      </div>
    </div>`;
}

export async function renderSimulation(root) {
  await renderLayout(root, '/simulation');
  const page = getPageContent();
  ensureStyles();
  page.innerHTML = `<div class="si-hero"><div class="si-lede">טוען…</div></div>`;

  const learner = await getLearner();
  const [{ data: forms }, { data: attempts }] = await Promise.all([
    listForms(),
    listAttempts(learner.id, 200),
  ]);

  const all = forms || [];
  if (!all.length) {
    page.innerHTML = `<div class="si-hero"><div class="si-lede">הסימולציות בדרך — נתראה כאן בקרוב.</div></div>`;
    return;
  }

  // sim-1 הוא האבחון המקורי; הוא מוצג ראשון ברשימת המלאות. מיון מספרי לפי הקוד.
  const num = (c) => Number(String(c).replace(/\D+/g, '')) || 0;
  const fullForms  = all.filter((f) => !isShortCode(f.code)).sort((a, b) => num(a.code) - num(b.code));
  const shortForms = all.filter((f) =>  isShortCode(f.code)).sort((a, b) => num(a.code) - num(b.code));

  const done = attempts || [];
  const summaries = new Map(all.map((f) => [f.id, summarize(f, done)]).filter(([, s]) => s));
  const recId = pickRecommended(fullForms, shortForms, summaries);
  const recForm = all.find((f) => f.id === recId) || fullForms[0] || shortForms[0];

  const last = done[0];
  const lastScore = last?.scaled_score ?? null;
  const lastPct = last && last.total_answered ? Math.round((last.total_correct / last.total_answered) * 100) : null;
  const best = done.reduce((m, a) => Math.max(m, a.scaled_score ?? -1), -1);
  const lastBlock = last ? `
    <div class="si-last">
      <span><b>${lastScore ?? (lastPct != null ? lastPct + '%' : '—')}</b> <small>${lastScore != null ? 'ציון משוער אחרון' : 'דיוק אחרון'}</small></span>
      ${best >= 50 && best !== lastScore ? `<span><b>${best}</b> <small>הכי גבוה</small></span>` : ''}
      <span><b>${done.length}</b> <small>סימולציות שהושלמו</small></span>
    </div>` : '';

  const structRows = FULL_STRUCTURE.map(([t, q, m, pilot]) => `
    <tr><td>${esc(t)}${pilot ? '<span class="si-tag si-tag-pilot">ניסיוני</span>' : ''}</td><td>${q}</td><td>${m} דק'</td></tr>`).join('');

  const renderList = (list, limit) => list.map((f, i) =>
    `<div ${i >= limit ? 'hidden data-more' : ''}>${cardHtml(f, summaries.get(f.id), f.id === recId)}</div>`).join('');

  page.innerHTML = `
    <div class="si-hero">
      <div class="si-h1">סימולציות</div>
      <p class="si-lede">
        המבחן כמו שהוא: שעון לכל פרק, בלי משוב באמצע, ובסוף — ציון משוער בסולם
        50–150, דיוק לכל סוג שאלה עם כיוון מול הפעם הקודמת, המפתחות שכדאי לשים
        אליהם לב, וסקירה של כל שאלה עם הסבר.
      </p>
      <div class="si-facts">
        <span class="si-fact">${fullForms.length} מלאות</span>
        <span class="si-fact">${shortForms.length} קצרות</span>
        <span class="si-fact">זמן לכל פרק</span>
        <span class="si-fact">בלי הרשמה</span>
      </div>
      ${lastBlock}
      <div style="margin-top:1.1rem">
        <button class="si-btn" id="siStart">${summaries.get(recForm.id) ? 'להמשיך: ' : 'להתחיל: '}${esc(recForm.title)}</button>
      </div>
    </div>

    <div class="si-h2">סימולציה מלאה</div>
    <div class="si-sub">שמונה פרקים במבנה הבחינה, 32 שאלות, כ-48 דקות. הסימולציה שנותנת את הציון המדויק ביותר.</div>
    <div class="si-grid" id="siFull">${renderList(fullForms, 6)}</div>
    ${fullForms.length > 6 ? `<button class="si-more" data-more-for="siFull">להציג את כל ${fullForms.length} המלאות ▾</button>` : ''}

    <div class="si-h2">סימולציה קצרה</div>
    <div class="si-sub">שלושה פרקים, 12 שאלות, כרבע שעה — השלמת משפטים, ניסוח מחדש וקטע שמיעה. לימים שאין בהם שעה פנויה.</div>
    <div class="si-grid" id="siShort">${renderList(shortForms, 6)}</div>
    ${shortForms.length > 6 ? `<button class="si-more" data-more-for="siShort">להציג את כל ${shortForms.length} הקצרות ▾</button>` : ''}

    <div class="si-h2">מבנה הסימולציה המלאה</div>
    <p class="si-sub">
      לפי הרצף שמפרסם המרכז הארצי לבחינות ולהערכה (מאל״ו), וכמו בבחינה עצמה
      <strong>הזמן מנוהל ברמת הפרק</strong>: לכל פרק שעון משלו, בתוכו אפשר לנוע בין
      השאלות ולשנות תשובות, וזמן שנשאר לא עובר הלאה.
    </p>
    <table class="si-map">
      <thead><tr><th>פרק</th><th>שאלות</th><th>זמן</th></tr></thead>
      <tbody>${structRows}</tbody>
    </table>
    <div class="si-note">
      <strong>הציון הוא הערכה.</strong> הוא משוקלל לפי קושי השאלות ומתורגם לסולם
      הבחינה. מה שמדויק בכל מקרה: איפה בדיוק הפער, ואיזה תרגול סוגר אותו.
    </div>`;

  page.querySelector('#siStart').addEventListener('click', () => navigate(`/simulation/run?form=${recForm.code}`));
  page.querySelectorAll('[data-start]').forEach((b) =>
    b.addEventListener('click', () => navigate(`/simulation/run?form=${b.dataset.start}`)));
  page.querySelectorAll('[data-more-for]').forEach((b) =>
    b.addEventListener('click', () => {
      page.querySelectorAll(`#${b.dataset.moreFor} [data-more]`).forEach((el) => { el.hidden = false; });
      b.remove();
    }));
}
