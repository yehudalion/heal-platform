/**
 * src/screens/rephrase-practice.js  (T043 — Rephrase Practice)
 *
 * Multiple-choice restatement practice. Runs in PACKS of 5. Auto-levels on a
 * rolling window of the last 10 answers. Self-contained focused shell (no
 * sidebar), house style modelled on card.js.
 *
 * HARD rules honoured:
 *  - Data layer only (fetchPracticeQuestions / logAttempt) — never touches supabase.
 *  - Wellbeing: no red-X shaming, no life/streak loss; mistakes are neutral learning moments.
 *  - Hebrew RTL UI; English content in dir="ltr" blocks.
 * Trigger-category resolution goes exclusively through lib/keys.js (resolveTrigger).
 */

import { navigate, subAnchor } from '../router.js';
import { getSessionLength } from '../lib/sessionPrefs.js';
import { getCurrentSession } from '../supabase.js';
import { fetchPracticeQuestions, fetchPracticeQuestionsByKey, logAttempt } from '../data/rephrase.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { resolveTrigger, CATEGORIES } from '../lib/keys.js';
import { LEARN_SEEN_KEY } from './rephrase-learn.js';

// ─── Tunables ────────────────────────────────────────────────────────────────
const PACK_SIZE   = 5;    // default pack size; the learner's choice on the gate overrides
const WINDOW      = 10;   // rolling window for auto-leveling (SEPARATE from pack size)
const MIN_WINDOW  = 5;    // don't adjust level until this many answers are in the window
// LEVEL_MIN is 2, not 1, ON PURPOSE: the published pool covers L2–L5 only. A floor
// of 1 dropped a student who failed their first pack into an empty screen.
const LEVEL_MIN   = 2;
const LEVEL_MAX   = 5;
const START_LEVEL = 2;
const PRACTICE_MODE = 'standard'; // SEAM: other practice_modes (verification/blackout) added later

// Same bar rephrase-analyze.js uses to highlight a row. A label only gets named
// when it stands out; lift ≈ 1 means the labels are indistinguishable this session
// and the card stays silent rather than pointing at noise.
const NOTABLE_LIFT = 1.25;

// Universal fallback hint (always true) — shown when a distractor's trigger
// can't be resolved. Teaches the two surface tells that are NOT reliable.
const GENERIC_HINT = 'אל תסמוך על אורך האופציה או על כמה מילים היא חולקת עם המשפט המקורי — אלה לא סימנים אמינים.';

// ─── Session state (in memory only — never localStorage, never DB) ───────────
let userId = null;
let level = START_LEVEL;          // live difficulty; may change after each answer
let packLevel = START_LEVEL;      // the level the CURRENT pack was fetched at
const answeredIds = [];           // → p_exclude, so questions never repeat in a session
const rolling = [];               // last-≤10 booleans (isCorrect) across packs

let pack = [];                    // current pack (≤ PACK_SIZE questions)
let packIdx = 0;
let packCorrect = 0;
let levelAdjustedThisPack = false; // one level MOVE per pack — see adjustLevel()
let focusKey = null;               // non-null → this session drills ONE label
let focusLabel = null;             // its student-facing label, for the header

// per-question view state
let order = [0, 1, 2, 3];         // display slot d → canonical index order[d]
let revealed = false;
let chosenDisplay = null;
let hintUsed = false;
let hintShown = false;
let showFull = false;
let qStart = 0;

let view = 'question';            // 'question' | 'summary' | 'empty' | 'error'

// ─── Pure helpers ────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Canonical option order: 0=correct, 1=distractor_1, 2=distractor_2, 3=distractor_3.
function canonicalOptions(q) {
  return [q.correct_answer, q.distractor_1, q.distractor_2, q.distractor_3];
}
// Critical distractor = highest proximity (P3>P2>P1); tie → lowest distractor number.
function criticalDistractor(q) {
  const rank = { P3: 3, P2: 2, P1: 1 };
  let bestN = 1, bestScore = -1;
  for (const n of [1, 2, 3]) {
    const s = rank[q['proximity_' + n]] ?? 0;
    if (s > bestScore) { bestScore = s; bestN = n; } // strict > keeps the lowest n on ties
  }
  return { n: bestN, rCode: q['mechanism_' + bestN] };
}
// SEAM: mastery-gated hint (§2.3 / T024) will wrap this later. For now always visible.
function isHintVisible(_q) { return true; }

