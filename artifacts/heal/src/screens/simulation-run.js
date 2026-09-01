/**
 * src/screens/simulation-run.js — הרצת האבחון + דוח הפערים.
 *
 * מסך מלא בלי הסיידבר, בכוונה: זה מבחן, לא תרגול.
 *
 * מודל הזמן זהה לאמירנט, ולא לפסיכומטרי: **הזמן מנוהל ברמת הפרק.**
 *   - לכל פרק שעון משלו, שסופר לאחור.
 *   - בתוך הפרק אפשר לנוע חופשי בין השאלות, לשנות תשובות, ולחזור אחורה.
 *   - כשהזמן נגמר הפרק נסגר אוטומטית והמבחן עובר לפרק הבא.
 *   - זמן שנשאר לא עובר לפרק הבא, ואי אפשר לחזור לפרק שנסגר.
 * (מקור: "הזמן מנוהל ברמת הפרק", "אי אפשר להעביר זמן מפרק לפרק".)
 *
 * מה שמבדיל אותו ממסכי התרגול: אין משוב אחרי שאלה. אין נכון/לא נכון, אין
 * הסבר ואין רמז — הכול נפתח רק בדוח. מבחן שנותן משוב תוך כדי כבר לא מודד.
 *
 * שאר כללי הפרויקט חלים: אין הענשה, אין ציון 50–150, והדוח מדבר באחוזים
 * ובפערים. מצב אורח רץ במלואו ושום דבר לא נשמר.
 */

import { navigate, subAnchor } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { track } from '../lib/analytics.js';
import { AudioPlayer } from '../listening/audio-player.js';
import {
  loadForm, startAttempt, saveAnswer, finishAttempt, buildReport, SECTION_LABELS,
} from '../data/simulation.data.js';

let state = null;
let player = null;
let mountedLectureId = null;

function destroyPlayer() {
  if (player) { try { player.destroy(); } catch (_) {} player = null; }
  mountedLectureId = null;
}

function resetState() {
  stopTicker();
  destroyPlayer();
  state = null;
}

