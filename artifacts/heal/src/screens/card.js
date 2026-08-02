import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getDueWords, rateWord } from '../data/srs.data.js';

const MAX_REQUEUES = 2;

let queue = [];
let idx = 0;
let revealed = false;
let mnemonicIdx = 0;
let openPanel = null;
let cardStart = 0;
let userId = null;

// session-local state (NOT persisted to DB)
let firstRatings = {};      // wordId -> 'again' | 'hard' | 'good'
let intraSessionReps = {};  // wordId -> count of times re-queued
let outcomes = {};          // wordId -> 'first_good' | 'recovered' | 'carry_over'

function getAssoc(word) {
  return [word.mnemonic, word.mnemonic_2, word.mnemonic_3].filter(Boolean);
}

function splitDef(word) {
  const parts = (word.definition_he || '').split(',').map(s => s.trim()).filter(Boolean);
  return { mainDef: parts[0] || '—', extraDefs: parts.slice(1) };
}

function playAudio(url) {
  if (!url) return;
  try { new Audio(url).play(); } catch (_) {}
}

function handleRating(word, rating) {
  // === STEP 1: DB write — ONLY if this is the word's first rating in this session ===
  const isFirstRating = !firstRatings[word.id];
  if (isFirstRating) {
    firstRatings[word.id] = rating;
    const responseTimeMs = cardStart ? Date.now() - cardStart : null;
    const currentState = {
      state: word.state,
      interval_days: word.interval_days,
      ease: word.ease,
      reps: word.reps,
      lapses: word.lapses,
    };
    if (userId) {
      rateWord(userId, word.id, rating, { currentState, responseTimeMs })
        .catch(err => console.warn('rateWord failed:', err));
    }
  }

  // === STEP 2: queue management (local only, never writes to DB) ===
  if (rating === 'good') {
    // Word is known — remove from queue
    queue.splice(idx, 1);
    // Decide the outcome label
    if (firstRatings[word.id] === 'good' && (intraSessionReps[word.id] || 0) === 0) {
      outcomes[word.id] = 'first_good';
    } else {
      outcomes[word.id] = 'recovered';
    }
    // idx stays the same (next word slides into this position)
  } else {
    // 'again' or 'hard'
    const reps = (intraSessionReps[word.id] || 0) + 1;
    intraSessionReps[word.id] = reps;

    if (reps >= MAX_REQUEUES) {
      // Hit the cap — drop from session, mark as carry_over
      queue.splice(idx, 1);
      outcomes[word.id] = 'carry_over';
      // idx stays the same
    } else {
      // Re-queue: pull current word out and re-insert further back
      const [w] = queue.splice(idx, 1);
      const offset = rating === 'again' ? 2 : 5;
      const insertPos = Math.min(idx + offset, queue.length);
      queue.splice(insertPos, 0, w);
      // idx stays the same — next card slides in
    }
  }

  // Reset per-card UI state
  revealed = false;
  openPanel = null;
  mnemonicIdx = 0;
  cardStart = 0;

  // Session complete?
  if (queue.length === 0 || idx >= queue.length) {
    finishSession();
    return;
  }

  // Adjust idx if it went out of bounds (shouldn't, but safety)
  if (idx >= queue.length) idx = 0;
}

function finishSession() {
  // Bundle outcomes for analyze screen
  const summary = {
    total: Object.keys(outcomes).length,
    first_good: Object.values(outcomes).filter(o => o === 'first_good').length,
    recovered:  Object.values(outcomes).filter(o => o === 'recovered').length,
    carry_over: Object.values(outcomes).filter(o => o === 'carry_over').length,
    timestamp: Date.now(),
  };
  sessionStorage.setItem('hs_last_session_summary', JSON.stringify(summary));
  navigate('/vocab-analyze');
}