// ─── Data-layer driven flow ──────────────────────────────────────────────────
export async function renderRephrasePractice(root) {
  // First visit goes through Learn first (same gate card.js uses for vocab-learn).
  if (!localStorage.getItem(LEARN_SEEN_KEY)) { navigate('/rephrase-learn'); return; }

  // '#/rephrase-practice?key=nearmiss' — a focused pack, arrived at from Analyze.
  const params = new URLSearchParams(subAnchor());
  const requested = params.get('key');
  focusKey = CATEGORIES.some((c) => c.id === requested) ? requested : null;
  focusLabel = focusKey ? CATEGORIES.find((c) => c.id === focusKey).label : null;

  ensureStyles();
  root.innerHTML = `<div class="rp-shell fade-in"><div class="rp-card"><div class="rp-center">טוען שאלות…</div></div></div>`;

  const session = await getCurrentSession();
  userId = session?.user?.id ?? null;
  if (!userId) {
    root.innerHTML = `<div class="rp-shell fade-in"><div class="rp-card"><div class="rp-center">יש להתחבר כדי לתרגל.<br><a href="#/home">← דף הבית</a></div></div></div>`;
    return;
  }

  // reset the whole session
  level = START_LEVEL;
  answeredIds.length = 0;
  rolling.length = 0;
  await loadPack(root);
}

async function loadPack(root) {
  root.innerHTML = `<div class="rp-shell fade-in"><div class="rp-card"><div class="rp-center">טוען שאלות…</div></div></div>`;
  const fetchedAt = level;
  // A focused pack is selected by LABEL and ignores level — the point is to meet
  // that one type again, not to hold a difficulty. Auto-levelling still runs on the
  // answers, so a focused detour does not freeze the learner's level.
  const { data, error } = focusKey
    ? await fetchPracticeQuestionsByKey({ key: focusKey, limit: getSessionLength('rephrase', PACK_SIZE), excludeIds: answeredIds })
    : await fetchPracticeQuestions({ level, limit: getSessionLength('rephrase', PACK_SIZE), excludeIds: answeredIds });

  if (error) { view = 'error'; draw(root); return; }
  if (!data || data.length === 0) { view = 'empty'; draw(root); return; }

  pack = data;
  packLevel = fetchedAt;
  packIdx = 0;
  packCorrect = 0;
  levelAdjustedThisPack = false;
  startQuestion();
  view = 'question';
  draw(root);
}

function startQuestion() {
  order = shuffle([0, 1, 2, 3]);
  revealed = false;
  chosenDisplay = null;
  hintUsed = false;
  hintShown = false;
  showFull = false;
  qStart = Date.now();
}

function onChoose(root, d) {
  if (revealed) return;
  revealed = true;
  chosenDisplay = d;

  const q = pack[packIdx];
  const canonical = order[d];
  const isCorrect = canonical === 0;
  const rCode = isCorrect ? null : q['mechanism_' + canonical];
  const responseTimeMs = qStart ? Date.now() - qStart : null;

  if (isCorrect) packCorrect += 1;
  rolling.push(isCorrect);
  if (rolling.length > WINDOW) rolling.shift();
  answeredIds.push(q.id);
  adjustLevel();

  // Fire-and-forget — a failed log must never block practice (house style: card.js).
  logAttempt({
    userId,
    questionId: q.id,
    chosenOptionIndex: canonical,   // CANONICAL index, mapped back from the shuffled display
    isCorrect,
    rCode,
    responseTimeMs,
    hintUsed,
    practiceMode: PRACTICE_MODE,
  }).catch((err) => console.warn('rephrase.logAttempt failed:', err));

  draw(root);
}

