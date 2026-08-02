/**
 * M7 — Listening Section Dashboard
 *
 * Smart entry point for the listening section:
 *   - If user hasn't completed diagnostic → redirect to /listening/diagnostic
 *   - Otherwise → show the dashboard
 *
 * Three blocks:
 *   1. Top strip   — readiness score, exam countdown, streak
 *   2. Main block  — Start session CTA + focus recommendation
 *   3. Bottom block — mini readiness chart, weakest accent, placeholders
 *
 * Data sources:
 *   - listening_user_state  (all listening stats)
 *   - user_profiles         (exam_date only — READ ONLY)
 */
import { supabase, getCurrentSession } from '../supabase.js';
import { navigate }                    from '../router.js';
import './dashboard.css';

// ─── Label maps ───────────────────────────────────────────────────────────────
const SKILL_LABELS = {
  syntactic_prediction: 'ניבוי תחבירי',
  argument_navigation:  'ניווט טיעונים',
  speaker_stance:       'עמדת הדובר',
  realtime_processing:  'עיבוד בזמן אמת',
};

const ACCENT_LABELS = {
  us:     'אמריקאי',
  uk_rp:  'בריטי (RP)',
  au:     'אוסטרלי',
  sa:     'דרום אפריקאי',
  in:     'הודי',
};

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

  // Fetch user's listening state + profile in parallel
  const [stateRes, profileRes] = await Promise.all([
    supabase
      .from('listening_user_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('exam_date')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const state    = stateRes.data;
  const examDate = profileRes.data?.exam_date ?? null;

  // If diagnostic not completed, redirect
  if (!state?.has_completed_diagnostic) {
    navigate('/listening/diagnostic');
    return;
  }

  _render(root, state, examDate);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function _render(root, state, examDate) {
  const score      = state?.readiness_score      ?? 0;
  const conf       = state?.readiness_confidence ?? 'provisional';
  const streak     = state?.streak_days          ?? 0;
  const history    = Array.isArray(state?.readiness_history) ? state.readiness_history : [];
  const weakSkill  = state?.weakest_skill  ?? null;
  const weakAccent = state?.weakest_accent ?? null;
  const skillAcc   = state?.skill_accuracy  ?? {};
  const accentAcc  = state?.accent_accuracy ?? {};

  const daysLeft  = _daysUntilExam(examDate);
  const skillLbl  = SKILL_LABELS[weakSkill]  || null;
  const accentLbl = ACCENT_LABELS[weakAccent] || weakAccent || '—';

  root.innerHTML = `
    <div class="ldash-body">
      <h1 class="ldash-title">פינת האזנה 🎧</h1>

      <!-- ── Block 1: Top strip ── -->
      <div class="ldash-strip">
        <div class="ldash-chip">
          <span class="ldash-chip-val ldash-chip-val--green">${score}%</span>
          <span class="ldash-chip-lbl">ציון מוכנות</span>
          <span class="ldash-conf ldash-conf--${conf}">
            ${conf === 'stable' ? 'יציב' : 'ראשוני'}
          </span>
        </div>
        <div class="ldash-chip">
          <span class="ldash-chip-val">${daysLeft !== null ? daysLeft : '—'}</span>
          <span class="ldash-chip-lbl">ימים למבחן</span>
          ${examDate
            ? `<span class="ldash-chip-sub">${_formatDate(examDate)}</span>`
            : `<span class="ldash-chip-sub">לא הוגדר</span>`}
        </div>
        <div class="ldash-chip">
          <span class="ldash-chip-val">${streak}</span>
          <span class="ldash-chip-lbl">ימים ברצף</span>
          <span class="ldash-chip-sub">🔥</span>
        </div>
      </div>

      <!-- ── Block 2: Skill selection panel ── -->
      <div class="ldash-main">
        <p class="ldash-main-title">על מה תרצה לעבוד היום?</p>
        <div class="ldash-skill-grid" id="ldash-skill-grid">
          ${Object.entries(SKILL_LABELS).map(([key, label]) => `
            <button class="btn-ldash-skill ${key === weakSkill ? 'btn-ldash-skill--recommended' : ''}"
                    data-skill="${key}">
              <span class="ldash-skill-name">${label}</span>
              ${key === weakSkill ? `<span class="ldash-skill-badge">הכי חלש</span>` : ''}
            </button>
          `).join('')}
        </div>
        <button class="btn-ldash-secondary" data-skill="auto" id="btn-auto-skill">
          ✨ המלצה אוטומטית
          ${skillLbl ? ` (${skillLbl})` : ''}
        </button>
      </div>

      <!-- ── Block 3: Bottom ── -->
      <div class="ldash-bottom">

        <div>
          <div class="ldash-section-lbl">היסטוריית מוכנות</div>
          ${_renderChart(history)}
        </div>

        <div class="ldash-stat-row">
          <span class="ldash-stat-key">המבטא החלש</span>
          <span class="ldash-stat-val">${accentLbl}</span>
        </div>
        ${Object.keys(accentAcc).length > 1 ? Object.entries(accentAcc).map(([a, pct]) => `
          <div class="ldash-stat-row">
            <span class="ldash-stat-key">${ACCENT_LABELS[a] || a}</span>
            <span class="ldash-stat-val">${pct}%</span>
          </div>`).join('') : ''}

        <div class="ldash-links">
          <button class="btn-ldash-link" id="btn-gap" disabled>
            📊 דוח פערים<br><small>בקרוב</small>
          </button>
          <button class="btn-ldash-link" id="btn-traps" disabled>
            🎯 סוגי מלכודות<br><small>בקרוב</small>
          </button>
        </div>

      </div>
    </div>`;

  // Task 4: show intro modal on first visit
  if (!localStorage.getItem('listening_intro_seen')) {
    _showIntroModal(root);
  }

  // Skill selection events
  root.querySelectorAll('.btn-ldash-skill').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill;
      sessionStorage.setItem('listening_focus_skill', skill);
      navigate('/listening/session');
    });
  });

  root.querySelector('#btn-auto-skill').addEventListener('click', () => {
    if (weakSkill) sessionStorage.setItem('listening_focus_skill', weakSkill);
    else sessionStorage.removeItem('listening_focus_skill');
    navigate('/listening/session');
  });
}

