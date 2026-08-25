/**
 * M7 — Listening Section Dashboard
 *
 * REWRITTEN 2026-08-14. The previous version depended on listening_user_state
 * (a table that does not exist and has no owner in SITEMAP) and presented a
 * 4-skill picker whose categories appear nowhere else in the docs. Removed:
 * readiness score, streak counter (wellbeing rule — no streaks), skill grid,
 * accent breakdown, readiness chart.
 *
 * REVISED 2026-08-16 (Lion): the 3-Layer Rule is OUR architecture, not the
 * student's menu. The previous version exposed למידה/תרגול/ניתוח as three
 * buttons to choose between — wrong. The student walks one path:
 *   Learn (first visit only) → Practice → Analyze (end of session)
 * with a single standing exception Lion asked to keep: they may return to Learn
 * at any point, offered as a quiet secondary link rather than a peer choice.
 * Stats come from listening_sessions via the data layer only (ARCHITECTURE
 * §2.11, no direct Supabase calls from screens).
 */
import { getCurrentSession }     from '../supabase.js';
import { getListeningOverview } from '../data/listening.data.js';
import { getProfile }            from '../data/profiles.data.js';
import { navigate }              from '../router.js';
import { lengthPicker }          from '../lib/sessionPrefs.js';
import './dashboard.css';

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function renderListeningDashboard(root) {
  root.className = 'ldash-wrap';
  root.innerHTML = `<div class="ldash-loading"><div class="spinner"></div><span>טוען…</span></div>`;

  const session = await getCurrentSession();
  if (!session) {
    root.innerHTML = `
      <div class="ldash-body" style="align-items:center;justify-content:center;text-align:center;gap:16px;padding-top:60px;">
        <p style="font-size:1rem;font-weight:600;color:var(--text,#1A2E22)">יש להתחבר לחשבון</p>
        <button class="btn-ldash-primary" style="max-width:220px"
          onclick="location.hash='/'">כניסה לחשבון</button>
      </div>`;
    return;
  }

  const userId = session.user.id;

  const [{ data: overview }, profileRes] = await Promise.all([
    getListeningOverview(userId),
    getProfile(userId),
  ]);
  const examDate = profileRes?.data?.exam_date ?? null;

  _render(root, overview, examDate);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function _render(root, overview, examDate) {
  const daysLeft = _daysUntilExam(examDate);
  const answered = overview?.questionsAnswered ?? 0;
  const accuracy = overview?.accuracyPct;
  const sessions = overview?.sessionsCompleted ?? 0;
  // "First time" = has never practised here. Drives the flow, not a menu.
  const firstTime = sessions === 0 && answered === 0;

  const picker = lengthPicker('listening', [
    { v: 2, label: 'קצר',  sub: '2 קטעים · כ־5 דק׳'  },
    { v: 4, label: 'רגיל', sub: '4 קטעים · כ־10 דק׳' },
    { v: 6, label: 'ארוך', sub: '6 קטעים · כ־15 דק׳' },
  ], 4);

  root.innerHTML = `
    <div class="ldash-body">
      <h1 class="ldash-title">פינת האזנה 🎧</h1>

      <!-- ── Top strip: informational, never punitive ── -->
      <div class="ldash-strip">
        <div class="ldash-chip">
          <span class="ldash-chip-val">${daysLeft !== null ? daysLeft : '—'}</span>
          <span class="ldash-chip-lbl">ימים לבחינה</span>
          ${examDate
            ? `<span class="ldash-chip-sub">${_formatDate(examDate)}</span>`
            : `<span class="ldash-chip-sub">לא הוגדר</span>`}
        </div>
        <div class="ldash-chip">
          <span class="ldash-chip-val">${answered}</span>
          <span class="ldash-chip-lbl">שאלות נענו</span>
        </div>
        <div class="ldash-chip">
          <span class="ldash-chip-val ldash-chip-val--green">${accuracy != null ? accuracy + '%' : '—'}</span>
          <span class="ldash-chip-lbl">דיוק כולל</span>
          ${sessions ? `<span class="ldash-chip-sub">${sessions} פגישות</span>` : ''}
        </div>
      </div>

      <!-- ── One path; the learner chooses length, never layer (Lion 2026-08-25) ── -->
      <div class="ldash-main" style="gap:12px;">
        ${firstTime ? '' : picker.html}
        <button class="btn-ldash-primary" id="btn-go" style="display:flex;justify-content:space-between;align-items:center;text-align:right;">
          <span>${firstTime ? '🎧 בוא נתחיל' : '🎧 המשך תרגול'}</span>
          <span>←</span>
        </button>
        ${firstTime
          ? `<p class="ldash-main-note">מתחילים בהסבר קצר על מה לשים לב, ואז ישר לתרגול.</p>`
          : `<button class="btn-ldash-link" id="btn-relearn">חזרה להסבר: על מה לשים לב 📖</button>`}
      </div>

    </div>`;

  // Intro modal on first visit
  if (!localStorage.getItem('listening_intro_seen')) {
    _showIntroModal(root);
  }

  // The student never picks a layer. Learn -> Practice -> Analyze is one flow;
  // "למידה / תרגול / ניתוח" is OUR vocabulary for the 3-Layer Rule and stays
  // internal (Lion, 2026-08-16). The one exception he asked to keep: the student
  // may go back to Learn at any point, so it stays as a quiet secondary link.
  picker.wire(root);
  root.querySelector('#btn-go').addEventListener('click', () =>
    navigate(firstTime ? '/listening/learn' : '/listening/session'));
  root.querySelector('#btn-relearn')?.addEventListener('click', () => navigate('/listening/learn'));
}

// ─── Intro modal (shown once on first visit) ──────────────────────────────────
function _showIntroModal(root) {
  const overlay = document.createElement('div');
  overlay.className = 'ldash-modal-overlay';
  overlay.innerHTML = `
    <div class="ldash-modal" role="dialog" aria-modal="true">
      <h2 class="ldash-modal-title">פינת ההאזנה — איך זה עובד? 🎧</h2>
      <div class="ldash-modal-body">
        <p>פינה זו מכינה אותך לחלק ההאזנה של מבחן הלאל.</p>
        <p>בכל פגישה תשמע קטעים קצרים באנגלית ותענה על שאלות הבנה.</p>
        <p><strong>יש שני סוגי תרגילים:</strong></p>
        <ul>
          <li>▸ <strong>השלמת משפט</strong> — תשמע משפט שנחתך, תבחר איך הוא ממשיך</li>
          <li>▸ <strong>הבנת קטע</strong> — תשמע קטע או שיחה, תענה על שאלות על הנאמר</li>
        </ul>
        <p class="ldash-modal-note">⚠️ במבחן האמיתי אין השמעה חוזרת — לכן גם כאן כל קטע מושמע פעם אחת.</p>
      </div>
      <button class="btn-ldash-primary ldash-modal-cta" id="btn-intro-ok">
        הבנתי, בואו נתחיל ←
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#btn-intro-ok').addEventListener('click', () => {
    localStorage.setItem('listening_intro_seen', '1');
    overlay.classList.add('ldash-modal-overlay--out');
    setTimeout(() => overlay.remove(), 250);
  }, { once: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _daysUntilExam(examDate) {
  if (!examDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam  = new Date(examDate); exam.setHours(0, 0, 0, 0);
  return Math.ceil((exam - today) / 86400000);
}

function _formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
