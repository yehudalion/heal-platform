/**
 * src/screens/vocab-sprint.js — ספרינט מילים: 60 שניות, כמה שיותר.
 *
 * למה מצב מהיר בכלל, כשיש כבר לולאת SRS: הן עונות על שני צרכים שונים.
 * ה-SRS בונה זיכרון לטווח ארוך ודורש סבלנות; הספרינט הוא הדבר שתלמיד פותח
 * בתור לאוטובוס. הוא לא מחליף את התרגול — הוא מייצר את ההרגל שמחזיר אליו.
 *
 * ── מה נלקח מהמתחרה ומה לא ────────────────────────────────────────────────────
 * הפורמט (60 שניות, קומבו, סקירה בסוף) עובד אצלם והוא נלקח. מה שלא נלקח:
 *   · אצלם טעות מורידה ניקוד ומקצרת זמן. כאן טעות עולה רק את הזמן שלקח לענות —
 *     אין ענישה, בהתאם לכלל הרווחה.
 *   · אצלם יש טבלת שיאים ארצית. כאן השיא הוא מול עצמך בלבד, בזיכרון המכשיר.
 *
 * ⚠️ המילים שפוספסו **מוצעות** להוספה לתרגול ולא נוספות אוטומטית — הכלל
 * מ-srsPush.data.js: רשימת התרגול של הלומד היא שלו, והיא לא גדלה בשקט בכל
 * פעם שהוא נופל.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getWordsByImpact } from '../data/words.data.js';
import { pushMissedWords } from '../data/srsPush.data.js';
import { getLearnerState } from '../data/srs.data.js';
import { markPractising, rewardSession } from '../lib/reward.js';
import { attachKeyNav } from '../lib/keyNav.js';

const DURATION = 60;
const BEST_KEY = 'hs:sprint:best';
// סשן שבת 5 (5.9.2026), פריט 33 — ספרינט הפוך, עברית → אנגלית. הכרעת יהודה:
// "מיומנות שונה: שליפה ולא זיהוי — זה מה שהשלמת משפטים דורשת." אותו מאגר,
// אותם מסיחים; רק כיוון השאלה מתהפך. השיא נשמר בנפרד לכל כיוון (זה משחק אחר).
// מצב Zen (בלי שעון) לא נבנה — הכרעת יהודה: הספרינט ממילא לא מעניש.
const DIR_KEY = 'hs:sprint:dir';           // 'en2he' | 'he2en'
const BEST_KEY_REV = 'hs:sprint:best:he2en';

let S = null;
let detachKeys = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function renderVocabSprint(root) {
  await renderLayout(root, '/flashcards');
  const el = getPageContent();
  ensureStyles();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  // המסלול נקרא מהפרופיל ולא נקבע קשיח: עד 4.9.2026 עמד כאן isPremium: true,
  // והספרינט חילק לכל תלמיד חינמי גם את המילים שמעבר לתקרה החינמית.
  const { isPremium } = await getLearnerState(userId);
  const { data: words } = await getWordsByImpact({ limit: 300, isPremium });
  // עמודות הטבלה הן headword ו-definition_he. עד 4.9.2026 סוננו כאן
  // w.word ו-w.translation_he, שמות שלא קיימים בסכימה — הסינון החזיר
  // רשימה ריקה תמיד, והספרינט מעולם לא הציג שאלה אחת.
  const pool = (words || []).filter((w) => w.headword && w.definition_he);
  if (pool.length < 8) {
    el.innerHTML = `<div class="fade-in" style="max-width:600px">
      <div class="page-title">ספרינט מילים</div>
      <p class="vs-empty">אין מספיק מילים במאגר כרגע כדי להריץ ספרינט.</p>
    </div>`;
    return;
  }

  S = { userId, pool, el, idx: 0, score: 0, streak: 0, best: 0, missed: [], seen: [],
        left: DURATION, tick: null, q: null, dir: 'en2he' };
  try { S.dir = localStorage.getItem(DIR_KEY) === 'he2en' ? 'he2en' : 'en2he'; } catch (_) { S.dir = 'en2he'; }
  loadBest();

  drawIntro();
}

function loadBest() {
  try { S.best = Number(localStorage.getItem(S.dir === 'he2en' ? BEST_KEY_REV : BEST_KEY) || 0) || 0; } catch (_) { S.best = 0; }
}

function drawIntro() {
  const rev = S.dir === 'he2en';
  S.el.innerHTML = `
    <div class="fade-in" style="max-width:600px">
      <div class="page-title">ספרינט מילים</div>
      <div class="page-sub">דקה אחת. כמה מילים תזהו?</div>
      <section class="vs-card vs-center">
        <div class="vs-intro-ico">⚡</div>
        <div class="vs-dir" role="group" aria-label="כיוון">
          <button type="button" class="vs-dir-btn${rev ? '' : ' on'}" data-dir="en2he">אנגלית → עברית</button>
          <button type="button" class="vs-dir-btn${rev ? ' on' : ''}" data-dir="he2en">עברית → אנגלית</button>
        </div>
        <p class="vs-lead">${rev
          ? 'מוצג פירוש בעברית וארבע מילים באנגלית. בוחרים את המילה הנכונה — זו שליפה מהראש, בדיוק מה שהשלמת משפטים דורשת.'
          : 'מוצגת מילה באנגלית וארבעה פירושים. בוחרים את הנכון, וממשיכים.'}
          <b>טעות לא מורידה ניקוד</b> — היא רק לוקחת זמן.</p>
        <p class="vs-lead vs-soft">בסוף תקבלו את רשימת המילים שפספסתם, ותוכלו
          להוסיף אותן לתרגול אם תרצו.</p>
        ${S.best ? `<div class="vs-best">השיא שלך: <b>${S.best}</b></div>` : ''}
        <button class="btn-primary" id="vsStart" style="width:100%;margin-top:1rem">מתחילים ←</button>
        <div style="margin-top:.7rem"><a class="sg-guide" href="#/flashcards">← חזרה לפינה</a></div>
      </section>
    </div>`;
  S.el.querySelector('#vsStart').addEventListener('click', start);
  S.el.querySelectorAll('.vs-dir-btn').forEach((b) => b.addEventListener('click', () => {
    S.dir = b.dataset.dir === 'he2en' ? 'he2en' : 'en2he';
    try { localStorage.setItem(DIR_KEY, S.dir); } catch (_) { /* מצב פרטי */ }
    loadBest();
    drawIntro();
  }));
}

