/**
 * src/screens/reading-practice.js — Reading Comprehension, Practice layer.
 *
 * ── Why this screen is shaped differently from sc-practice.js ────────────────
 * Every other practice screen streams unrelated items. Reading's unit is the
 * real exam's section 3: ONE passage, five questions, 15 minutes. So a session
 * here is a passage, the five questions are navigable (not a one-way queue),
 * and the passage stays on screen the whole time.
 *
 * Two modes, both chosen by Lion on 2.9.2026:
 *   practice — feedback and explanation immediately after each answer.
 *   exam     — 15 minutes on the clock, no feedback until the section is done.
 * Reached as #/reading-practice and #/reading-practice?mode=exam.
 *
 * ── The quoted-sentence highlight ───────────────────────────────────────────
 * The real AMIRNET interface highlights the sentence a question quotes, and
 * Lion chose to mirror that exactly, in both modes. It only ever fires for
 * questions that carry highlight_spans — anchor questions, 28% of the bank.
 * Paragraph and text questions get no visual help, which is precisely what the
 * real exam does, and is why the Window Method still has work to do.
 *
 * ── Navigation is the method ────────────────────────────────────────────────
 * The five chips at the top are not a convenience. The Window Method's second
 * rule is that a question with no anchor is answered LAST, and the exam prints
 * it first 54% of the time. Being able to skip question 1 and come back is how
 * the screen lets the learner actually do what the Learn layer teaches.
 *
 * HARD rules honoured:
 *  - Data layer only (reading.data.js), auth only via lib/learner.js.
 *  - Wellbeing: no streaks, no lives, no red-X shaming; a wrong answer opens an
 *    explanation, not a penalty.
 *  - "מפתחות"/"מה לשים לב", never "מלכודות".
 *  - The difficulty center is INTERNAL — never rendered (levelMix.js contract).
 */

import { navigate, subAnchor } from '../router.js';
import { renderLayout, getPageContent } from '../layout.js';
import { getLearner, getGuestSeenIds, addGuestSeenIds } from '../lib/learner.js';
import {
  fetchPassageSession, logAttempt, fetchSeenPassageIds, fetchAnalyzeSummary,
} from '../data/reading.data.js';
import { getLevelCenter, saveLevelCenter, MODULE_LEVELS } from '../data/levels.data.js';
import { levelMix, driftCenter } from '../lib/levelMix.js';
import { LEARN_SEEN_KEY } from './reading-learn.js';

const CFG = MODULE_LEVELS.reading;
const EXAM_SECONDS = 15 * 60;
const MASTERY_RUN = 3;   // 💡 stops being offered after this many correct in a row on a type

// ─── Session state (in memory only) ──────────────────────────────────────────
let userId = null;
let isGuestLearner = false;
let mode = 'practice';
let center = CFG.start;

let passage = null;
let questions = [];
let chosen = [];        // per question: option index, or null
let revealed = [];      // per question: has feedback been shown (practice mode)
let hintOpen = [];
let idx = 0;
let masteredTypes = new Set();
let startedAt = 0;
let questionShownAt = 0;
let timerId = null;
let secondsLeft = EXAM_SECONDS;
let finished = false;

