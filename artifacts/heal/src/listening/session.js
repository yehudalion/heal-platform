/**
 * M5 — Practice Session Loop
 *
 * Flow:
 *   Warmup brief  →  Warmup item (easiest)  →
 *   Core items x3 (targeting weakest_skill)  →
 *   Cooldown summary  →  navigate('/home')
 *
 * DB lifecycle:
 *   - Creates listening_session on entry
 *   - Updates items_completed after each answered item
 *   - On full completion: sets completed_at
 *   - On mid-session exit: sets abandoned_at_step
 */
import { supabase, getCurrentSession }   from '../supabase.js';
import { ListeningItem }                 from './item-component.js';
import { computeAndSaveReadiness }       from './readiness.js';
import { navigate }                      from '../router.js';
import './session.css';

// ─── Skill → Hebrew label ─────────────────────────────────────────────────────
const SKILL_LABELS = {
  main_idea:            'הרעיון המרכזי',
  detail_recall:        'זיכרון פרטים',
  inference:            'הסקת מסקנות',
  argument_navigation:  'ניווט טיעונים',
  syntactic_prediction: 'ניבוי תחבירי',
  speaker_stance:       'עמדת הדובר',
};

// ─── Module-level session state ───────────────────────────────────────────────
let _sessionId      = null;
let _phase          = null;    // 'brief'|'warmup'|'core'|'cooldown'|'done'
let _phaseIndex     = 0;       // item index within current phase (for abandon step)
let _warmupItem     = null;    // { id, ... }
let _coreItems      = [];      // [{ id, ... }, ...]
let _focusSkill     = null;
let _correctCount   = 0;
let _totalAnswered  = 0;
let _currentItem    = null;
let _abandonHandler = null;

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function renderSession(root) {
  // Reset module state
  _sessionId     = null;
  _phase         = null;
  _phaseIndex    = 0;
  _warmupItem    = null;
  _coreItems     = [];
  _focusSkill    = null;
  _correctCount  = 0;
  _totalAnswered = 0;
  _currentItem   = null;
  _cleanupAbandonHandler();

  root.className = 'sess-wrap';
  root.innerHTML = `<div class="sess-loading"><div class="spinner"></div><span>מכין פגישה…</span></div>`;

  // Require real auth session
  const session = await getCurrentSession();
  if (!session) {
    root.innerHTML = `
      <div class="sess-screen" style="align-items:center;justify-content:center;text-align:center;gap:16px;padding-top:60px;">
        <p style="font-size:1rem;font-weight:600;color:var(--text,#1A2E22)">יש להתחבר לחשבון כדי להתחיל</p>
        <button class="btn-sess-primary" style="max-width:220px"
          onclick="location.hash='/'">כניסה לחשבון</button>
      </div>`;
    return;
  }

  const userId = session.user.id;

  // Load user state (weakest_skill, readiness_score)
  const { data: userState } = await supabase
    .from('listening_user_state')
    .select('weakest_skill, readiness_score')
    .eq('user_id', userId)
    .maybeSingle();

  const weakestSkill    = userState?.weakest_skill   ?? null;
  const readinessBefore = userState?.readiness_score ?? 0;

  // Pick focus skill: user's dashboard choice > DB weakest_skill
  const storedSkill = sessionStorage.getItem('listening_focus_skill');
  sessionStorage.removeItem('listening_focus_skill');
  const chosenSkill = storedSkill || weakestSkill;

  // Select items for this session
  const { warmupItem, coreItems, focusSkill } = await _selectItems(userId, chosenSkill);

  if (!warmupItem && coreItems.length === 0) {
    root.innerHTML = `
      <div class="sess-screen" style="align-items:center;justify-content:center;padding-top:40px;">
        <div class="sess-card">
          <div class="sess-card-icon">📭</div>
          <h2 class="sess-card-title">אין פריטים זמינים</h2>
          <p class="sess-card-sub">ניסית כבר את כל הפריטים. נוסיף עוד בקרוב!</p>
          <div class="sess-actions">
            <button class="btn-sess-primary" onclick="location.hash='/home'">חזרה לדף הבית</button>
          </div>
        </div>
      </div>`;
    return;
  }

  _warmupItem = warmupItem;
  _coreItems  = coreItems;
  _focusSkill = focusSkill;

  const itemsPlanned = (_warmupItem ? 1 : 0) + _coreItems.length;

  // Create listening_session record
  try {
    const { data, error } = await supabase
      .from('listening_sessions')
      .insert({
        user_id:          userId,
        package_type:     'standard',
        focus_skill:      focusSkill,        // enum or null
        items_planned:    itemsPlanned,
        items_completed:  0,
        readiness_before: readinessBefore,
      })
      .select('id')
      .single();
    if (error) console.error('[M5] session create error:', error.message);
    _sessionId = data?.id ?? null;
    console.log('[M5] session created:', _sessionId);
  } catch (e) {
    console.error('[M5] session create failed:', e.message);
  }

  // Register abandon handler (fires on hashchange = user navigates away)
  _registerAbandonHandler();

  // Show warmup brief
  _phase = 'brief';
  _showWarmupBrief(root);
}

