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
 * שאר כללי הפרויקט חלים: אין הענשה. הדוח נותן ציון משוער בסולם 50–150
 * (יהודה, 4.9.2026 — src/lib/scoreScale.js), אחוזים לכל סוג שאלה עם כיוון מול
 * הסימולציה הקודמת, מפתחות ('למה לשים לב') וקצב. מצב אורח רץ במלואו ושום דבר לא נשמר.
 */

import { navigate, subAnchor } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { track } from '../lib/analytics.js';
import { AudioPlayer } from '../listening/audio-player.js';
import { markPractising, rewardSession } from '../lib/reward.js';
import { XP } from '../lib/xp.js';
import {
  loadForm, startAttempt, saveAnswer, finishAttempt, buildReport, listAttempts, SECTION_LABELS,
} from '../data/simulation.data.js';
import { scaledScore, deltaLine } from '../lib/scoreScale.js';
import { paceLine, fmtSec } from '../lib/pace.js';
import { resolveKey } from '../lib/scKeys.js';
import { resolveTrigger } from '../lib/keys.js';
import { shareText, shareHeader, SITE } from '../lib/share.js';   // סשן שבת 6: שיתוף תוצאה

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
.sim-passage{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.9rem 1.05rem;margin-bottom:1rem;max-height:22rem;overflow-y:auto}
.sim-passage-title{font-family:var(--eng);font-weight:700;font-size:1.02rem;color:var(--green-dark);margin-bottom:.5rem;text-align:left}
.sim-passage-body{text-align:left;font-family:var(--eng);font-size:1rem;line-height:1.75}
.sim-passage-body p{margin:0 0 .7rem}
.sim-passage-body p:last-child{margin-bottom:0}
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

/* דיאלוג אישור סגירת פרק (3.9.2026) */
.sim-confirm { position:fixed; inset:0; background:rgba(10,20,16,.55); z-index:1000;
  display:flex; align-items:center; justify-content:center; padding:1.2rem; }
