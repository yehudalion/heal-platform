/**
 * M5 — Practice Session Loop
 *
 * Flow:
 *   Warmup brief  →  Warmup item (easiest continuation)  →
 *   Core items (continuations + one lecture_qa when available)  →
 *   Cooldown = the Analyze layer's SOFT SESSION SUMMARY (SITEMAP §3:
 *   "ניתוח — סיכום רך בסוף סשן") → back to /listening.
 *
 * DB lifecycle (real schema — listening_sessions is scoped to ONE lecture):
 *   - A fresh listening_session row is created right before each item is shown
 *     (startSession, with the item's REAL question count) and closed right
 *     after all its questions are answered (completeSession with the number
 *     answered correctly). The multi-item "session" the student experiences
 *     is a client-side sequence over several single-lecture DB sessions.
 *
 * Wellbeing + descriptive-phrasing rules: the summary describes the SESSION,
 * never the student ("בסשן הזה…"), no loss framing, no streaks.
 */
import { getCurrentSession }                                  from '../supabase.js';
import { getLectures, getLectureQuestions, getRecentLectureIds, startSession, completeSession } from '../data/listening.data.js';
import { getGuestSeenIds, addGuestSeenIds }                    from '../lib/learner.js';
import { ListeningItem }                 from './item-component.js';
import { summarizeMistakes }             from './keys.js';
import { navigate }                      from '../router.js';
import { getSessionLength, getSessionType } from '../lib/sessionPrefs.js';
import './session.css';
import '../lib/signIn.js';

// ─── Module-level session state ───────────────────────────────────────────────
let _items          = [];      // [{ id, item_type, ... }] in play order (index 0 = warmup)
let _correctCount   = 0;
let _totalAnswered  = 0;
let _mistakeModes   = [];      // fail_mode of every wrong answer chosen this session
let _currentItem    = null;
let _currentDbSessionId = null;
let _itemCorrect    = 0;       // correct answers within the item on screen

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function renderSession(root) {
  _items          = [];
  _correctCount   = 0;
  _totalAnswered  = 0;
  _mistakeModes   = [];
  _currentItem    = null;
  _currentDbSessionId = null;
  _itemCorrect    = 0;

  root.className = 'sess-wrap';
  root.innerHTML = `<div class="sess-loading"><div class="spinner"></div><span>מכין פגישה…</span></div>`;

  // 2.9.2026 (ליאון): "אני לא רואה סיבה שלא לתת לאורח להשתמש בכל המודולים".
  // ההאזנה כבר לא כתובה על ה-DB באמצע התרגול (startSession/completeSession
  // רצות רק if (session) למטה, item-component.js כבר בודק !this._sessionId
  // לפני כתיבה) — הקיר כאן היה השריד היחיד שחסם אורח, בלי סיבה מבנית.
  // אורח מקבל את אותו לוגיקת בחירת פריטים, עם "כבר נראה" מקומי בדפדפן
  // (getGuestSeenIds) במקום ההיסטוריה ב-DB.
  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;

  _items = await _selectItems(userId);
  if (!userId && _items.length) addGuestSeenIds('listening', _items.map(i => i.id));

  if (_items.length === 0) {
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

  _showWarmupBrief(root);
}

// ─── Item selection ───────────────────────────────────────────────────────────
/**
 * Session shape, sized by the learner's choice on the dashboard (default 4):
 *   1 warmup (easiest continuation) + (n-2) continuations + 1 lecture_qa.
 * A short session (2) is warmup + lecture_qa. Recently-seen lectures excluded.
 */
async function _selectItems(userId) {
  // אורח: אין לו שורות ב-listening_sessions, אז ה"נראה לאחרונה" מגיע
  // מ-localStorage (lib/learner.js) ולא מה-DB — אותו דפוס כמו reading-practice.js.
  const recentIds = userId
    ? (await getRecentLectureIds(userId, { limit: 10 })).data
    : getGuestSeenIds('listening');

  const fetchPool = async (itemType) => {
    let { data: pool, error } = await getLectures({
      itemType, excludeIds: recentIds || [], limit: 100,
    });
    if (error) console.warn('[M5] lectures fetch error:', error.message);
    if (!pool?.length) {
      ({ data: pool } = await getLectures({ itemType, limit: 100 }));
    }
    return pool || [];
  };

  // Warmup + core, built from one already-fetched pool: easiest item first,
  // then (target - 1) more, shuffled. Shared by both single-type branches
  // below so 'continuation only' and 'lecture_qa only' behave identically
  // apart from which pool they draw from.
  const oneTypeSession = (pool, target) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const byDiff = [...shuffled].sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
    const out = [];
    if (byDiff[0]) out.push(byDiff[0]);
    out.push(...shuffled.filter(i => i.id !== out[0]?.id).slice(0, Math.max(0, target - 1)));
    return out;
  };

  const target = getSessionLength('listening', 4);

  // Practice-type filter (Lion, 2026-08-26 - lib/sessionPrefs.js's typePicker
  // on the dashboard). 'mixed' is the ORIGINAL, unchanged composition below -
  // this is additive, not a rewrite of the default path.
  const type = getSessionType('listening', 'mixed');

  if (type === 'continuation') {
    return oneTypeSession(await fetchPool('continuation'), target);
  }
  if (type === 'lecture_qa') {
    return oneTypeSession(await fetchPool('lecture_qa'), target);
  }

  // 'mixed' (default): 1 warmup (easiest continuation) + up to (target - 2)
  // more continuations + 1 lecture_qa when the pool has one.
  const [contPool, lqaPool] = await Promise.all([
    fetchPool('continuation'),
    fetchPool('lecture_qa'),
  ]);

  const items = [];

  // Warmup: easiest continuation
  const contShuffled = [...contPool].sort(() => Math.random() - 0.5);
  const byDiff = [...contShuffled].sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
  if (byDiff[0]) items.push(byDiff[0]);

  // Core: continuations up to (target - 2), leaving room for one lecture_qa
  const moreConts = Math.max(0, target - 2);
  items.push(...contShuffled.filter(i => i.id !== items[0]?.id).slice(0, moreConts));

  // Core: 1 lecture_qa (multi-question item) when the pool has one
  const lqaShuffled = [...lqaPool].sort(() => Math.random() - 0.5);
  if (lqaShuffled[0]) items.push(lqaShuffled[0]);

  return items;
}

