/**
 * src/screens/sc-practice.js — Sentence Completion, Practice layer.
 *
 * Packs of 5, auto-leveling on difficulty_pos (1–8) via a rolling window of the
 * last 10 answers — same shape as rephrase-practice.js, adapted to a single
 * blank + 4 short options instead of 4 full restatements.
 *
 * HARD rules honoured:
 *  - Data layer only (sentenceCompletion.data.js). Auth via supabase.js only.
 *  - Wellbeing: no red-X shaming, no life/streak loss.
 *  - "מפתחות"/"למה לשים לב", never "traps" (CLAUDE.md #8).
 *  - Label resolution goes exclusively through lib/scKeys.js (resolveKey).
 *
 * "הוסף מילים לחזרות" (push a missed word into vocab SRS) is DEFERRED — a
 * scope decision, not an oversight. sc_attempts.pushed_words stays NULL from
 * this screen; do not wire it without a fresh design pass.
 */

import { navigate, subAnchor } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { fetchPracticeQuestions, fetchPracticeQuestionsByKey, logAttempt } from '../data/sentenceCompletion.data.js';
import { getPushableWords, pushMissedWords } from '../data/srsPush.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { resolveKey, isDefinitionMove, CATEGORIES } from '../lib/scKeys.js';
import { LEARN_SEEN_KEY } from './sc-learn.js';

// ─── Tunables ────────────────────────────────────────────────────────────────
const PACK_SIZE   = 5;
const WINDOW      = 10;
const MIN_WINDOW  = 5;
// The bank covers all 8 positions fully (100/position) — unlike rephrase's
// L2–L5-only pool, there is no dead floor here. Start in the middle.
const LEVEL_MIN   = 1;
const LEVEL_MAX   = 8;
const START_LEVEL = 4;

const NOTABLE_LIFT = 1.25;

const GENERIC_HINT = 'אל תסתפקו במילה הכי "יפה" — בדקו מה בדיוק במשפט מחייב את התשובה: המילים הצמודות, מילת הקישור, או המשפט כולו.';

// ─── Session state (in memory only) ───────────────────────────────────────────
let userId = null;
let level = START_LEVEL;
let packLevel = START_LEVEL;
const answeredIds = [];
const rolling = [];

let pack = [];
let packIdx = 0;
let packCorrect = 0;
let levelAdjustedThisPack = false;
let focusKey = null;
let focusLabel = null;

// per-question view state
let order = [0, 1, 2, 3];         // display slot d → canonical 0-based option index (canonical option NUMBER = order[d]+1)
let revealed = false;
let chosenDisplay = null;
let hintUsed = false;
let hintShown = false;
let showFull = false;
let metaTagged = false;           // whether the optional lexical/strategic tag was answered (or dismissed)
let qStart = 0;

// "Add the words you missed to my practice" — LEARNER-INITIATED, never automatic
// (Lion, 2026-08-27). A wrong answer only makes the offer available; nothing is
// written until the learner presses the button. `pushOffer` is whatever
// getPushableWords() found and stays empty when no button should appear at all
// (correct answer / grammar-shaped options with no row in `words` / already in
// the learner's queue).
let pushOffer = [];               // [{ wordId, headword, source }]
let pushState = 'idle';           // 'idle' | 'saving' | 'done'

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
// Escapes first (stem is plain text, never HTML), then marks the blank.
// NOTE (Lion, 2026-08-27): highlight_spans is intentionally NOT rendered
// here anymore -- regular practice must not visually mark the "keys"
// (that gives the strategy away before the learner looks for it
// themselves). The textual hint (hintBox, below) still names the key on
// request via the existing hint button. highlight_spans stays in the
// data/columns for a possible future reveal-after-answer use, just not
// live in the question.
function renderStem(stem) {
  const html = esc(stem);
  return html.replace('___', '<span class="sp-blank">___</span>');
}
// SEAM: mastery-gated hint (rephrase's §2.3 pattern) will wrap this later. For
// now the hint is ALWAYS visible — explicit scope decision, not an omission.
function isHintVisible(_q) { return true; }