// ─── Item selection ───────────────────────────────────────────────────────────
async function _selectItems(userId, weakestSkill) {
  // 1. Get IDs of last 5 unique items this user has seen
  let recentItemIds = [];
  try {
    const { data: recentResps } = await supabase
      .from('listening_responses')
      .select('question_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentResps?.length) {
      const qIds = recentResps.map(r => r.question_id);
      const { data: recentQs } = await supabase
        .from('listening_questions')
        .select('item_id')
        .in('id', qIds);
      recentItemIds = [...new Set((recentQs || []).map(q => q.item_id))].slice(0, 5);
    }
  } catch (e) {
    console.warn('[M5] recent items fetch failed:', e.message);
  }

  // 2. Fetch all published items
  const { data: allItems, error } = await supabase
    .from('listening_items')
    .select('id, item_type, primary_skill, difficulty, accent')
    .eq('status', 'published');

  if (error) console.warn('[M5] items fetch error:', error.message);
  if (!allItems?.length) return { warmupItem: null, coreItems: [], focusSkill: null };

  // 3. Exclude recently seen (fall back to full pool if all seen)
  const fresh = allItems.filter(i => !recentItemIds.includes(i.id));
  const pool  = fresh.length > 0 ? fresh : allItems;

  // 4. Determine focus skill for this session
  const focusSkill = weakestSkill
    ?? pool.find(i => i.primary_skill)?.primary_skill
    ?? null;

  // 5. Sort: focus-skill items first, then by difficulty ascending
  const sorted = [...pool].sort((a, b) => {
    const aScore = (a.primary_skill === focusSkill ? 0 : 10) + (a.difficulty ?? 3);
    const bScore = (b.primary_skill === focusSkill ? 0 : 10) + (b.difficulty ?? 3);
    return aScore - bScore;
  });

  // 6. Warmup: absolute easiest item (regardless of skill)
  const byDiff    = [...pool].sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
  const warmupItem = byDiff[0] ?? null;

  // 7. Core: up to 3 items from skill-sorted pool, excluding warmup
  const warmupId = warmupItem?.id;
  const coreItems = sorted.filter(i => i.id !== warmupId).slice(0, 3);

  return { warmupItem, coreItems, focusSkill };
}

// ─── Screen: Warmup brief ─────────────────────────────────────────────────────
function _showWarmupBrief(root) {
  const skillLabel = SKILL_LABELS[_focusSkill] || 'כישורי האזנה';
  const total      = (_warmupItem ? 1 : 0) + _coreItems.length;

  root.innerHTML = `
    <div class="sess-screen sess-fade-in">
      ${_header(root)}
      ${_progressBar(-1, total)}
      <div class="sess-card">
        <div class="sess-card-icon">🎯</div>
        <h2 class="sess-card-title">מוכן/ה להתחיל?</h2>
        <p class="sess-card-sub">
          היום נתמקד ב<strong>${skillLabel}</strong>.<br>
          ${total} שאלות, בקצב שלך.
        </p>
        <div class="sess-actions">
          <button class="btn-sess-primary" id="btn-start">מתחילים! ←</button>
        </div>
      </div>
    </div>`;

  _attachExitBtn(root);
  root.querySelector('#btn-start').addEventListener('click', () => {
    if (_warmupItem) {
      _phase = 'warmup'; _phaseIndex = 0;
      _showItem(root, _warmupItem.id, 0);
    } else {
      _phase = 'core'; _phaseIndex = 0;
      _showItem(root, _coreItems[0].id, 0);
    }
  });
}

