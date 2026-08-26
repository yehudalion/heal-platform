/**
 * src/lib/coverageBar.js — shared "how much of the material have you touched"
 * bar. Used by /progress today; the plan is to wire the same helper into the
 * home dashboard's empty weekly-progress box once that file is free to edit
 * (it's mid-edit in another chat as of 2026-08-26).
 *
 * Deliberately a flat horizontal bar, not a percentage ring (Lion, 2026-08-26,
 * on the "coverage chart" question): a ring is the exact move that reads as
 * Duolingo-style gamification once it sits on the paper/ink palette, and it
 * only shows one module at a time. A bar stacks cleanly across modules and
 * reads as a calm fact, not a game meter.
 *
 * This is COVERAGE — "how much have you touched" — a different question from
 * weakpoints.data.js's "where do you slip". Keep the two concepts visually
 * distinct: coverage is a bar with a real done/total fraction; a weak point is
 * a sentence, never a bar (there's no "total" to a miss-rate).
 */

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/**
 * @param {{ label: string, done: number, total: number, unit?: string }} p
 *   label — module name ("אוצר מילים")
 *   done/total — real counts. total <= 0 renders an honest "אין עדיין נתונים"
 *                instead of a fraction — never a fabricated percentage.
 *   unit  — caption after the fraction ("מילים בסבב חזרות", "הרצאות שהושלמו")
 * @returns {string} HTML for one bar block. Wrap it in the caller's own card.
 */
export function renderCoverageBar({ label, done, total, unit = '' }) {
  const hasData = Number.isFinite(total) && total > 0;
  const pct = hasData ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
  const fraction = hasData
    ? `${done}/${total}${unit ? ' ' + esc(unit) : ''}`
    : 'אין עדיין נתונים';
  return `<div class="cov-mod">
    <div class="cov-head"><b>${esc(label)}</b><span>${fraction}</span></div>
    <div class="cov-bar"><div class="cov-fill" style="width:${pct}%"></div></div>
  </div>`;
}

/** Inject once per page. Call alongside the page's own ensureStyles(). */
export function ensureCoverageBarStyles() {
  if (document.getElementById('cov-bar-css')) return;
  const s = document.createElement('style');
  s.id = 'cov-bar-css';
  s.textContent = `
.cov-mod{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.7rem}
.cov-head{display:flex;justify-content:space-between;align-items:baseline;font-size:.86rem}
.cov-head b{font-weight:800}
.cov-head span{color:var(--muted);font-size:.74rem;font-weight:700}
.cov-bar{height:8px;border-radius:4px;background:var(--border);overflow:hidden}
.cov-fill{height:100%;background:var(--green);border-radius:4px;transition:width .3s ease}
`;
  document.head.appendChild(s);
}
