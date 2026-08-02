import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getDueWords, saveSrsRating, playAudio } from '../supabase.js';

let queue = [], idx = 0, correct = 0, flipped = false, assocIdx = 0, openPanel = null;

export async function renderSrs(root) {
  await renderLayout(root, '/srs');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const words = await getDueWords(8);

  if (!words.length) {
    el.innerHTML = `
      <div class="srs-done fade-in">
        <div class="srs-done-emoji">📚</div>
        <h2>אין מילים לתרגול</h2>
        <p>לא נמצאו מילים לחזרה כרגע. נסו שוב מאוחר יותר.</p>
        <button class="btn-primary" id="btn-back">← חזרה לכרטיסיות</button>
      </div>`;
    el.querySelector('#btn-back').addEventListener('click', () => navigate('/flashcards'));
    return;
  }

  queue   = words.sort(() => Math.random() - .5).slice(0, 8);
  idx     = 0;
  correct = 0;
  flipped = false;
  assocIdx= 0;
  openPanel = null;

  drawCard(el);
}

function drawCard(el) {
  const total = queue.length;
  if (idx >= total) { drawDone(el); return; }

  const w = queue[idx];
  flipped  = false;
  assocIdx = 0;
  openPanel= null;

  const tc = w.tier === 'A' ? 'ta' : w.tier === 'B' ? 'tb' : 'tc';
  const tl = w.tier === 'A' ? '★ Tier A — זהב' : w.tier === 'B' ? '◆ Tier B — כסף' : '◇ Tier C — רזרב';
  const pct = Math.round(idx / total * 100);

  el.innerHTML = `
    <div class="srs-wrap fade-in">
      <div class="srs-header">
        <button class="btn-exit" id="btn-exit">← יציאה</button>
        <div class="srs-progress">
          <div class="srs-progress-bar">
            <div class="srs-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="srs-progress-lbl">כרטיסייה ${idx + 1} מתוך ${total}</div>
        </div>
        <div style="font-size:.73rem;color:var(--muted)">${correct}/${idx}</div>
      </div>

      <!-- Flip card -->
      <div class="flip-scene" id="flip-scene">
        <div class="flip-card" id="flip-card">

          <!-- FRONT -->
          <div class="flip-face">
            <span class="fc-tier-tag ${tc}">${tl}</span>
            <div class="fc-word">${w.word || ''}</div>
            <div class="fc-pos">${w.pos || ''}</div>
            <div class="fc-hint">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px"><path d="M3 8a5 5 0 0010 0"/><path d="M11 6l2 2-2 2"/></svg>
              לחץ לחשוף
            </div>
          </div>

          <!-- BACK -->
          <div class="flip-face flip-back">
            <div class="fc-back-word">${w.word || ''}</div>
            <div class="fc-back-pos">${w.pos || ''} · impact ${(w.impact ?? 0).toFixed(1)}</div>
            <div class="fc-def-row">
              <div class="fc-def-he">${w.def_he || w.def || ''}</div>
              ${w.audioWord ? `<button class="btn-audio" id="btn-audio-word" title="השמע">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:12px;height:12px"><path d="M5 3L11 8 5 13V3z"/></svg>
              </button>` : ''}
            </div>
            <div class="fc-panels">
              ${panelBtn('sentence', '📝 משפט לדוגמה')}
              ${panelBtn('meanings', '📖 משמעויות נוספות')}
              ${w.assoc?.length ? panelBtn('assoc', '💡 אסוציאציות') : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Rating (hidden until flip) -->
      <div class="srs-rating" id="srs-rating" style="display:none">
        <button class="srs-rate-btn hard"   data-r="hard">✗ קשה</button>
        <button class="srs-rate-btn medium" data-r="medium">~ בסדר</button>
        <button class="srs-rate-btn easy"   data-r="easy">✓ קל</button>
      </div>
    </div>`;

  // Panels content (hidden initially)
  const sentenceText = w.sentence || w.def;
  if (sentenceText) {
    injectPanel(el, 'sentence',
      `<span style="font-style:italic;direction:ltr;display:block">${sentenceText}</span>
       ${w.sentence_he ? `<div style="font-size:.8rem;color:var(--muted);margin-top:4px;direction:rtl">${w.sentence_he}</div>` : ''}
       ${w.audioSentence ? `<button class="btn-audio" id="btn-audio-sentence" style="margin-top:6px">
         <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:12px;height:12px"><path d="M5 3L11 8 5 13V3z"/></svg>
       </button>` : ''}`,
      'fc-panel-ltr');
  }
  if (w.meanings?.length) {
    injectPanel(el, 'meanings',
      w.meanings.map(m => `<div>• ${m}</div>`).join(''),
      'fc-panel-rtl');
  }
  if (w.assoc?.length) {
    injectPanel(el, 'assoc', buildAssocHtml(w, 0), 'fc-panel-rtl');
  }

  // Events
  el.querySelector('#flip-scene').addEventListener('click', () => doFlip(el, w));
  el.querySelector('#btn-exit').addEventListener('click', () => navigate('/flashcards'));

  el.querySelectorAll('.fc-expand-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); togglePanel(el, btn.dataset.panel, w); });
  });

  if (w.audioWord) {
    const ab = el.querySelector('#btn-audio-word');
    if (ab) ab.addEventListener('click', e => { e.stopPropagation(); playAudio(w.audioWord); });
  }

  el.querySelectorAll('[data-r]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.r === 'easy') correct++;
      if (w.id) await saveSrsRating(w.id, btn.dataset.r, w.easeFactor, w.reviewCount);
      idx++;
      drawCard(el);
    });
  });
}

