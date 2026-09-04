/**
 * src/screens/word-wall.js — קיר המילים.
 *
 * ליאון (3.9): "לגבי התקדמות בעיניים אני בעד."
 *
 * מספר אומר "47 מתוך 550". קיר מראה את זה: 550 משבצות, כל אחת מילה, וכל אחת
 * מקבלת צבע לפי מצב הזיכרון. מה שקורה פסיכולוגית זה שהתלמיד רואה כמה *נשאר*
 * ולא רק כמה עשה, ושהריבועים הירוקים מצטברים לכתם שגדל — סוג ההתקדמות שאי
 * אפשר להרגיש מפס אחוזים.
 *
 * ההבדל מהמתחרה: אצלם מפת החום צבועה לפי "מדד הופעה במבחנים", שהוא בפועל
 * ספירת תדירות נאיבית — המילים ה"חמות" שם הן According to, Answer, Explain,
 * כלומר מילות ההוראות של המבחן. כאן הסדר הוא impact_score, והצבע הוא מצב
 * הידיעה של התלמיד עצמו. שני הצירים אומרים משהו אמיתי.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getWordWall } from '../data/words.data.js';
import { getLearnerState } from '../data/srs.data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let filter = 'all';

export async function renderWordWall(root) {
  await renderLayout(root, '/flashcards');
  const el = getPageContent();
  ensureStyles();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  const { data } = await getWordWall(userId);
  const { isPremium } = await getLearnerState(userId);

  if (!data || !data.words.length) {
    el.innerHTML = `<div class="fade-in" style="max-width:640px">
      <div class="page-title">קיר המילים</div>
      <p class="ww-empty">לא הצלחנו לטעון את המילים כרגע. אפשר לנסות שוב עוד רגע.</p>
    </div>`;
    return;
  }

  const { words, counts } = data;
  const pct = counts.total ? Math.round((counts.known / counts.total) * 100) : 0;

  // הקיר מציג את כל מילות הליבה, גם אלה שהמסלול החינמי עוד לא מגיע אליהן.
  // בלי המשפט הזה המונה מבטיח לתלמיד חינמי טווח שאינו פתוח לו — בדיוק
  // הפער שסרגל ההתקדמות כבר מסמן כנעול (coverage.data.js).
  const lockedNote = isPremium
    ? ''
    : '<div class="ww-locked">חלק מהמילים כאן נפתחות לתרגול בגרסה המלאה. לעיון הן פתוחות לכולם במילון.</div>';

  const drawWall = () => {
    const shown = words.filter((w) => filter === 'all' || w.state === filter);
    return shown.map((w) => `
      <span class="ww-cell ww-${w.state}" tabindex="0"
            title="${esc(w.word)} — ${esc(w.he || '')}"
            aria-label="${esc(w.word)}, ${esc(stateLabel(w.state))}">${esc(w.word)}</span>`).join('');
  };

  el.innerHTML = `
    <div class="fade-in" style="max-width:820px">
      <div class="page-title">קיר המילים</div>
      <div class="page-sub">כל מילות הליבה של הבחינה, לפי סדר החשיבות — וכמה מהן כבר שלך</div>

      <div class="ww-top">
        <div class="ww-big">${counts.known}<span> / ${counts.total}</span></div>
        <div class="ww-bar"><i style="width:${Math.max(1, pct)}%"></i></div>
        <div class="ww-sub">${pct}% מהמילים כבר בזיכרון לטווח ארוך</div>
        ${lockedNote}
      </div>

      <div class="ww-legend">
        <button class="ww-fchip ${filter === 'all' ? 'is-on' : ''}" data-f="all">הכול · ${counts.total}</button>
        <button class="ww-fchip ${filter === 'known' ? 'is-on' : ''}" data-f="known"><i class="ww-dot ww-known"></i> יודע · ${counts.known}</button>
        <button class="ww-fchip ${filter === 'learning' ? 'is-on' : ''}" data-f="learning"><i class="ww-dot ww-learning"></i> בלמידה · ${counts.learning}</button>
        <button class="ww-fchip ${filter === 'fresh' ? 'is-on' : ''}" data-f="fresh"><i class="ww-dot ww-fresh"></i> טרם · ${counts.fresh}</button>
      </div>

      <div class="ww-grid" id="wwGrid">${drawWall()}</div>

      <div class="ww-cta">
        <button class="btn-primary" id="wwPractice">לתרגל את המילים הבאות ←</button>
        <a class="sg-guide" href="#/dictionary">📖 למילון המלא</a>
      </div>
      <p class="ww-note">הסדר הוא לפי מידת ההשפעה של המילה על הציון, לא לפי א־ב.
        המילים הראשונות בקיר הן אלה שחוזרות הכי הרבה בבחינה.</p>
    </div>`;

  el.querySelectorAll('.ww-fchip').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.f;
    el.querySelectorAll('.ww-fchip').forEach((x) => x.classList.toggle('is-on', x.dataset.f === filter));
    el.querySelector('#wwGrid').innerHTML = drawWall();
  }));
  el.querySelector('#wwPractice').addEventListener('click', () => navigate('/card'));
}

function stateLabel(s) {
  return s === 'known' ? 'יודע' : s === 'learning' ? 'בלמידה' : 'טרם נלמדה';
}

function ensureStyles() {
  if (document.getElementById('ww-styles')) return;
  const s = document.createElement('style');
  s.id = 'ww-styles';
  s.textContent = `
.ww-top{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.1rem;margin-bottom:1rem}
.ww-big{font-size:2.2rem;font-weight:800;color:var(--green-dark,#16412F);line-height:1.1}
.ww-big span{font-size:1rem;color:var(--muted);font-weight:700}
.ww-bar{height:9px;background:var(--green-light,#e8f0ea);border-radius:99px;overflow:hidden;margin:.55rem 0 .35rem}
.ww-bar i{display:block;height:100%;background:var(--green,#1F5C43);transition:width .5s ease}
.ww-sub{font-size:.82rem;color:var(--muted)}
.ww-locked{margin-top:.5rem;font-size:.78rem;color:var(--muted);line-height:1.5}
.ww-legend{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem}
.ww-fchip{display:flex;align-items:center;gap:.35rem;background:var(--card);border:1.5px solid var(--border);
  border-radius:99px;padding:.3rem .75rem;font:inherit;font-size:.78rem;cursor:pointer;color:var(--muted)}
.ww-fchip.is-on{border-color:var(--green);color:var(--green-dark);font-weight:700}
.ww-dot{width:.6rem;height:.6rem;border-radius:50%;display:inline-block}
.ww-grid{display:flex;flex-wrap:wrap;gap:3px;max-height:60vh;overflow-y:auto;padding:.5rem;
  background:var(--card);border:1px solid var(--border);border-radius:var(--radius)}
.ww-cell{direction:ltr;font-size:.68rem;line-height:1;padding:.28rem .4rem;border-radius:4px;
  white-space:nowrap;cursor:default;border:1px solid transparent}
.ww-cell:focus-visible{outline:2px solid var(--green-dark);outline-offset:1px}
.ww-known,.ww-dot.ww-known{background:var(--green,#1F5C43);color:#fff}
.ww-learning,.ww-dot.ww-learning{background:var(--gold,#B08442);color:#fff}
.ww-fresh,.ww-dot.ww-fresh{background:#e9e5db;color:#6b7280}
.ww-cta{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin-top:1rem}
.ww-note{font-size:.78rem;color:var(--muted);line-height:1.6;margin-top:.7rem}
.ww-empty{color:var(--muted);line-height:1.8}
@media(max-width:640px){.ww-cell{font-size:.62rem}}
`;
  document.head.appendChild(s);
}
