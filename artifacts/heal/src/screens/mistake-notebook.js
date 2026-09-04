import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';
import { navigate } from '../router.js';
import { playClip } from '../lib/sound.js';
import {
  getRephraseMistakes, getScMistakes, getListeningMistakes,
  getMistakeMarks, markMistakeResolved, unmarkMistakeResolved,
} from '../data/mistakeNotebook.data.js';

// Mistake Notebook (מוצר/UX chat, 2026-08-29 — BACKLOG_next.md #14).
// Zero new content: every mistake shown here is ALREADY fully explained in the
// DB (restatement_attempts/sc_attempts/listening_question_responses + their
// question tables) — this screen just surfaces the most recent wrong attempt
// per question, across the three practice modules, in one place. Free for
// everyone, no tier gate. "אין מלכודות יש מפתחות": framing stays positive
// throughout — this is a study tool, not a list of failures.

const MODULES = [
  { id: 'rephrase',  label: 'ניסוח מחדש',      practiceRoute: '/rephrase-practice', fetcher: getRephraseMistakes },
  { id: 'sc',        label: 'השלמת משפטים',    practiceRoute: '/sc-practice',       fetcher: getScMistakes },
  { id: 'listening', label: 'האזנה',           practiceRoute: '/listening',         fetcher: getListeningMistakes },
];

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// הקראה דרך lib/sound.js: עוצרת את הקודמת, ונעצרת בכל ניווט.
function playAudio(url) { playClip(url); }

function mistakeRow(m, isResolved) {
  const keyChip = m.keyLabel ? `<span class="mn-key-chip">${escapeHtml(m.keyLabel)}</span>` : '';
  return `
  <div class="mn-row${isResolved ? ' mn-row--resolved' : ''}" data-qid="${m.questionId}" data-module="${m.module}">
    <button type="button" class="mn-row-head" data-toggle aria-expanded="false">
      <span class="mn-head-main">
        <span class="mn-prompt">${escapeHtml(m.prompt)}</span>
        ${keyChip}
      </span>
      <span class="mn-chev">▾</span>
    </button>
    <div class="mn-row-body">
      <div class="mn-block mn-block--wrong">
        <div class="mn-block-lbl">מה שנבחר</div>
        <p class="mn-block-text">${escapeHtml(m.wrongText)}</p>
        ${m.wrongExplanation ? `<p class="mn-block-expl">${escapeHtml(m.wrongExplanation)}</p>` : ''}
      </div>
      <div class="mn-block mn-block--right">
        <div class="mn-block-lbl">התשובה הנכונה</div>
        <p class="mn-block-text">${escapeHtml(m.correctText)}</p>
        ${m.correctExplanation ? `<p class="mn-block-expl">${escapeHtml(m.correctExplanation)}</p>` : ''}
      </div>
      <div class="mn-actions">
        ${m.extra?.audioUrl ? `<button type="button" class="mn-audio-btn" data-audio="${m.extra.audioUrl}">🔊 השמיעו את הקטע שוב</button>` : ''}
        <button type="button" class="mn-mark-btn${isResolved ? ' is-on' : ''}" data-mark>
          ${isResolved ? '✓ סומן כתוקן' : 'סמנו כתוקן'}
        </button>
      </div>
    </div>
  </div>`;
}