// ─── Data-layer driven flow ──────────────────────────────────────────────────
export async function renderScPractice(root) {
  if (!localStorage.getItem(LEARN_SEEN_KEY)) { navigate('/sc-learn'); return; }

  const params = new URLSearchParams(subAnchor());
  const requested = params.get('key');
  focusKey = CATEGORIES.some((c) => c.id === requested) ? requested : null;
  focusLabel = focusKey ? CATEGORIES.find((c) => c.id === focusKey).label : null;

  ensureStyles();
  root.innerHTML = `<div class="sp-shell fade-in"><div class="sp-card"><div class="sp-center">טוען שאלות…</div></div></div>`;

  const session = await getCurrentSession();
  userId = session?.user?.id ?? null;
  if (!userId) {
    root.innerHTML = `<div class="sp-shell fade-in"><div class="sp-card"><div class="sp-center">יש להתחבר כדי לתרגל.<br><a href="#/home">← דף הבית</a></div></div></div>`;
    return;
  }

  level = START_LEVEL;
  answeredIds.length = 0;
  rolling.length = 0;
  await loadPack(root);
}

async function loadPack(root) {
  root.innerHTML = `<div class="sp-shell fade-in"><div class="sp-card"><div class="sp-center">טוען שאלות…</div></div></div>`;
  const fetchedAt = level;
  const { data, error } = focusKey
    ? await fetchPracticeQuestionsByKey({ key: focusKey, limit: PACK_SIZE, excludeIds: answeredIds })
    : await fetchPracticeQuestions({ level, limit: PACK_SIZE, excludeIds: answeredIds });

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
  metaTagged = false;
  pushOffer = [];
  pushState = 'idle';
  qStart = Date.now();
}

function onChoose(root, d) {
  if (revealed) return;
  revealed = true;
  chosenDisplay = d;

  const q = pack[packIdx];
  const chosenOption = order[d] + 1;              // canonical 1–4
  const isCorrect = chosenOption === q.correct_option;
  const responseTimeMs = qStart ? Date.now() - qStart : null;

  if (isCorrect) packCorrect += 1;
  rolling.push(isCorrect);
  if (rolling.length > WINDOW) rolling.shift();
  answeredIds.push(q.id);
  adjustLevel();

  // Fire-and-forget for the base log; the optional meta_response tag (if the
  // learner picks one) updates the same row afterwards — see onMetaTag().
  logAttempt({ userId, questionId: q.id, chosenOption, isCorrect, responseTimeMs })
    .then(({ data }) => { lastAttemptId = data?.id ?? null; })
    .catch((err) => console.warn('sentenceCompletion.logAttempt failed:', err));

  // Find out whether there is anything worth offering. READ-ONLY — nothing
  // reaches the learner's practice queue until they press the button.
  if (!isCorrect) {
    getPushableWords(userId, {
      options: q.options,
      chosenOption,
      correctOption: q.correct_option,
      isCorrect,
    }).then(({ data }) => {
      if (!revealed || pack[packIdx] !== q) return;   // learner already moved on
      pushOffer = data || [];
      if (pushOffer.length) draw(root);
    });
  }

  draw(root);
}

let lastAttemptId = null; // set by the fire-and-forget insert above, used only by the optional meta tag

function adjustLevel() {
  if (rolling.length < MIN_WINDOW) return;
  const w = rolling.slice(-WINDOW);
  const acc = w.reduce((sum, ok) => sum + (ok ? 1 : 0), 0) / w.length;
  let next = level;
  if (acc >= 0.8) next = Math.min(LEVEL_MAX, level + 1);
  else if (acc <= 0.4) next = Math.max(LEVEL_MIN, level - 1);

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
  if (view === 'empty') { root.innerHTML = shell(`<div class="sp-card"><div class="sp-center">אין כרגע שאלות זמינות ברמה הזו.<br><span class="sp-empty-sub">התוכן בדרך — נשמח לראותך בקרוב.</span></div></div>`); return; }
  if (view === 'error') { root.innerHTML = shell(`<div class="sp-card"><div class="sp-center">אירעה תקלה בטעינת השאלות.<br><span class="sp-empty-sub">אפשר לנסות שוב מאוחר יותר.</span></div></div>`); return; }
  if (view === 'summary') { drawSummary(root); return; }
  drawQuestion(root);
}