// ─── Screen: Warmup brief ─────────────────────────────────────────────────────
function _showWarmupBrief(root) {
  const total = _items.length;

  root.innerHTML = `
    <div class="sess-screen sess-fade-in">
      ${_header(root)}
      ${_progressBar(-1, total)}
      <div class="sess-card">
        <div class="sess-card-icon">🎯</div>
        <h2 class="sess-card-title">מוכן/ה להתחיל?</h2>
        <p class="sess-card-sub">
          תרגול האזנה: ${total} קטעים, בקצב שלך.<br>
          אפשר להשמיע כל קטע שוב מההתחלה (אבל לא להתקדם/לחזור בתוכו) — כמו במבחן.
        </p>
        <div class="sess-actions">
          <button class="btn-sess-primary" id="btn-start">מתחילים! ←</button>
        </div>
      </div>
    </div>`;

  _attachExitBtn(root);
  root.querySelector('#btn-start').addEventListener('click', () => {
    _showItem(root, 0);
  });
}

// ─── Screen: Item ─────────────────────────────────────────────────────────────
async function _showItem(root, index) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  const total     = _items.length;
  const lectureId = _items[index].id;

  root.innerHTML = `
    <div class="sess-screen sess-fade-in">
      ${_header(root)}
      ${_progressBar(index, total)}
      <div id="sess-item-mount"></div>
    </div>`;

  _attachExitBtn(root);

  // One listening_sessions row per lecture attempt, with the REAL question
  // count (continuation = 1, lecture_qa = 1-2+).
  const session = await getCurrentSession();
  _currentDbSessionId = null;
  _itemCorrect = 0;

  let questionCount = 1;
  const { data: questions } = await getLectureQuestions(lectureId);
  if (questions?.length) questionCount = questions.length;

  if (session) {
    const { data, error } = await startSession(session.user.id, lectureId, questionCount);
    if (error) console.warn('[M5] startSession failed:', error.message);
    _currentDbSessionId = data?.id ?? null;
  }

  _currentItem = new ListeningItem(
    root.querySelector('#sess-item-mount'),
    {
      lectureId,
      sessionId:    _currentDbSessionId,
      feedbackMode: 'full',
      onAnswered:   (isCorrect, meta) => {
        _totalAnswered++;
        if (isCorrect) { _correctCount++; _itemCorrect++; }
        else if (meta?.failMode) _mistakeModes.push(meta.failMode);
      },
      onContinue: () => {
        if (_currentDbSessionId) {
          completeSession(_currentDbSessionId, _itemCorrect)
            .catch(e => console.warn('[M5] completeSession failed:', e.message));
        }
        _advanceToNext(root, index);
      },
    }
  );
  _currentItem.load();
}