function start() {
  S.left = DURATION; S.score = 0; S.streak = 0; S.missed = []; S.seen = [];
  S.tick = setInterval(() => {
    S.left -= 1;
    const t = document.getElementById('vsClock');
    if (t) { t.textContent = S.left; t.classList.toggle('is-low', S.left <= 10); }
    const bar = document.getElementById('vsBar');
    if (bar) bar.style.width = `${(S.left / DURATION) * 100}%`;
    if (S.left <= 0) finish();
  }, 1000);
  nextQuestion();
}

/** בונה שאלה: המילה, הפירוש הנכון, ושלושה פירושים של מילים אחרות. */
function nextQuestion() {
  const pool = S.pool;
  const w = pool[Math.floor(Math.random() * pool.length)];
  const others = [];
  const guard = new Set([w.id]);
  while (others.length < 3 && guard.size < pool.length) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (guard.has(c.id)) continue;
    guard.add(c.id);
    others.push(c);
  }
  const rev = S.dir === 'he2en';
  const pick = (x) => (rev ? x.headword : x.definition_he);
  const options = [pick(w), ...others.map(pick)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  S.q = { w, options, correct: options.indexOf(pick(w)), rev };
  drawQuestion();
}

function drawQuestion() {
  const { w, options, rev } = S.q;
  S.el.innerHTML = `
    <div class="fade-in" style="max-width:600px">
      <div class="vs-hud">
        <span class="vs-clock" id="vsClock">${S.left}</span>
        <span class="vs-score">${S.score}</span>
        ${S.streak >= 3 ? `<span class="vs-combo">🔥 ${S.streak} ברצף</span>` : '<span></span>'}
      </div>
      <div class="vs-track"><i id="vsBar" style="width:${(S.left / DURATION) * 100}%"></i></div>

      <section class="vs-card vs-center">
        <div class="vs-word" dir="${rev ? 'rtl' : 'ltr'}">${esc(rev ? w.definition_he : w.headword)}</div>
        <div class="vs-opts">
          ${options.map((o, i) => `<button class="vs-opt" data-i="${i}" ${rev ? 'dir="ltr"' : ''}>${esc(o)}</button>`).join('')}
        </div>
      </section>
    </div>`;

  S.el.querySelectorAll('.vs-opt').forEach((b) =>
    b.addEventListener('click', () => answer(Number(b.dataset.i))));
  detachKeys?.();
  detachKeys = attachKeyNav({
    options: options.length,
    onPick: (i) => S.el.querySelectorAll('.vs-opt')[i]?.click(),
  });
}

