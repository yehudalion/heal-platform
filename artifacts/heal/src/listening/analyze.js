/**
 * Listening — Analyze layer (שכבת הניתוח), cumulative view
 *
 * NEW 2026-08-14, per SITEMAP §3 ("ניתוח | סיכום רך בסוף סשן | לא בנוי").
 * The end-of-session soft summary lives in session.js's cooldown screen;
 * this screen is the cumulative counterpart: recent sessions + a descriptive
 * summary of recent mistakes in the module's single-label vocabulary (כיוון).
 *
 * Descriptive-phrasing rule (SITEMAP §2): describes the SESSIONS, never the
 * student. No "אתה נוטה", no "חולשה שלך". Wellbeing rule: no streaks,
 * no loss framing.
 *
 * Data layer only (ARCHITECTURE §2.11) — no direct Supabase calls.
 */
import { getCurrentSession }                      from '../supabase.js';
import { getListeningHistory, getRecentMistakes } from '../data/listening.data.js';
import { renderTypeSplit }                       from './dashboard.js';
import { summarizeMistakes }                      from './keys.js';
import { navigate }                               from '../router.js';
import './dashboard.css';
import '../lib/signIn.js';

export async function renderListeningAnalyze(root) {
  root.className = 'ldash-wrap';
  root.innerHTML = `<div class="ldash-loading"><div class="spinner"></div><span>טוען…</span></div>`;

  // 2.9.2026 (ליאון): פתוח לאורח כמו כל שאר המודולים. אין צורך בענף אורח
  // נפרד — history.length === 0 (המצב שכל אורח נמצא בו, כי אין לו שורות
  // ב-DB) כבר מצייר את מסך "עוד אין כאן מה לנתח" הקיים, בדיוק כמו למשתמש
  // חדש שעדיין לא תרגל.
  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  const [{ data: history }, { data: mistakes }] = await Promise.all([
    userId ? getListeningHistory(userId, { limit: 15 }) : Promise.resolve({ data: [] }),
    userId ? getRecentMistakes(userId,  { limit: 60 })  : Promise.resolve({ data: [] }),
  ]);

  _render(root, history || [], mistakes || []);
}

function _render(root, history, mistakes) {
  const totalQ   = history.reduce((s, h) => s + (h.total_questions ?? 0), 0);
  const totalOk  = history.reduce((s, h) => s + (h.correct_count ?? 0), 0);
  const pct      = totalQ > 0 ? Math.round((totalOk / totalQ) * 100) : null;

  // Split by exercise type (Lion, 2026-08-26) — same shape as getListeningOverview's byType.
  const _byType = { continuation: { q: 0, c: 0 }, lecture_qa: { q: 0, c: 0 } };
  for (const h of history) {
    const t = h.listening_lectures?.item_type;
    if (t && _byType[t]) { _byType[t].q += h.total_questions ?? 0; _byType[t].c += h.correct_count ?? 0; }
  }
  const pctOf = (b) => (b.q > 0 ? Math.round((b.c / b.q) * 100) : null);
  const byType = {
    continuation: { questionsAnswered: _byType.continuation.q, accuracyPct: pctOf(_byType.continuation) },
    lecture_qa:   { questionsAnswered: _byType.lecture_qa.q,   accuracyPct: pctOf(_byType.lecture_qa) },
  };

  const { headline, details } = summarizeMistakes(mistakes.map(m => m.failMode));

  root.innerHTML = `
    <div class="ldash-body" style="gap:20px;">

      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn-ldash-link" id="btn-back" style="padding:6px 12px;">→ חזרה</button>
        <h1 class="ldash-title" style="margin:0;">ניתוח 📊</h1>
      </div>

      ${history.length === 0 ? `
        <div class="ldash-main" style="align-items:center;text-align:center;gap:12px;">
          <p class="ldash-main-title" style="margin:0;">עוד אין כאן מה לנתח</p>
          <p style="margin:0;line-height:1.7;">הניתוח נבנה מהתרגולים שלך. אחרי הפגישה הראשונה — הדוח הראשון יחכה כאן.</p>
          <button class="btn-ldash-primary" id="btn-practice" style="max-width:240px;">לתרגול הראשון ←</button>
        </div>
      ` : `
        <!-- ── Overall strip ── -->
        <div class="ldash-strip">
          <div class="ldash-chip">
            <span class="ldash-chip-val">${history.length}</span>
            <span class="ldash-chip-lbl">קטעים אחרונים</span>
          </div>
          <div class="ldash-chip">
            <span class="ldash-chip-val">${totalQ}</span>
            <span class="ldash-chip-lbl">שאלות</span>
          </div>
          <div class="ldash-chip">
            <span class="ldash-chip-val ldash-chip-val--green">${pct != null ? pct + '%' : '—'}</span>
            <span class="ldash-chip-lbl">דיוק</span>
          </div>
        </div>

        ${renderTypeSplit(byType)}

        <!-- ── Descriptive mistake summary ── -->
        <div class="ldash-main" style="text-align:right;">
          <p class="ldash-main-title" style="margin-bottom:8px;">על מה היו הטעויות בתרגולים האחרונים</p>
          <p style="margin:0 0 10px;line-height:1.7;">${escHtml(headline)}</p>
          ${details.length ? `
            <div style="display:flex;flex-direction:column;gap:8px;font-size:.92rem;">
              ${details.map(d => `
                <div style="display:flex;gap:8px;align-items:flex-start;">
                  <span style="flex-shrink:0;">🔑</span>
                  <span>${escHtml(d.label)}${d.n > 1 ? ` <strong>(×${d.n})</strong>` : ''}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${details.some(d => ['pre_pivot','post_pivot','reversed'].includes(d.mode)) ? `
            <button class="btn-ldash-link" id="btn-relearn" style="margin-top:12px;">
              📖 חזרה לשיעור על שינוי כיוון
            </button>
          ` : ''}
        </div>

        <!-- ── Recent sessions list ── -->
        <div class="ldash-main" style="text-align:right;">
          <p class="ldash-main-title" style="margin-bottom:8px;">הקטעים האחרונים</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${history.map(h => `
              <div class="ldash-stat-row">
                <span class="ldash-stat-key">${h.listening_lectures?.item_type === 'lecture_qa' ? '🎧' : '📝'} ${escHtml(h.listening_lectures?.title || 'קטע')}</span>
                <span class="ldash-stat-val">${h.correct_count ?? 0}/${h.total_questions ?? 0}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `}

    </div>`;

  root.querySelector('#btn-back').addEventListener('click', () => navigate('/listening'));
  root.querySelector('#btn-practice')?.addEventListener('click', () => navigate('/listening/session'));
  root.querySelector('#btn-relearn')?.addEventListener('click',  () => navigate('/listening/learn'));
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