function doFlip(el, w) {
  if (flipped) return;
  flipped = true;
  el.querySelector('#flip-card').classList.add('flipped');
  el.querySelector('#srs-rating').style.display = 'grid';
}

function togglePanel(el, id, w) {
  ['sentence','meanings','assoc'].forEach(p => {
    const panel = el.querySelector(`#panel-${p}`);
    const btn   = el.querySelector(`[data-panel="${p}"]`);
    if (!panel || !btn) return;
    const isTarget = p === id;
    const wasOpen  = panel.classList.contains('show');
    if (isTarget && !wasOpen) {
      panel.classList.add('show');
      btn.classList.add('open');
      if (p === 'assoc') {
        el.querySelector('#btn-assoc-prev')?.addEventListener('click', e => { e.stopPropagation(); assocIdx = (assocIdx - 1 + w.assoc.length) % w.assoc.length; updateAssoc(el, w); });
        el.querySelector('#btn-assoc-next')?.addEventListener('click', e => { e.stopPropagation(); assocIdx = (assocIdx + 1) % w.assoc.length; updateAssoc(el, w); });
      }
      if (p === 'sentence' && w.audioSentence) {
        el.querySelector('#btn-audio-sentence')?.addEventListener('click', e => { e.stopPropagation(); playAudio(w.audioSentence); });
      }
    } else {
      panel.classList.remove('show');
      btn.classList.remove('open');
    }
  });
}

function updateAssoc(el, w) {
  const c = el.querySelector('#assoc-text');
  if (c) c.textContent = w.assoc[assocIdx];
  el.querySelectorAll('.assoc-dot').forEach((d, i) => d.classList.toggle('on', i === assocIdx));
}

function buildAssocHtml(w, i) {
  const dots = w.assoc.map((_, j) => `<div class="assoc-dot${j === i ? ' on' : ''}"></div>`).join('');
  return `<div id="assoc-text">${w.assoc[i]}</div>
    <div class="assoc-nav">
      <button class="btn-assoc-nav" id="btn-assoc-prev">← הקודמת</button>
      <div class="assoc-dots">${dots}</div>
      <button class="btn-assoc-nav" id="btn-assoc-next">הבאה →</button>
    </div>`;
}

function panelBtn(id, label) {
  return `<div>
    <button class="fc-expand-btn" data-panel="${id}">
      <span>${label}</span>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M4 6l4 4 4-4"/></svg>
    </button>
    <div class="fc-panel" id="panel-${id}"></div>
  </div>`;
}

function injectPanel(el, id, html, cls) {
  const p = el.querySelector(`#panel-${id}`);
  if (p) { p.innerHTML = html; p.classList.add(cls); }
}

function drawDone(el) {
  const pct = queue.length ? Math.round(correct / queue.length * 100) : 0;
  el.innerHTML = `
    <div class="srs-done fade-in">
      <div class="srs-done-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
      <h2>${pct >= 70 ? 'כל הכבוד!' : 'המשך כך!'}</h2>
      <p>סיימת ${queue.length} כרטיסיות · דירגת "קל" על ${correct} (${pct}%)</p>
      <button class="btn-primary" id="btn-again">סשן נוסף ←</button>
    </div>`;
  el.querySelector('#btn-again').addEventListener('click', () => navigate('/srs'));
}
