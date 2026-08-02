/**
 * M3 — Generic Listening Item Component
 *
 * Usage (full feedback mode — M3 test / M5 session):
 *   const item = new ListeningItem(container, {
 *     itemId, sessionId,
 *     onAnswered: (isCorrect) => { ... },   // fired immediately on answer
 *     onContinue: () => { ... },            // shows "המשך" button after feedback
 *   });
 *   await item.load();
 *
 * Usage (silent mode — M4 diagnostic, no correct/wrong shown):
 *   const item = new ListeningItem(container, {
 *     itemId, sessionId, feedbackMode: 'silent',
 *     onContinue: () => { ... }
 *   });
 *   await item.load();
 *
 * Call item.destroy() when navigating away.
 */
import { supabase, getCurrentSession } from '../supabase.js';
import { AudioPlayer } from './audio-player.js';
import './item-component.css';

// ─── Trap type → Hebrew description ──────────────────────────────────────────
const TRAP_LABELS = {
  L1_absolute_quantifier:  'מלכודת: כמת מוחלט ("תמיד" / "אף פעם")',
  L2_causal_reversal:      'מלכודת: היפוך סיבתי',
  L3_fabricated_detail:    'מלכודת: פרט שלא הוזכר',
  L4_unjustified_narrowing:'מלכודת: צמצום לא מוצדק',
  L5_temporal_distortion:  'מלכודת: עיוות זמני',
  L6_lexical_soundalike:   'מלכודת: דמיון צלילי',
  L7_tone_misread:         'מלכודת: קריאת טון שגויה',
  L8_discourse_marker_miss:'מלכודת: פספוס סמן שיח',
};

export class ListeningItem {
  /**
   * @param {HTMLElement} container
   * @param {{
   *   itemId: string|number,
   *   sessionId?: string|null,
   *   feedbackMode?: 'full'|'silent',
   *   onContinue?: (() => void)|null,
   *   onAnswered?: ((isCorrect: boolean) => void)|null,
   * }} opts
   */
  constructor(container, {
    itemId,
    sessionId    = null,
    feedbackMode = 'full',
    onContinue   = null,
    onAnswered   = null,
  }) {
    this._container    = container;
    this._itemId       = itemId;
    this._sessionId    = sessionId;
    this._feedbackMode = feedbackMode;   // 'full' | 'silent'
    this._onContinue   = onContinue;     // called when user clicks continue
    this._onAnswered   = onAnswered;     // called immediately after answer: (isCorrect) => void
    this._player       = null;
    this._answered     = false;
    this._questionStartMs = null;
    this._transcript   = null;           // stored for "איך יכולת לדעת?" cue (Task 3)
  }

  async load() {
    this._container.className = 'lic-wrap';
    this._container.innerHTML = `<div class="lic-loading"><div class="spinner"></div><span>טוען פריט…</span></div>`;

    try {
      const { item, question, options } = await this._fetchData();
      this._render(item, question, options);
    } catch (err) {
      this._container.innerHTML = `
        <div class="lic-error">שגיאה בטעינת הפריט: ${err.message}</div>`;
    }
  }

  async _fetchData() {
    if (!supabase) throw new Error('Supabase לא מוגדר');

    const [itemRes, questionsRes] = await Promise.all([
      supabase.from('listening_items').select('*').eq('id', this._itemId).single(),
      supabase.from('listening_questions')
        .select('*')
        .eq('item_id', this._itemId)
        .order('question_order', { ascending: true })
        .limit(1)
        .single(),
    ]);

    if (itemRes.error)      throw new Error(itemRes.error.message);
    if (questionsRes.error) throw new Error(questionsRes.error.message);

    const item     = itemRes.data;
    const question = questionsRes.data;

    const optionsRes = await supabase
      .from('listening_options')
      .select('*')
      .eq('question_id', question.id)
      .order('option_order', { ascending: true });

    if (optionsRes.error) throw new Error(optionsRes.error.message);

    return { item, question, options: optionsRes.data || [] };
  }