export async function renderMistakeNotebook(root) {
  await renderLayout(root, '/mistake-notebook');
  ensureStyles();
  const el = getPageContent();

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  el.innerHTML = `
    <div class="fade-in mn-wrap">
      <div class="page-title">מחברת טעויות</div>
      <div class="page-sub">מפתחות לתרגול חוזר — כל שאלה שפספסתם, עם ההסבר וההזדמנות לתרגל שוב.</div>
      ${!userId ? `<p class="mn-empty">התחברו כדי לראות את מחברת הטעויות האישית שלכם.</p>` : `
        <div class="mn-tabs" id="mnTabs"></div>
        <label class="mn-toggle">
          <input type="checkbox" id="mnShowResolved">
          הצגת פריטים שסומנו כתוקנו
        </label>
        <div id="mnList" class="mn-list"></div>
      `}
    </div>`;

  if (!userId) return;

  const tabsEl = el.querySelector('#mnTabs');
  tabsEl.innerHTML = MODULES.map((m, i) =>
    `<button type="button" class="mn-tab${i === 0 ? ' active' : ''}" data-module="${m.id}">${m.label}</button>`
  ).join('');

  const marksRes = await getMistakeMarks(userId);
  let marks = marksRes.data; // Set of "module:questionId"

  const cache = {}; // module -> mistakes array
  let activeModule = MODULES[0].id;
  let showResolved = false;

  async function loadModule(moduleId) {
    if (!cache[moduleId]) {
      const mod = MODULES.find(m => m.id === moduleId);
      const { data } = await mod.fetcher(userId, { limit: 40 });
      cache[moduleId] = data;
    }
    return cache[moduleId];
  }

  async function renderList() {
    const listEl = el.querySelector('#mnList');
    listEl.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
    const mistakes = await loadModule(activeModule);
    const mod = MODULES.find(m => m.id === activeModule);

    const visible = mistakes.filter(m => showResolved || !marks.has(`${m.module}:${m.questionId}`));

    if (visible.length === 0) {
      listEl.innerHTML = `
        <div class="mn-empty-block">
          <p class="mn-empty">${mistakes.length === 0
            ? 'אין כאן כרגע טעויות פתוחות — או שעדיין לא תרגלתם את המודול הזה, או שכל הכבוד, אין מה לתקן.'
            : 'כל הפריטים כאן סומנו כתוקנו. אפשר לסמן את התיבה למעלה כדי לראות אותם שוב.'}</p>
          <button type="button" class="btn-primary" data-goto-practice>המשיכו לתרגול</button>
        </div>`;
      listEl.querySelector('[data-goto-practice]')?.addEventListener('click', () => navigate(mod.practiceRoute));
      return;
    }

    listEl.innerHTML = visible.map(m => mistakeRow(m, marks.has(`${m.module}:${m.questionId}`))).join('');
    wireRows(listEl);
  }

  function wireRows(scopeEl) {
    scopeEl.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.mn-row');
        const open = row.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    scopeEl.querySelectorAll('[data-audio]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); playAudio(btn.dataset.audio); });
    });
    scopeEl.querySelectorAll('[data-mark]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('.mn-row');
        const qid = row.dataset.qid;
        const mod = row.dataset.module;
        const key = `${mod}:${qid}`;
        const currentlyMarked = marks.has(key);
        btn.disabled = true;
        if (currentlyMarked) {
          await unmarkMistakeResolved(userId, mod, qid);
          marks.delete(key);
        } else {
          await markMistakeResolved(userId, mod, qid);
          marks.add(key);
        }
        btn.disabled = false;
        renderList();
      });
    });
  }

  tabsEl.querySelectorAll('.mn-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.module === activeModule) return;
      tabsEl.querySelector('.mn-tab.active')?.classList.remove('active');
      btn.classList.add('active');
      activeModule = btn.dataset.module;
      renderList();
    });
  });

  el.querySelector('#mnShowResolved').addEventListener('change', (e) => {
    showResolved = e.target.checked;
    renderList();
  });

  renderList();
}

function ensureStyles() {
  if (document.getElementById('mn-css')) return;
  const s = document.createElement('style');
  s.id = 'mn-css';
  s.textContent = `
.mn-wrap { max-width: 760px; }
.mn-tabs { display:flex; gap:.5rem; margin:1rem 0 .8rem; flex-wrap:wrap; }
.mn-tab { border:1.5px solid var(--border); background:var(--card); border-radius:999px; padding:.5rem 1.1rem;
  font-family:inherit; font-size:.85rem; font-weight:700; cursor:pointer; color:var(--text); }
.mn-tab.active { background:var(--green); border-color:var(--green); color:#fff; }
.mn-toggle { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--muted); margin-bottom:1rem; cursor:pointer; }
.mn-list { display:flex; flex-direction:column; gap:.6rem; min-height:80px; }
.mn-row { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
.mn-row--resolved { opacity:.6; }
.mn-row-head { display:flex; align-items:center; gap:.8rem; width:100%; padding:.9rem 1.1rem;
  background:none; border:none; cursor:pointer; text-align:right; font:inherit; color:inherit; }
.mn-head-main { flex:1; display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
.mn-prompt { font-size:.92rem; font-weight:600; color:var(--text); }
.mn-key-chip { font-size:.7rem; font-weight:700; color:var(--green-dark); background:var(--green-light);
  border-radius:999px; padding:.15rem .6rem; white-space:nowrap; }
.mn-chev { flex:0 0 auto; font-size:.8rem; color:var(--muted); transition:transform .2s ease; }
.mn-row.open .mn-chev { transform:rotate(180deg); }
.mn-row-body { display:none; padding:0 1.1rem 1.1rem; border-top:1px solid var(--border); }
.mn-row.open .mn-row-body { display:block; padding-top:.9rem; }
.mn-block { border-radius:var(--radius-sm); padding:.7rem .9rem; margin-bottom:.6rem; }
.mn-block--wrong { background:#fdf3ee; }
.mn-block--right { background:var(--green-light); }
.mn-block-lbl { font-size:.7rem; font-weight:800; color:var(--muted); margin-bottom:.3rem; }
.mn-block-text { font-family:var(--eng); direction:ltr; text-align:left; font-size:.9rem; color:var(--text); margin-bottom:.3rem; }
.mn-block-expl { font-size:.83rem; color:var(--text); line-height:1.6; }
.mn-actions { display:flex; gap:.6rem; flex-wrap:wrap; margin-top:.4rem; }
.mn-audio-btn, .mn-mark-btn { border:1.5px solid var(--border); background:var(--card); border-radius:999px;
  padding:.4rem .9rem; font-family:inherit; font-size:.78rem; font-weight:700; cursor:pointer; color:var(--text); }
.mn-mark-btn.is-on { background:var(--green); border-color:var(--green); color:#fff; }
.mn-empty { color:var(--muted); font-size:.9rem; text-align:center; padding:1rem 0; line-height:1.7; }
.mn-empty-block { text-align:center; padding:2rem 0; display:flex; flex-direction:column; align-items:center; gap:1rem; }
`;
  document.head.appendChild(s);
}