// ─── Screen: Item ─────────────────────────────────────────────────────────────
function _showItem(root, itemId, globalIndex) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  const total = (_warmupItem ? 1 : 0) + _coreItems.length;

  root.innerHTML = `
    <div class="sess-screen sess-fade-in">
      ${_header(root)}
      ${_progressBar(globalIndex, total)}
      <div id="sess-item-mount"></div>
    </div>`;

  _attachExitBtn(root);

  _currentItem = new ListeningItem(
    root.querySelector('#sess-item-mount'),
    {
      itemId,
      sessionId:    _sessionId,
      feedbackMode: 'full',
      onAnswered:   (isCorrect) => {
        _totalAnswered++;
        if (isCorrect) _correctCount++;
        _updateItemsCompleted(_totalAnswered); // non-blocking
      },
      onContinue: () => _advanceToNext(root, globalIndex),
    }
  );
  _currentItem.load();
}

// ─── Advance to next step ─────────────────────────────────────────────────────
function _advanceToNext(root, currentGlobalIndex) {
  const warmupCount = _warmupItem ? 1 : 0;
  const total       = warmupCount + _coreItems.length;
  const next        = currentGlobalIndex + 1;

  if (next >= total) {
    // All items done → cooldown
    _phase = 'cooldown';
    _showCooldown(root);
    return;
  }

  // Update phase tracking for abandon-step accuracy
  if (next < warmupCount) {
    _phase = 'warmup'; _phaseIndex = next;
    _showItem(root, _warmupItem.id, next);
  } else {
    _phase = 'core'; _phaseIndex = next - warmupCount;
    _showItem(root, _coreItems[_phaseIndex].id, next);
  }
}

// ─── Screen: Cooldown / Summary ───────────────────────────────────────────────
async function _showCooldown(root) {
  _phase = 'done';
  _cleanupAbandonHandler();

  // Brief loading while computing M6 and closing session
  root.innerHTML = `<div class="sess-loading"><div class="spinner"></div><span>מסכם פגישה…</span></div>`;

  const session = await getCurrentSession();
  const [, readinessData] = await Promise.all([
    _completeSession(),
    session ? computeAndSaveReadiness(session.user.id, supabase) : Promise.resolve(null),
  ]);

  const pct      = _totalAnswered > 0
    ? Math.round((_correctCount / _totalAnswered) * 100)
    : 0;
  const insight  = _buildInsight(pct, _focusSkill);
  const newScore = readinessData?.readiness_score ?? null;
  const conf     = readinessData?.readiness_confidence ?? null;

  const readinessBlock = newScore !== null ? `
    <div class="sess-readiness">
      <span class="sess-readiness-val">${newScore}%</span>
      <span class="sess-readiness-lbl">ציון מוכנות${conf === 'provisional' ? ' (ראשוני)' : ''}</span>
    </div>` : '';

  root.innerHTML = `
    <div class="sess-screen sess-fade-in" style="align-items:center;">
      <div class="sess-header" style="width:100%;max-width:640px;">
        <span></span>
        <span class="sess-header-title">סיכום פגישה</span>
        <span></span>
      </div>
      <div class="sess-summary">
        <div class="sess-summary-icon">🏁</div>
        <h2 class="sess-summary-title">סיימת את הפגישה!</h2>
        <div class="sess-summary-stats">
          <div class="sess-stat">
            <span class="sess-stat-val">${_totalAnswered}</span>
            <span class="sess-stat-lbl">שאלות</span>
          </div>
          <div class="sess-stat">
            <span class="sess-stat-val">${_correctCount}</span>
            <span class="sess-stat-lbl">נכון</span>
          </div>
          <div class="sess-stat">
            <span class="sess-stat-val">${pct}%</span>
            <span class="sess-stat-lbl">דיוק</span>
          </div>
        </div>
        ${readinessBlock}
        <p class="sess-insight">${insight}</p>
        <div class="sess-actions">
          <button class="btn-sess-primary" id="btn-finish">סיים פגישה ✓</button>
          <button class="btn-sess-secondary" id="btn-home">חזרה לתפריט הראשי</button>
        </div>
      </div>
    </div>`;

  root.querySelector('#btn-finish').addEventListener('click', () => navigate('/listening'));
  root.querySelector('#btn-home').addEventListener('click', () => { window.location.hash = '/home'; });
}