  _render(item, question, options) {
    const hasAudio    = !!item.audio_url;
    const isSilent    = this._feedbackMode === 'silent';
    const hasContinue = !!this._onContinue;

    // Task 3: store transcript for "איך יכולת לדעת?" cue lookup
    this._transcript = item.transcript || null;

    this._container.innerHTML = `
      <div class="lic-content">

        ${hasAudio ? `
          <div class="lic-section-label">האזן לקטע</div>
          <div id="lic-player"></div>
          <div class="lic-audio-lock" id="lic-audio-lock">
            <span class="lic-audio-lock-icon">▶</span>
            הפעל את השמע לפני המענה
          </div>
        ` : ''}

        <div class="lic-question-block">
          <div class="lic-section-label">שאלה</div>
          <div class="lic-question-text">${escHtml(question.question_he || question.question_text || '')}</div>
        </div>

        <div class="lic-options${hasAudio ? ' lic-options--locked' : ''}" id="lic-options">
          ${options.map((opt, i) => `
            <button class="lic-option" data-id="${opt.id}" data-correct="${opt.is_correct}">
              <span class="lic-option-letter">${['א','ב','ג','ד'][i] || i + 1}</span>
              <span class="lic-option-text">${escHtml(opt.option_he || opt.option_text || '')}</span>
            </button>
          `).join('')}
        </div>

        ${isSilent ? `
          <div class="lic-continue" id="lic-continue" hidden>
            <button class="btn-lic-continue">המשך ←</button>
          </div>
        ` : `
          <div class="lic-feedback" id="lic-feedback" hidden>
            <div class="lic-verdict" id="lic-verdict"></div>
            <div class="lic-explanations" id="lic-explanations"></div>
            ${hasContinue ? `
              <div class="lic-continue" id="lic-continue" hidden>
                <button class="btn-lic-continue">המשך ←</button>
              </div>
            ` : ''}
          </div>
        `}

      </div>
    `;

    // Task 2: stop any previous audio before mounting a new player
    if (window._currentAudioPlayer) {
      try { window._currentAudioPlayer.destroy(); } catch (_) {}
      window._currentAudioPlayer = null;
    }

    // Mount audio player — unlock options on first play (Task 3 fix: always, not just lecture_qa)
    if (hasAudio) {
      const playerEl = this._container.querySelector('#lic-player');
      this._player = new AudioPlayer(playerEl, {
        src: item.audio_url,
        mode: 'single-pass',
        onFirstPlay: () => {
          const optEl  = this._container.querySelector('#lic-options');
          const lockEl = this._container.querySelector('#lic-audio-lock');
          if (optEl)  optEl.classList.remove('lic-options--locked');
          if (lockEl) lockEl.hidden = true;
        },
      });
      // Task 2: register as global current player
      window._currentAudioPlayer = this._player;
    }

    this._questionStartMs = performance.now();
    this._container.querySelector('#lic-options')
      .addEventListener('click', (e) => {
        const btn = e.target.closest('.lic-option');
        if (btn && !this._answered) this._handleAnswer(btn, options, question);
      });
  }

  async _handleAnswer(btn, options, question) {
    this._answered = true;
    const latencyMs  = Math.round(performance.now() - this._questionStartMs);
    const selectedId = btn.dataset.id;
    const isCorrect  = btn.dataset.correct === 'true';

    // Fire onAnswered immediately (before any UI updates)
    if (this._onAnswered) this._onAnswered(isCorrect);

    // Disable all buttons
    this._container.querySelectorAll('.lic-option').forEach(b => {
      b.disabled = true;

      if (this._feedbackMode === 'full') {
        const correct = b.dataset.correct === 'true';
        if (correct)                 b.classList.add('lic-option--correct');
        if (b === btn && !isCorrect) b.classList.add('lic-option--wrong');
      } else {
        // Silent: neutral highlight on selected only
        if (b === btn) b.classList.add('lic-option--selected');
      }
    });

    if (this._feedbackMode === 'full') {
      // ── Part 1: Verdict + correct answer explanation ──────────────────────
      const correctOpt  = options.find(o => o.is_correct);
      const selectedOpt = options.find(o => String(o.id) === String(selectedId));

      const verdictEl = this._container.querySelector('#lic-verdict');
      if (isCorrect) {
        verdictEl.innerHTML = `
          <div class="lic-verdict-row lic-verdict--ok">
            <span class="lic-verdict-icon">✓</span>
            <span>תשובה נכונה!</span>
          </div>
          ${correctOpt?.explanation_he ? `
            <div class="lic-correct-expl">${escHtml(correctOpt.explanation_he)}</div>
          ` : ''}`;
      } else {
        verdictEl.innerHTML = `
          <div class="lic-verdict-row lic-verdict--err">
            <span class="lic-verdict-icon">✗</span>
            <span>תשובה שגויה</span>
          </div>
          <div class="lic-correct-label">
            התשובה הנכונה: <strong>${escHtml(correctOpt?.option_text || correctOpt?.option_he || '')}</strong>
          </div>
          ${correctOpt?.explanation_he ? `
            <div class="lic-correct-expl">${escHtml(correctOpt.explanation_he)}</div>
          ` : ''}`;
      }

      // ── Parts 2, 3 & 4: only on incorrect answers ────────────────────────
      let explHtml = '';
      if (!isCorrect) {
        // Part 2: Why the chosen answer is wrong
        if (selectedOpt?.explanation_he) {
          explHtml += `
            <div class="lic-wrong-section">
              <div class="lic-wrong-title">מדוע תשובתך שגויה:</div>
              <div class="lic-wrong-expl">${escHtml(selectedOpt.explanation_he)}</div>
            </div>`;
        }

        // Part 3: "איך יכולת לדעת?" — transcript cue block
        const cue = _findTranscriptCue(this._transcript, correctOpt);
        if (cue) {
          const signalWord = _extractSignalWord(cue, correctOpt);
          explHtml += `
            <div class="lic-cue-section">
              <div class="lic-cue-title">💡 איך יכולת לדעת?</div>
              <div class="lic-cue-quote">"${escHtml(cue)}"</div>
              ${signalWord ? `
                <div class="lic-cue-signal">
                  הסיגנל: <strong>${escHtml(signalWord)}</strong> ← מסמן את התשובה הנכונה
                </div>` : ''}
            </div>`;
        }

        // Part 4: Trap type label
        const trapType = selectedOpt?.trap_type;
        if (trapType) {
          const trapLabel = TRAP_LABELS[trapType] || trapType;
          explHtml += `
            <div class="lic-trap-section">
              <span class="lic-trap-badge">🪤 ${escHtml(trapLabel)}</span>
            </div>`;
        }
      }
      this._container.querySelector('#lic-explanations').innerHTML = explHtml;
      this._container.querySelector('#lic-feedback').hidden = false;

      // Show continue button (if onContinue was supplied)
      const continueEl = this._container.querySelector('#lic-continue');
      if (continueEl) {
        continueEl.hidden = false;
        continueEl.querySelector('button').addEventListener('click', () => {
          if (this._onContinue) this._onContinue();
        }, { once: true });
      }

    } else {
      // Silent mode: show "המשך" button
      const continueEl = this._container.querySelector('#lic-continue');
      if (continueEl) {
        continueEl.hidden = false;
        continueEl.querySelector('button').addEventListener('click', () => {
          if (this._onContinue) this._onContinue();
        }, { once: true });
      }
    }

    // Save to DB (non-blocking)
    this._saveResponse({ questionId: question.id, selectedOptionId: selectedId, isCorrect, latencyMs })
      .catch(err => console.warn('[M3] save response failed:', err.message));
  }