function shell(inner) {
  const q = pack[packIdx];
  const showMeta = view === 'question' && q;
  return `<div class="sp-shell fade-in">
    <div class="sp-top">
      <a class="sp-brand" href="#/sentence-completion">← השלמת משפטים</a>
      <div class="sp-meta">
        ${focusLabel ? `<span class="sp-chip sp-focuschip">🎯 ${esc(focusLabel)}</span>` : ''}
        ${showMeta ? `<span class="sp-chip">רמה ${packLevel}</span>
        <span class="sp-chip">שאלה ${packIdx + 1} / ${pack.length}</span>` : ''}
        <a class="sp-chip sp-guide" href="#/sc-learn">📘 מדריך</a>
      </div>
    </div>
    ${inner}
    <div class="sp-foot"><a href="#/home">← דף הבית</a></div>
  </div>`;
}

function drawQuestion(root) {
  const q = pack[packIdx];

  const optsHtml = [0, 1, 2, 3].map((d) => {
    const canonN = order[d] + 1;
    let cls = '', tag = '';
    if (revealed) {
      if (canonN === q.correct_option) { cls = 'correct'; tag = '✓ נכון'; }
      else if (d === chosenDisplay) { cls = 'chosen-wrong'; tag = 'הבחירה שלך'; }
    }
    return `<button class="sp-opt ${cls}" data-d="${d}" ${revealed ? 'disabled' : ''}>
      <span class="sp-opt-en" dir="ltr">${esc(q.options[order[d]])}</span>
      ${tag ? `<span class="sp-opt-tag">${tag}</span>` : ''}
    </button>`;
  }).join('');

  const actions = revealed
    ? feedback(q)
    : (isHintVisible(q) ? `<button class="sp-hint" id="spHint">💡 רמז</button>` : '');

  root.innerHTML = shell(`
    <div class="sp-card">
      <div class="sp-stem" dir="ltr">${renderStem(q.stem)}</div>
      ${hintShown ? hintBox(q) : ''}
      <div class="sp-opts">${optsHtml}</div>
      <div class="sp-actions">${actions}</div>
    </div>
  `);

  if (!revealed) {
    root.querySelectorAll('.sp-opt').forEach((b) =>
      b.addEventListener('click', () => onChoose(root, Number(b.dataset.d))));
    root.querySelector('#spHint')?.addEventListener('click', () => {
      hintUsed = true;
      hintShown = true;
      draw(root);
    });
  } else {
    root.querySelector('#spFull')?.addEventListener('click', () => { showFull = !showFull; draw(root); });
    root.querySelector('#spNext')?.addEventListener('click', () => nextQuestion(root));
    root.querySelector('#spPush')?.addEventListener('click', () => onPushWords(root));
    root.querySelectorAll('.sp-meta-btn').forEach((b) =>
      b.addEventListener('click', () => onMetaTag(root, b.dataset.tag)));
    root.querySelector('#spMetaSkip')?.addEventListener('click', () => { metaTagged = true; draw(root); });
  }
}

function onMetaTag(root, tag) {
  metaTagged = true;
  if (lastAttemptId) {
    import('../supabase.js').then(({ supabase }) => {
      supabase.from('sc_attempts').update({ meta_response: tag }).eq('id', lastAttemptId)
        .then(({ error }) => { if (error) console.warn('sc_attempts meta_response update failed:', error); });
    });
  }
  draw(root);
}

/** The offer to add the missed words to the vocabulary queue. Renders nothing
 *  when there is nothing to offer, so a correct answer, a grammar-shaped item
 *  and an already-queued word all look the same to the learner: no button. */
function pushBox() {
  if (pushState === 'done') {
    return `<div class="sp-push sp-push-done">✓ נוסף לתרגול אוצר המילים שלך</div>`;
  }
  if (!pushOffer.length) return '';
  const words = pushOffer
    .map((w) => `<span class="sp-push-w" dir="ltr">${esc(w.headword)}</span>`)
    .join('');
  const label = pushOffer.length > 1 ? 'הוסף את שתי המילים לתרגול' : 'הוסף את המילה לתרגול';
  return `
    <div class="sp-push">
      <div class="sp-push-words">${words}</div>
      <button class="sp-link" id="spPush" ${pushState === 'saving' ? 'disabled' : ''}>
        ${pushState === 'saving' ? 'מוסיף…' : `➕ ${label}`}
      </button>
    </div>`;
}

async function onPushWords(root) {
  if (pushState !== 'idle' || !pushOffer.length) return;
  pushState = 'saving';
  draw(root);
  const { error } = await pushMissedWords(userId, pushOffer, { attemptId: lastAttemptId });
  if (error) {
    console.warn('srsPush.pushMissedWords failed:', error);
    pushState = 'idle';       // let the learner try again
  } else {
    pushState = 'done';
  }
  draw(root);
}

