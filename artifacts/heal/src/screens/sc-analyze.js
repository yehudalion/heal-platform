/**
 * src/screens/sc-analyze.js — Sentence Completion, Analyze layer.
 *
 * Same router pattern as rephrase-analyze.js, at THREE labels instead of five
 * (scKeys.js). THE RULE THIS SCREEN EXISTS TO KEEP: never show a label bare —
 * every row carries label → a sentence THIS learner actually got wrong → what
 * to do next. A label with no example to show gets no row.
 *
 * Unlike Rephrase, a label here belongs to the QUESTION, not to a specific
 * distractor (clue_code is one value per row) — so unlike
 * rephrase-analyze.js#indexExamplesByLabel there is no per-option loop.
 *
 * HARD rules honoured:
 *  - Data layer only (weakpoints.data.js, sentenceCompletion.data.js).
 *  - Descriptive phrasing (SITEMAP §2): describes the sessions, never labels
 *    the learner. No score, no badge, no red.
 *  - `lift` orders and highlights; it is never shown as a number.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';
import { getWeakPoints } from '../data/weakpoints.data.js';
import { fetchRecentMistakes } from '../data/sentenceCompletion.data.js';
import { resolveKey } from '../lib/scKeys.js';
import { LEARN_BLOCKS } from './sc-learn.js';

const NOTABLE_LIFT = 1.25;
const LEARN_IDS = new Set(LEARN_BLOCKS.map((b) => b.id));

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export async function renderScAnalyze(root) {
  await renderLayout(root, '/sentence-completion');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  ensureStyles();

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;

  let report = null, examples = new Map();
  if (userId) {
    const [reports, mistakes] = await Promise.all([
      getWeakPoints(userId),
      fetchRecentMistakes(userId),
    ]);
    report = reports.find((r) => r.moduleId === 'sentenceCompletion') ?? null;
    examples = indexExamplesByLabel(mistakes.data || []);
  }

  el.innerHTML = `
    <div class="fade-in" style="max-width:760px">
      <div class="page-title">השלמת משפטים — מה כדאי לתרגל</div>
      <div class="page-sub">לכל סוג: משפט אמיתי שטעית בו, ומה לעשות איתו.</div>
      ${body(userId, report, examples)}
      <div class="sa-back"><a href="#/sentence-completion">← חזרה למודול</a></div>
    </div>`;
}

/** Most recent wrong answer per label. Rows arrive newest-first (data layer),
 *  so the first write per label wins. */
function indexExamplesByLabel(rows) {
  const byLabel = new Map();
  for (const row of rows) {
    const q = row.sentence_completion_questions;
    const n = row.chosen_option;
    if (!q || !n || n < 1 || n > 4) continue;
    const key = resolveKey(q.clue_code);
    if (!key || byLabel.has(key.id)) continue;
    byLabel.set(key.id, {
      stem: q.stem,
      chosen: q.options?.[n - 1],
      why: q.explanations_he?.distractors?.[String(n)],
    });
  }
  return byLabel;
}

function body(userId, r, examples) {
  if (!userId) return `<p class="sa-empty">יש להתחבר כדי לראות את הנתונים. <a href="#/home">← דף הבית</a></p>`;
  if (!r || r.status === 'not_started') {
    return `<p class="sa-empty">התרגול עוד לא התחיל.</p>
      <a class="btn-primary sa-cta" href="#/sc-practice">התחל תרגול ←</a>`;
  }
  if (r.status === 'insufficient_data') {
    const left = Math.max(0, r.minAttempts - r.attempts);
    return `<p class="sa-empty">נאספו ${r.attempts} תרגולים. עוד ${left} ואפשר יהיה לתאר מגמה.</p>
      <a class="btn-primary sa-cta" href="#/sc-practice">עוד מנה ←</a>`;
  }

  const withExample = r.points.filter((p) => examples.has(p.id));
  const withoutExample = r.points.filter((p) => !examples.has(p.id));

  if (!withExample.length) {
    return `<p class="sa-empty">אין עדיין טעויות שאפשר להראות מהן דוגמה.</p>
      <a class="btn-primary sa-cta" href="#/sc-practice">עוד מנה ←</a>`;
  }

  return `
    <div class="sa-count">${r.attempts} תרגולים נאספו</div>
    ${withExample.map((p) => row(p, examples.get(p.id))).join('')}
    ${thin(r, withoutExample)}
    <p class="sa-foot">המספרים מתארים את הסשנים שנאספו, לא הערכה כוללת.</p>`;
}