// ─── Intro modal (shown once on first visit) ──────────────────────────────────
function _showIntroModal(root) {
  const overlay = document.createElement('div');
  overlay.className = 'ldash-modal-overlay';
  overlay.innerHTML = `
    <div class="ldash-modal" role="dialog" aria-modal="true">
      <h2 class="ldash-modal-title">פינת ההאזנה — איך זה עובד? 🎧</h2>
      <div class="ldash-modal-body">
        <p>פינה זו מכינה אותך למבחן ההאזנה של HILAL.</p>
        <p>בכל פגישה תשמע קטעים קצרים באנגלית ותענה על שאלות הבנה.</p>
        <p><strong>יש שני סוגי תרגילים:</strong></p>
        <ul>
          <li>▸ <strong>השלמת משפט</strong> — תשמע משפט שנחתך, תבחר איך הוא ממשיך</li>
          <li>▸ <strong>הבנת הרצאה</strong> — תשמע קטע, תענה על שאלות על הנאמר</li>
        </ul>
        <p class="ldash-modal-note">⚠️ במבחן האמיתי אין השמעה חוזרת. כאן אפשר — אבל נסה לא להסתמך על זה.</p>
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

// ─── Mini SVG chart (last 7 history entries) ─────────────────────────────────
function _renderChart(history) {
  const pts = history.slice(-7);
  if (pts.length < 2) {
    return `<div class="ldash-chart-empty">אין עדיין מספיק נתונים</div>`;
  }

  const W = 280, H = 72, PAD = 10;
  const maxS = Math.max(...pts.map(p => p.score), 1);
  const minS = Math.min(...pts.map(p => p.score), 0);
  const range = Math.max(maxS - minS, 10);  // min range to avoid flat line

  const coords = pts.map((p, i) => {
    const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p.score - minS) / range) * (H - PAD * 2);
    return { x, y, score: p.score, date: p.date };
  });

  const polyline = coords.map(c => `${c.x},${c.y}`).join(' ');
  const circles  = coords.map(c =>
    `<circle cx="${c.x}" cy="${c.y}" r="3" fill="var(--green,#4CAF6F)"/>`
  ).join('');

  // Date labels for first + last point
  const fmt = d => d.slice(5);  // MM-DD

  return `
    <div class="ldash-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none"
           style="overflow:visible;display:block">
        <!-- Grid line at midpoint -->
        <line x1="${PAD}" y1="${H / 2}" x2="${W - PAD}" y2="${H / 2}"
              stroke="var(--border,#E0EBE4)" stroke-width="1" stroke-dasharray="3,3"/>
        <!-- Line -->
        <polyline points="${polyline}" fill="none"
          stroke="var(--green,#4CAF6F)" stroke-width="2.5"
          stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Dots -->
        ${circles}
        <!-- Labels -->
        <text x="${coords[0].x}" y="${H + 14}" text-anchor="middle"
              font-size="9" fill="var(--muted,#7A8C80)">${fmt(coords[0].date)}</text>
        <text x="${coords[coords.length-1].x}" y="${H + 14}" text-anchor="middle"
              font-size="9" fill="var(--muted,#7A8C80)">${fmt(coords[coords.length-1].date)}</text>
        <!-- Latest score label -->
        <text x="${coords[coords.length-1].x + 6}" y="${coords[coords.length-1].y + 4}"
              font-size="9" font-weight="bold" fill="var(--green,#4CAF6F)"
              text-anchor="start">${coords[coords.length-1].score}%</text>
      </svg>
    </div>`;
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