export async function renderReadingPractice(root) {
  await renderLayout(root, '/reading');
  const el = getPageContent();

  mode = subAnchor().includes('mode=exam') ? 'exam' : 'practice';

  // First visit goes through the method once — same gate sc-practice.js applies.
  // The timed section is exempt: someone who deliberately asked for an exam
  // simulation should not be redirected into a lesson.
  if (mode !== 'exam') {
    let seen = true;
    try { seen = !!localStorage.getItem(LEARN_SEEN_KEY); } catch (_) {}
    if (!seen) { navigate('/reading-learn'); return; }
  }

  el.innerHTML = `<div class="rp-loading">טוען קטע…</div>`;
  ensureStyles();

  const learner = await getLearner();
  userId = learner.id;
  isGuestLearner = learner.isGuest;

  // Difficulty center — persisted, unlike the older corners where it lived only
  // in memory and reset every session (see levels.data.js header).
  const lvl = await getLevelCenter(userId, 'reading');
  center = lvl.center;

  // A learner never gets a text he has already worked through.
  const seen = isGuestLearner
    ? getGuestSeenIds('reading')
    : (await fetchSeenPassageIds(userId)).data;

  const levels = levelMix(center, { min: CFG.min, max: CFG.max, packSize: 3 }).map((x) => x.level);
  const { data, error } = await fetchPassageSession({ levels, excludePassageIds: seen });

  if (error)  { el.innerHTML = errorView(); return; }
  if (!data)  { el.innerHTML = exhaustedView(); wireExhausted(el); return; }

  passage   = data.passage;
  questions = data.questions;
  chosen    = questions.map(() => null);
  revealed  = questions.map(() => false);
  hintOpen  = questions.map(() => false);
  idx = 0;
  finished = false;
  startedAt = Date.now();

  // Mastery hints run on question TYPE (project rule): once a learner has three
  // consecutive correct answers on a type, 💡 stops being offered for it.
  masteredTypes = new Set();
  if (!isGuestLearner) {
    const { data: sum } = await fetchAnalyzeSummary(userId, { limit: 200 });
    for (const [type, run] of Object.entries(sum?.typeStreaks || {})) {
      if (run >= MASTERY_RUN) masteredTypes.add(type);
    }
  }

  if (mode === 'exam') startTimer(el);
  draw(el);
}