function hintBox(q) {
  const key = resolveKey(q.clue_code);
  const body = key ? `שים לב ל${esc(key.label)} — ${esc(key.cue)}` : esc(GENERIC_HINT);
  return `<div class="sp-hintbox">💡 ${body}</div>`;
}

function feedback(q) {
  const canonN = order[chosenDisplay] + 1;
  const isCorrect = canonN === q.correct_option;
  const key = resolveKey(q.clue_code);
  const defNote = isDefinitionMove(q.clue_code)
    ? '<span class="sp-def-note">(המשפט מגדיר את המילה החסרה במפורש)</span> '
    : '';

  let body;
  if (isCorrect) {
    body = `<div class="sp-expl sp-expl-good"><strong>✓ נכון.</strong> ${esc(q.explanations_he?.correct || '')}</div>`;
  } else {
    const why = q.explanations_he?.distractors?.[String(canonN)] || '';
    body = `<div class="sp-expl"><strong>מה קרה:</strong> ${esc(why)}</div>`;
    if (key) {
      body += `<div class="sp-expl sp-help">${defNote}<strong>🔍 ${esc(key.label)} —</strong> ${esc(key.cue)}</div>`;
    }
  }

  const last = packIdx >= pack.length - 1;
  return `
    ${body}
    ${!isCorrect ? pushBox() : ''}
    ${!isCorrect && !metaTagged ? metaPrompt() : ''}
    <button class="sp-link" id="spFull">${showFull ? 'הסתר הסבר לשאלה' : 'הסבר לשאלה ←'}</button>
    ${showFull ? fullExplanation(q) : ''}
    <button class="btn-primary sp-next" id="spNext">${last ? 'לסיכום המנה ←' : 'המשך ←'}</button>
  `;
}

// Optional, skippable, one-tap self-tag feeding sc_attempts.meta_response
// ('lexical' | 'strategic') — schema column exists for the Analyze split
// planned in SITEMAP §3. No pressure to answer: a plain "דלג" is right there.
function metaPrompt() {
  return `<div class="sp-metaq">
    <div class="sp-metaq-lbl">מה קרה כאן, בקצרה?</div>
    <div class="sp-metaq-btns">
      <button class="sp-meta-btn" data-tag="lexical">לא הכרתי מילה</button>
      <button class="sp-meta-btn" data-tag="strategic">הכרתי את המילים, טעיתי בגישה</button>
      <button class="sp-link" id="spMetaSkip">דלג</button>
    </div>
  </div>`;
}

function fullExplanation(q) {
  const rows = [`<div class="sp-fa-row sp-fa-correct">${esc(q.explanations_he?.correct || '')}</div>`];
  for (let n = 1; n <= 4; n++) {
    if (n === q.correct_option) continue;
    const txt = q.explanations_he?.distractors?.[String(n)];
    if (txt) rows.push(`<div class="sp-fa-row">${esc(txt)}</div>`);
  }
  return `<div class="sp-fa"><div class="sp-fa-intro">כל אופציה, ולמה היא לא מתאימה:</div>${rows.join('')}</div>`;
}

function drawSummary(root) {
  const total = pack.length;
  let levelMsg = '';
  if (level > packLevel) levelMsg = `<div class="sp-levelmsg up">עולים רמה! 🚀 המנה הבאה ברמה ${level}.</div>`;
  else if (level < packLevel) levelMsg = `<div class="sp-levelmsg down">בוא נתרגל עוד קצת ברמה הזו 💪 המנה הבאה ברמה ${level}.</div>`;

  root.innerHTML = shell(`
    <div class="sp-card sp-summary">
      <div class="sp-sum-title">סיכום מנה</div>
      <div class="sp-sum-score">${packCorrect} / ${total}</div>
      <div class="sp-sum-sub">${packCorrect} מתוך ${total} נכון במנה הזו.</div>
      <div class="sp-sum-total" id="spTotal"></div>
      ${levelMsg}
      <div class="sp-insight" id="spInsight" hidden></div>
      <div class="sp-nextstep">מה עכשיו?</div>
      <div class="sp-sum-btns">
        <button class="btn-primary" id="spMore">${focusLabel ? `עוד מנה ב${esc(focusLabel)} ←` : 'עוד מנה ←'}</button>
        <a class="sp-sum-alt" href="#/sc-learn">📘 חזור למדריך</a>
        <a class="sp-sum-alt" id="spToAnalyze" href="#/sc-analyze" hidden>מה כדאי לתרגל עכשיו ←</a>
        <button class="sp-link" id="spDone">סיום</button>
      </div>
    </div>
  `);
  root.querySelector('#spMore').addEventListener('click', () => loadPack(root));
  root.querySelector('#spDone').addEventListener('click', () => navigate('/home'));
  fillSummaryExtras(root);
}