function row(p, ex) {
  const pct = Math.round(p.missRate * 100);
  const notable = p.lift !== null && p.lift >= NOTABLE_LIFT;
  const linked = LEARN_IDS.has(p.id);
  const name = linked
    ? `<a class="sa-key" href="#/sc-learn#sl-block-${p.id}">${esc(p.label)}</a>`
    : `<span class="sa-key">${esc(p.label)}</span>`;

  return `<section class="sa-card${notable ? ' notable' : ''}">
    <div class="sa-head">
      ${name}
      <span class="sa-nums">${p.misses} מתוך ${p.exposures} · ${pct}%</span>
    </div>
    ${notable ? `<div class="sa-note">חוזר בסשנים האחרונים יותר משאר הסוגים</div>` : ''}

    <div class="sa-ex">
      <div class="sa-ex-lbl">משפט שטעית בו</div>
      <div class="sa-en" dir="ltr">${esc(ex.stem)}</div>
      <div class="sa-ex-lbl">מה שבחרת</div>
      <div class="sa-en sa-chosen" dir="ltr">${esc(ex.chosen)}</div>
      ${ex.why ? `<div class="sa-why">🔍 ${esc(ex.why)}</div>` : ''}
    </div>

    <div class="sa-actions">
      <a class="btn-primary sa-drill" href="#/sc-practice?key=${encodeURIComponent(p.id)}">תרגל עוד 5 מהסוג הזה ←</a>
      ${linked ? `<a class="sa-learn" href="#/sc-learn#sl-block-${p.id}">📘 ההסבר על ${esc(p.label)}</a>` : ''}
    </div>
  </section>`;
}

function thin(r, withoutExample) {
  const names = [...r.suppressed.map((s) => s.label), ...withoutExample.map((p) => p.label)];
  if (!names.length) return '';
  return `<p class="sa-thin">עוד לא נאספו מספיק דוגמאות כדי להראות: ${names.map(esc).join(' · ')}</p>`;
}

function ensureStyles() {
  if (document.getElementById('sa-css')) return;
  const s = document.createElement('style');
  s.id = 'sa-css';
  s.textContent = `
.sa-count{font-size:.75rem;color:var(--muted);font-weight:700;margin-bottom:.9rem}
.sa-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem 1.3rem;margin-bottom:1rem}
.sa-card.notable{border-color:var(--orange)}
.sa-head{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem}
.sa-key{font-size:1rem;font-weight:800;color:var(--green-dark);text-decoration:underline}
.sa-nums{font-size:.72rem;color:var(--muted);font-variant-numeric:tabular-nums;flex:0 0 auto}
.sa-note{font-size:.75rem;color:#b5551f;margin-top:.3rem}
.sa-ex{background:var(--bg);border-radius:var(--radius-sm);padding:.85rem .95rem;margin-top:.9rem}
.sa-ex-lbl{font-size:.7rem;font-weight:800;color:var(--muted);margin-bottom:.25rem}
.sa-en{direction:ltr;text-align:left;font-size:.9rem;line-height:1.55;margin-bottom:.7rem}
.sa-chosen{color:#b5551f}
.sa-why{background:var(--blue-light);border-radius:var(--radius-sm);padding:.55rem .75rem;font-size:.85rem;line-height:1.6}
.sa-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin-top:1rem}
.sa-drill{display:inline-block;padding:.6rem 1.1rem;font-size:.87rem;text-decoration:none}
.sa-learn{font-size:.83rem;font-weight:700;color:var(--green-dark);text-decoration:none}
.sa-learn:hover{text-decoration:underline}
.sa-cta{display:inline-block;margin-top:.9rem;padding:.7rem 1.2rem;text-decoration:none}
.sa-empty{font-size:.9rem;color:var(--muted);line-height:1.7}
.sa-empty a{color:var(--green-dark);font-weight:700}
.sa-thin{font-size:.75rem;color:var(--muted);margin-top:.9rem;line-height:1.6}
.sa-foot{font-size:.75rem;color:var(--muted);margin-top:1.1rem;line-height:1.6}
.sa-back{margin-top:1.4rem}
.sa-back a{color:var(--muted);font-size:.82rem}
`;
  document.head.appendChild(s);
}