  async _saveResponse({ questionId, selectedOptionId, isCorrect, latencyMs }) {
    if (!supabase) return;
    const session = await getCurrentSession();
    if (!session) return;

    const { error } = await supabase.from('listening_responses').insert({
      user_id:            session.user.id,
      session_id:         this._sessionId,
      question_id:        questionId,
      selected_option_id: selectedOptionId,
      is_correct:         isCorrect,
      latency_ms:         latencyMs,
    });

    if (error) throw new Error(error.message);
  }

  destroy() {
    if (this._player) {
      // Task 2: clear global ref before destroying
      if (window._currentAudioPlayer === this._player) {
        window._currentAudioPlayer = null;
      }
      this._player.destroy();
      this._player = null;
    }
    this._container.innerHTML = '';
    this._container.className = '';
  }
}

// ─── Task 3 helpers: find relevant transcript sentence ───────────────────────

/**
 * Find the transcript sentence most relevant to the correct answer.
 * Uses keyword overlap between correctOpt text/explanation and transcript sentences.
 */
function _findTranscriptCue(transcript, correctOpt) {
  if (!transcript || !correctOpt) return null;

  // Build keyword set from the correct option
  const source = `${correctOpt.option_text || ''} ${correctOpt.option_he || ''} ${correctOpt.explanation_he || ''}`;
  const keywords = source.toLowerCase().match(/[a-zא-ת]{3,}/g) || [];
  if (!keywords.length) return null;

  // Split transcript into sentences (English-friendly)
  const sentences = transcript
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  if (!sentences.length) return null;

  // Score each sentence by keyword overlap
  let best = { score: 0, idx: 0 };
  sentences.forEach((s, i) => {
    const sLow = s.toLowerCase();
    const score = keywords.filter(w => sLow.includes(w)).length;
    if (score > best.score) best = { score, idx: i };
  });

  // Return best-matching sentence; if no match, return first sentence
  return best.score >= 1 ? sentences[best.idx] : sentences[0];
}

/**
 * Extract the most "signal-like" keyword that appears in both
 * the cue sentence and the correct-option text/explanation.
 */
function _extractSignalWord(cueSentence, correctOpt) {
  if (!cueSentence || !correctOpt) return null;
  const source = `${correctOpt.option_text || ''} ${correctOpt.option_he || ''} ${correctOpt.explanation_he || ''}`;
  const keywords = source.toLowerCase().match(/[a-zא-ת]{4,}/g) || [];
  const cueLow = cueSentence.toLowerCase();

  // Find keywords that appear in the cue, prefer longer ones
  const found = keywords.filter(w => cueLow.includes(w));
  if (!found.length) return null;
  found.sort((a, b) => b.length - a.length);
  return found[0];
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
