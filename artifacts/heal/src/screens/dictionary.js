import { renderLayout, getPageContent } from '../layout.js';
import { browseDictionary, getDictionaryCount } from '../data/words.data.js';
import { getCurrentSession } from '../supabase.js';
import { setVocabPool } from '../data/srs.data.js';
import { getProfile } from '../data/profiles.data.js';

// Dictionary / browse screen (מוצר/UX chat, 2026-08-29 — PLAN_depth_and_new_corners.md).
// Zero new content: surfaces the 2,666 words (550 'done' + 2,116
// 'pending_review', all with full definition/audio/mnemonics already written)
// that no other screen was reading. Free for everyone, no tier gate — this is
// a reference tool, not a practice/selection loop, so it deliberately does
// NOT use impact_score (see words.data.js's browseDictionary comment).

const PAGE_SIZE = 40;

function playAudio(url) {
  if (!url) return;
  try { new Audio(url).play(); } catch (_) { /* ignore */ }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function wordRow(w) {
  const mnemonics = [w.mnemonic, w.mnemonic_2, w.mnemonic_3].filter(Boolean);
  return `
  <div class="dict-row" data-id="${w.id}">
    <button type="button" class="dict-row-head" data-toggle aria-expanded="false">
      <span class="dict-head-main">
        <span class="dict-word">${escapeHtml(w.headword)}</span>
        <span class="dict-def-he">${escapeHtml(w.definition_he || '')}</span>
      </span>
      <span class="dict-chev">▾</span>
    </button>
    <div class="dict-row-body">
      ${w.definition ? `<p class="dict-def-en">${escapeHtml(w.definition)}</p>` : ''}
      ${w.surface_1 ? `<p class="dict-example">${escapeHtml(w.surface_1)}</p>` : ''}
      <div class="dict-audio-row">
        ${w.audio_word_url ? `<button type="button" class="dict-audio-btn" data-audio="${w.audio_word_url}">🔊 מילה</button>` : ''}
        ${w.audio_sentence_url ? `<button type="button" class="dict-audio-btn" data-audio="${w.audio_sentence_url}">🔊 משפט</button>` : ''}
      </div>
      ${mnemonics.length ? `
        <div class="dict-mnem">
          <div class="dict-mnem-hint">🔗 חפשו בתוך המשפט את הצליל שדומה למילה באנגלית — הוא הגשר לזכירה</div>
          ${mnemonics.map(m => `<p class="dict-mnem-line">${escapeHtml(m)}</p>`).join('')}
        </div>` : ''}
    </div>
  </div>`;
}

export async function renderDictionary(root) {
  await renderLayout(root, '/dictionary');
  ensureStyles();
  const el = getPageContent();
  el.innerHTML = `
    <div class="fade-in dict-wrap">
      <div class="page-title">מילון</div>
      <div class="page-sub" id="dictSub">כל אוצר המילים שלנו, לעיון חופשי — בלי הגבלה.</div>
      <div class="dict-search-wrap">
        <input type="text" id="dictSearch" class="dict-search" placeholder="חפשו מילה או פירוש..." autocomplete="off">
      </div>
      <div id="dictPool" class="dict-pool" hidden></div>
      <div id="dictList" class="dict-list"><div class="spinner-wrap"><div class="spinner"></div></div></div>
      <div id="dictMore" class="dict-more-wrap"></div>
    </div>`;

  // Real count, not a hardcoded number — see getDictionaryCount()'s comment.
  getDictionaryCount().then(({ count }) => {
    const sub = el.querySelector('#dictSub');
    if (sub && count) sub.textContent = `${count.toLocaleString('he-IL')} מילים באוצר המילים שלנו, לעיון חופשי — בלי הגבלה.`;
  });

  // ── The explicit "add the extension words to my practice" request ──
  // This is the right screen for it and nowhere else: the Dictionary is the
  // one place a learner actually SEES the 2,116 unscored words. Asking here
  // turns a dead end ("why do I never get these?") into one tap.
  // The other half of Lion's model — automatic promotion once the core pool
  // runs out — lives in data/srs.data.js and needs no UI.
  (async () => {
    const box = el.querySelector('#dictPool');
    if (!box) return;
    const session = await getCurrentSession();
    const userId = session?.user?.id ?? null;
    if (!userId) return;                 // guests practise the core pool only

    const { data: profile } = await getProfile(userId);
    const alreadyIn = profile?.vocab_pool === 'extended';
    const notExpired = !profile?.paid_expires_at || new Date(profile.paid_expires_at) > new Date();
    const isPremium = Boolean(profile?.paid_track) && notExpired;
    box.hidden = false;

    if (alreadyIn) {
      box.innerHTML = `<span class="dict-pool-on">✓ כל המילים כאן כלולות בתרגול היומי שלכם</span>`;
      return;
    }

    // No dead buttons. While the extension pool is paid-only
    // (EXTENSION_REQUIRES_PREMIUM in data/srs.data.js — an interim state, not a
    // decision), a free learner pressing "add them" would flip a flag and still
    // receive nothing. So they get the honest sentence instead, and the offer
    // appears only for an account that can actually act on it.
    if (!isPremium) {
      box.innerHTML = `<span>המילון פתוח לכם במלואו לעיון. התרגול היומי מתחיל מהמילים המשתלמות ביותר, ונפתח לשאר בגרסה המלאה.</span>`;
      return;
    }
    box.innerHTML = `
      <span>חלק מהמילים כאן עדיין לא נכנסות לתרגול היומי — אנחנו מתחילים מהמילים המשתלמות ביותר.</span>
      <button type="button" class="dict-pool-btn" id="dictPoolAdd">הוסיפו גם אותן לתרגול שלי</button>`;

    box.querySelector('#dictPoolAdd')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'מוסיפים…';
      const { error } = await setVocabPool(userId, 'extended');
      box.innerHTML = error
        ? `<span>לא הצלחנו לעדכן כרגע. נסו שוב מאוחר יותר.</span>`
        : `<span class="dict-pool-on">✓ מעכשיו גם המילים האלה ייכנסו לתרגול היומי שלכם</span>`;
    });
  })();

  let offset = 0;
  let query = '';
  let loading = false;
  let exhausted = false;

  async function loadPage(reset) {
    if (loading || (exhausted && !reset)) return;
    loading = true;
    if (reset) { offset = 0; exhausted = false; }
    const listEl = el.querySelector('#dictList');
    const moreEl = el.querySelector('#dictMore');
    if (reset) listEl.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
    moreEl.innerHTML = '';

    const { data, error } = await browseDictionary({ query, limit: PAGE_SIZE, offset });
    loading = false;

    if (error) {
      listEl.innerHTML = `<p class="dict-empty">משהו השתבש בטעינה — נסו שוב.</p>`;
      return;
    }
    const rows = data || [];
    if (reset) listEl.innerHTML = '';
    if (reset && rows.length === 0) {
      listEl.innerHTML = `<p class="dict-empty">לא נמצאו מילים תואמות.</p>`;
      return;
    }
    listEl.insertAdjacentHTML('beforeend', rows.map(wordRow).join(''));
    offset += rows.length;
    if (rows.length < PAGE_SIZE) exhausted = true;

    wireRowToggles(listEl);
    moreEl.innerHTML = exhausted ? '' : `<button type="button" class="btn-primary" id="dictLoadMore">טענו עוד</button>`;
    moreEl.querySelector('#dictLoadMore')?.addEventListener('click', () => loadPage(false));
  }

  function wireRowToggles(scopeEl) {
    scopeEl.querySelectorAll('[data-toggle]').forEach(btn => {
      if (btn.__wired) return;
      btn.__wired = true;
      btn.addEventListener('click', () => {
        const row = btn.closest('.dict-row');
        const open = row.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    scopeEl.querySelectorAll('[data-audio]').forEach(btn => {
      if (btn.__wired) return;
      btn.__wired = true;
      btn.addEventListener('click', (e) => { e.stopPropagation(); playAudio(btn.dataset.audio); });
    });
  }

  let debounceTimer = null;
  el.querySelector('#dictSearch').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const v = e.target.value;
    debounceTimer = setTimeout(() => { query = v; loadPage(true); }, 300);
  });

  loadPage(true);
}

function ensureStyles() {
  if (document.getElementById('dict-css')) return;
  const s = document.createElement('style');
  s.id = 'dict-css';
  s.textContent = `
.dict-pool{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;background:var(--orange-light);border-radius:var(--radius-sm);padding:.7rem .9rem;margin-bottom:.9rem;font-size:.84rem;line-height:1.6}
.dict-pool-btn{background:var(--green);color:#fff;border:none;border-radius:var(--radius-sm);padding:.4rem .9rem;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit}
.dict-pool-btn:hover{background:var(--green-dark)}
.dict-pool-btn:disabled{opacity:.6;cursor:default}
.dict-pool-on{font-weight:700;color:var(--green-dark)}
.dict-wrap { max-width: 720px; }
.dict-search-wrap { margin: 1rem 0 1.3rem; }
.dict-search { width:100%; padding:.85rem 1.1rem; border:1.5px solid var(--border); border-radius:var(--radius);
  font-family:inherit; font-size:.95rem; background:var(--card); }
.dict-search:focus { outline:none; border-color:var(--green); }
.dict-list { display:flex; flex-direction:column; gap:.6rem; }
.dict-row { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
.dict-row-head { display:flex; align-items:center; gap:.8rem; width:100%; padding:.9rem 1.1rem;
  background:none; border:none; cursor:pointer; text-align:right; font:inherit; color:inherit; }
.dict-head-main { flex:1; display:flex; align-items:baseline; gap:.7rem; flex-wrap:wrap; }
.dict-word { font-family:var(--eng); font-size:1.05rem; font-weight:700; color:var(--green-dark); direction:ltr; }
.dict-def-he { font-size:.86rem; color:var(--muted); }
.dict-chev { flex:0 0 auto; font-size:.8rem; color:var(--muted); transition:transform .2s ease; }
.dict-row.open .dict-chev { transform:rotate(180deg); }
.dict-row-body { display:none; padding:0 1.1rem 1rem; border-top:1px solid var(--border); }
.dict-row.open .dict-row-body { display:block; padding-top:.8rem; }
.dict-def-en { font-family:var(--eng); direction:ltr; text-align:left; font-size:.92rem; color:var(--text); margin-bottom:.5rem; }
.dict-example { font-family:var(--eng); direction:ltr; text-align:left; font-size:.88rem; color:var(--muted); font-style:italic; margin-bottom:.7rem; }
.dict-audio-row { display:flex; gap:.5rem; margin-bottom:.6rem; }
.dict-audio-btn { border:1.5px solid var(--border); background:var(--card); border-radius:999px; padding:.35rem .8rem;
  font-family:inherit; font-size:.78rem; font-weight:700; cursor:pointer; color:var(--text); }
.dict-audio-btn:hover { border-color:var(--green); }
.dict-mnem { background:var(--green-light); border-radius:var(--radius-sm); padding:.7rem .9rem; }
.dict-mnem-hint { font-size:.72rem; font-weight:700; color:var(--orange); margin-bottom:.4rem; }
.dict-mnem-line { font-size:.85rem; color:var(--text); margin-bottom:.3rem; }
.dict-mnem-line:last-child { margin-bottom:0; }
.dict-empty { color:var(--muted); font-size:.9rem; text-align:center; padding:2rem 0; }
.dict-more-wrap { text-align:center; margin-top:1.2rem; }
`;
  document.head.appendChild(s);
}
