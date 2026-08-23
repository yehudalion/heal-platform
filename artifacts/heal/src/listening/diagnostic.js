/**
 * M4 — Diagnostic Flow
 *
 * Screens:
 *   1. Headphone check
 *   2. text_continuation item  (silent — no feedback)
 *   3. lecture_qa item         (silent — no feedback)
 *   4. 3-second transition → navigate to first session (M5)
 *
 * On completion:
 *   - listening_session (is_diagnostic=TRUE) created + completed
 *   - listening_user_state upserted with has_completed_diagnostic=TRUE
 */
import { supabase, getCurrentSession } from '../supabase.js';
import { AudioPlayer }                 from './audio-player.js';
import { ListeningItem }               from './item-component.js';
import { navigate }                    from '../router.js';
import './diagnostic.css';

// ─── ⚠️ PARKED SCREEN — NOT part of the product's entry path ──────────────────
// SITEMAP.md: "listening/diagnostic.js — יוצא מנתיב הכניסה. מועמד להפוך
// ל'בדוק את עצמך' מרצון בהמשך. לא נמחק, לא פעיל."
//
// The forced-diagnostic concept was DROPPED. Nothing routes a user here
// automatically any more (the dashboard's auto-redirect was removed
// 2026-08-14); the route still exists so the screen can be reached directly
// if you want to look at it, and so the file is preserved for the possible
// future opt-in "test yourself" feature.
//
// Do NOT build on this file, and do not treat the item IDs below as a product
// decision — they are two arbitrary real rows chosen only so the screen does
// not crash if opened. (The original IDs 'cccc…'/'dddd…' never existed in
// listening_lectures, so this screen threw "קטע לא נמצא" for everyone.)
// If the opt-in version is ever built, choosing what it should actually test
// is an open product question.
const DIAG_TEXT_ITEM_ID    = 'e73f0172-262b-47b9-9d26-8443c4ca6e58'; // CONT-1: Canals
const DIAG_LECTURE_ITEM_ID = '03680e7f-e3d4-4691-b727-9d3b9e451eef'; // LQA-CAL2: coffeehouses
const HEADPHONE_AUDIO_URL  =
  'https://opjtromnkdgehlqeaqzi.supabase.co/storage/v1/object/public/heal-audio/abandoned_word.mp3';

// module-level refs so destroy() can reach them
let _sessionId   = null;
let _currentItem = null;
let _hpPlayer    = null;

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function renderDiagnostic(root) {
  _sessionId   = null;
  _currentItem = null;
  _hpPlayer    = null;

  root.className = 'diag-wrap';
  root.innerHTML = `<div class="diag-loading"><div class="spinner"></div><span>טוען…</span></div>`;

  // Require a real auth session (not guest)
  const session = await getCurrentSession();
  if (!session) {
    root.innerHTML = `
      <div class="diag-screen" style="align-items:center;justify-content:center;text-align:center;gap:16px;">
        <p style="font-size:1.05rem;color:var(--text,#1A2E22);font-weight:600;">יש להתחבר לחשבון כדי להתחיל את האבחון</p>
        <button class="btn-diag-primary" style="max-width:240px" onclick="location.hash='/'">כניסה לחשבון</button>
      </div>`;
    return;
  }

  // Create the session record now so responses can reference it
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .insert({
        user_id:         session.user.id,
        package_type:    'diagnostic',
        is_diagnostic:   true,
        items_planned:   2,
        items_completed: 0,
      })
      .select('id')
      .single();
    if (error) console.error('[M4] session insert error:', error.message, error);
    _sessionId = data?.id ?? null;
    console.log('[M4] session created:', _sessionId);
  } catch (e) {
    console.error('[M4] session create failed:', e.message);
  }

  _showScreen1(root);
}

// ─── Screen 1: Headphone check ────────────────────────────────────────────────
function _showScreen1(root) {
  root.innerHTML = `
    <div class="diag-screen diag-fade-in">
      ${_progressBar(0)}
      <div class="diag-card">
        <div class="diag-card-icon">🎧</div>
        <h2 class="diag-card-title">בדיקת אוזניות</h2>
        <p class="diag-card-sub">לפני שמתחילים — האזינ/י לקטע הקצר וודא/י שהשמע ברור.</p>
        <div id="diag-hp-player" class="diag-player-wrap"></div>
        <div class="diag-actions" id="diag-hp-actions">
          <button class="btn-diag-primary" id="btn-hear-ok">שומע/ת ברור ✓</button>
          <button class="btn-diag-ghost"   id="btn-hear-fail">לא שומע/ת</button>
        </div>
      </div>
    </div>
  `;

  if (_hpPlayer) { _hpPlayer.destroy(); _hpPlayer = null; }
  _hpPlayer = new AudioPlayer(
    root.querySelector('#diag-hp-player'),
    { src: HEADPHONE_AUDIO_URL, mode: 'normal' }
  );

  root.querySelector('#btn-hear-ok').addEventListener('click', () => {
    _hpPlayer.destroy(); _hpPlayer = null;
    _showScreen2(root);
  });

  root.querySelector('#btn-hear-fail').addEventListener('click', () => {
    root.querySelector('#diag-hp-actions').innerHTML = `
      <div class="diag-tips">
        <p class="diag-tips-title">💡 טיפים לפתרון בעיה:</p>
        <ul class="diag-tips-list">
          <li>בדוק/י שהאוזניות מחוברות ומוגדרות כהתקן הפעיל</li>
          <li>הגדל/י את עוצמת הקול במכשיר</li>
          <li>לחץ/י על Play שוב</li>
        </ul>
        <button class="btn-diag-primary" id="btn-retry">נסה/י שוב</button>
        <button class="btn-diag-ghost"   id="btn-skip-hp">המשך בכל מקרה</button>
      </div>
    `;
    root.querySelector('#btn-retry').addEventListener('click', () => {
      _hpPlayer.destroy(); _hpPlayer = null;
      _showScreen1(root);
    });
    root.querySelector('#btn-skip-hp').addEventListener('click', () => {
      _hpPlayer.destroy(); _hpPlayer = null;
      _showScreen2(root);
    });
  });
}

