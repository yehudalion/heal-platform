/**
 * src/screens/rephrase-analyze.js  (T044 — Rephrase Analyze)
 *
 * The third layer of the Rephrase module: what the sessions have looked like so
 * far, per label, with a way back into Learn for each one.
 *
 * How this differs from screens/progress.js — they are NOT duplicates:
 *   progress.js         cross-module, one summary card per module, no drill-down
 *   rephrase-analyze.js this module only, all five labels, raw counts + rate,
 *                       every label a link to its Learn block
 * Same voice and same visual family on purpose; the learner should feel they are
 * reading two views of one thing.
 *
 * HARD rules honoured:
 *  - Data layer only (data/weakpoints.data.js). No Supabase beyond auth.
 *  - Descriptive phrasing (SITEMAP §2). Every sentence describes the SESSIONS.
 *    No "יש לך חולשה ב-", no score, no badge, no red.
 *  - `lift` orders and highlights but is NEVER shown as a number — the learner
 *    reads raw counts they can verify against their own memory of the session.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';        // auth only
import { getWeakPoints } from '../data/weakpoints.data.js';
import { LEARN_BLOCKS } from './rephrase-learn.js';

// Same bar as progress.js — above this a label is worth naming, below it the
// differences between labels are not meaningful enough to point at.
const NOTABLE_LIFT = 1.25;

const LEARN_IDS = new Set(LEARN_BLOCKS.map((b) => b.id));

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export async function renderRephraseAnalyze(root) {
  // Keep the sidebar on the module the learner came from.
  await renderLayout(root, '/rephrasing');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  ensureStyles();

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  const reports = userId ? await getWeakPoints(userId) : [];
  const r = reports.find((x) => x.moduleId === 'rephrase') ?? null;

  el.innerHTML = `
    <div class="fade-in" style="max-width:640px">
      <div class="page-title">ניסוח מחדש — מה עלה עד עכשיו</div>
      <div class="page-sub">לפי סוג השאלה, על סמך התרגולים שנאספו.</div>
      ${body(userId, r)}
      <div class="ra-back"><a href="#/rephrasing">← חזרה למודול</a></div>
    </div>`;
}

function body(userId, r) {
  if (!userId) return `<p class="ra-empty">יש להתחבר כדי לראות את הנתונים. <a href="#/home">← דף הבית</a></p>`;
  if (!r || r.status === 'not_started') return `<p class="ra-empty">התרגול עוד לא התחיל. אחרי כמה מנות תופיע כאן תמונה.</p>`;
  if (r.status === 'insufficient_data') {
    const left = Math.max(0, r.minAttempts - r.attempts);
    return `<p class="ra-empty">נאספו ${r.attempts} תרגולים. עוד ${left} ואפשר יהיה לתאר מגמה.</p>`;
  }
  if (!r.points.length) {
    return `<p class="ra-empty">אין עדיין מספיק פריטים מכל סוג כדי לתאר מגמה.</p>${thin(r)}`;
  }
  return `
    <div class="ra-count">${r.attempts} תרגולים נאספו</div>
    <div class="ra-rows">${r.points.map(row).join('')}</div>
    ${thin(r)}
    <p class="ra-foot">המספרים מתארים את הסשנים שנאספו, לא הערכה כוללת. לחיצה על סוג פותחת את ההסבר שלו.</p>`;
}

function row(p) {
  const pct = Math.round(p.missRate * 100);
  const notable = p.lift !== null && p.lift >= NOTABLE_LIFT;
  // Every label id is also a Learn block id (keys.js and rephrase-learn.js share
  // the vocabulary). Guard anyway so a future label without a block degrades to
  // plain text instead of a dead link.
  const linked = LEARN_IDS.has(p.id);
  const name = linked
    ? `<a class="ra-key" href="#/rephrase-learn#rl-block-${p.id}">${esc(p.label)}</a>`
    : `<span class="ra-key">${esc(p.label)}</span>`;
  return `<div class="ra-row${notable ? ' notable' : ''}">
    <div class="ra-row-top">
      ${name}
      <span class="ra-nums">${p.misses} מתוך ${p.exposures} · ${pct}%</span>
    </div>
    <div class="ra-bar"><div class="ra-bar-fill" style="width:${Math.min(100, pct)}%"></div></div>
    ${notable ? `<div class="ra-note">חוזר בסשנים האחרונים יותר משאר הסוגים</div>` : ''}
  </div>`;
}

function thin(r) {
  if (!r.suppressed.length) return '';
  return `<p class="ra-thin">עוד לא הופיעו מספיק פעמים כדי לתאר: ${r.suppressed.map((s) => esc(s.label)).join(' · ')}</p>`;
}

function ensureStyles() {
  if (document.getElementById('ra-css')) return;
  const s = document.createElement('style');
  s.id = 'ra-css';
  s.textContent = `
.ra-count{font-size:.75rem;color:var(--muted);font-weight:700;margin-bottom:.9rem}
.ra-rows{display:flex;flex-direction:column;gap:1rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem 1.3rem}
.ra-row-top{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;margin-bottom:.35rem}
.ra-key{font-size:.9rem;font-weight:800;color:var(--green-dark);text-decoration:underline}
.ra-nums{font-size:.75rem;color:var(--muted);font-variant-numeric:tabular-nums}
.ra-bar{height:7px;background:var(--bg);border-radius:999px;overflow:hidden}
.ra-bar-fill{height:100%;background:var(--green);border-radius:999px}
.ra-row.notable .ra-bar-fill{background:var(--orange)}
.ra-note{font-size:.75rem;color:var(--muted);margin-top:.3rem}
.ra-empty{font-size:.88rem;color:var(--muted);line-height:1.7}
.ra-empty a{color:var(--green-dark);font-weight:700}
.ra-thin{font-size:.75rem;color:var(--muted);margin-top:.9rem;line-height:1.6}
.ra-foot{font-size:.75rem;color:var(--muted);margin-top:1.1rem;line-height:1.6}
.ra-back{margin-top:1.4rem}
.ra-back a{color:var(--muted);font-size:.82rem}
`;
  document.head.appendChild(s);
}