function answer(i) {
  const { w, correct } = S.q;
  const ok = i === correct;
  markPractising('vocab');
  S.seen.push(w.id);

  if (ok) { S.score += 1; S.streak += 1; }
  else { S.streak = 0; if (!S.missed.some((m) => m.id === w.id)) S.missed.push(w); }

  // משוב חטוף של 350ms — מספיק כדי לראות, לא מספיק כדי לשבור את הקצב.
  const btns = S.el.querySelectorAll('.vs-opt');
  btns.forEach((b, k) => {
    b.disabled = true;
    if (k === correct) b.classList.add('is-correct');
    else if (k === i) b.classList.add('is-wrong');
  });
  setTimeout(() => { if (S.left > 0) nextQuestion(); }, 350);
}

function finish() {
  clearInterval(S.tick);
  detachKeys?.();
  const isRecord = S.score > S.best;
  if (isRecord) {
    S.best = S.score;
    try { localStorage.setItem(S.dir === 'he2en' ? BEST_KEY_REV : BEST_KEY, String(S.score)); } catch (_) { /* מצב פרטי */ }
  }

  rewardSession({
    source: 'vocab_sprint', correct: S.score, total: S.score + S.missed.length, userId: S.userId,
  }).catch(() => {});

  const missedHtml = S.missed.length
    ? `<div class="vs-missed">
         <div class="vs-missed-t">המילים שפספסת</div>
         ${S.missed.map((m) => `<div class="vs-mrow">
            <span dir="ltr">${esc(m.headword)}</span><span>${esc(m.definition_he)}</span>
         </div>`).join('')}
         ${S.userId ? `<button class="vs-add" id="vsAdd">להוסיף את ${S.missed.length} המילים לתרגול שלי</button>` : ''}
         <div class="vs-msg" id="vsMsg"></div>
       </div>`
    : `<p class="vs-lead">לא פספסת אף מילה. 👑</p>`;

  S.el.innerHTML = `
    <div class="fade-in" style="max-width:600px">
      <div class="page-title">סיום הספרינט</div>
      <section class="vs-card vs-center">
        <div class="vs-final">${S.score}</div>
        <div class="vs-sub">${isRecord ? '🎉 שיא אישי חדש!' : `השיא שלך: ${S.best}`}</div>
        <div class="vs-btns">
          <button class="btn-primary" id="vsAgain">עוד סיבוב ←</button>
          <a class="sg-guide" href="#/word-wall">🧱 לקיר המילים</a>
          <a class="sg-guide" href="#/flashcards">← חזרה לפינה</a>
        </div>
      </section>
      ${missedHtml}
    </div>`;

  S.el.querySelector('#vsAgain').addEventListener('click', start);
  S.el.querySelector('#vsAdd')?.addEventListener('click', async (e) => {
    const msg = S.el.querySelector('#vsMsg');
    e.target.disabled = true;
    msg.textContent = 'מוסיף…';
    // חתימת pushMissedWords: { wordId, headword, source } — לא { id, word }.
    const res = await pushMissedWords(
      S.userId,
      S.missed.map((m) => ({ wordId: m.id, headword: m.headword, source: 'vocab_sprint' })),
    );
    msg.textContent = res?.error
      ? 'ההוספה נכשלה — אפשר לנסות שוב.'
      : 'נוספו לתרגול שלך ✓ הן יופיעו במנה הקרובה.';
  });
}