function draw(root) {
  if (!queue.length) {
    finishSession();
    return;
  }

  const word = queue[idx];
  const { mainDef, extraDefs } = splitDef(word);
  const assoc = getAssoc(word);
  const counter = `${Object.keys(outcomes).length + 1}`;

  const hiddenZone = `<div class="reveal-prompt">
    <button class="reveal-btn" id="revealBtn">חשוף הגדרה</button>
  </div>`;

  const panelBtns = [];
  if (word.surface_1) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='sentence'?'open':''}" data-panel="sentence">📝 משפט</button>`);
  }
  if (extraDefs.length) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='extras'?'open':''}" data-panel="extras">📖 פירושים נוספים</button>`);
  }
  if (assoc.length) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='mnemonic'?'open':''}" data-panel="mnemonic">💡 אסוציאציה</button>`);
  }

  let panelContent = '';
  if (openPanel === 'sentence' && word.surface_1) {
    const sentenceAudioBtn = word.audio_sentence_url
      ? `<button class="vc-sent-audio-btn" id="sentAudioBtn" title="השמע משפט">🔊</button>`
      : '';
    panelContent = `<div class="vc-panel-content vc-sent-row">
      <span class="vc-sent-text" dir="ltr">${word.surface_1}</span>
      ${sentenceAudioBtn}
    </div>`;
  } else if (openPanel === 'extras' && extraDefs.length) {
    panelContent = `<div class="vc-panel-content vc-panel-rtl">${extraDefs.join('  ·  ')}</div>`;
  } else if (openPanel === 'mnemonic' && assoc.length) {
    const cyclerHtml = assoc.length > 1
      ? `<button class="vc-mnem-cycle" id="mnemCycleBtn" title="אסוציאציה הבאה">↻</button>`
      : '';
    panelContent = `<div class="vc-panel-content vc-panel-rtl vc-mnem-row">
      <span id="mnemText">${assoc[mnemonicIdx]}</span>
      ${cyclerHtml}
    </div>`;
  }

  const revealedZone = `
    <div class="def-block">
      <div class="section-label">הגדרה</div>
      <div class="main-definition" dir="rtl">${mainDef}</div>
    </div>
    <div class="vc-panel-row">${panelBtns.join('')}</div>
    ${panelContent}
    <div class="rate-bar">
      <button class="rate-btn" data-rating="again">✗ שוב</button>
      <button class="rate-btn" data-rating="hard">~ קשה</button>
      <button class="rate-btn" data-rating="good">✓ ידעתי</button>
    </div>`;

  root.innerHTML = `<div class="vc-shell fade-in">
    <header class="vc-topbar">
      <a class="brand-mark vc-brand" href="#/home">hSc</a>
      <div class="vc-topbar-right">
        <button class="card-help-btn" id="helpBtn" title="הסבר שוב">?</button>
        <span class="card-counter">מילה ${counter}</span>
      </div>
    </header>
    <main class="vc-main">
      <div class="vc-card">
        <div class="card-headword-row">
          <div class="card-headword" dir="ltr">${word.headword}</div>
          ${word.audio_word_url ? `<button class="audio-btn" id="audioBtn" title="השמע">🔊</button>` : ''}
        </div>
        <div class="reveal-zone">
          ${revealed ? revealedZone : hiddenZone}
        </div>
      </div>
      <div class="card-footer"><a href="#/home">← דף הבית</a></div>
    </main>
  </div>`;

  root.querySelector('#audioBtn')?.addEventListener('click', () => playAudio(word.audio_word_url));
  root.querySelector('#helpBtn')?.addEventListener('click', () => {
    localStorage.removeItem('hs_vocab_learn_seen');
    navigate('/vocab-learn');
  });

  if (!revealed) {
    root.querySelector('#revealBtn').addEventListener('click', () => {
      revealed = true;
      openPanel = null;
      mnemonicIdx = 0;
      cardStart = Date.now();
      draw(root);
    });
    return;
  }

  root.querySelectorAll('.vc-panel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.panel;
      openPanel = (openPanel === p) ? null : p;
      if (openPanel === 'mnemonic') mnemonicIdx = 0;
      draw(root);
    });
  });

  root.querySelector('#mnemCycleBtn')?.addEventListener('click', () => {
    mnemonicIdx = (mnemonicIdx + 1) % assoc.length;
    const txt = root.querySelector('#mnemText');
    if (txt) txt.textContent = assoc[mnemonicIdx];
  });

  root.querySelector('#sentAudioBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    playAudio(word.audio_sentence_url);
  });

  root.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating;
      handleRating(word, rating);
      draw(root);
    });
  });
}

export async function renderCard(root) {
  const learnSeen = localStorage.getItem('hs_vocab_learn_seen');
  if (!learnSeen) {
    navigate('/vocab-learn');
    return;
  }

  root.innerHTML = '<div class="vc-shell"><div class="spinner">טוען מילים…</div></div>';

  const session = await getCurrentSession();
  userId = session?.user?.id ?? null;
  if (!userId) {
    root.innerHTML = '<div class="vc-shell"><p dir="rtl" style="padding:2rem">יש להתחבר כדי לתרגל מילים.</p></div>';
    return;
  }

  const { data, error } = await getDueWords(userId, { limit: 20 });
  if (error || !data?.length) {
    root.innerHTML = `<div class="vc-shell">
      <header class="vc-topbar">
        <a class="brand-mark vc-brand" href="#/home">hSc</a>
      </header>
      <main class="vc-main">
        <div class="vc-card">
          <p dir="rtl" style="text-align:center;color:var(--muted);padding:2rem">אין מילים לתרגול כרגע. חזור מחר!</p>
        </div>
        <div class="card-footer"><a href="#/home">← חזרה לדף הבית</a></div>
      </main>
    </div>`;
    return;
  }

  // Reset session state
  queue = [...data];
  idx = 0;
  revealed = false;
  openPanel = null;
  mnemonicIdx = 0;
  cardStart = 0;
  firstRatings = {};
  intraSessionReps = {};
  outcomes = {};

  draw(root);
}
