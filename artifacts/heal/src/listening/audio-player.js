import _howler from 'howler';
import './audio-player.css';
import { registerStopper } from '../lib/sound.js';

// Vite pre-bundles howler as a default export wrapping its CJS exports.
// We extract Howl this way to handle both pre-bundled and native CJS forms.
const Howl = _howler?.Howl ?? _howler?.default?.Howl ?? window.Howl;

function fmt(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SVG = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,3 20,12 6,21"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  back10: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.5 8.5A9 9 0 1 1 4 16"/><polyline points="1,5 4,8.5 7.5,6"/><text x="8.5" y="15.5" font-size="6.5" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>`,
  fwd10:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21.5 8.5A9 9 0 1 0 20 16"/><polyline points="23,5 20,8.5 16.5,6"/><text x="7.5" y="15.5" font-size="6.5" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>`,
  replay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3,4 3,9 8,9"/></svg>`,
};

export class AudioPlayer {
  /**
   * @param {HTMLElement} container
   * @param {{ src: string, mode?: 'normal'|'single-pass', onFirstPlay?: () => void }} options
   */
  constructor(container, { src, mode = 'normal', onFirstPlay = null } = {}) {
    this._container = container;
    this._mode = mode;
    this._locked = false;
    this._hasStarted = false;
    this._ended = false; // single-pass: audio finished, replay (from 0) is offered
    this._onFirstPlay = onFirstPlay;
    this._raf = null;
    // כל ניווט (hashchange) עוצר את הנגן — ראו lib/sound.js.
    this._unregister = registerStopper(() => this.destroy());

    // Pause when browser/OS interrupts (incoming call, app switch, screen lock)
    this._visibilityHandler = () => {
      if (document.hidden && this._howl?.playing()) {
        this._howl.pause();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this._howl = new Howl({
      src: [src],
      html5: true, // required for long files + mobile streaming
      onload: () => {
        this._duration = this._howl.duration();
        this._timeDuration.textContent = fmt(this._duration);
        this._container.classList.remove('ap-loading');
      },
      onplay: () => this._syncPlay(),
      onpause: () => this._syncPause(),
      onstop: () => this._syncPause(),
      onend: () => this._onEnd(),
      onloaderror: () => this._showError('שגיאה בטעינת קובץ השמע'),
      onplayerror: (id, err) => {
        // iOS unlock: retry after user-gesture unlock fires
        this._howl.once('unlock', () => {
          if (!this._locked) this._howl.play();
        });
      },
    });

    this._duration = 0;
    this._render();
    this._bindEvents();
  }

  _render() {
    const isNormal = this._mode === 'normal';

    this._container.className = `ap-wrap ap-loading${isNormal ? '' : ' ap-mode-single-pass'}`;
    this._container.innerHTML = `
      <div class="ap-controls">
        ${isNormal ? `
          <button class="ap-btn ap-btn-skip" data-skip="-10" aria-label="אחורה 10 שניות">
            ${SVG.back10}
          </button>
        ` : ''}

        <button class="ap-btn ap-btn-play" aria-label="נגן">
          <span class="ap-icon ap-icon-play">${SVG.play}</span>
          <span class="ap-icon ap-icon-pause" hidden>${SVG.pause}</span>
          <span class="ap-icon ap-icon-lock" hidden>${SVG.lock}</span>
          <span class="ap-icon ap-icon-replay" hidden>${SVG.replay}</span>
        </button>

        ${isNormal ? `
          <button class="ap-btn ap-btn-skip" data-skip="10" aria-label="קדימה 10 שניות">
            ${SVG.fwd10}
          </button>
        ` : ''}
      </div>

      <div class="ap-seek-row">
        <span class="ap-time ap-time-current">0:00</span>
        <div class="ap-seek-bar" role="slider" aria-label="מיקום בשמע"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="ap-track">
            <div class="ap-fill"></div>
            <div class="ap-thumb"></div>
          </div>
        </div>
        <span class="ap-time ap-time-duration">–:––</span>
      </div>

      <div class="ap-error" hidden></div>
    `;

    this._btnPlay     = this._container.querySelector('.ap-btn-play');
    this._iconPlay    = this._container.querySelector('.ap-icon-play');
    this._iconPause   = this._container.querySelector('.ap-icon-pause');
    this._iconLock    = this._container.querySelector('.ap-icon-lock');
    this._iconReplay  = this._container.querySelector('.ap-icon-replay');
    this._seekBar     = this._container.querySelector('.ap-seek-bar');
    this._fill        = this._container.querySelector('.ap-fill');
    this._thumb       = this._container.querySelector('.ap-thumb');
    this._timeCurrent = this._container.querySelector('.ap-time-current');
    this._timeDuration= this._container.querySelector('.ap-time-duration');
    this._errorEl     = this._container.querySelector('.ap-error');
  }

  _bindEvents() {
    this._btnPlay.addEventListener('click', () => {
      if (!this._locked) this.togglePlay();
    });

    // Skip ±10s (normal mode only)
    this._container.querySelectorAll('.ap-btn-skip').forEach(btn => {
      btn.addEventListener('click', () => this._skip(parseInt(btn.dataset.skip, 10)));
    });

    this._bindSeek();
  }

  _bindSeek() {
    if (this._mode === 'single-pass') return; // no seeking in single-pass

    const bar = this._seekBar;
    let dragging = false;

    const getPos = (e) => {
      const rect = bar.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const doSeek = (e) => {
      if (!dragging || this._locked) return;
      const dur = this._howl.duration();
      if (dur > 0) {
        this._howl.seek(getPos(e) * dur);
        this._updateProgress();
      }
    };

    bar.addEventListener('mousedown', (e) => { dragging = true; doSeek(e); });
    bar.addEventListener('touchstart', (e) => { dragging = true; doSeek(e); }, { passive: true });
    document.addEventListener('mousemove', doSeek);
    document.addEventListener('touchmove', (e) => doSeek(e), { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
  }

  _skip(secs) {
    if (this._locked) return;
    const cur = typeof this._howl.seek() === 'number' ? this._howl.seek() : 0;
    const dur = this._howl.duration();
    this._howl.seek(Math.max(0, Math.min(dur, cur + secs)));
    this._updateProgress();
  }

  togglePlay() {
    if (this._locked) return;
    if (this._howl.playing()) {
      this._howl.pause();
    } else {
      // Single-pass clips don't rewind mid-play, but a finished clip can be
      // replayed from the start (the real exam allows re-hearing a clip,
      // just not skipping/scrubbing within it).
      if (this._mode === 'single-pass' && this._ended) {
        this._howl.seek(0);
      }
      this._howl.play();
    }
  }

  _syncPlay() {
    if (!this._hasStarted && this._onFirstPlay) {
      this._onFirstPlay();
    }
    this._hasStarted = true;
    this._ended = false;
    this._iconPlay.hidden   = true;
    this._iconPause.hidden  = false;
    this._iconLock.hidden   = true;
    this._iconReplay.hidden = true;
    this._btnPlay.setAttribute('aria-label', 'השהה');
    this._startRaf();
  }

  _syncPause() {
    this._iconPlay.hidden   = false;
    this._iconPause.hidden  = true;
    this._iconLock.hidden   = true;
    this._iconReplay.hidden = true;
    this._btnPlay.setAttribute('aria-label', 'נגן');
    this._stopRaf();
    this._updateProgress();
  }

  _onEnd() {
    this._stopRaf();
    this._updateProgress();

    if (this._mode === 'single-pass') {
      // The real exam allows re-hearing a clip (just not seeking within it),
      // so a finished single-pass clip stays playable — offered as replay.
      this._ended = true;
      this._iconPlay.hidden   = true;
      this._iconPause.hidden  = true;
      this._iconLock.hidden   = true;
      this._iconReplay.hidden = false;
      this._btnPlay.setAttribute('aria-label', 'השמע שוב');
    } else {
      // Normal mode: reset to play state
      this._iconPlay.hidden  = false;
      this._iconPause.hidden = true;
      this._iconLock.hidden  = true;
      this._btnPlay.setAttribute('aria-label', 'נגן שוב');
    }
  }

  _startRaf() {
    const tick = () => {
      if (this._howl.playing()) {
        this._updateProgress();
        this._raf = requestAnimationFrame(tick);
      }
    };
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(tick);
  }

  _stopRaf() {
    cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _updateProgress() {
    const seek = this._howl.seek();
    if (typeof seek !== 'number') return;
    const dur = this._howl.duration() || 1;
    const pct = Math.min(100, (seek / dur) * 100);
    this._fill.style.width = pct + '%';
    this._thumb.style.left = pct + '%';
    this._timeCurrent.textContent = fmt(seek);
    this._seekBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  _showError(msg) {
    this._container.classList.remove('ap-loading');
    this._errorEl.textContent = msg;
    this._errorEl.hidden = false;
    this._btnPlay.disabled = true;
  }

  destroy() {
    if (this._destroyed) return;   // נקרא גם מהמסך וגם מ-stopAll — פעם אחת מספיקה
    this._destroyed = true;
    this._unregister?.();
    this._stopRaf();
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    this._howl.unload();
    this._container.innerHTML = '';
    this._container.className = '';
  }
}
