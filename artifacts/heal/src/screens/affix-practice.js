/**
 * src/screens/affix-practice.js — שכבת התרגול של פינת התחיליות והסופיות.
 *
 * מנות של 5, רמה מסתגלת סביב מרכז שנשמר (levels.data.js, module='affix'),
 * ורמז זמין עד שהתלמיד מוכיח שליטה — בדיוק כמו בשאר הפינות. מה שייחודי כאן
 * הוא ההסבר שאחרי: מוצג לא רק למה התשובה נכונה, אלא <b>הפירוק</b> של המילה
 * למרכיביה (decode_note_he). זה מה שמעביר את התלמיד מ"זכרתי" ל"פירקתי".
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { fetchAffixItems, logAffixAttempt } from '../data/affix.data.js';
import { getLevelCenter, saveLevelCenter, MODULE_LEVELS } from '../data/levels.data.js';
import { levelMix, driftCenter } from '../lib/levelMix.js';
import { familyInfo } from '../lib/affixKeys.js';
import { markPractising, rewardSession } from '../lib/reward.js';
import { attachKeyNav, KEY_HINT_HTML } from '../lib/keyNav.js';
import { AFFIX_LEARN_SEEN } from './affix-learn.js';
import { itemFeedbackHtml, wireItemFeedback } from '../lib/itemFeedback.js';
import { paceLine } from '../lib/pace.js';

const PACK = 5;
const CFG = MODULE_LEVELS.affix || { min: 2, max: 7, start: 4 };

let userId = null;
let pack = [];
let packIdx = 0;
let packCorrect = 0;
let center = CFG.start;
let revealed = false;
let picked = null;
let hintShown = false;
let qStart = 0;
let answeredIds = [];
let streakByFamily = {};
let detachKeys = null;
let packMs = 0;
let packTimed = 0;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function renderAffixPractice(root) {
  await renderLayout(root, '/affix');
  const el = getPageContent();
  ensureStyles();

  // מדריך לפני תרגול בפעם הראשונה — אותו דפוס כמו שאר הפינות.
  let seen = false;
  try { seen = localStorage.getItem(AFFIX_LEARN_SEEN) === 'true'; } catch (_) { seen = false; }
  if (!seen) { navigate('/affix-learn'); return; }

  const session = await getCurrentSession();
  userId = session?.user?.id ?? null;

  const lvl = await getLevelCenter(userId, 'affix');
  center = lvl.center;
  answeredIds = [];
  streakByFamily = {};

  await loadPack(el);
}

async function loadPack(el) {
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  const levels = levelMix(center, { min: CFG.min, max: CFG.max });
  const { data } = await fetchAffixItems({ limit: PACK, levels, excludeIds: answeredIds });

  if (!data.length) {
    el.innerHTML = `
      <div class="fade-in af-wrap">
        <section class="af-card af-center">
          תרגלת את כל מה שיש כרגע בפינה הזו. 🎉<br>
          <span class="af-sub">אנחנו מוסיפים פריטים חדשים כל הזמן — בינתיים אפשר להמשיך בפינה אחרת.</span>
          <div style="margin-top:1rem"><a class="btn-primary" href="#/home">לדף הבית ←</a></div>
        </section>
      </div>`;
    return;
  }

  pack = data;
  packIdx = 0;
  packCorrect = 0;
  packMs = 0; packTimed = 0;
  revealed = false;
  picked = null;
  hintShown = false;
  draw(el);
}

function draw(el) {
  const q = pack[packIdx];
  qStart = Date.now();
  const fam = familyInfo(q.family_code);

  const opts = (q.options || []).map((o, i) => {
    const correctIdx = (q.correct_option || 1) - 1;
    let cls = '';
    if (revealed) {
      if (i === correctIdx) cls = 'is-correct';
      else if (i === picked) cls = 'is-wrong';
      else cls = 'is-dim';
    }
    return `<button class="af-opt ${cls}" data-i="${i}" ${revealed ? 'disabled' : ''}>
      <span class="af-opt-n">${i + 1}</span>
      <span class="af-opt-t" dir="ltr">${esc(o)}</span>
    </button>`;
  }).join('');

  el.innerHTML = `
    <div class="fade-in af-wrap">
      <div class="af-head">
        <span class="af-prog">שאלה ${packIdx + 1} מתוך ${pack.length}</span>
        <a class="af-guide" href="#/affix-learn#al-block-${esc(q.family_code)}">📘 ${esc(fam.label)}</a>
      </div>

      <section class="af-card">
        <div class="af-stem" dir="ltr">${esc(q.stem)}</div>
        ${hintShown ? `<div class="af-hint-box">💡 ${esc(fam.hint)}</div>` : ''}
        <div class="af-opts">${opts}</div>
        ${revealed ? '' : KEY_HINT_HTML}
        ${!revealed && isHintVisible(q) ? `<button class="af-hint" id="afHint">💡 למה לשים לב</button>` : ''}
        ${revealed ? feedback(q) : ''}
      </section>

      ${revealed ? `<button class="btn-primary af-next" id="afNext">${
        packIdx === pack.length - 1 ? 'לסיכום המנה ←' : 'המשך ←'}</button>` : ''}

      <div class="af-foot"><a href="#/affix">← חזרה לפינה</a></div>
    </div>`;

  detachKeys?.();
  if (!revealed) {
    el.querySelectorAll('.af-opt').forEach((b) =>
      b.addEventListener('click', () => onChoose(el, Number(b.dataset.i))));
    el.querySelector('#afHint')?.addEventListener('click', () => { hintShown = true; draw(el); });
    detachKeys = attachKeyNav({
      options: (q.options || []).length,
      onPick: (i) => el.querySelectorAll('.af-opt')[i]?.click(),
    });
  } else {
    el.querySelector('#afNext').addEventListener('click', () => next(el));
    wireItemFeedback(el);
    detachKeys = attachKeyNav({ onNext: () => el.querySelector('#afNext')?.click() });
  }
}

/**
 * הרמז זמין כברירת מחדל, ונסגר רק אחרי שלוש תשובות נכונות ברצף באותה משפחה —
 * כלל השליטה (Mastery Hints). השליטה נמדדת פר-משפחה ולא באופן גורף, כי מי
 * שהבין שלילה לא בהכרח הבין סופיות של שם עצם.
 */