function adjustLevel() {
  if (rolling.length < MIN_WINDOW) return; // guard against single-answer swings
  const w = rolling.slice(-WINDOW);
  const acc = w.reduce((sum, ok) => sum + (ok ? 1 : 0), 0) / w.length;
  let next = level;
  if (acc >= 0.8) next = Math.min(LEVEL_MAX, level + 1);
  else if (acc <= 0.4) next = Math.max(LEVEL_MIN, level - 1);

  // ONE level move per pack, never a skip. This runs after EVERY answer, so an
  // unbroken streak used to climb 2→3→5 (and a collapse to fall 5→2) inside a
  // single pack, skipping levels the learner never got to practise.
  // The clamps above are untouched — only the OPPORTUNITY is capped. The flag is
  // burned solely on a real move, so a clamped no-op at the ceiling/floor does
  // not silently consume this pack's one adjustment.
  if (next === level || levelAdjustedThisPack) return;
  level = next;
  levelAdjustedThisPack = true;
}

function nextQuestion(root) {
  packIdx += 1;
  if (packIdx >= pack.length) { view = 'summary'; draw(root); return; }
  startQuestion();
  view = 'question';
  draw(root);
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function draw(root) {
  if (view === 'empty') { root.innerHTML = shell(`<div class="rp-card"><div class="rp-center">אין כרגע שאלות זמינות לתרגול.<br><span class="rp-empty-sub">התוכן בדרך — נשמח לראותך בקרוב.</span></div></div>`); return; }
  if (view === 'error') { root.innerHTML = shell(`<div class="rp-card"><div class="rp-center">אירעה תקלה בטעינת השאלות.<br><span class="rp-empty-sub">אפשר לנסות שוב מאוחר יותר.</span></div></div>`); return; }
  if (view === 'summary') { drawSummary(root); return; }
  drawQuestion(root);
}

function shell(inner) {
  const q = pack[packIdx];
  const showMeta = view === 'question' && q;
  return `<div class="rp-shell fade-in">
    <div class="rp-top">
      <a class="rp-brand" href="#/rephrasing">← ניסוח מחדש</a>
      <div class="rp-meta">
        ${focusLabel ? `<span class="rp-chip rp-focuschip">🎯 ${esc(focusLabel)}</span>` : ''}
        ${showMeta ? `<span class="rp-chip">רמה ${packLevel}</span>
        <span class="rp-chip">שאלה ${packIdx + 1} / ${pack.length}</span>` : ''}
        <a class="rp-chip rp-guide" href="#/rephrase-learn">📘 מדריך</a>
      </div>
    </div>
    ${inner}
    <div class="rp-foot"><a href="#/home">← דף הבית</a></div>
  </div>`;
}

function drawQuestion(root) {
  const q = pack[packIdx];
  const opts = canonicalOptions(q);

  const optsHtml = [0, 1, 2, 3].map((d) => {
    const canon = order[d];
    let cls = '', tag = '';
    if (revealed) {
      if (canon === 0) { cls = 'correct'; tag = '✓ נכון'; }
      else if (d === chosenDisplay) { cls = 'chosen-wrong'; tag = 'הבחירה שלך'; }
    }
    return `<button class="rp-opt ${cls}" data-d="${d}" ${revealed ? 'disabled' : ''}>
      <span class="rp-opt-en" dir="ltr">${esc(opts[canon])}</span>
      ${tag ? `<span class="rp-opt-tag">${tag}</span>` : ''}
    </button>`;
  }).join('');

  const actions = revealed
    ? feedback(q)
    : (isHintVisible(q) ? `<button class="rp-hint" id="rpHint">💡 רמז</button>` : '');

  root.innerHTML = shell(`
    <div class="rp-card">
      <div class="rp-stem" dir="ltr">${esc(q.original_sentence)}</div>
      ${hintShown ? hintBox(q) : ''}
      <div class="rp-opts">${optsHtml}</div>
      <div class="rp-actions">${actions}</div>
    </div>
  `);

  if (!revealed) {
    root.querySelectorAll('.rp-opt').forEach((b) =>
      b.addEventListener('click', () => onChoose(root, Number(b.dataset.d))));
    root.querySelector('#rpHint')?.addEventListener('click', () => {
      hintUsed = true;
      hintShown = true;
      draw(root);
    });
  } else {
    root.querySelector('#rpFull')?.addEventListener('click', () => { showFull = !showFull; draw(root); });
    root.querySelector('#rpNext')?.addEventListener('click', () => nextQuestion(root));
  }
}

// The HINT_LEAD override that used to live here is gone (2026-08-05). It existed
// only because 'שים לב ל' + the old label 'לא נאמר במקור' read as 'שים לב ללא…'.
// That label no longer exists in the unified vocabulary, and all five current
// labels read correctly after 'שים לב ל'.
function hintBox(q) {
  // Critical-distractor selection unchanged. Name the label + cue only —
  // never the trigger word (that would give the answer away).
  const { n } = criticalDistractor(q);
  const t = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] });
  const body = t ? `שים לב ל${esc(t.label)} — ${esc(t.cue)}` : esc(GENERIC_HINT);
  return `<div class="rp-hintbox">💡 ${body}</div>`;
}

