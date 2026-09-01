/**
 * src/screens/simulation-run.js — הרצת האבחון + דוח הפערים.
 *
 * מסך מלא בלי הסיידבר, בכוונה: זה מבחן, לא תרגול, ואין סיבה להציע ניווט
 * החוצה באמצע. מה שמבדיל אותו ממסכי התרגול הוא בדיוק זה —
 *
 *   אין משוב אחרי כל שאלה. אין "נכון/לא נכון", אין הסבר, אין רמז.
 *   הכול נפתח רק בסוף, בדוח. מבחן שנותן משוב תוך כדי כבר לא מודד.
 *
 * שאר כללי הפרויקט ממשיכים לחול: אין הענשה, אין טיימר שחותך באמצע (מוצג
 * זמן שחלף בלבד), ואין ציון 50–150 — הדוח מדבר בפערים ובמפתחות.
 *
 * מצב אורח: רץ במלואו, שום דבר לא נשמר, וההצעה להירשם מגיעה בסוף עם הדוח.
 */

import { navigate, subAnchor } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { track } from '../lib/analytics.js';
import { AudioPlayer } from '../listening/audio-player.js';
import {
  loadForm, startAttempt, saveAnswer, finishAttempt, buildReport, SECTION_LABELS,
} from '../data/simulation.data.js';

/* ── מצב המסך ─────────────────────────────────────────────────────────────── */
let state = null;
let player = null;

function resetState() {
  destroyPlayer();
  state = null;
}

function destroyPlayer() {
  if (player) { try { player.destroy(); } catch (_) {} player = null; }
}

/* ── סגנונות ──────────────────────────────────────────────────────────────── */
function ensureStyles() {
  if (document.getElementById('sim-css')) return;
  const s = document.createElement('style');
  s.id = 'sim-css';
  s.textContent = `
.sim-shell { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; }
.sim-top { position:sticky; top:0; z-index:5; background:var(--card); border-bottom:1px solid var(--border);
  padding:.7rem 1rem; display:flex; align-items:center; gap:1rem; }
.sim-top-sec { font-weight:800; font-size:.9rem; color:var(--green-dark); }
.sim-top-meta { margin-inline-start:auto; display:flex; gap:1rem; align-items:center;
  font-size:.8rem; color:var(--muted); font-variant-numeric:tabular-nums; }
.sim-bar { height:3px; background:var(--border); }
.sim-bar-fill { height:100%; background:var(--green); transition:width .25s ease; }
.sim-body { flex:1; width:100%; max-width:760px; margin:0 auto; padding:1.6rem 1.2rem 3rem; }
.sim-q-num { font-size:.78rem; font-weight:800; letter-spacing:.06em; color:var(--muted); margin-bottom:.5rem; }
.sim-prompt { font-size:1.06rem; line-height:1.85; margin-bottom:1.3rem; }
.sim-prompt.en { direction:ltr; text-align:left; }
.sim-opts { display:flex; flex-direction:column; gap:.55rem; }
.sim-opt { width:100%; text-align:right; background:var(--card); border:1.5px solid var(--border);
  border-radius:var(--radius-sm,8px); padding:.8rem 1rem; font-family:inherit; font-size:.95rem;
  line-height:1.6; cursor:pointer; color:var(--text); }
.sim-opt.en { direction:ltr; text-align:left; }
.sim-opt:hover { border-color:var(--green); }
.sim-opt.on { border-color:var(--green-dark); background:var(--green-light); }
.sim-actions { display:flex; gap:.7rem; align-items:center; margin-top:1.6rem; }
.sim-btn { background:var(--green-dark); color:#fff; border:0; border-radius:var(--radius-sm,8px);
  padding:.75rem 1.7rem; font-family:inherit; font-weight:800; font-size:.95rem; cursor:pointer; }
.sim-btn:disabled { opacity:.4; cursor:not-allowed; }
.sim-btn-quiet { background:none; color:var(--muted); border:0; font-family:inherit; font-size:.85rem;
  cursor:pointer; text-decoration:underline; }
.sim-sec-card { background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:2rem 1.8rem; text-align:center; margin-top:2rem; }
.sim-sec-kicker { font-size:.76rem; font-weight:800; letter-spacing:.14em; color:var(--orange,#B08442); }
.sim-sec-title { font-size:1.5rem; font-weight:900; margin:.5rem 0 .6rem; }
.sim-sec-note { color:var(--muted); font-size:.92rem; line-height:1.7; max-width:34rem; margin:0 auto 1.4rem; }
.sim-audio-wrap { background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:1rem; margin-bottom:1.2rem; }
.sim-audio-title { font-size:.82rem; font-weight:800; color:var(--muted); margin-bottom:.6rem; }
/* דוח */
.sim-rep-head { text-align:center; margin-bottom:2rem; }
.sim-rep-h1 { font-size:1.7rem; font-weight:900; margin-bottom:.4rem; }
.sim-rep-sub { color:var(--muted); font-size:.95rem; line-height:1.7; }
.sim-rep-total { font-size:2.6rem; font-weight:900; color:var(--green-dark); font-variant-numeric:tabular-nums; }
.sim-sec-row { background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:1rem 1.1rem; margin-bottom:.7rem; }
.sim-sec-row-top { display:flex; align-items:baseline; gap:.6rem; margin-bottom:.5rem; }
.sim-sec-name { font-weight:800; }
.sim-sec-score { margin-inline-start:auto; font-weight:900; font-variant-numeric:tabular-nums; }
.sim-meter { height:7px; background:var(--border); border-radius:99px; overflow:hidden; }
.sim-meter-fill { height:100%; border-radius:99px; }
.sim-sec-foot { font-size:.82rem; color:var(--muted); margin-top:.45rem; }
.sim-note { background:var(--orange-light,#F2E9D8); border-inline-start:3px solid var(--orange,#B08442);
  border-radius:8px; padding:.85rem 1.1rem; font-size:.88rem; line-height:1.7; margin:1.4rem 0; }
.sim-review { margin-top:2.2rem; }
.sim-rev-item { background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:1rem 1.1rem; margin-bottom:.6rem; }
.sim-rev-q { font-size:.93rem; line-height:1.7; margin-bottom:.5rem; }
.sim-rev-line { font-size:.86rem; line-height:1.7; }
.sim-rev-ok { color:var(--green-dark); font-weight:700; }
.sim-rev-no { color:var(--red,#B4553E); font-weight:700; }
.sim-rev-expl { font-size:.86rem; color:var(--muted); line-height:1.75; margin-top:.4rem; }
.sim-center { text-align:center; padding:3rem 1rem; color:var(--muted); }
@media (max-width:560px){ .sim-body{padding:1.2rem 1rem 2.5rem} .sim-rep-h1{font-size:1.35rem} }
`;
  document.head.appendChild(s);
}