// ─── Advance to next step ─────────────────────────────────────────────────────
function _advanceToNext(root, currentIndex) {
  const next = currentIndex + 1;
  if (next >= _items.length) {
    _showCooldown(root);
    return;
  }
  _showItem(root, next);
}

// ─── Screen: Cooldown = the Analyze layer's soft session summary ─────────────
async function _showCooldown(root) {
  const pct = _totalAnswered > 0
    ? Math.round((_correctCount / _totalAnswered) * 100)
    : 0;

  // Descriptive summary of THIS session (never the student) — keys.js owns
  // the raw-tag → student-language mapping (dual-labeling rule).
  const { headline, details } = summarizeMistakes(_mistakeModes);

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

        <p class="sess-insight">${headline}</p>
        ${details.length ? `
          <div style="width:100%;max-width:480px;text-align:right;display:flex;flex-direction:column;gap:8px;margin-top:4px;">
            ${details.map(d => `
              <div style="display:flex;gap:8px;align-items:flex-start;font-size:.9rem;color:var(--text, #14201A);">
                <span style="flex-shrink:0;">🔑</span>
                <span>${escHtml(d.label)}${d.n > 1 ? ` <strong>(×${d.n})</strong>` : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="sess-actions">
          <button class="btn-sess-primary" id="btn-analyze">מה למדנו מהפגישה ←</button>
          <button class="btn-sess-secondary" id="btn-finish">סיום</button>
        </div>
      </div>
    </div>`;

  // Analyze is the END of the flow, not a menu item the student picks (Lion,
  // 2026-08-16): Learn -> Practice -> Analyze runs as one path. The layer names
  // are our internal vocabulary and are never shown as a chooser.
  root.querySelector('#btn-analyze').addEventListener('click', () => navigate('/listening/analyze'));
  root.querySelector('#btn-finish').addEventListener('click', () => navigate('/listening'));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function _header() {
  // Reachable "how do I solve this" mid-session (Lion, 2026-08-27 — the same
  // always-there guide link rephrase-practice.js already has via "📘 מדריך").
  // Points at listening/readiness.js's renderListeningLearn, already reachable
  // pre-session from the dashboard's "חזרה להסבר" button — this just makes it
  // reachable DURING a session too, not only before starting one.
  return `
    <div class="sess-header">
      <button class="btn-sess-exit" id="btn-exit" title="חזרה לדף הבית">←</button>
      <span class="sess-header-title">פגישת תרגול</span>
      <button class="btn-sess-guide" id="btn-guide" title="איך מקשיבים נכון" aria-label="איך מקשיבים נכון">?</button>
    </div>`;
}

/**
 * Attaches click handler to #btn-exit after innerHTML is set.
 * A session row already created for the item on screen is simply left
 * incomplete (completed_at stays NULL) — enough signal for analytics.
 */
function _attachExitBtn(root) {
  const btn = root.querySelector('#btn-exit');
  if (!btn) return;
  btn.addEventListener('click', () => navigate('/home'));
  root.querySelector('#btn-guide')?.addEventListener('click', () => navigate('/listening/learn'));
}

function _progressBar(currentIndex, total) {
  const phaseLabel = currentIndex < 0 ? ''
    : currentIndex === 0 ? 'חימום'
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