function feedback(q) {
  const canon = order[chosenDisplay];
  const isCorrect = canon === 0;
  let chosenExpl;
  if (isCorrect) {
    chosenExpl = `<div class="rp-expl rp-expl-good"><strong>✓ נכון.</strong> ${esc(q.correct_explanation_he || '')}</div>`;
  } else {
    // "מה קרה" — always shown, from the DB.
    const whatHappened = `<div class="rp-expl"><strong>מה קרה:</strong> ${esc(q['explanation_' + canon + '_he'] || '')}</div>`;
    // "מה היה עוזר" — only when the trigger resolves; otherwise omitted entirely.
    const t = resolveTrigger({ category: q['trigger_category_' + canon], mechanism: q['mechanism_' + canon] });
    let whatHelps = '';
    if (t) {
      const word = q['trigger_word_' + canon];
      const detail = word ? `שים לב ל"${esc(word)}". ${esc(t.cue)}` : esc(t.cue);
      whatHelps = `<div class="rp-expl rp-help"><strong>🔍 ${esc(t.label)} —</strong> ${detail}</div>`;
    }
    chosenExpl = whatHappened + whatHelps;
  }
  const last = packIdx >= pack.length - 1;
  return `
    ${chosenExpl}
    <button class="rp-link" id="rpFull">${showFull ? 'הסתר ניתוח מלא' : 'הצג ניתוח מלא'}</button>
    ${showFull ? fullAnalysis(q) : ''}
    <button class="btn-primary rp-next" id="rpNext">${last ? 'לסיכום המנה ←' : 'המשך ←'}</button>
  `;
}

function fullAnalysis(q) {
  const rows = [
    `<div class="rp-fa-row"><span class="rp-fa-lbl rp-fa-correct">התשובה הנכונה</span> ${esc(q.correct_explanation_he || '')}</div>`,
  ];
  for (const n of [1, 2, 3]) {
    // Category label only when the trigger resolves; otherwise just the explanation.
    const t = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] });
    const lbl = t ? `<span class="rp-fa-lbl">🔍 ${esc(t.label)}</span> ` : '';
    rows.push(`<div class="rp-fa-row">${lbl}${esc(q['explanation_' + n + '_he'] || '')}</div>`);
  }
  return `<div class="rp-fa"><div class="rp-fa-intro">כל מסיח בודק משהו אחר:</div>${rows.join('')}</div>`;
}

function drawSummary(root) {
  const total = pack.length;
  let levelMsg = '';
  if (level > packLevel) levelMsg = `<div class="rp-levelmsg up">עולים רמה! 🚀 המנה הבאה ברמה ${level}.</div>`;
  else if (level < packLevel) levelMsg = `<div class="rp-levelmsg down">בוא נתרגל עוד קצת ברמה הזו 💪 המנה הבאה ברמה ${level}.</div>`;

  root.innerHTML = shell(`
    <div class="rp-card rp-summary">
      <div class="rp-sum-title">סיכום מנה</div>
      <div class="rp-sum-score">${packCorrect} / ${total}</div>
      <div class="rp-sum-sub">${packCorrect} מתוך ${total} נכון במנה הזו.</div>
      <div class="rp-sum-total" id="rpTotal"></div>
      ${levelMsg}
      <div class="rp-insight" id="rpInsight" hidden></div>
      <div class="rp-nextstep">מה עכשיו?</div>
      <div class="rp-sum-btns">
        <button class="btn-primary" id="rpMore">${focusLabel ? `עוד מנה ב${esc(focusLabel)} ←` : 'עוד מנה ←'}</button>
        <a class="rp-sum-alt" href="#/rephrase-learn">📘 חזור למדריך</a>
        <a class="rp-sum-alt" id="rpToAnalyze" href="#/rephrase-analyze" hidden>מה כדאי לתרגל עכשיו ←</a>
        <button class="rp-link" id="rpDone">סיום</button>
      </div>
    </div>
  `);
  root.querySelector('#rpMore').addEventListener('click', () => loadPack(root));
  root.querySelector('#rpDone').addEventListener('click', () => navigate('/home'));
  fillSummaryExtras(root);
}