/* ── סגנונות ──────────────────────────────────────────────────────────────── */
function ensureStyles() {
  if (document.getElementById('sim-css')) return;
  const s = document.createElement('style');
  s.id = 'sim-css';
  s.textContent = `
.sim-shell { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; }
.sim-top { position:sticky; top:0; z-index:5; background:var(--card); border-bottom:1px solid var(--border);
  padding:.7rem 1rem; display:flex; align-items:center; gap:.9rem; flex-wrap:wrap; }
.sim-top-sec { font-weight:800; font-size:.9rem; color:var(--green-dark); }
.sim-pilot-tag { font-size:.7rem; font-weight:800; background:var(--orange-light,#F2E9D8);
  color:var(--orange,#B08442); border-radius:99px; padding:.15rem .55rem; }
.sim-clock { margin-inline-start:auto; font-size:.95rem; font-weight:800; font-variant-numeric:tabular-nums;
  background:var(--green-light); color:var(--green-dark); border-radius:99px; padding:.25rem .8rem; }
.sim-clock.warn { background:var(--orange-light,#F2E9D8); color:var(--orange,#B08442); }
.sim-clock.crit { background:var(--red-light,#F4E4DD); color:var(--red,#B4553E); }
.sim-nav { display:flex; gap:.35rem; flex-wrap:wrap; padding:.6rem 1rem; background:var(--card);
  border-bottom:1px solid var(--border); }
.sim-dot { width:2rem; height:2rem; border-radius:7px; border:1.5px solid var(--border); background:var(--bg);
  font-family:inherit; font-size:.82rem; font-weight:800; cursor:pointer; color:var(--muted); }
.sim-dot.answered { background:var(--green-light); border-color:var(--green); color:var(--green-dark); }
.sim-dot.current { outline:2px solid var(--green-dark); outline-offset:1px; }
.sim-body { flex:1; width:100%; max-width:760px; margin:0 auto; padding:1.5rem 1.2rem 3rem; }
.sim-q-num { font-size:.78rem; font-weight:800; letter-spacing:.06em; color:var(--muted); margin-bottom:.5rem; }
.sim-prompt { font-size:1.06rem; line-height:1.85; margin-bottom:1.3rem; }
.sim-opts { display:flex; flex-direction:column; gap:.55rem; }
.sim-opt { width:100%; text-align:right; background:var(--card); border:1.5px solid var(--border);
  border-radius:var(--radius-sm,8px); padding:.8rem 1rem; font-family:inherit; font-size:.95rem;
  line-height:1.6; cursor:pointer; color:var(--text); }
.sim-opt.en { direction:ltr; text-align:left; }
.sim-opt:hover { border-color:var(--green); }
.sim-opt.on { border-color:var(--green-dark); background:var(--green-light); }
.sim-actions { display:flex; gap:.7rem; align-items:center; margin-top:1.6rem; flex-wrap:wrap; }
.sim-btn { background:var(--green-dark); color:#fff; border:0; border-radius:var(--radius-sm,8px);
  padding:.75rem 1.7rem; font-family:inherit; font-weight:800; font-size:.95rem; cursor:pointer; }
.sim-btn:disabled { opacity:.4; cursor:not-allowed; }
.sim-btn-ghost { background:var(--card); color:var(--text); border:1.5px solid var(--border);
  border-radius:var(--radius-sm,8px); padding:.75rem 1.3rem; font-family:inherit; font-weight:700;
  font-size:.9rem; cursor:pointer; }
.sim-btn-quiet { background:none; color:var(--muted); border:0; font-family:inherit; font-size:.85rem;
  cursor:pointer; text-decoration:underline; }
.sim-sec-card { background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:2rem 1.8rem; text-align:center; margin-top:2rem; }
.sim-sec-kicker { font-size:.76rem; font-weight:800; letter-spacing:.14em; color:var(--orange,#B08442); }
.sim-sec-title { font-size:1.5rem; font-weight:900; margin:.5rem 0 .6rem; }
.sim-sec-note { color:var(--muted); font-size:.92rem; line-height:1.7; max-width:34rem; margin:0 auto 1rem; }
.sim-sec-meta { font-size:.86rem; font-weight:700; color:var(--green-dark); margin-bottom:1.3rem; }
.sim-audio-wrap { background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:1rem; margin-bottom:1.2rem; }
.sim-audio-title { font-size:.82rem; font-weight:800; color:var(--muted); margin-bottom:.6rem; }
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
.sim-rev-head { display:flex; align-items:center; gap:.5rem; width:100%; margin-top:.6rem;
  background:none; border:0; padding:.35rem 0; font-family:inherit; font-size:.85rem;
  font-weight:700; color:var(--green-dark); cursor:pointer; text-align:right; }
.sim-rev-chev { transition:transform .15s ease; }
.sim-rev-item.open .sim-rev-chev { transform:rotate(180deg); }
.sim-rev-body { display:none; }
.sim-rev-item.open .sim-rev-body { display:block; }
.sim-rev-why { font-size:.86rem; color:var(--muted); line-height:1.75; margin-top:.45rem; }
.sim-rev-why strong { color:var(--text); }
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
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const SECTION_NOTES = {
  sc:           'משפט אחד עם חסר, וארבע אפשרויות להשלמה. בחרו את זו שמתאימה לא רק מבחינת המשמעות אלא גם מבחינת המבנה.',
  continuation: 'תשמעו קטע קצר שנקטע באמצע, ותבחרו את ההמשך ההגיוני ביותר. אפשר להשמיע שוב מההתחלה, אבל אי אפשר לדלג בתוך הקטע.',
  restatement:  'משפט אחד, וארבע גרסאות שלו. רק אחת שומרת על אותה משמעות בדיוק — לשאר יש שינוי קטן שמשנה הכול.',
  lecture_qa:   'שלושה קטעים, כל אחד קשה מקודמו, ושאלות על כל אחד. אפשר להשמיע כל קטע שוב מההתחלה.',
  reading:      'קטע קריאה ושאלות עליו.',
};

const TIME_HINT = 'בתוך הפרק אפשר לעבור בין השאלות ולשנות תשובות. כשהזמן ייגמר הפרק ייסגר, ולא נוכל לחזור אליו.';

/* ── כניסה ────────────────────────────────────────────────────────────────── */
export async function renderSimulationRun(root) {
  ensureStyles();
  resetState();

  const params = new URLSearchParams(subAnchor());
  const code = params.get('form') || 'sim-1';

  root.innerHTML = `<div class="sim-shell"><div class="sim-center">טוען את האבחון…</div></div>`;

  const [{ data, error }, learner] = await Promise.all([loadForm(code), getLearner()]);
  if (error || !data || !data.sections?.length) {
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
    sections: data.sections,
    items: data.items.filter((it) => data.sections.some((s) => s.no === it.sectionNo)),
    secIdx: 0,
    qIdx: 0,
    answers: new Map(),          // order -> { chosenIndex, isCorrect, responseMs }
    attemptId: attempt?.id ?? null,
    isGuest: learner.isGuest,
    startedAt: Date.now(),
    sectionEndsAt: null,
    questionAt: Date.now(),
    phase: 'section-intro',
    ticker: null,
  };

  track('simulation_started', { form: code, guest: learner.isGuest });
  draw();
}

const curSection = () => state.sections[state.secIdx];
const curItems   = () => curSection().items;
const curItem    = () => curItems()[state.qIdx];

/* ── שעון ─────────────────────────────────────────────────────────────────── */
function startTicker() {
  stopTicker();
  state.ticker = setInterval(() => {
    if (!state) { stopTicker(); return; }
    const el = document.getElementById('simClock');
    if (!el) return;
    const left = state.sectionEndsAt - Date.now();
    el.textContent = fmtTime(left);
    el.classList.toggle('warn', left <= 60000 && left > 20000);
    el.classList.toggle('crit', left <= 20000);
    if (left <= 0) { stopTicker(); closeSection('time'); }
  }, 250);
}
function stopTicker() {
  if (state?.ticker) { clearInterval(state.ticker); state.ticker = null; }
}

/* ── ציור ─────────────────────────────────────────────────────────────────── */
function draw() {
  if (!state) return;
  if (state.secIdx >= state.sections.length) { drawReport(); return; }
  if (state.phase === 'section-intro') { drawSectionIntro(); return; }
  drawQuestion();
}

function drawSectionIntro() {
  stopTicker();
  destroyPlayer();
  const sec = curSection();
  const mins = Math.round(sec.seconds / 60);
  state.root.innerHTML = `
    <div class="sim-shell"><div class="sim-body">
      <div class="sim-sec-card">
        <div class="sim-sec-kicker">${sec.isPilot ? 'פרק ניסיוני' : 'פרק ' + sec.no}</div>
        <div class="sim-sec-title">${esc(sec.title || SECTION_LABELS[sec.kind] || sec.kind)}</div>
        <p class="sim-sec-note">${esc(SECTION_NOTES[sec.kind] || '')}</p>
        <div class="sim-sec-meta">${sec.items.length} שאלות · ${mins} דקות</div>
        <p class="sim-sec-note" style="font-size:.86rem">${esc(TIME_HINT)}</p>
        <button class="sim-btn" id="simGo">להתחיל את הפרק</button>
      </div>
    </div></div>`;
  state.root.querySelector('#simGo').addEventListener('click', () => {
    state.phase = 'running';
    state.qIdx = 0;
    state.sectionEndsAt = Date.now() + sec.seconds * 1000;
    state.questionAt = Date.now();
    destroyPlayer();          // פרק חדש — נגן חדש
    drawSectionShell();
    drawQuestion();
    startTicker();
  });
}

/**
 * מעטפת הפרק נבנית פעם אחת בכניסה אליו, ולא מחדש בכל שאלה. זה לא שיפור
 * ביצועים אלא דרישה תוכנית: AudioPlayer מצייר לתוך המכל שלו, ורינדור מחדש
 * של כל המסך היה הורס אותו ובונה נגן חדש — כלומר האזנה נוספת לאותו קטע
 * דרך הדלת האחורית, בפרק שבו שתי שאלות חולקות קטע אחד.
 */
function drawSectionShell() {
  const sec = curSection();
  const items = curItems();
  const hasAudio = items.some((it) => it.itemKind === 'listening');

  const dots = items.map((q, i) => `
    <button class="sim-dot" data-q="${i}" title="שאלה ${i + 1}">${i + 1}</button>`).join('');

  state.root.innerHTML = `
    <div class="sim-shell">
      <div class="sim-top">
        <span class="sim-top-sec">${esc(sec.title || SECTION_LABELS[sec.kind])}</span>
        ${sec.isPilot ? '<span class="sim-pilot-tag">ניסיוני</span>' : ''}
        <span class="sim-clock" id="simClock">${fmtTime(state.sectionEndsAt - Date.now())}</span>
      </div>
      <div class="sim-nav" id="simNav">${dots}</div>
      <div class="sim-body">
        <div class="sim-audio-wrap" id="simAudioWrap"${hasAudio ? '' : ' hidden'}>
          <div class="sim-audio-title" id="simAudioTitle"></div>
          <div id="simAudio"></div>
        </div>
        <div id="simQBody"></div>
      </div>
    </div>`;

  state.root.querySelectorAll('.sim-dot').forEach((d) => {
    d.addEventListener('click', () => goTo(Number(d.dataset.q)));
  });
}

/** מצייר מחדש רק את גוף השאלה. המעטפת, ובעיקר הנגן, נשארים על כנם. */
function drawQuestion() {
  const items = curItems();
  const it = curItem();
  const a = state.answers.get(it.order);

  // ── אודיו: נטען מחדש רק כשמתחלף הקטע, לא כשמתחלפת השאלה
  const wrap = state.root.querySelector('#simAudioWrap');
  if (it.itemKind === 'listening' && it.audioUrl) {
    wrap.hidden = false;
    if (mountedLectureId !== it.lectureId) {
      destroyPlayer();
      state.root.querySelector('#simAudioTitle').textContent = it.lectureTitle || 'קטע האזנה';
      player = new AudioPlayer(state.root.querySelector('#simAudio'), {
        src: it.audioUrl, mode: 'single-pass',
      });
      mountedLectureId = it.lectureId;
    }
  } else if (wrap) {
    wrap.hidden = true;
  }

  const opts = it.options.map((o, i) => `
    <button class="sim-opt en${a?.chosenIndex === i ? ' on' : ''}" dir="ltr" data-i="${i}">${esc(o)}</button>`).join('');

  state.root.querySelector('#simQBody').innerHTML = `
    <div class="sim-q-num">שאלה ${state.qIdx + 1} מתוך ${items.length}</div>
    ${it.prompt ? `<div class="sim-prompt"${it.itemKind === 'listening' ? '' : ' dir="ltr" style="text-align:left"'}>${esc(it.prompt)}</div>` : ''}
    <div class="sim-opts">${opts}</div>
    <div class="sim-actions">
      <button class="sim-btn-ghost" id="simPrev"${state.qIdx === 0 ? ' disabled' : ''}>הקודמת</button>
      <button class="sim-btn" id="simNext">${state.qIdx === items.length - 1 ? 'סיום הפרק' : 'הבאה'}</button>
      <button class="sim-btn-quiet" id="simEnd">לסיים את הפרק עכשיו</button>
    </div>`;

  // מצב הניווט העליון
  state.root.querySelectorAll('.sim-dot').forEach((d, i) => {
    d.classList.toggle('answered', state.answers.has(items[i].order));
    d.classList.toggle('current', i === state.qIdx);
  });

  state.root.querySelectorAll('.sim-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.root.querySelectorAll('.sim-opt').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      record(it, Number(btn.dataset.i));
      state.root.querySelector(`.sim-dot[data-q="${state.qIdx}"]`)?.classList.add('answered');
    });
  });

  state.root.querySelector('#simPrev').addEventListener('click', () => goTo(state.qIdx - 1));
  state.root.querySelector('#simNext').addEventListener('click', () => {
    if (state.qIdx === items.length - 1) closeSection('finished');
    else goTo(state.qIdx + 1);
  });
  state.root.querySelector('#simEnd').addEventListener('click', () => closeSection('finished'));
}

function goTo(i) {
  const items = curItems();
  if (i < 0 || i >= items.length) return;
  state.qIdx = i;
  state.questionAt = Date.now();
  draw();
}

/** שומר/מעדכן תשובה. אפשר לשנות אותה כל עוד הפרק פתוח. */
function record(it, chosenIndex) {
  const isCorrect = chosenIndex === it.correctIndex;
  const responseMs = Date.now() - state.questionAt;
  state.answers.set(it.order, { chosenIndex, isCorrect, responseMs });

  // fire-and-forget: כתיבה שנכשלה לא תעצור מבחן באמצע. upsert בשכבת
  // הנתונים דואג לכך ששינוי תשובה יעדכן ולא ייצור שורה נוספת.
  saveAnswer(state.attemptId, {
    order: it.order, sectionKind: it.sectionKind, itemKind: it.itemKind,
    itemId: it.itemId, chosenIndex, isCorrect, difficulty: it.difficulty, responseMs,
  });
}

/** סוגר את הפרק הנוכחי ועובר הלאה. אין דרך חזרה — כמו במבחן. */
function closeSection(reason) {
  stopTicker();
  destroyPlayer();
  track('simulation_section_done', {
    section: curSection().kind,
    reason,
    answered: curItems().filter((it) => state.answers.has(it.order)).length,
    total: curItems().length,
  });
  state.secIdx += 1;
  state.phase = 'section-intro';
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

  const insight = (report.weakest && report.strongest && report.weakest.kind !== report.strongest.kind)
    ? `<div class="sim-note">
        הפער הבולט: <strong>${esc(report.strongest.label)}</strong> יצא הכי חזק
        (${report.strongest.accuracy}%), ו<strong>${esc(report.weakest.label)}</strong> הכי חלש
        (${report.weakest.accuracy}%). זה המקום שבו תרגול ייתן לך הכי הרבה תמורה על הזמן.
      </div>` : '';

  const guestBlock = state.isGuest ? `
    <div class="sim-note">
      <strong>הדוח הזה לא נשמר.</strong> אתם מתרגלים כאורחים, ולכן ברגע שתסגרו את
      הדף הוא ייעלם. חשבון חינם שומר אותו, ומאפשר להשוות בין אבחונים לאורך זמן.
      <div style="margin-top:.7rem"><button class="sim-btn" id="simSignup">להרשמה חינם</button></div>
    </div>` : '';

  state.root.innerHTML = `
    <div class="sim-shell"><div class="sim-body">
      <div class="sim-rep-head">
        <div class="sim-rep-h1">דוח הפערים שלך</div>
        <div class="sim-rep-total">${report.accuracy ?? 0}%</div>
        <div class="sim-rep-sub">
          ${report.totalCorrect} תשובות נכונות מתוך ${report.totalAnswered} שנענו · ${fmtTime(elapsed)} דקות
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
    wireReviewToggles(box);
    box.hidden = false;
    revBtn.textContent = 'להסתיר את הסקירה';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * הסקירה לפי מפרט הטעויות המשותף (claude/SPEC_mistake_feedback_pattern.md):
 * הבחירה השגויה מסומנת, הנכונה נדלקת, וההסבר מחכה מאחורי פאנל מקופל.
 * 27 שאלות ברצף עם הסבר פתוח לכל אחת הן קיר טקסט — כאן זה קריטי במיוחד.
 */
function renderReview() {
  return state.items.map((it, i) => {
    const a = state.answers.get(it.order);
    const chosen = a?.chosenIndex;
    const ok = a?.isCorrect;

    // סדר קבוע בתוך הפאנל: למה הנכונה נכונה, ואז מה לא עבד בבחירה שלך.
    const parts = [];
    if (Array.isArray(it.explanations) && it.explanations[it.correctIndex]) {
      parts.push(`<div class="sim-rev-why"><strong>למה זו התשובה:</strong> ${esc(it.explanations[it.correctIndex])}</div>`);
    }
    if (chosen != null && !ok && Array.isArray(it.explanations) && it.explanations[chosen]) {
      parts.push(`<div class="sim-rev-why"><strong>מה לא עבד בבחירה שלך:</strong> ${esc(it.explanations[chosen])}</div>`);
    }
    if (!parts.length && it.transcript) {
      parts.push(`<div class="sim-rev-why"><strong>מה שנאמר בקטע:</strong> ${esc(it.transcript)}</div>`);
    }

    // אין הסבר בבנק — אין פאנל. לא ממציאים טקסט.
    const panel = parts.length ? `
      <button type="button" class="sim-rev-head" data-block-toggle data-rev="${i}" aria-expanded="false">
        <span>${ok ? 'למה זו התשובה' : 'הסבר לי את הטעות'}</span>
        <span class="sim-rev-chev">▾</span>
      </button>
      <div class="sim-rev-body">${parts.join('')}</div>` : '';

    return `
      <div class="sim-rev-item" data-rev-item="${i}">
        <div class="sim-sec-foot">${esc(SECTION_LABELS[it.sectionKind])} · שאלה ${it.order}</div>
        ${it.prompt ? `<div class="sim-rev-q" dir="${it.itemKind === 'listening' ? 'rtl' : 'ltr'}">${esc(it.prompt)}</div>` : ''}
        <div class="sim-rev-line">
          ${chosen == null
            ? '<span class="sim-rev-no">לא נענתה</span>'
            : ok
              ? '<span class="sim-rev-ok">✓ נכון</span>'
              : `<span class="sim-rev-no">✗ בחרת:</span> <span dir="ltr">${esc(it.options[chosen])}</span>`}
        </div>
        ${!ok ? `<div class="sim-rev-line"><span class="sim-rev-ok">התשובה:</span> <span dir="ltr">${esc(it.options[it.correctIndex])}</span></div>` : ''}
        ${panel}
      </div>`;
  }).join('');
}

/** קיפול הפאנלים — אותו דפוס data-block-toggle שכבר משמש במסכי ההסבר. */
function wireReviewToggles(box) {
  box.querySelectorAll('[data-block-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-rev-item]');
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}