function _buildInsight(pct, skill) {
  const lbl = SKILL_LABELS[skill] || 'כישורי האזנה';
  if (pct >= 80) return `כל הכבוד! תוצאה מצוינת ב${lbl} 💪`;
  if (pct >= 60) return `עבודה טובה! ${lbl} משתפר.`;
  return `${lbl} מצריך עוד תרגול — נמשיך בפגישה הבאה.`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function _updateItemsCompleted(count) {
  if (!_sessionId || !supabase) return;
  try {
    await supabase
      .from('listening_sessions')
      .update({ items_completed: count })
      .eq('id', _sessionId);
  } catch (e) {
    console.warn('[M5] updateItemsCompleted failed:', e.message);
  }
}

async function _completeSession() {
  if (!_sessionId || !supabase) return;
  try {
    const { error } = await supabase
      .from('listening_sessions')
      .update({
        completed_at:    new Date().toISOString(),
        items_completed: _totalAnswered,
        // readiness_after: computed by M6
      })
      .eq('id', _sessionId);
    if (error) console.error('[M5] completeSession error:', error.message);
    else console.log('[M5] session completed:', _sessionId);
  } catch (e) {
    console.error('[M5] completeSession failed:', e.message);
  }
}

async function _saveAbandonStep() {
  if (!_sessionId || !supabase || _phase === 'done') return;
  const step = `${_phase}_${_phaseIndex}`;
  try {
    const { error } = await supabase
      .from('listening_sessions')
      .update({ abandoned_at_step: step })
      .eq('id', _sessionId);
    if (error) console.warn('[M5] saveAbandon error:', error.message);
    else console.log('[M5] abandoned at step:', step);
  } catch (e) {
    console.warn('[M5] saveAbandon failed:', e.message);
  }
}

// ─── Abandon / exit handlers ──────────────────────────────────────────────────
function _registerAbandonHandler() {
  _abandonHandler = () => {
    if (_phase && _phase !== 'done') {
      _saveAbandonStep();   // fire-and-forget; request completes in background
    }
    _cleanupAbandonHandler();
  };
  window.addEventListener('hashchange', _abandonHandler);
}

function _cleanupAbandonHandler() {
  if (_abandonHandler) {
    window.removeEventListener('hashchange', _abandonHandler);
    _abandonHandler = null;
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
/** Returns header HTML string (exit button + title). */
function _header() {
  return `
    <div class="sess-header">
      <button class="btn-sess-exit" id="btn-exit" title="יציאה מהפגישה">✕</button>
      <span class="sess-header-title">פגישת תרגול</span>
      <span style="width:36px"></span>
    </div>`;
}

/** Attaches click handler to #btn-exit after innerHTML is set. */
function _attachExitBtn(root) {
  const btn = root.querySelector('#btn-exit');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (_phase && _phase !== 'done') await _saveAbandonStep();
    _cleanupAbandonHandler();
    navigate('/home');
  });
}

/**
 * Returns progress-dots HTML.
 * @param {number} currentIndex – index of item currently shown (-1 = brief screen)
 * @param {number} total        – total number of items in session
 */
function _progressBar(currentIndex, total) {
  const warmupCount = _warmupItem ? 1 : 0;

  const phaseLabel = currentIndex < 0         ? ''
    : currentIndex < warmupCount              ? 'חימום'
    : 'ליבה';

  const dots = Array.from({ length: total }, (_, i) => {
    let cls = '';
    if (i < currentIndex)        cls = 'sess-dot--done';
    else if (i === currentIndex) cls = 'sess-dot--active';
    return `<div class="sess-dot ${cls}"></div>`;
  }).join('');

  return `
    <div class="sess-progress">
      <span class="sess-progress-phase">${phaseLabel}</span>
      <div class="sess-dots">${dots}</div>
    </div>`;
}