.sim-confirm-box { background:var(--card,#fff); border-radius:var(--radius,14px); padding:1.4rem 1.3rem;
  max-width:24rem; width:100%; box-shadow:0 20px 50px rgba(0,0,0,.28); text-align:center; }
.sim-confirm-title { font-weight:800; font-size:1.1rem; margin-bottom:.5rem; }
.sim-confirm-sub { font-size:.88rem; color:var(--muted); line-height:1.6; margin-bottom:1.1rem; }
.sim-confirm-btns { display:flex; flex-direction:column; gap:.55rem; }
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
.sim-h2 { font-size:1.05rem; font-weight:800; margin:1.6rem 0 .6rem; }
.sim-score-card { display:inline-block; background:var(--card); border:1px solid var(--border); border-radius:14px;
  padding:1.1rem 2rem; margin:.4rem 0 .6rem; }
.sim-score-num { font-size:3rem; font-weight:900; color:var(--green-dark); line-height:1; font-variant-numeric:tabular-nums; }
.sim-score-lbl { font-size:.8rem; color:var(--muted); font-weight:700; margin-top:.35rem; }
.sim-score-band { display:inline-block; margin-top:.5rem; background:var(--green-light); color:var(--green-dark);
  border-radius:99px; padding:.2rem .8rem; font-size:.82rem; font-weight:800; }
.sim-score-delta { font-size:.84rem; color:var(--muted); margin-top:.5rem; min-height:1.2em; }
.sim-score-how { max-width:34rem; margin:0 auto .4rem; font-size:.86rem; }
.sim-delta { font-size:.78rem; font-weight:800; color:var(--muted); margin-inline-start:.3rem; }
.sim-delta.up { color:var(--green-dark); } .sim-delta.down { color:var(--orange,#B08442); }
.sim-key-row { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:.7rem .9rem;
  margin-bottom:.5rem; display:grid; grid-template-columns:1fr auto; gap:.3rem .9rem; align-items:center; }
.sim-key-label { font-weight:800; font-size:.92rem; } .sim-key-group { font-weight:600; color:var(--muted); font-size:.8rem; }
.sim-key-foot { font-size:.8rem; color:var(--muted); }
.sim-key-meter { grid-column:1 / -1; }
.sim-key-go { background:none; border:1px solid var(--green-dark); color:var(--green-dark); border-radius:8px;
  padding:.35rem .7rem; font-family:inherit; font-weight:800; font-size:.8rem; cursor:pointer; white-space:nowrap; }
.pace-line { font-size:.82rem; color:var(--muted); margin-top:.4rem; line-height:1.6; }
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
    userId: learner.id,
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
  // הקטע משותף לכל חמש השאלות ולכן נבנה במעטפת, בדיוק כמו הנגן: ציור מחדש
  // בכל שאלה היה מאפס את מיקום הגלילה בתוך הקטע באמצע קריאה.
  const reading = items.find((it) => it.itemKind === 'reading' && it.passageBody);

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
        ${reading ? passageBlock(reading) : ''}
        <div id="simQBody"></div>
      </div>
    </div>`;

  state.root.querySelectorAll('.sim-dot').forEach((d) => {
    d.addEventListener('click', () => goTo(Number(d.dataset.q)));
  });
}

/** קטע הקריאה של הפרק. נבנה פעם אחת ולא מצויר מחדש בין שאלות.
 *  הגוף מגיע מהמאגר עם שורות ריקות בין פסקאות. מפצלים לפסקאות ומריצים כל
 *  אחת דרך esc() — לא מזריקים HTML מהמסד. */
function passageBlock(it) {
  const paras = String(it.passageBody || '')
    .split(/\n\s*\n|\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<p>${esc(t)}</p>`)
    .join('');
  if (!paras) return '';
  return `
    <div class="sim-passage">
      ${it.passageTitle ? `<div class="sim-passage-title" dir="ltr">${esc(it.passageTitle)}</div>` : ''}
      <div class="sim-passage-body" dir="ltr">${paras}</div>
    </div>`;
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
  // 3.9.2026 — נמצא בבדיקה מקצה לקצה: הכפתור סגר פרק מתוזמן מיידית, בלי דרך
  // חזרה. לחיצה מקרית אחת במובייל הייתה מוחקת פרק שלם. אישור אחד, ולא יותר.
  state.root.querySelector('#simEnd').addEventListener('click', () => confirmEndSection());
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

/**
 * שואל לפני שסוגרים פרק. מציג כמה שאלות עוד לא נענו — המספר הזה הוא מה שגורם
 * לתלמיד לעצור, הרבה יותר מהמילה "בטוח?".
 */
function confirmEndSection() {
  const items = curItems();
  const unanswered = items.filter((it) => !state.answers.has(it.order)).length;
  const wrap = document.createElement('div');
  wrap.className = 'sim-confirm';
  wrap.innerHTML = `
    <div class="sim-confirm-box" role="dialog" aria-modal="true" aria-labelledby="simConfirmTitle">
      <div class="sim-confirm-title" id="simConfirmTitle">לסיים את הפרק?</div>
      <div class="sim-confirm-sub">${unanswered > 0
        ? `נשארו ${unanswered} שאלות שלא ענית עליהן. אי אפשר לחזור לפרק אחרי שהוא נסגר.`
        : 'ענית על כל השאלות. אי אפשר לחזור לפרק אחרי שהוא נסגר.'}</div>
      <div class="sim-confirm-btns">
        <button class="sim-btn" id="simConfirmStay">להמשיך בפרק</button>
        <button class="sim-btn-quiet" id="simConfirmEnd">לסיים ולעבור הלאה</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('#simConfirmStay').addEventListener('click', close);
  wrap.querySelector('#simConfirmEnd').addEventListener('click', () => { close(); closeSection('finished'); });
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
  wrap.querySelector('#simConfirmStay').focus();
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
  rewardSession({
    source: 'simulation_section', total: 0,
    extraXp: XP.simulationSection, userId: state.userId, silent: true,
  }).catch(() => {});
  state.secIdx += 1;
  state.phase = 'section-intro';
  draw();
}

/* ── הדוח ─────────────────────────────────────────────────────────────────── */

/** תוויות סוגי שאלה בהבנת הנקרא — זהות ל-reading-analyze.js. */
const READING_TYPE_LABEL = {
  main_idea:         'רעיון מרכזי / כותרת',
  explicit_detail:   'פרט מפורש',
  inference:         'הסקה',
  vocab_in_context:  'אוצר מילים בהקשר',
  paragraph_purpose: 'תפקיד הפסקה',
  reference_word:    'מילת ייחוס',
};

/** סוג פרק → מודול קצב ב-lib/pace.js. האזנה נקבעת ע"י אורך הקטע ולכן בלי קצב. */
const PACE_MODULE = { sc: 'sc', restatement: 'rephrase', reading: 'reading' };

/**
 * המפתחות ("למה לשים לב") שהשאלה חושפת, ואם הטעות נזקפת להם.
 * השלמת משפטים: מפתח אחד לשאלה (lib/scKeys). ניסוח מחדש: המפתח שייך למסיח,
 * ולכן חשיפה לכל שלושת המסיחים וטעות רק למסיח שנבחר (כמו weakpoints.data.js).
 * הבנת הנקרא: סוג השאלה. האזנה: אין תיוג עקבי בבנק — לא ממציאים.
 * @returns {Array<{id:string,label:string,group:string,route:string|null,missed:boolean}>}
 */
function keysOf(it, a) {
  const chosen = a?.chosenIndex;
  if (chosen == null) return [];
  const wrong = !a.isCorrect;

  if (it.itemKind === 'sc') {
    const k = resolveKey(it.clueCode);
    return k ? [{ id: 'sc:' + k.id, label: k.label, group: 'השלמת משפטים', route: `/sc-practice?key=${k.id}`, missed: wrong }] : [];
  }
  if (it.itemKind === 'restatement') {
    const out = new Map();
    const chosenCanon = it.canonicalIdx?.[chosen];
    for (let n = 1; n <= 3; n++) {
      const t = resolveTrigger({ category: it.categories?.[n - 1], mechanism: it.mechanisms?.[n - 1] });
      if (!t) continue;
      const cur = out.get(t.id) || { id: 'rs:' + t.id, label: t.label, group: 'ניסוח מחדש', route: `/rephrase-practice?key=${t.id}`, missed: false };
      if (wrong && chosenCanon === n) cur.missed = true;
      out.set(t.id, cur);
    }
    return [...out.values()];
  }
  if (it.itemKind === 'reading' && it.questionType) {
    return [{ id: 'rd:' + it.questionType, label: READING_TYPE_LABEL[it.questionType] || it.questionType,
      group: 'הבנת הנקרא', route: '/reading-practice', missed: wrong }];
  }
  return [];
}

/** ספירה לפי מפתח; רק מפתחות עם שתי חשיפות לפחות — מספר על חשיפה אחת הוא רעש. */
function buildKeyReport(items, answers) {
  const tally = new Map();
  for (const it of items) {
    for (const k of keysOf(it, answers.get(it.order))) {
      const t = tally.get(k.id) || { ...k, exposures: 0, misses: 0 };
      t.exposures += 1;
      if (k.missed) t.misses += 1;
      tally.set(k.id, t);
    }
  }
  return [...tally.values()]
    .filter((t) => t.exposures >= 2)
    .sort((x, y) => (y.misses / y.exposures) - (x.misses / x.exposures) || y.misses - x.misses);
}

/** משפט קצב לפרק, מהזמנים שנמדדו לכל שאלה. '' כשאין מדידה מספקת. */
function sectionPace(kind) {
  const mod = PACE_MODULE[kind];
  if (!mod) return '';
  let total = 0, n = 0;
  for (const it of state.items) {
    if (it.sectionKind !== kind) continue;
    const a = state.answers.get(it.order);
    if (!a || !a.responseMs) continue;
    total += a.responseMs; n += 1;
  }
  return paceLine(mod, total, n);
}

/** חץ כיוון מול ניסיון קודם. "מספר עם כיוון קורא כמו התקדמות". */
function deltaChip(cur, prev) {
  if (cur == null || prev == null) return '';
  const d = cur - prev;
  if (d > 0) return `<span class="sim-delta up">↑ ${d}</span>`;
  if (d < 0) return `<span class="sim-delta down">↓ ${Math.abs(d)}</span>`;
  return `<span class="sim-delta">=</span>`;
}

function drawReport() {
  stopTicker();
  destroyPlayer();

  const report = buildReport(state.items, state.answers);
  const scaled = scaledScore(state.items, state.answers);
  const elapsed = Date.now() - state.startedAt;
  const isShort = String(state.form.code).startsWith('short');

  finishAttempt(state.attemptId, {
    totalAnswered: report.totalAnswered,
    totalCorrect:  report.totalCorrect,
    scaledScore:   scaled?.score ?? null,
    sectionStats:  report.sections.map((s) => ({
      kind: s.kind, total: s.total, answered: s.answered, correct: s.correct,
      accuracy: s.accuracy, ceiling: s.ceiling,
    })),
  });

  track('simulation_completed', {
    form: state.form.code, accuracy: report.accuracy, scaled: scaled?.score ?? null,
    minutes: Math.round(elapsed / 60000),
  });

  rewardSession({
    source: 'simulation', total: 0, extraXp: XP.simulationDone,
    userId: state.userId, badges: ['sim_first'],
  }).catch(() => {});

  const meterColor = (acc) =>
    acc >= 75 ? 'var(--green)' : acc >= 50 ? 'var(--orange,#B08442)' : 'var(--red,#B4553E)';

  const rows = report.sections.map((s) => `
    <div class="sim-sec-row">
      <div class="sim-sec-row-top">
        <span class="sim-sec-name">${esc(s.label)}</span>
        <span class="sim-sec-score">${s.accuracy != null ? s.accuracy + '%' : '—'} <span data-delta="${s.kind}"></span></span>
      </div>
      <div class="sim-meter">
        <div class="sim-meter-fill" style="width:${s.accuracy ?? 0}%;background:${meterColor(s.accuracy ?? 0)}"></div>
      </div>
      <div class="sim-sec-foot">
        ${s.correct} מתוך ${s.answered} שנענו${s.answered < s.total ? ` · ${s.total - s.answered} נשארו פתוחות` : ''}
      </div>
      ${sectionPace(s.kind)}
    </div>`).join('');

  const keys = buildKeyReport(state.items, state.answers);
  const keyRows = keys.map((k) => {
    const pct = Math.round(((k.exposures - k.misses) / k.exposures) * 100);
    const link = (k.misses > 0 && k.route)
      ? `<button type="button" class="sim-key-go" data-nav="${esc(k.route)}">לתרגול ממוקד ←</button>` : '';
    return `
      <div class="sim-key-row">
        <div class="sim-key-main">
          <div class="sim-key-label">${esc(k.label)} <span class="sim-key-group">· ${esc(k.group)}</span></div>
          <div class="sim-key-foot">${k.exposures - k.misses} מתוך ${k.exposures} · ${pct}%</div>
        </div>
        <div class="sim-meter sim-key-meter"><div class="sim-meter-fill" style="width:${pct}%;background:${meterColor(pct)}"></div></div>
        ${link}
      </div>`;
  }).join('');
  const keysBlock = keys.length ? `
    <div class="sim-h2">למה לשים לב</div>
    <div class="sim-rep-sub" style="margin-bottom:.8rem">המפתחות שהופיעו בסימולציה, מהחלש לחזק. מפתח עם טעות מקבל תרגול ממוקד משלו.</div>
    ${keyRows}` : '';

  const insight = (report.weakest && report.strongest && report.weakest.kind !== report.strongest.kind)
    ? `<div class="sim-note">
        הפער הבולט: <strong>${esc(report.strongest.label)}</strong> יצא הכי חזק
        (${report.strongest.accuracy}%), ו<strong>${esc(report.weakest.label)}</strong> הכי חלש
        (${report.weakest.accuracy}%). זה המקום שבו תרגול ייתן לך הכי הרבה תמורה על הזמן.
      </div>` : '';

  const guestBlock = state.isGuest ? `
    <div class="sim-note">
      <strong>חשבון חינם שומר את הדוח הזה</strong> ומראה לך בסימולציה הבאה כמה עלית בכל פרק.
      <div style="margin-top:.7rem"><button class="sim-btn" id="simSignup">להרשמה חינם</button></div>
    </div>` : '';

  const scoreCard = scaled ? `
    <div class="sim-score-card">
      <div class="sim-score-num">${scaled.score}</div>
      <div class="sim-score-lbl">ציון משוער · סולם 50–150</div>
      <div class="sim-score-band">${esc(scaled.band.code)} · ${esc(scaled.band.label)}</div>
      <div class="sim-score-delta" id="simScoreDelta"></div>
    </div>
    <div class="sim-rep-sub sim-score-how">
      הציון משוקלל לפי קושי השאלות ומתורגם לסולם הבחינה. כמו בכל סימולציה — זו הערכה,
      ${isShort ? 'וטופס קצר נותן תמונה ראשונית; סימולציה מלאה מדייקת אותה.' : 'וסימולציות נוספות מראות את הכיוון.'}
    </div>` : '';

  state.root.innerHTML = `
    <div class="sim-shell"><div class="sim-body">
      <div class="sim-rep-head">
        <div class="sim-rep-h1">${esc(state.form.title || 'הסימולציה')} — הסיכום שלך</div>
        ${scoreCard}
        <div class="sim-rep-sub">
          ${report.totalCorrect} תשובות נכונות מתוך ${report.totalAnswered} שנענו (${report.accuracy ?? 0}%) · ${fmtTime(elapsed)} דקות
        </div>
      </div>

      <div class="sim-h2">לפי סוג שאלה</div>
      ${rows}
      ${insight}
      ${keysBlock}
      ${guestBlock}

      <div class="sim-actions" style="justify-content:center;margin-top:2rem">
        <button class="sim-btn" id="simReview">לסקירת כל השאלות</button>
        <button class="sim-btn-quiet" id="simAgain">סימולציה נוספת</button>
        <button class="sim-btn-quiet" id="simShare">📤 שיתוף</button>
        <button class="sim-btn-quiet" id="simHome">חזרה</button>
      </div>

      <div class="sim-review" id="simReviewBox" hidden></div>
    </div></div>`;

  state.root.querySelector('#simHome').addEventListener('click', () => { resetState(); navigate('/home'); });
  state.root.querySelector('#simAgain').addEventListener('click', () => { resetState(); navigate('/simulation'); });
  state.root.querySelector('#simShare')?.addEventListener('click', (e) => {
    // 🟩🟥 לפי סדר השאלות — כמו באתגר היומי. הציון משוער, ומסומן כך גם בשיתוף.
    const squares = state.items.map((it) => (state.answers.get(it.order)?.isCorrect ? '🟩' : '🟥')).join('');
    const scoreLine = scaled ? `ציון משוער ${scaled.score} (${scaled.band.code})` : `${report.totalCorrect}/${report.totalAnswered}`;
    shareText(`${shareHeader(state.form.title || 'סימולציה')}\n${scoreLine} · ${report.totalCorrect}/${report.totalAnswered} נכונות\n${squares}\n${SITE}/#/simulation`, e.currentTarget);
  });
  state.root.querySelector('#simSignup')?.addEventListener('click', () => { resetState(); navigate('/'); });
  state.root.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => { resetState(); navigate(b.dataset.nav); }));

  const revBtn = state.root.querySelector('#simReview');
  revBtn.addEventListener('click', () => {
    const box = state.root.querySelector('#simReviewBox');
    if (!box.hidden) { box.hidden = true; revBtn.textContent = 'לסקירת כל השאלות'; return; }
    box.innerHTML = renderReview();
    wireReviewToggles(box);
    box.hidden = false;
    revBtn.textContent = 'להסתיר את הסקירה';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  fillDeltas(report, scaled);
}

/**
 * הכיוון מול הסימולציה הקודמת (רשום בלבד). נטען אחרי הציור כדי שהדוח לא
 * יחכה לרשת. משווים לניסיון האחרון שהושלם לפני זה, לא לפי סוג טופס — תלמיד
 * רואה "עליתי" גם בין קצרה למלאה; זה כיוון, לא כיול.
 */
async function fillDeltas(report, scaled) {
  if (!state?.userId) return;
  const { data } = await listAttempts(state.userId, 10);
  if (!state?.root) return;
  const prev = (data || []).find((a) => a.id !== state.attemptId);
  if (!prev) return;

  const scoreEl = state.root.querySelector('#simScoreDelta');
  if (scoreEl && scaled) scoreEl.textContent = deltaLine(scaled.score, prev.scaled_score);

  const prevStats = Array.isArray(prev.section_stats) ? prev.section_stats : [];
  for (const s of report.sections) {
    const p = prevStats.find((x) => x.kind === s.kind);
    const el = state.root.querySelector(`[data-delta="${s.kind}"]`);
    if (el && p && p.accuracy != null && s.accuracy != null) el.innerHTML = deltaChip(s.accuracy, p.accuracy);
  }
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
        <div class="sim-sec-foot">${esc(SECTION_LABELS[it.sectionKind])} · שאלה ${it.order}${
          a?.responseMs ? ` · ${fmtSec(a.responseMs)}` : ''}${
          keysOf(it, a).length ? ` · ${esc(keysOf(it, a).map((k) => k.label).join(', '))}` : ''}</div>
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