function ensureStyles() {
  if (document.getElementById('vs-styles')) return;
  const s = document.createElement('style');
  s.id = 'vs-styles';
  s.textContent = `
.vs-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.3rem 1.2rem}
.vs-center{text-align:center}
.vs-intro-ico{font-size:2.2rem}
.vs-lead{font-size:.92rem;line-height:1.75;color:var(--text);margin:.7rem 0 0}
.vs-soft{color:var(--muted);font-size:.85rem}
.vs-best{margin-top:.8rem;font-size:.85rem;color:var(--muted)}
.vs-dir{display:flex;gap:.4rem;justify-content:center;margin:.6rem 0 .2rem}
.vs-dir-btn{padding:.35rem .8rem;border:1.5px solid var(--border);border-radius:99px;background:var(--card);font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}
.vs-dir-btn.on{background:var(--green-dark,#16412F);color:#fff;border-color:var(--green-dark,#16412F)}
.vs-hud{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
.vs-clock{font-size:1.6rem;font-weight:800;font-variant-numeric:tabular-nums;color:var(--green-dark,#16412F)}
.vs-clock.is-low{color:var(--red,#B4553E)}
.vs-score{font-size:1.6rem;font-weight:800;color:var(--gold,#B08442)}
.vs-combo{font-size:.8rem;font-weight:700;color:var(--gold,#B08442)}
.vs-track{height:5px;background:var(--green-light,#e8f0ea);border-radius:99px;overflow:hidden;margin-bottom:1rem}
.vs-track i{display:block;height:100%;background:var(--green,#1F5C43);transition:width 1s linear}
.vs-word{direction:ltr;font-family:var(--font-serif,Georgia,serif);font-size:2.4rem;font-weight:700;
  color:var(--green-dark,#16412F);margin:.4rem 0 1.2rem}
.vs-opts{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
.vs-opt{background:var(--card);border:1.5px solid var(--border);border-radius:var(--radius-sm,10px);
  padding:.75rem .6rem;font:inherit;font-size:.9rem;cursor:pointer;transition:border-color .12s,background .12s}
.vs-opt:hover:not(:disabled){border-color:var(--green)}
.vs-opt.is-correct{background:var(--green-light);border-color:var(--green)}
.vs-opt.is-wrong{background:#fbecea;border-color:var(--red,#B4553E)}
.vs-final{font-size:3.4rem;font-weight:800;color:var(--green-dark,#16412F);line-height:1}
.vs-sub{color:var(--muted);font-size:.9rem;margin-top:.2rem}
.vs-btns{display:flex;flex-direction:column;gap:.6rem;align-items:center;margin-top:1.1rem}
.vs-btns .btn-primary{width:100%}
.vs-missed{margin-top:1rem;background:var(--card);border:1px solid var(--border);
  border-radius:var(--radius);padding:1rem}
.vs-missed-t{font-weight:800;font-size:.9rem;margin-bottom:.5rem}
.vs-mrow{display:flex;justify-content:space-between;gap:1rem;font-size:.86rem;padding:.35rem 0;
  border-top:1px solid var(--border)}
.vs-mrow:first-of-type{border-top:0}
.vs-add{width:100%;margin-top:.8rem;padding:.6rem;border:1.5px dashed var(--green,#1F5C43);background:none;
  border-radius:var(--radius-sm,10px);color:var(--green-dark,#16412F);font:inherit;font-weight:700;cursor:pointer}
.vs-add:disabled{opacity:.55;cursor:default}
.vs-msg{margin-top:.5rem;font-size:.82rem;color:var(--muted);min-height:1.1em}
.vs-empty{color:var(--muted);line-height:1.8}
@media(max-width:480px){.vs-opts{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}