async function fillSummaryExtras(root) {
  if (!userId) return;

  let lifetime = null, session = null;
  try {
    const [allTime, thisSession] = await Promise.all([
      getWeakPoints(userId),
      getWeakPoints(userId, { attemptLimit: answeredIds.length }),
    ]);
    lifetime = allTime.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
    session = thisSession.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
  } catch (err) {
    console.warn('sc-practice.summary failed:', err);
    return;
  }

  const totalBox = root.querySelector('#spTotal');
  if (totalBox && lifetime?.attempts) {
    totalBox.textContent = `סה"כ תרגלת ${lifetime.attempts} שאלות.`;
  }

  if (!session || session.status !== 'ok' || !session.points.length) return;
  const top = session.points[0];
  if (top.lift === null || top.lift < NOTABLE_LIFT) return;

  const box = root.querySelector('#spInsight');
  if (!box) return;
  box.innerHTML = `
    <div class="sp-insight-title">מה עלה בסשן הזה</div>
    <div class="sp-insight-body">
      <a class="sp-insight-key" href="#/sc-learn#sl-block-${top.id}">${esc(top.label)}</a>
      — נבחר ${top.misses} מתוך ${top.exposures} הפעמים שהופיע, יותר משאר הסוגים.
    </div>`;
  box.hidden = false;
  const toAnalyze = root.querySelector('#spToAnalyze');
  if (toAnalyze) toAnalyze.hidden = false;
}

// ─── Scoped styles (injected once; styles.css untouched) ─────────────────────
function ensureStyles() {
  if (document.getElementById('sp-practice-css')) return;
  const s = document.createElement('style');
  s.id = 'sp-practice-css';
  s.textContent = SP_CSS;
  document.head.appendChild(s);
}