/* ── עזרים ────────────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** גבולות הפרקים: הפריט הראשון של כל רצף עם אותו section_kind. */
function sectionStarts(items) {
  const starts = new Map();
  let prev = null, n = 0;
  items.forEach((it, i) => {
    if (it.sectionKind !== prev) { n += 1; starts.set(i, { n, kind: it.sectionKind }); prev = it.sectionKind; }
  });
  return starts;
}

const SECTION_NOTES = {
  sc:           'משפט אחד עם חסר, וארבע אפשרויות להשלמה. בחרו את זו שמתאימה לא רק מבחינת המשמעות אלא גם מבחינת המבנה.',
  continuation: 'פרק ניסיוני. תשמעו קטע קצר שנקטע באמצע, ותבחרו את ההמשך ההגיוני ביותר. אפשר להשמיע שוב מההתחלה, אבל אי אפשר לדלג בתוך הקטע.',
  restatement:  'משפט אחד, וארבע גרסאות שלו. רק אחת שומרת על אותה משמעות בדיוק — לשאר יש שינוי קטן שמשנה הכול.',
  lecture_qa:   'פרק ניסיוני. תשמעו הרצאה או שיחה ותענו עליה. אפשר להשמיע שוב מההתחלה.',
  reading:      'קטע קריאה ושאלות עליו.',
};

// פרקי ההאזנה מופיעים במבחן האמיתי כפרקים ניסיוניים, לא כפרקי ליבה — הנבחן
// עשוי להיתקל בהם ועשוי שלא. מסומן ככזה גם כאן, כדי לא ליצור ציפייה שגויה.
const PILOT_SECTIONS = new Set(['continuation', 'lecture_qa']);