// ─── Screen 2: text_continuation (silent) ────────────────────────────────────
function _showScreen2(root) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  root.innerHTML = `
    <div class="diag-screen diag-fade-in">
      ${_progressBar(1)}
      <div id="diag-item-mount"></div>
    </div>
  `;

  _currentItem = new ListeningItem(
    root.querySelector('#diag-item-mount'),
    {
      lectureId:    DIAG_TEXT_ITEM_ID,
      sessionId:    _sessionId,
      feedbackMode: 'silent',
      onContinue:   () => _showScreen3(root),
    }
  );
  _currentItem.load();
}

// ─── Screen 3: lecture_qa (silent) ───────────────────────────────────────────
function _showScreen3(root) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  root.innerHTML = `
    <div class="diag-screen diag-fade-in">
      ${_progressBar(2)}
      <div id="diag-item-mount"></div>
    </div>
  `;

  _currentItem = new ListeningItem(
    root.querySelector('#diag-item-mount'),
    {
      lectureId:    DIAG_LECTURE_ITEM_ID,
      sessionId:    _sessionId,
      feedbackMode: 'silent',
      onContinue:   () => _showTransition(root),
    }
  );
  _currentItem.load();
}

// ─── Screen 4: 3-second transition ───────────────────────────────────────────
async function _showTransition(root) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  const texts = [
    'מנתח את התשובות שלך...',
    'בוחר נושאים שיתאימו לך...',
    'מתחילים בעוד רגע...',
  ];

  root.innerHTML = `
    <div class="diag-transition diag-fade-in">
      <div class="diag-transition-spinner"></div>
      <p class="diag-transition-text" id="diag-trans-txt">${texts[0]}</p>
    </div>
  `;

  // Cycle texts every second (1 → 2 → 3)
  let i = 0;
  const cycleId = setInterval(() => {
    i++;
    if (i >= texts.length) { clearInterval(cycleId); return; }
    const el = document.getElementById('diag-trans-txt');
    if (!el) { clearInterval(cycleId); return; }
    el.classList.remove('diag-txt-fade');
    void el.offsetWidth;                      // force reflow
    el.classList.add('diag-txt-fade');
    el.textContent = texts[i];
  }, 1000);

  // DB work + 3-second minimum run in parallel
  await Promise.all([
    _finalizeDiagnostic(),
    new Promise(r => setTimeout(r, 3000)),
  ]);

  clearInterval(cycleId);
  navigate('/listening/session');
}

// ─── DB finalization ──────────────────────────────────────────────────────────
async function _finalizeDiagnostic() {
  try {
    const session = await getCurrentSession();
    if (!session) { console.error('[M4] finalize: no session'); return; }

    const now    = new Date().toISOString();
    const userId = session.user.id;

    await Promise.all([
      // Mark session completed
      _sessionId
        ? supabase
            .from('listening_sessions')
            .update({ completed_at: now, items_completed: 2 })
            .eq('id', _sessionId)
        : Promise.resolve(),

      // FLAGGED 2026-08-14, not fixed: `listening_user_state` does not exist in
      // the DB (confirmed via information_schema — 0 rows possible, table is
      // absent, not just empty) and is not documented in SITEMAP.md or any doc
      // in docs/. This upsert will error every time and is caught below, so it
      // fails silently — has_completed_diagnostic never actually gets recorded,
      // which means dashboard.js's redirect-to-diagnostic check can never see
      // a "done" state either. This is a real, undesigned gap (a readiness-score
      // table + algorithm), not a naming mismatch like the rest of this file —
      // per CLAUDE.md ("if a table is not in SITEMAP.md, it has no owner —
      // flag it, do not build on it"), decide the schema with Lion before
      // writing it, not as a silent fix here.
      supabase
        .from('listening_user_state')
        .upsert(
          { user_id: userId, has_completed_diagnostic: true, updated_at: now },
          { onConflict: 'user_id' }
        ),
    ]);
    console.log('[M4] finalize: done');
  } catch (err) {
    console.error('[M4] finalize error:', err.message, err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _progressBar(step) {
  // step: 0 = headphone, 1 = item1, 2 = item2
  const labels = ['בדיקת שמע', 'שאלה 1', 'שאלה 2'];
  const dots = labels.map((lbl, i) => `
    <div class="diag-dot-wrap">
      <div class="diag-dot ${i < step ? 'diag-dot--done' : i === step ? 'diag-dot--active' : ''}"></div>
      <span class="diag-dot-lbl">${lbl}</span>
    </div>
  `).join('');
  return `
    <div class="diag-progress">
      <button class="btn-diag-home" onclick="window.location.hash='/home'">← ראשי</button>
      <span class="diag-progress-title">אבחון ראשוני</span>
      <div class="diag-dots">${dots}</div>
    </div>
  `;
}