const SP_CSS = `
.sp-shell{max-width:760px;margin:0 auto;padding:1.1rem 1rem 3rem;direction:rtl}
.sp-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:1rem}
.sp-brand{font-weight:800;color:var(--green-dark);text-decoration:none;font-size:.9rem}
.sp-meta{display:flex;gap:.4rem;flex-wrap:wrap}
.sp-chip{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.75rem;font-weight:700;color:var(--muted)}
.sp-focuschip{background:var(--purple-light);color:var(--purple);border-color:var(--purple-light);white-space:nowrap}
.sp-guide{color:var(--green-dark);text-decoration:none;white-space:nowrap}
.sp-guide:hover{border-color:var(--green)}
.sp-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem 1.5rem}
.sp-stem{font-size:1.1rem;line-height:1.7;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem 1.1rem;margin-bottom:1.1rem;text-align:left}
.sp-blank{font-weight:800;color:var(--green-dark);border-bottom:2px solid var(--green)}
.sp-hl{background:var(--yellow);border-radius:3px;padding:.02rem .15rem}
.sp-opts{display:flex;flex-wrap:wrap;gap:.55rem}
.sp-opt{flex:1 1 auto;min-width:7rem;display:flex;flex-direction:column;align-items:center;gap:.25rem;text-align:center;background:var(--card);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:.75rem .95rem;cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
.sp-opt:hover:not(:disabled){border-color:var(--green)}
.sp-opt:disabled{cursor:default}
.sp-opt-en{direction:ltr;font-size:1rem;font-weight:700;color:var(--text)}
.sp-opt-tag{font-size:.72rem;font-weight:800}
.sp-opt.correct{border-color:var(--green);background:var(--green-light)}
.sp-opt.correct .sp-opt-tag{color:var(--green-dark)}
.sp-opt.chosen-wrong{border-color:var(--muted);background:var(--bg)}
.sp-opt.chosen-wrong .sp-opt-tag{color:var(--muted)}
.sp-actions{margin-top:1rem}
.sp-hint{background:var(--purple-light);color:var(--purple);border:1px solid var(--purple-light);border-radius:999px;padding:.5rem 1.1rem;font-weight:700;font-size:.85rem;cursor:pointer}
.sp-hintbox{background:var(--purple-light);color:#4a3aa8;border-radius:var(--radius-sm);padding:.7rem .95rem;margin-bottom:1rem;font-size:.88rem;line-height:1.5}
.sp-expl{background:var(--bg);border-radius:var(--radius-sm);padding:.8rem 1rem;font-size:.9rem;line-height:1.6;margin-bottom:.7rem}
.sp-expl-good{background:var(--green-light)}
.sp-help{background:var(--blue-light)}
.sp-def-note{font-size:.78rem;color:var(--muted);font-weight:700}
.sp-link{background:none;border:none;color:var(--green-dark);font-weight:700;font-size:.83rem;cursor:pointer;padding:.3rem 0;text-decoration:underline}
.sp-push{background:var(--bg);border:1px dashed var(--border);border-radius:var(--radius-sm);padding:.7rem .9rem;margin-bottom:.7rem}
.sp-push-words{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.35rem}
.sp-push-w{font-family:var(--eng);font-size:.9rem;font-weight:600;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.1rem .45rem}
.sp-push-done{color:var(--green-dark);font-size:.85rem;font-weight:700;border-style:solid}
.sp-fa{display:flex;flex-direction:column;gap:.5rem;margin:.4rem 0 .8rem}
.sp-fa-intro{font-size:.8rem;color:var(--muted);font-weight:700;margin-bottom:.2rem}
.sp-fa-row{font-size:.85rem;line-height:1.55;background:var(--bg);border-radius:var(--radius-sm);padding:.6rem .8rem}
.sp-fa-correct{background:var(--green-light)}
.sp-next{margin-top:.6rem;width:100%}
.sp-foot{margin-top:1.4rem;text-align:center}
.sp-foot a{color:var(--muted);font-size:.82rem;text-decoration:none}
.sp-center{text-align:center;color:var(--muted);padding:2rem 1rem;line-height:1.8}
.sp-center a{color:var(--green-dark);text-decoration:none;font-weight:700}
.sp-empty-sub{font-size:.82rem;color:var(--muted)}
.sp-summary{text-align:center}
.sp-sum-title{font-size:.9rem;color:var(--muted);font-weight:700}
.sp-sum-score{font-size:2.4rem;font-weight:900;color:var(--green-dark);margin:.3rem 0}
.sp-sum-sub{font-size:.9rem;color:var(--text)}
.sp-levelmsg{margin-top:1rem;padding:.7rem 1rem;border-radius:var(--radius-sm);font-weight:700;font-size:.9rem}
.sp-levelmsg.up{background:var(--green-light);color:var(--green-dark)}
.sp-levelmsg.down{background:var(--orange-light);color:#b5551f}
.sp-insight{margin-top:1.2rem;background:var(--blue-light);border-radius:var(--radius-sm);padding:.9rem 1rem;text-align:right}
.sp-insight-title{font-size:.75rem;font-weight:800;color:var(--muted);margin-bottom:.35rem}
.sp-insight-body{font-size:.88rem;line-height:1.7}
.sp-insight-key{font-weight:800;color:var(--green-dark);text-decoration:underline}
.sp-sum-total{font-size:.85rem;color:var(--muted);margin-top:.35rem}
.sp-nextstep{margin-top:1.4rem;font-size:.8rem;font-weight:800;color:var(--muted)}
.sp-sum-alt{font-size:.85rem;font-weight:700;color:var(--green-dark);text-decoration:none;padding:.35rem 0}
.sp-sum-alt:hover{text-decoration:underline}
.sp-sum-btns{margin-top:.7rem;display:flex;flex-direction:column;gap:.5rem;align-items:center}
.sp-sum-btns .btn-primary{width:100%}
.sp-metaq{background:var(--bg);border-radius:var(--radius-sm);padding:.75rem .9rem;margin-bottom:.7rem}
.sp-metaq-lbl{font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:.5rem}
.sp-metaq-btns{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.sp-meta-btn{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.4rem .9rem;font-size:.8rem;font-weight:700;cursor:pointer}
.sp-meta-btn:hover{border-color:var(--green)}

@media (max-width:520px){
  .sp-card{padding:1.1rem 1rem}
  .sp-opts{flex-direction:column}
}
`;
