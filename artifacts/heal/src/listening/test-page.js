/**
 * M2 — Temporary audio player test page.
 * Route: #/listening/test
 * No auth required — designed for real-device testing before M3.
 * DELETE or gate behind auth before production.
 */
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { AudioPlayer } from './audio-player.js';

const PAGE_CSS = `
<style>
.lt-page {
  min-height: 100vh;
  background: var(--bg, #F5F1E8);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px 48px;
  box-sizing: border-box;
  direction: rtl;
  font-family: 'Inter', 'Heebo', Arial, sans-serif;
}
.lt-badge {
  background: #FFF3CD;
  border: 1px solid #FFD166;
  color: #7A6000;
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 10px;
}
.lt-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text, #14201A);
  margin-bottom: 4px;
  text-align: center;
}
.lt-sub {
  font-size: 0.82rem;
  color: var(--muted, #5C6B60);
  margin-bottom: 24px;
  text-align: center;
}
.lt-item-info {
  font-size: 0.88rem;
  color: var(--text, #14201A);
  margin-bottom: 20px;
  text-align: center;
  max-width: 340px;
}
.lt-section {
  width: 100%;
  max-width: 420px;
  margin-bottom: 28px;
}
.lt-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted, #5C6B60);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
  direction: rtl;
}
.lt-fallback {
  width: 100%;
  max-width: 420px;
  background: var(--card, #FFFDF7);
  border: 1px solid var(--border, #E3DDCC);
  border-radius: var(--radius, 18px);
  padding: 20px;
  font-size: 0.85rem;
  color: var(--text, #14201A);
  text-align: right;
}
.lt-fallback p { margin-bottom: 12px; }
.lt-url-row { display: flex; gap: 8px; }
.lt-url-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border, #E3DDCC);
  border-radius: var(--radius-sm, 10px);
  font-size: 0.82rem;
  direction: ltr;
  outline: none;
}
.lt-url-input:focus { border-color: var(--green, #1F5C43); }
.lt-url-btn {
  padding: 10px 18px;
  background: var(--green, #1F5C43);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 10px);
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}
.lt-url-btn:active { opacity: 0.8; }
.lt-status-err { color: var(--red, #B4553E); font-size: 0.82rem; }
.lt-status-ok  { color: var(--green, #1F5C43); font-size: 0.82rem; }
</style>
`;

let _normalPlayer = null;
let _singlePlayer = null;

export async function renderListeningTest(root) {
  // Tear down any previous players (e.g., if navigating back here)
  if (_normalPlayer) { _normalPlayer.destroy(); _normalPlayer = null; }
  if (_singlePlayer) { _singlePlayer.destroy(); _singlePlayer = null; }

  root.innerHTML = PAGE_CSS + `
    <div class="lt-page">
      <div class="lt-badge">עמוד בדיקה זמני — M2</div>
      <div class="lt-title">בדיקת נגן שמע</div>
      <div class="lt-sub">Audio Player Component · Howler.js</div>
      <div id="lt-item-info" class="lt-item-info"></div>

      <div class="lt-section" id="lt-section-normal">
        <div class="lt-label">מצב רגיל (normal)</div>
        <div id="lt-ap-normal"></div>
      </div>

      <div class="lt-section" id="lt-section-single">
        <div class="lt-label">מצב חד-פעמי (single-pass)</div>
        <div id="lt-ap-single"></div>
      </div>

      <div class="lt-fallback" id="lt-fallback" hidden>
        <p>לא נמצא פריט שמע ב-DB. הדבק/י URL לקובץ שמע לבדיקה ידנית:</p>
        <div class="lt-url-row">
          <input id="lt-url-input" class="lt-url-input" type="url"
                 placeholder="https://…/audio.mp3" autocomplete="off"/>
          <button id="lt-url-btn" class="lt-url-btn">טען</button>
        </div>
      </div>
    </div>
  `;

  const infoEl = document.getElementById('lt-item-info');
  let audioUrl = null;

  if (isSupabaseConfigured && supabase) {
    infoEl.innerHTML = `<span class="lt-status-ok">מחפש פריט שמע ב-DB…</span>`;
    try {
      const { data, error } = await supabase
        .from('listening_lectures')
        .select('id, title, audio_url')
        .eq('is_published', true)
        .not('audio_url', 'is', null)
        .limit(1)
        .maybeSingle();

      if (data?.audio_url) {
        audioUrl = data.audio_url;
        const title = data.title || `פריט #${data.id}`;
        infoEl.innerHTML = `<strong>${title}</strong>`;
      } else {
        infoEl.innerHTML = `<span class="lt-status-err">לא נמצא listening_lectures עם is_published=true ו-audio_url${error ? ` (${error.message})` : ''}</span>`;
      }
    } catch (e) {
      infoEl.innerHTML = `<span class="lt-status-err">שגיאה: ${e.message}</span>`;
    }
  } else {
    infoEl.innerHTML = `<span class="lt-status-err">Supabase לא מוגדר — השתמש/י ב-URL ידני</span>`;
  }

  if (audioUrl) {
    _initPlayers(audioUrl);
  } else {
    document.getElementById('lt-fallback').hidden = false;
    document.getElementById('lt-url-btn').addEventListener('click', () => {
      const url = document.getElementById('lt-url-input').value.trim();
      if (!url) return;
      document.getElementById('lt-fallback').hidden = true;
      infoEl.innerHTML = `URL ידני`;
      _initPlayers(url);
    });
    document.getElementById('lt-url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('lt-url-btn').click();
    });
  }
}

function _initPlayers(src) {
  if (_normalPlayer) { _normalPlayer.destroy(); _normalPlayer = null; }
  if (_singlePlayer) { _singlePlayer.destroy(); _singlePlayer = null; }

  _normalPlayer = new AudioPlayer(document.getElementById('lt-ap-normal'), {
    src,
    mode: 'normal',
  });
  _singlePlayer = new AudioPlayer(document.getElementById('lt-ap-single'), {
    src,
    mode: 'single-pass',
  });
}