/* ── מסך ההרצה ────────────────────────────────────────────────────────────── */
export async function renderSimulationRun(root) {
  ensureStyles();
  resetState();

  const params = new URLSearchParams(subAnchor());
  const code = params.get('form') || 'sim-1';

  root.innerHTML = `<div class="sim-shell"><div class="sim-center">טוען את האבחון…</div></div>`;

  const [{ data, error }, learner] = await Promise.all([loadForm(code), getLearner()]);
  if (error || !data || !data.items.length) {
    root.innerHTML = `<div class="sim-shell"><div class="sim-center">
      לא הצלחנו לטעון את האבחון.<br><br>
      <button class="sim-btn" id="simBack">חזרה</button></div></div>`;
    root.querySelector('#simBack').addEventListener('click', () => navigate('/simulation'));
    return;
  }

  const { data: attempt } = await startAttempt(learner.id, data.form.id);

  state = {
    root,
    form: data.form,
    items: data.items,
    starts: sectionStarts(data.items),
    idx: 0,
    answers: new Map(),          // order -> { chosenIndex, isCorrect, ... }
    pending: null,               // הבחירה בשאלה הנוכחית, לפני "הבא"
    attemptId: attempt?.id ?? null,
    isGuest: learner.isGuest,
    startedAt: Date.now(),
    questionAt: Date.now(),
    showingSectionCard: true,
    ticker: null,
  };

  track('simulation_started', { form: code, guest: learner.isGuest });
  draw();
}

function draw() {
  if (!state) return;
  destroyPlayer();
  const { items, idx } = state;

  if (idx >= items.length) { drawReport(); return; }

  const it = items[idx];
  const start = state.starts.get(idx);

  if (start && state.showingSectionCard) { drawSectionCard(start, it); return; }

  drawQuestion(it);
}

function chrome(inner) {
  const { items, idx, startedAt } = state;
  const it = items[Math.min(idx, items.length - 1)];
  const pct = Math.round((idx / items.length) * 100);
  return `
    <div class="sim-shell">
      <div class="sim-top">
        <div class="sim-top-sec">${esc(SECTION_LABELS[it.sectionKind] || '')}</div>
        <div class="sim-top-meta">
          <span>שאלה ${idx + 1} מתוך ${items.length}</span>
          <span id="simClock">${fmtTime(Date.now() - startedAt)}</span>
        </div>
      </div>
      <div class="sim-bar"><div class="sim-bar-fill" style="width:${pct}%"></div></div>
      <div class="sim-body">${inner}</div>
    </div>`;
}

function startTicker() {
  stopTicker();
  state.ticker = setInterval(() => {
    const el = document.getElementById('simClock');
    if (!el || !state) { stopTicker(); return; }
    el.textContent = fmtTime(Date.now() - state.startedAt);
  }, 1000);
}
function stopTicker() {
  if (state?.ticker) { clearInterval(state.ticker); state.ticker = null; }
}

function drawSectionCard(start, it) {
  state.root.innerHTML = chrome(`
    <div class="sim-sec-card">
      <div class="sim-sec-kicker">${PILOT_SECTIONS.has(start.kind) ? 'פרק ניסיוני' : 'פרק ' + start.n}</div>
      <div class="sim-sec-title">${esc(SECTION_LABELS[start.kind] || start.kind)}</div>
      <p class="sim-sec-note">${esc(SECTION_NOTES[start.kind] || '')}</p>
      <button class="sim-btn" id="simGo">התחלה</button>
    </div>`);
  startTicker();
  state.root.querySelector('#simGo').addEventListener('click', () => {
    state.showingSectionCard = false;
    state.questionAt = Date.now();
    draw();
  });
}