/**
 * Two independent things land on the summary, and they must not be confused:
 *
 *   the FACTUAL line — "you have practised N questions in total". Always shown from
 *   the very first pack. It states what happened; no threshold applies to a fact.
 *
 *   the DIAGNOSTIC card — "this type keeps coming back". That IS a claim about a
 *   pattern, so it keeps its sample gate and its notability bar and stays silent
 *   whenever either is unmet.
 *
 * Deliberately no level anywhere in either (Lion, 2026-08-05).
 */
async function fillSummaryExtras(root) {
  if (!userId) return;

  let lifetime = null, session = null;
  try {
    const [allTime, thisSession] = await Promise.all([
      getWeakPoints(userId),
      getWeakPoints(userId, { attemptLimit: answeredIds.length }),
    ]);
    lifetime = allTime.find((r) => r.moduleId === 'rephrase') ?? null;
    session = thisSession.find((r) => r.moduleId === 'rephrase') ?? null;
  } catch (err) {
    console.warn('rephrase.summary failed:', err);
    return;
  }

  // ── factual, no threshold ──
  const totalBox = root.querySelector('#rpTotal');
  if (totalBox && lifetime?.attempts) {
    totalBox.textContent = `סה"כ תרגלת ${lifetime.attempts} שאלות.`;
  }

  // ── diagnostic, thresholds apply ──
  if (!session || session.status !== 'ok' || !session.points.length) return;
  const top = session.points[0];
  if (top.lift === null || top.lift < NOTABLE_LIFT) return;   // nothing stands out — stay quiet

  const box = root.querySelector('#rpInsight');
  if (!box) return;
  box.innerHTML = `
    <div class="rp-insight-title">מה עלה בסשן הזה</div>
    <div class="rp-insight-body">
      <a class="rp-insight-key" href="#/rephrase-learn#rl-block-${top.id}">${esc(top.label)}</a>
      — נבחר ${top.misses} מתוך ${top.exposures} הפעמים שהופיע, יותר משאר הסוגים.
    </div>`;
  box.hidden = false;
  const toAnalyze = root.querySelector('#rpToAnalyze');
  if (toAnalyze) toAnalyze.hidden = false;
}

// ─── Scoped styles (injected once; styles.css untouched) ─────────────────────
function ensureStyles() {
  if (document.getElementById('rp-practice-css')) return;
  const s = document.createElement('style');
  s.id = 'rp-practice-css';
  s.textContent = RP_CSS;
  document.head.appendChild(s);
}

