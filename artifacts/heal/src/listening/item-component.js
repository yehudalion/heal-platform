/**
 * M3 — Generic Listening Item Component
 *
 * Renders one lecture and ALL of its questions from the real listening schema
 * (listening_lectures / listening_questions, options as jsonb).
 *
 *   - continuation items have exactly 1 question → behaves as before.
 *   - lecture_qa items have 1-2+ questions → audio plays once (single-pass),
 *     then the questions are shown one after another WITHOUT replaying.
 *
 * Usage (full feedback mode — practice session):
 *   const item = new ListeningItem(container, {
 *     lectureId, sessionId,
 *     onAnswered: (isCorrect, meta) => { ... },  // fired per question;
 *                                                // meta = { failMode, questionId }
 *     onContinue: () => { ... },                 // fired after the LAST question
 *   });
 *   await item.load();
 *
 * Usage (silent mode — no correct/wrong shown):
 *   pass feedbackMode: 'silent'.
 *
 * Call item.destroy() when navigating away.
 */
import { getCurrentSession }                            from '../supabase.js';
import { getLectureById, getLectureQuestions, saveQuestionResponse } from '../data/listening.data.js';
import { AudioPlayer }                                   from './audio-player.js';
import { keyLabel }                                      from './keys.js';
import './item-component.css';

export class ListeningItem {
  /**
   * @param {HTMLElement} container
   * @param {{
   *   lectureId: string,
   *   sessionId?: string|null,
   *   feedbackMode?: 'full'|'silent',
   *   onContinue?: (() => void)|null,
   *   onAnswered?: ((isCorrect: boolean, meta?: { failMode: string|null, questionId: string }) => void)|null,
   * }} opts
   */
  constructor(container, {
    lectureId,
    sessionId    = null,
    feedbackMode = 'full',
    onContinue   = null,
    onAnswered   = null,
  }) {
    this._container    = container;
    this._lectureId    = lectureId;
    this._sessionId    = sessionId;
    this._feedbackMode = feedbackMode;   // 'full' | 'silent'
    this._onContinue   = onContinue;     // called after the LAST question
    this._onAnswered   = onAnswered;     // called per question: (isCorrect, meta)
    this._player       = null;
    this._answered     = false;
    this._questionStartMs = null;
    this._transcript      = null;        // stored for "איך יכולת לדעת?" cue
    this._highlightSpans  = null;        // verbatim connective phrases from the lecture
    this._lecture         = null;
    this._questions       = [];          // all questions, display_order asc
    this._qIndex          = 0;           // which question is on screen
    this._audioPlayed     = false;       // audio is played once for ALL questions
  }

  async load() {
    this._container.className = 'lic-wrap';
    this._container.innerHTML = `<div class="lic-loading"><div class="spinner"></div><span>טוען פריט…</span></div>`;

    try {
      const { data: lecture, error: lErr } = await getLectureById(this._lectureId);
      if (lErr || !lecture) throw new Error(lErr?.message || 'קטע לא נמצא');

      const { data: questions, error: qErr } = await getLectureQuestions(this._lectureId);
      if (qErr) throw new Error(qErr.message);
      if (!questions?.length) throw new Error('לא נמצאה שאלה לקטע זה');

      this._lecture        = lecture;
      this._questions      = questions;
      this._transcript     = lecture.transcript || null;
      this._highlightSpans = Array.isArray(lecture.highlight_spans) ? lecture.highlight_spans : [];
      this._qIndex         = 0;
      this._audioPlayed    = false;

      this._renderQuestion();
    } catch (err) {
      this._container.innerHTML = `
        <div class="lic-error">שגיאה בטעינת הפריט: ${err.message}</div>`;
    }
  }

  get questionCount() { return this._questions.length; }

  _currentOptions(question) {
    // options: jsonb array of { text, k_code, fail_mode, explanation_he }
    return (question.options || []).map((opt, i) => ({
      ...opt,
      isCorrect: i === question.correct_option_index,
    }));
  }