function isHintVisible(q) {
  return (streakByFamily[q.family_code] || 0) < 3;
}

function feedback(q) {
  const correctIdx = (q.correct_option || 1) - 1;
  const ok = picked === correctIdx;
  const expl = Array.isArray(q.explanations_he) ? q.explanations_he : [];
  return `
    <div class="af-fb ${ok ? 'is-ok' : 'is-no'}">
      <div class="af-fb-head">${ok ? '✓ נכון' : '✗ לא נכון'}</div>
      ${!ok && expl[picked] ? `<p><b>מה שבחרתם:</b> ${esc(expl[picked])}</p>` : ''}
      ${expl[correctIdx] ? `<p><b>התשובה הנכונה:</b> ${esc(expl[correctIdx])}</p>` : ''}
      ${q.decode_note_he ? `<p class="af-decode"><b>🔤 הפירוק:</b> ${esc(q.decode_note_he)}</p>` : ''}
      ${itemFeedbackHtml('affix', q.id)}
    </div>`;
}

function onChoose(el, i) {
  if (revealed) return;
  const q = pack[packIdx];
  const correctIdx = (q.correct_option || 1) - 1;
  const isCorrect = i === correctIdx;

  picked = i;
  revealed = true;
  if (isCorrect) packCorrect += 1;
  markPractising('affix');

  streakByFamily[q.family_code] = isCorrect ? (streakByFamily[q.family_code] || 0) + 1 : 0;
  answeredIds.push(q.id);

  const responseTimeMs = qStart ? Date.now() - qStart : null;
  if (responseTimeMs) { packMs += responseTimeMs; packTimed += 1; }

  logAffixAttempt({
    userId, itemId: q.id, chosenOption: i + 1, isCorrect,
    responseTimeMs,
    hintUsed: hintShown,
  }).catch(() => {});

  draw(el);
}

function next(el) {
  if (packIdx === pack.length - 1) { drawSummary(el); return; }
  packIdx += 1;
  revealed = false;
  picked = null;
  hintShown = false;
  draw(el);
}