// ─── Timer (exam mode only) ──────────────────────────────────────────────────
function startTimer(el) {
  stopTimer();
  secondsLeft = EXAM_SECONDS;
  timerId = setInterval(() => {
    // The learner may have navigated away mid-section. Without this the
    // interval would keep running against a detached element and, at zero,
    // "finish" a section nobody is looking at.
    if (!document.body.contains(el)) { stopTimer(); return; }
    secondsLeft--;
    const box = el.querySelector('#rpClock');
    if (box) box.textContent = clockText();
    if (secondsLeft <= 0) { stopTimer(); finish(el); }
  }, 1000);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function clockText() {
  const s = Math.max(0, secondsLeft);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function draw(el) {
  if (finished) { drawSummary(el); return; }
  const q = questions[idx];
  questionShownAt = Date.now();

  el.innerHTML = `
    <div class="rp-wrap fade-in">
      <div class="rp-head">
        <div class="rp-chips">${questions.map((_, i) => chip(i)).join('')}</div>
        ${mode === 'exam' ? `<div class="rp-clock" id="rpClock">${clockText()}</div>` : ''}
      </div>

      <article class="rp-passage" dir="ltr">
        <h2 class="rp-title">${esc(passage.title)}</h2>
        ${renderBody(passage.body, q)}
      </article>

      <section class="rp-qbox">
        <div class="rp-qnum">שאלה ${idx + 1} מתוך ${questions.length}</div>
        <p class="rp-stem" dir="ltr">${esc(q.question_text)}</p>
        <div class="rp-opts">${q.options.map((o, i) => optionBtn(o, i, q)).join('')}</div>
        ${hintBlock(q)}
        ${feedbackBlock(q)}
        <div class="rp-nav">
          <button class="rp-nav-btn" id="rpPrev" ${idx === 0 ? 'disabled' : ''}>הקודמת</button>
          <button class="rp-nav-btn rp-next" id="rpNext">${nextLabel()}</button>
        </div>
      </section>
    </div>`;

  el.querySelectorAll('[data-opt]').forEach((b) =>
    b.addEventListener('click', () => choose(el, Number(b.dataset.opt))));
  el.querySelectorAll('[data-chip]').forEach((b) =>
    b.addEventListener('click', () => { idx = Number(b.dataset.chip); draw(el); }));
  el.querySelector('#rpPrev')?.addEventListener('click', () => { if (idx > 0) { idx--; draw(el); } });
  el.querySelector('#rpNext')?.addEventListener('click', () => onNext(el));
  el.querySelector('#rpHintBtn')?.addEventListener('click', () => {
    hintOpen[idx] = !hintOpen[idx]; draw(el);
  });
}

function chip(i) {
  const answered = chosen[i] !== null;
  const cls = ['rp-chip', i === idx ? 'is-current' : '', answered ? 'is-done' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" data-chip="${i}">${i + 1}</button>`;
}

function nextLabel() {
  const last = idx === questions.length - 1;
  if (mode === 'practice' && !revealed[idx] && chosen[idx] === null) return last ? 'סיום' : 'דלג';
  return last ? 'סיום' : 'הבאה';
}

/**
 * The passage, split on the blank line that separates paragraphs in the bank,
 * with the current question's quoted sentence marked — the AMIRNET behaviour.
 * Escaping happens FIRST and the span is matched in escaped form, so a quote
 * containing an apostrophe or a quotation mark still lines up.
 */
function renderBody(body, q) {
  const span = Array.isArray(q.highlight_spans) ? q.highlight_spans[0] : null;
  return body.split(/\n{2,}/).map((para) => {
    let html = esc(para);
    if (span) {
      const needle = esc(span);
      const at = html.indexOf(needle);
      if (at !== -1) {
        html = html.slice(0, at) + '<mark class="rp-mark">' + needle + '</mark>' + html.slice(at + needle.length);
      }
    }
    return `<p>${html}</p>`;
  }).join('');
}

function optionBtn(text, i, q) {
  const picked = chosen[idx] === i;
  const show = mode === 'practice' && revealed[idx];
  let cls = 'rp-opt';
  if (picked) cls += ' is-picked';
  if (show && i === q.correct_option_index) cls += ' is-correct';
  if (show && picked && i !== q.correct_option_index) cls += ' is-wrong';
  return `<button class="${cls}" data-opt="${i}" dir="ltr"${show ? ' disabled' : ''}>
      <span class="rp-opt-letter">${'ABCD'[i]}</span><span>${esc(text)}</span>
    </button>`;
}

/** The hint IS the Window Method — it names the window, never the answer. */
const WINDOW_HINT = {
  anchor:    'זו שאלת עוגן. השאלה מצטטת ניסוח מהקטע — קראו את המשפט הזה, ואת המשפט שלפניו ואחריו. לא יותר מזה.',
  paragraph: 'זו שאלת פסקה. קראו את הפסקה כולה, לא רק את המשפט הפותח — האופציות בשאלות כאלה בנויות בדיוק מהמשפט הראשון או האחרון כשקוראים אותו לבד.',
  text:      'זו שאלת טקסט: אין בה שום דבר לסרוק אחריו. אם עוד לא עניתם על השאר — השאירו אותה לסוף וחזרו אליה, אחרי שעברתם על רוב הקטע דרך השאלות האחרות.',
};

function hintBlock(q) {
  if (mode === 'exam') return '';                 // no coaching inside a timed section
  if (masteredTypes.has(q.question_type)) return '';
  if (revealed[idx]) return '';
  const open = hintOpen[idx];
  return `
    <div class="rp-hint">
      <button class="rp-hint-btn" id="rpHintBtn">💡 ${open ? 'הסתר' : 'מה לשים לב'}</button>
      ${open ? `<p class="rp-hint-text">${WINDOW_HINT[q.window_size] || ''}</p>` : ''}
    </div>`;
}

function feedbackBlock(q) {
  if (mode !== 'practice' || !revealed[idx]) return '';
  const pick = chosen[idx];
  const ok = pick === q.correct_option_index;
  const expl = q.explanations_he || [];
  return `
    <div class="rp-fb ${ok ? 'ok' : 'no'}">
      <div class="rp-fb-head">${ok ? 'נכון' : 'לא נכון'}</div>
      ${!ok && expl[pick] ? `<p class="rp-fb-line"><b>מה שסימנת:</b> ${esc(expl[pick])}</p>` : ''}
      ${expl[q.correct_option_index] ? `<p class="rp-fb-line"><b>התשובה:</b> ${esc(expl[q.correct_option_index])}</p>` : ''}
    </div>`;
}

// ─── Interaction ─────────────────────────────────────────────────────────────
function choose(el, i) {
  const q = questions[idx];
  if (mode === 'practice' && revealed[idx]) return;

  const first = chosen[idx] === null;
  chosen[idx] = i;

  if (mode === 'practice') {
    revealed[idx] = true;
    record(q, i, Date.now() - questionShownAt);
  } else if (first) {
    // Exam mode logs once, at submit — see finish(). Nothing to do here.
  }
  draw(el);
}

function record(q, pick, ms) {
  // Fire-and-forget: a failed write must never block practice. Guests no-op
  // inside the data layer.
  logAttempt({
    userId,
    passageId: passage.id,
    questionId: q.id,
    chosenOption: pick,
    isCorrect: pick === q.correct_option_index,
    questionType: q.question_type,
    windowSize: q.window_size,
    mode,
    responseTimeMs: ms,
  }).catch(() => {});
}

function onNext(el) {
  if (idx < questions.length - 1) { idx++; draw(el); return; }
  finish(el);
}

async function finish(el) {
  stopTimer();
  finished = true;

  // Exam mode held its answers back so the section ran without feedback; write
  // them now, in order, so the analyze report sees the same rows either way.
  if (mode === 'exam') {
    questions.forEach((q, i) => { if (chosen[i] !== null) record(q, chosen[i], null); });
  }

  if (isGuestLearner) addGuestSeenIds('reading', [passage.id]);

  // Drift the internal difficulty center on the section's accuracy.
  const correct = questions.reduce((n, q, i) => n + (chosen[i] === q.correct_option_index ? 1 : 0), 0);
  const next = driftCenter(center, correct / questions.length, { min: CFG.min, max: CFG.max });
  if (next !== center) { center = next; saveLevelCenter(userId, 'reading', next).catch(() => {}); }

  drawSummary(el);
}

function drawSummary(el) {
  const correct = questions.reduce((n, q, i) => n + (chosen[i] === q.correct_option_index ? 1 : 0), 0);
  const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  // Descriptive, never diagnostic (SITEMAP §2): what happened in this session,
  // on the one axis the learner is taught.
  const missedWindows = {};
  questions.forEach((q, i) => {
    if (chosen[i] !== q.correct_option_index) {
      missedWindows[q.window_size] = (missedWindows[q.window_size] || 0) + 1;
    }
  });
  const WNAME = { anchor: 'שאלות עוגן', paragraph: 'שאלות פסקה', text: 'שאלות טקסט' };
  const worst = Object.entries(missedWindows).sort((a, b) => b[1] - a[1])[0];

  el.innerHTML = `
    <div class="rp-wrap fade-in">
      <section class="rp-qbox rp-sum">
        <div class="rp-sum-title">סיימת את הקטע</div>
        <div class="rp-sum-score">${correct} מתוך ${questions.length}</div>
        <div class="rp-sum-sub">${esc(passage.title)} · ${mins} דק'</div>
        ${worst && worst[1] > 1
          ? `<p class="rp-sum-note">רוב הטעויות בסשן הזה היו ב${WNAME[worst[0]] || 'שאלות'}.</p>`
          : ''}
        ${mode === 'exam'
          ? `<p class="rp-sum-note">אפשר לעבור על ההסברים לכל שאלה במסך הניתוח.</p>` : ''}
        ${isGuestLearner
          ? `<p class="rp-sum-note">אתם מתרגלים כאורחים — ההתקדמות לא נשמרת.</p>` : ''}
        <div class="rp-sum-btns">
          <button class="btn-primary" id="rpAgain">קטע נוסף ←</button>
          <a class="rp-sum-link" href="#/reading-analyze">📊 לניתוח</a>
          <a class="rp-sum-link" href="#/reading">חזרה לפינה</a>
        </div>
      </section>
    </div>`;

  el.querySelector('#rpAgain')?.addEventListener('click', () => renderReadingPractice(document.getElementById('app')));
}

function errorView() {
  return `<div class="rp-wrap fade-in"><section class="rp-qbox"><div class="rp-center">
    אירעה תקלה בטעינת הקטע.<br><span class="rp-sub">אפשר לנסות שוב מאוחר יותר.</span>
  </div></section></div>`;
}
function exhaustedView() {
  return `<div class="rp-wrap fade-in"><section class="rp-qbox"><div class="rp-center">
    עברתם על כל הקטעים שיש כרגע בבנק.<br><span class="rp-sub">אפשר לחזור לטעויות במסך הניתוח, ותוכן חדש בדרך.</span>
    <div class="rp-sum-btns"><a class="rp-sum-link" href="#/reading-analyze">📊 לניתוח</a></div>
  </div></section></div>`;
}
function wireExhausted() { /* links only */ }

// ─── Utils ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ensureStyles() {
  if (document.getElementById('rp-css')) return;
  const s = document.createElement('style');
  s.id = 'rp-css';
  s.textContent = `
.rp-wrap{max-width:760px;margin:0 auto}
.rp-loading,.rp-center{text-align:center;color:var(--muted);padding:2rem 1rem;line-height:1.9}
.rp-sub{font-size:.85rem}
.rp-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.9rem}
.rp-chips{display:flex;gap:.4rem}
.rp-chip{width:2rem;height:2rem;border-radius:50%;border:1.5px solid var(--border);background:var(--card);font:inherit;font-weight:700;font-size:.85rem;color:var(--muted);cursor:pointer}
.rp-chip.is-done{border-color:var(--green-dark);color:var(--green-dark)}
.rp-chip.is-current{background:var(--green-dark);border-color:var(--green-dark);color:#fff}
.rp-clock{font-variant-numeric:tabular-nums;font-weight:800;font-size:1.05rem;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.3rem .7rem}
.rp-passage{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.3rem 1.5rem;max-height:46vh;overflow-y:auto;text-align:left}
.rp-title{font-size:1.02rem;font-weight:800;margin:0 0 .8rem}
.rp-passage p{font-size:.95rem;line-height:1.95;margin:0 0 .85rem}
.rp-passage p:last-child{margin-bottom:0}
.rp-mark{background:#fdf2a8;padding:.05em 0;border-radius:2px}
.rp-qbox{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.4rem;margin-top:1rem}
.rp-qnum{font-size:.78rem;color:var(--muted);margin-bottom:.5rem}
.rp-stem{font-size:.97rem;font-weight:700;line-height:1.7;margin:0 0 1rem;text-align:left}
.rp-opts{display:flex;flex-direction:column;gap:.5rem}
.rp-opt{display:flex;align-items:flex-start;gap:.6rem;text-align:left;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:.7rem .85rem;font:inherit;font-size:.9rem;line-height:1.6;cursor:pointer;transition:border-color .15s,background .15s}
.rp-opt:hover:not(:disabled){border-color:var(--green-dark)}
.rp-opt:disabled{cursor:default}
.rp-opt-letter{flex:0 0 auto;font-weight:800;color:var(--muted)}
.rp-opt.is-picked{border-color:var(--green-dark)}
.rp-opt.is-correct{border-color:#3f9d5a;background:#f1faf3}
.rp-opt.is-correct .rp-opt-letter{color:#3f9d5a}
.rp-opt.is-wrong{border-color:#c9a227;background:#fdfaef}
.rp-hint{margin-top:.9rem}
.rp-hint-btn{background:none;border:none;font:inherit;font-size:.85rem;font-weight:700;color:var(--green-dark);cursor:pointer;padding:0}
.rp-hint-text{font-size:.87rem;line-height:1.8;color:var(--text);margin:.5rem 0 0;padding:.6rem .8rem;background:var(--bg);border-radius:var(--radius-sm)}
.rp-fb{margin-top:1rem;padding:.8rem .95rem;border-radius:var(--radius-sm);background:var(--bg);border:1px solid var(--border)}
.rp-fb-head{font-weight:800;font-size:.9rem;margin-bottom:.4rem}
.rp-fb.ok .rp-fb-head{color:#3f9d5a}
.rp-fb.no .rp-fb-head{color:#c9a227}
.rp-fb-line{font-size:.87rem;line-height:1.8;margin:.35rem 0 0}
.rp-nav{display:flex;justify-content:space-between;gap:.6rem;margin-top:1.2rem}
.rp-nav-btn{font:inherit;font-size:.88rem;font-weight:700;padding:.55rem 1.1rem;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:var(--card);color:var(--text);cursor:pointer}
.rp-nav-btn:disabled{opacity:.4;cursor:default}
.rp-nav-btn.rp-next{background:var(--green-dark);border-color:var(--green-dark);color:#fff}
.rp-sum{text-align:center}
.rp-sum-title{font-weight:800;font-size:1.05rem}
.rp-sum-score{font-size:2rem;font-weight:800;color:var(--green-dark);margin:.4rem 0}
.rp-sum-sub{font-size:.85rem;color:var(--muted)}
.rp-sum-note{font-size:.87rem;line-height:1.8;color:var(--text);margin:.9rem 0 0}
.rp-sum-btns{margin-top:1.2rem;display:flex;flex-direction:column;gap:.6rem;align-items:center}
.rp-sum-link{color:var(--green-dark);font-weight:700;font-size:.85rem;text-decoration:none}
@media(max-width:640px){.rp-passage{max-height:38vh}}
`;
  document.head.appendChild(s);
}