  _renderQuestion() {
    const item     = this._lecture;
    const question = this._questions[this._qIndex];
    const options  = this._currentOptions(question);

    const hasAudio    = !!item.audio_url;
    const isSilent    = this._feedbackMode === 'silent';
    const hasContinue = !!this._onContinue;
    const isLast      = this._qIndex === this._questions.length - 1;
    const multi       = this._questions.length > 1;

    // Options stay locked only until the FIRST play of the audio; questions
    // after the first inherit the unlock (the real exam plays each clip once).
    const locked = hasAudio && !this._audioPlayed;

    this._answered = false;

    this._container.innerHTML = `
      <div class="lic-content">

        ${hasAudio ? `
          <div class="lic-section-label">האזן לקטע</div>
          <div id="lic-player"></div>
          <div class="lic-audio-lock" id="lic-audio-lock" ${locked ? '' : 'hidden'}>
            <span class="lic-audio-lock-icon">▶</span>
            הפעל את השמע לפני המענה
          </div>
        ` : ''}

        <div class="lic-question-block">
          <div class="lic-section-label">
            שאלה${multi ? ` ${this._qIndex + 1} מתוך ${this._questions.length}` : ''}
          </div>
          <div class="lic-question-text">${escHtml(question.question_text || '')}</div>
        </div>

        <div class="lic-options${locked ? ' lic-options--locked' : ''}" id="lic-options">
          ${options.map((opt, i) => `
            <button class="lic-option" data-index="${i}" data-correct="${opt.isCorrect}">
              <span class="lic-option-letter">${['א','ב','ג','ד'][i] || i + 1}</span>
              <span class="lic-option-text">${escHtml(opt.text || '')}</span>
            </button>
          `).join('')}
        </div>

        ${isSilent ? `
          <div class="lic-continue" id="lic-continue" hidden>
            <button class="btn-lic-continue">${isLast ? 'המשך ←' : 'לשאלה הבאה ←'}</button>
          </div>
        ` : `
          <div class="lic-feedback" id="lic-feedback" hidden>
            <div class="lic-verdict" id="lic-verdict"></div>
            <div class="lic-explanations" id="lic-explanations"></div>
            ${(hasContinue || !isLast) ? `
              <div class="lic-continue" id="lic-continue" hidden>
                <button class="btn-lic-continue">${isLast ? 'המשך ←' : 'לשאלה הבאה ←'}</button>
              </div>
            ` : ''}
          </div>
        `}

      </div>
    `;

    // Stop any previous audio before mounting a new player
    if (window._currentAudioPlayer && window._currentAudioPlayer !== this._player) {
      try { window._currentAudioPlayer.destroy(); } catch (_) {}
      window._currentAudioPlayer = null;
    }

    // Mount audio player — only for the first question; later questions of the
    // same lecture reuse "already played" state and show no player controls
    // reset (mounting a fresh player each render would tempt a replay).
    if (hasAudio && !this._audioPlayed) {
      const playerEl = this._container.querySelector('#lic-player');
      this._player = new AudioPlayer(playerEl, {
        src: item.audio_url,
        mode: 'single-pass',
        onFirstPlay: () => {
          this._audioPlayed = true;
          const optEl  = this._container.querySelector('#lic-options');
          const lockEl = this._container.querySelector('#lic-audio-lock');
          if (optEl)  optEl.classList.remove('lic-options--locked');
          if (lockEl) lockEl.hidden = true;
        },
      });
      window._currentAudioPlayer = this._player;
    } else if (hasAudio && this._audioPlayed) {
      // Later questions: the player's DOM was wiped by the re-render — release
      // the object too, and show a static "already played" note instead.
      if (this._player) {
        if (window._currentAudioPlayer === this._player) window._currentAudioPlayer = null;
        try { this._player.destroy(); } catch (_) {}
        this._player = null;
      }
      const playerEl = this._container.querySelector('#lic-player');
      if (playerEl) playerEl.innerHTML = `
        <div class="lic-audio-lock" style="opacity:.7">✓ הקטע הושמע — ענה על סמך מה ששמעת</div>`;
    }

    this._questionStartMs = performance.now();
    this._container.querySelector('#lic-options')
      .addEventListener('click', (e) => {
        const btn = e.target.closest('.lic-option');
        if (btn && !this._answered) this._handleAnswer(btn, options, question);
      });
  }

  _advanceQuestion() {
    const isLast = this._qIndex === this._questions.length - 1;
    if (isLast) {
      if (this._onContinue) this._onContinue();
    } else {
      this._qIndex++;
      this._renderQuestion();
    }
  }

  async _handleAnswer(btn, options, question) {
    this._answered = true;
    const latencyMs     = Math.round(performance.now() - this._questionStartMs);
    const selectedIndex = Number(btn.dataset.index);
    const isCorrect      = btn.dataset.correct === 'true';
    const selectedOpt    = options[selectedIndex];

    // Fire onAnswered immediately (before any UI updates)
    if (this._onAnswered) {
      this._onAnswered(isCorrect, {
        failMode:   isCorrect ? null : (selectedOpt?.fail_mode ?? null),
        questionId: question.id,
      });
    }

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
      const correctOpt = options.find(o => o.isCorrect);

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
            התשובה הנכונה: <strong>${escHtml(correctOpt?.text || '')}</strong>
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

        // Part 3: "איך יכולת לדעת?" — verbatim connective phrase(s) from the transcript
        // (tagged during content production, verified by verify_listening_explanations.py)
        if (this._highlightSpans?.length) {
          explHtml += `
            <div class="lic-cue-section">
              <div class="lic-cue-title">💡 איך יכולת לדעת?</div>
              ${this._highlightSpans.map(span => `
                <div class="lic-cue-quote">"${escHtml(span)}"</div>
              `).join('')}
            </div>`;
        }

        // Part 4: Key label (never "trap" — Hard Rule #8). Mapping lives in keys.js.
        const failMode = selectedOpt?.fail_mode;
        if (failMode) {
          explHtml += `
            <div class="lic-trap-section">
              <span class="lic-trap-badge">🔑 מפתח: ${escHtml(keyLabel(failMode))}</span>
            </div>`;
        }
      }
      this._container.querySelector('#lic-explanations').innerHTML = explHtml;
      this._container.querySelector('#lic-feedback').hidden = false;

      const continueEl = this._container.querySelector('#lic-continue');
      if (continueEl) {
        continueEl.hidden = false;
        continueEl.querySelector('button').addEventListener('click', () => {
          this._advanceQuestion();
        }, { once: true });
      }

    } else {
      // Silent mode: show continue button
      const continueEl = this._container.querySelector('#lic-continue');
      if (continueEl) {
        continueEl.hidden = false;
        continueEl.querySelector('button').addEventListener('click', () => {
          this._advanceQuestion();
        }, { once: true });
      }
    }

    // Save to DB (non-blocking)
    this._saveResponse({ questionId: question.id, selectedIndex, isCorrect, latencyMs })
      .catch(err => console.warn('[M3] save response failed:', err.message));
  }

  async _saveResponse({ questionId, selectedIndex, isCorrect, latencyMs }) {
    if (!this._sessionId) return;
    const session = await getCurrentSession();
    if (!session) return;

    const { error } = await saveQuestionResponse(this._sessionId, questionId, session.user.id, {
      chosenOptionIndex: selectedIndex,
      isCorrect,
      responseTimeMs: latencyMs,
    });

    if (error) throw new Error(error.message || String(error));
  }

  destroy() {
    if (this._player) {
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