const RP_CSS = `
/* 960, not 720: the options are full English sentences and at 720 every one of
   them wrapped, which is what made the screen feel cramped on a desktop. Scoped to
   .rp-shell — this screen renders outside the sidebar layout, so no other screen
   is affected. max-width still collapses cleanly on mobile. */
.rp-shell{max-width:960px;margin:0 auto;padding:1.1rem 1rem 3rem;direction:rtl}
.rp-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:1rem}
.rp-brand{font-weight:800;color:var(--green-dark);text-decoration:none;font-size:.9rem}
.rp-meta{display:flex;gap:.4rem}
.rp-chip{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.75rem;font-weight:700;color:var(--muted)}
.rp-focuschip{background:var(--purple-light);color:var(--purple);border-color:var(--purple-light);white-space:nowrap}
.rp-guide{color:var(--green-dark);text-decoration:none;white-space:nowrap}
.rp-guide:hover{border-color:var(--green)}
.rp-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem 1.5rem}
.rp-stem{font-size:1.05rem;line-height:1.6;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem 1.1rem;margin-bottom:1.1rem;text-align:left}
.rp-opts{display:flex;flex-direction:column;gap:.55rem}
.rp-opt{display:flex;flex-direction:column;gap:.25rem;width:100%;text-align:right;background:var(--card);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:.75rem .95rem;cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
.rp-opt:hover:not(:disabled){border-color:var(--green)}
.rp-opt:disabled{cursor:default}
.rp-opt-en{display:block;direction:ltr;text-align:left;font-size:.95rem;line-height:1.5;color:var(--text)}
.rp-opt-tag{font-size:.72rem;font-weight:800}
.rp-opt.correct{border-color:var(--green);background:var(--green-light)}
.rp-opt.correct .rp-opt-tag{color:var(--green-dark)}
.rp-opt.chosen-wrong{border-color:var(--muted);background:var(--bg)}
.rp-opt.chosen-wrong .rp-opt-tag{color:var(--muted)}
.rp-actions{margin-top:1rem}
.rp-hint{background:var(--purple-light);color:var(--purple);border:1px solid var(--purple-light);border-radius:999px;padding:.5rem 1.1rem;font-weight:700;font-size:.85rem;cursor:pointer}
.rp-hintbox{background:var(--purple-light);color:#4a3aa8;border-radius:var(--radius-sm);padding:.7rem .95rem;margin-bottom:1rem;font-size:.88rem;line-height:1.5}
.rp-expl{background:var(--bg);border-radius:var(--radius-sm);padding:.8rem 1rem;font-size:.9rem;line-height:1.6;margin-bottom:.7rem}
.rp-expl-good{background:var(--green-light)}
.rp-help{background:var(--blue-light)}
.rp-link{background:none;border:none;color:var(--green-dark);font-weight:700;font-size:.83rem;cursor:pointer;padding:.3rem 0;text-decoration:underline}
.rp-fa{display:flex;flex-direction:column;gap:.5rem;margin:.4rem 0 .8rem}
.rp-fa-intro{font-size:.8rem;color:var(--muted);font-weight:700;margin-bottom:.2rem}
.rp-fa-row{font-size:.85rem;line-height:1.55;background:var(--bg);border-radius:var(--radius-sm);padding:.6rem .8rem}
.rp-fa-lbl{display:inline-block;font-weight:800;color:var(--muted);margin-left:.4rem}
.rp-fa-correct{color:var(--green-dark)}
.rp-next{margin-top:.6rem;width:100%}
.rp-foot{margin-top:1.4rem;text-align:center}
.rp-foot a{color:var(--muted);font-size:.82rem;text-decoration:none}
.rp-center{text-align:center;color:var(--muted);padding:2rem 1rem;line-height:1.8}
.rp-center a{color:var(--green-dark);text-decoration:none;font-weight:700}
.rp-empty-sub{font-size:.82rem;color:var(--muted)}
.rp-summary{text-align:center}
.rp-sum-title{font-size:.9rem;color:var(--muted);font-weight:700}
.rp-sum-score{font-size:2.4rem;font-weight:900;color:var(--green-dark);margin:.3rem 0}
.rp-sum-sub{font-size:.9rem;color:var(--text)}
.rp-levelmsg{margin-top:1rem;padding:.7rem 1rem;border-radius:var(--radius-sm);font-weight:700;font-size:.9rem}
.rp-levelmsg.up{background:var(--green-light);color:var(--green-dark)}
.rp-levelmsg.down{background:var(--orange-light);color:#b5551f}
.rp-insight{margin-top:1.2rem;background:var(--blue-light);border-radius:var(--radius-sm);padding:.9rem 1rem;text-align:right}
.rp-insight-title{font-size:.75rem;font-weight:800;color:var(--muted);margin-bottom:.35rem}
.rp-insight-body{font-size:.88rem;line-height:1.7}
.rp-insight-key{font-weight:800;color:var(--green-dark);text-decoration:underline}
.rp-sum-total{font-size:.85rem;color:var(--muted);margin-top:.35rem}
.rp-nextstep{margin-top:1.4rem;font-size:.8rem;font-weight:800;color:var(--muted)}
.rp-sum-alt{font-size:.85rem;font-weight:700;color:var(--green-dark);text-decoration:none;padding:.35rem 0}
.rp-sum-alt:hover{text-decoration:underline}
.rp-sum-btns{margin-top:.7rem;display:flex;flex-direction:column;gap:.5rem;align-items:center}
.rp-sum-btns .btn-primary{width:100%}
`;
