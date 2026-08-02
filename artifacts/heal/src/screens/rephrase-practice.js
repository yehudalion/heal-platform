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

import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { fetchPracticeQuestions, logAttempt } from '../data/rephrase.data.js';
import { resolveTrigger } from '../lib/keys.js';

// ─── Tunables ────────────────────────────────────────────────────────────────
const PACK_SIZE   = 5;    // questions per pack (display cadence)
const WINDOW      = 10;   // rolling window for auto-leveling (SEPARATE from pack size)
const MIN_WINDOW  = 5;    // don't adjust level until this many answers are in the window
const LEVEL_MIN   = 1;
const LEVEL_MAX   = 5;
const START_LEVEL = 2;    // only L2 has published content today
const PRACTICE_MODE = 'standard'; // SEAM: other practice_modes (verification/blackout) added later

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
  const { data, error } = await fetchPracticeQuestions({ level, limit: PACK_SIZE, excludeIds: answeredIds });

  if (error) { view = 'error'; draw(root); return; }
  if (!data || data.length === 0) { view = 'empty'; draw(root); return; }

  pack = data;
  packLevel = fetchedAt;
  packIdx = 0;
  packCorrect = 0;
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
  if (acc >= 0.8) level = Math.min(LEVEL_MAX, level + 1);
  else if (acc <= 0.4) level = Math.max(LEVEL_MIN, level - 1);
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
      ${showMeta ? `<div class="rp-meta">
        <span class="rp-chip">רמה ${packLevel}</span>
        <span class="rp-chip">שאלה ${packIdx + 1} / ${pack.length}</span>
      </div>` : ''}
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

function hintBox(q) {
  // Critical-distractor selection unchanged. Name the category + cue only —
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
      <div class="rp-sum-sub">ענית נכון על ${packCorrect} מתוך ${total} שאלות.</div>
      ${levelMsg}
      <div class="rp-sum-btns">
        <button class="btn-primary" id="rpMore">המשך ←</button>
        <button class="rp-link" id="rpDone">סיום</button>
      </div>
    </div>
  `);
  root.querySelector('#rpMore').addEventListener('click', () => loadPack(root));
  root.querySelector('#rpDone').addEventListener('click', () => navigate('/home'));
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
.rp-shell{max-width:720px;margin:0 auto;padding:1.1rem 1rem 3rem;direction:rtl}
.rp-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:1rem}
.rp-brand{font-weight:800;color:var(--green-dark);text-decoration:none;font-size:.9rem}
.rp-meta{display:flex;gap:.4rem}
.rp-chip{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.75rem;font-weight:700;color:var(--muted)}
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
.rp-sum-btns{margin-top:1.4rem;display:flex;flex-direction:column;gap:.6rem;align-items:center}
.rp-sum-btns .btn-primary{width:100%}
`;