function drawQuestion(it) {
  const isAudio = it.itemKind === 'listening';
  const optsLtr = it.itemKind !== 'listening' || true; // התוכן תמיד אנגלית
  const audioBlock = isAudio ? `
    <div class="sim-audio-wrap">
      <div class="sim-audio-title">${esc(it.lectureTitle || 'קטע האזנה')}</div>
      <div id="simAudio"></div>
    </div>` : '';

  const promptBlock = it.prompt ? `
    <div class="sim-prompt ${isAudio ? '' : 'en'}" ${isAudio ? '' : 'dir="ltr"'}>${esc(it.prompt)}</div>` : '';

  const opts = it.options.map((o, i) => `
    <button class="sim-opt en" dir="ltr" data-i="${i}">${esc(o)}</button>`).join('');

  state.root.innerHTML = chrome(`
    <div class="sim-q-num">שאלה ${state.idx + 1}</div>
    ${audioBlock}
    ${promptBlock}
    <div class="sim-opts">${opts}</div>
    <div class="sim-actions">
      <button class="sim-btn" id="simNext" disabled>
        ${state.idx === state.items.length - 1 ? 'סיום ולדוח' : 'הבא'}
      </button>
      <button class="sim-btn-quiet" id="simSkip">לדלג על השאלה</button>
    </div>`);

  startTicker();

  if (isAudio && it.audioUrl) {
    // single-pass: אפשר להשמיע שוב מההתחלה, אי אפשר לדלג בתוך הקטע —
    // בדיוק ההתנהגות של מודול ההאזנה.
    player = new AudioPlayer(state.root.querySelector('#simAudio'), {
      src: it.audioUrl, mode: 'single-pass',
    });
  }

  const nextBtn = state.root.querySelector('#simNext');
  state.pending = null;

  state.root.querySelectorAll('.sim-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.root.querySelectorAll('.sim-opt').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      state.pending = Number(btn.dataset.i);
      nextBtn.disabled = false;
    });
  });

  nextBtn.addEventListener('click', () => commit(it, state.pending));
  state.root.querySelector('#simSkip').addEventListener('click', () => commit(it, null));
}

function commit(it, chosenIndex) {
  const isCorrect = chosenIndex != null ? chosenIndex === it.correctIndex : false;
  const responseMs = Date.now() - state.questionAt;

  state.answers.set(it.order, { chosenIndex, isCorrect, responseMs });

  // fire-and-forget: תשובה שלא נשמרה לא תעצור מבחן באמצע.
  saveAnswer(state.attemptId, {
    order: it.order, sectionKind: it.sectionKind, itemKind: it.itemKind,
    itemId: it.itemId, chosenIndex, isCorrect, difficulty: it.difficulty, responseMs,
  });

  state.idx += 1;
  state.showingSectionCard = true;
  state.questionAt = Date.now();
  draw();
}