function drawSummary(el) {
  const total = pack.length;
  rewardSession({ source: 'affix', correct: packCorrect, total, userId, badges: ['affix_first'] })
    .catch(() => {});

  // הרמה נעה על דיוק המנה, בלי להציג שום מספר ללומד.
  const next = driftCenter(center, packCorrect / total, { min: CFG.min, max: CFG.max });
  if (next !== center) { center = next; saveLevelCenter(userId, 'affix', next).catch(() => {}); }

  el.innerHTML = `
    <div class="fade-in af-wrap">
      <section class="af-card af-center">
        <div class="af-sum-title">סיכום מנה</div>
        <div class="af-sum-score">${packCorrect} / ${total}</div>
        ${paceLine('affix', packMs, packTimed)}
        <div class="af-sub">${packCorrect === total
          ? 'מנה מושלמת. הפירוק עובד.'
          : 'כל טעות כאן היא משפחה אחת שכדאי לחזור עליה במדריך.'}</div>
        <div class="af-sum-btns">
          <button class="btn-primary" id="afMore">עוד מנה ←</button>
          <a class="sg-guide" href="#/affix-learn">📘 חזרה למדריך</a>
          <a class="sg-guide" href="#/affix-analyze">📊 מה כדאי לתרגל</a>
          <button class="af-link" id="afDone">סיום</button>
        </div>
      </section>
    </div>`;

  el.querySelector('#afMore').addEventListener('click', () => loadPack(el));
  el.querySelector('#afDone').addEventListener('click', () => navigate('/home'));
}

function ensureStyles() {
  if (document.getElementById('affix-practice-styles')) return;
  const s = document.createElement('style');
  s.id = 'affix-practice-styles';
  s.textContent = `
.af-wrap{max-width:640px}
.af-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;font-size:.8rem}
.af-prog{color:var(--muted)}
.af-guide{color:var(--green-dark,#16412F);font-weight:700;text-decoration:none}
.af-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.15rem 1.1rem}
.af-center{text-align:center;line-height:1.8}
.af-stem{direction:ltr;text-align:left;font-size:1.02rem;line-height:1.75;margin-bottom:1rem}
.af-opts{display:flex;flex-direction:column;gap:.5rem}
.af-opt{display:flex;align-items:center;gap:.6rem;width:100%;text-align:start;background:var(--card);
  border:1.5px solid var(--border);border-radius:var(--radius-sm,10px);padding:.7rem .85rem;cursor:pointer;
  font:inherit;transition:border-color .15s,background .15s}
.af-opt:hover:not(:disabled){border-color:var(--green)}
.af-opt:disabled{cursor:default}
.af-opt-n{flex:none;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--bg,#F5F1E8);
  display:flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:800;color:var(--muted)}
.af-opt-t{direction:ltr;text-align:left;font-size:.96rem;font-weight:600}
.af-opt.is-correct{border-color:var(--green);background:var(--green-light)}
.af-opt.is-correct .af-opt-n{background:var(--green);color:#fff}
.af-opt.is-wrong{border-color:var(--red,#B4553E);background:#fbecea}
.af-opt.is-wrong .af-opt-n{background:var(--red,#B4553E);color:#fff}
.af-opt.is-dim{opacity:.5}
.af-hint{display:block;width:100%;margin-top:.8rem;padding:.6rem;border:1.5px dashed var(--gold,#B08442);
  border-radius:var(--radius-sm,10px);background:none;color:var(--gold,#B08442);font:inherit;font-weight:700;cursor:pointer}
.af-hint-box{margin-bottom:.8rem;padding:.65rem .85rem;border-radius:var(--radius-sm,10px);
  background:rgba(176,132,66,.1);font-size:.86rem;line-height:1.6}
.af-fb{margin-top:.9rem;padding:.85rem .95rem;border-radius:var(--radius-sm,10px);font-size:.88rem;line-height:1.7}
.af-fb.is-ok{background:var(--green-light)}
.af-fb.is-no{background:#fbecea}
.af-fb-head{font-weight:800;margin-bottom:.3rem}
.af-fb p{margin:.3rem 0}
.af-decode{margin-top:.5rem;padding-top:.5rem;border-top:1px dashed rgba(0,0,0,.14)}
.af-next{width:100%;margin-top:.9rem}
.af-sum-title{font-size:.8rem;color:var(--muted);font-weight:700}
.af-sum-score{font-size:2.6rem;font-weight:800;color:var(--green-dark,#16412F);margin:.2rem 0}
.af-sub{color:var(--muted);font-size:.88rem}
.af-sum-btns{display:flex;flex-direction:column;gap:.6rem;align-items:center;margin-top:1.1rem}
.af-sum-btns .btn-primary{width:100%}
.af-link{background:none;border:0;color:var(--muted);font:inherit;cursor:pointer;text-decoration:underline}
.af-foot{margin-top:1rem;text-align:center;font-size:.82rem}
.af-foot a{color:var(--muted)}
`;
  document.head.appendChild(s);
}