/* ── הדוח ─────────────────────────────────────────────────────────────────── */
function drawReport() {
  stopTicker();
  destroyPlayer();

  const report = buildReport(state.items, state.answers);
  const elapsed = Date.now() - state.startedAt;

  finishAttempt(state.attemptId, {
    totalAnswered: report.totalAnswered,
    totalCorrect:  report.totalCorrect,
    sectionStats:  report.sections.map((s) => ({
      kind: s.kind, total: s.total, answered: s.answered, correct: s.correct,
      accuracy: s.accuracy, ceiling: s.ceiling,
    })),
  });

  track('simulation_completed', {
    form: state.form.code, accuracy: report.accuracy, minutes: Math.round(elapsed / 60000),
  });

  const meterColor = (acc) =>
    acc >= 75 ? 'var(--green)' : acc >= 50 ? 'var(--orange,#B08442)' : 'var(--red,#B4553E)';

  const rows = report.sections.map((s) => `
    <div class="sim-sec-row">
      <div class="sim-sec-row-top">
        <span class="sim-sec-name">${esc(s.label)}</span>
        <span class="sim-sec-score">${s.accuracy != null ? s.accuracy + '%' : '—'}</span>
      </div>
      <div class="sim-meter">
        <div class="sim-meter-fill" style="width:${s.accuracy ?? 0}%;background:${meterColor(s.accuracy ?? 0)}"></div>
      </div>
      <div class="sim-sec-foot">
        ${s.correct} מתוך ${s.answered} שנענו${s.answered < s.total ? ` (${s.total - s.answered} לא נענו)` : ''}${
          s.ceiling != null ? ` · עמדת בעקביות עד רמה ${s.ceiling}` : ''}
      </div>
    </div>`).join('');

  const insight = (() => {
    if (!report.weakest || !report.strongest || report.weakest.kind === report.strongest.kind) return '';
    return `<div class="sim-note">
      הפער הבולט: <strong>${esc(report.strongest.label)}</strong> יצא הכי חזק
      (${report.strongest.accuracy}%), ו<strong>${esc(report.weakest.label)}</strong> הכי חלש
      (${report.weakest.accuracy}%). זה המקום שבו תרגול ייתן לך הכי הרבה תמורה על הזמן.
    </div>`;
  })();

  const guestBlock = state.isGuest ? `
    <div class="sim-note">
      <strong>הדוח הזה לא נשמר.</strong> אתם מתרגלים כאורחים, ולכן ברגע שתסגרו את
      הדף הוא ייעלם. חשבון חינם שומר אותו, ומאפשר להשוות בין אבחונים לאורך זמן.
      <div style="margin-top:.7rem">
        <button class="sim-btn" id="simSignup">להרשמה חינם</button>
      </div>
    </div>` : '';

  state.root.innerHTML = `
    <div class="sim-shell"><div class="sim-body">
      <div class="sim-rep-head">
        <div class="sim-rep-h1">דוח הפערים שלך</div>
        <div class="sim-rep-total">${report.accuracy ?? 0}%</div>
        <div class="sim-rep-sub">
          ${report.totalCorrect} תשובות נכונות מתוך ${report.totalAnswered} שנענו ·
          ${fmtTime(elapsed)} דקות
        </div>
      </div>

      <div class="sim-note">
        <strong>זה לא ציון מבחן.</strong> אנחנו לא נותנים ציון בסולם 50–150, כי כדי
        לתרגם ביצועים לציון כזה צריך כיול פסיכומטרי שאין לנו — ומספר לא מבוסס כאן
        עלול לגרום לך להחליט החלטה אמיתית על סמך ניחוש. מה שיש כאן במקום זה מדויק
        יותר בכל מקרה: איפה בדיוק הפער.
      </div>

      ${rows}
      ${insight}
      ${guestBlock}

      <div class="sim-actions" style="justify-content:center;margin-top:2rem">
        <button class="sim-btn" id="simReview">לסקירת התשובות</button>
        <button class="sim-btn-quiet" id="simHome">חזרה</button>
      </div>

      <div class="sim-review" id="simReviewBox" hidden></div>
    </div></div>`;

  state.root.querySelector('#simHome').addEventListener('click', () => { resetState(); navigate('/simulation'); });
  state.root.querySelector('#simSignup')?.addEventListener('click', () => { resetState(); navigate('/'); });

  const revBtn = state.root.querySelector('#simReview');
  revBtn.addEventListener('click', () => {
    const box = state.root.querySelector('#simReviewBox');
    if (!box.hidden) { box.hidden = true; revBtn.textContent = 'לסקירת התשובות'; return; }
    box.innerHTML = renderReview();
    box.hidden = false;
    revBtn.textContent = 'להסתיר את הסקירה';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderReview() {
  return state.items.map((it) => {
    const a = state.answers.get(it.order);
    const chosen = a?.chosenIndex;
    const ok = a?.isCorrect;
    const correctText = it.options[it.correctIndex];

    // כל שלושת הבנקים מוחזרים משכבת הנתונים כמערך הסברים מיושר לאופציות,
    // כולל האזנה (שם ההסבר יושב בתוך כל אופציה בנפרד). התמליל הוא גיבוי
    // אחרון בלבד, למקרה שפריט האזנה כלשהו יגיע בלי הסברים.
    let expl = '';
    if (Array.isArray(it.explanations) && it.explanations[it.correctIndex]) {
      expl = it.explanations[it.correctIndex];
      if (chosen != null && !ok && it.explanations[chosen]) {
        expl += ` · מה שבחרת: ${it.explanations[chosen]}`;
      }
    } else if (it.transcript) {
      expl = `מה שנאמר בקטע: ${it.transcript}`;
    }

    return `
      <div class="sim-rev-item">
        <div class="sim-sec-foot">${esc(SECTION_LABELS[it.sectionKind])} · שאלה ${it.order}</div>
        ${it.prompt ? `<div class="sim-rev-q" dir="${it.itemKind === 'listening' ? 'rtl' : 'ltr'}">${esc(it.prompt)}</div>` : ''}
        <div class="sim-rev-line">
          ${chosen == null
            ? '<span class="sim-rev-no">לא נענתה</span>'
            : ok
              ? '<span class="sim-rev-ok">✓ נכון</span>'
              : `<span class="sim-rev-no">✗ בחרת:</span> <span dir="ltr">${esc(it.options[chosen])}</span>`}
        </div>
        ${!ok ? `<div class="sim-rev-line"><span class="sim-rev-ok">התשובה:</span> <span dir="ltr">${esc(correctText)}</span></div>` : ''}
        ${expl ? `<div class="sim-rev-expl">${esc(expl)}</div>` : ''}
      </div>`;
  }).join('');
}
