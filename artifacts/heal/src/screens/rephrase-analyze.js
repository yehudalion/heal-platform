/**
 * src/screens/rephrase-analyze.js  (T044 — Rephrase Analyze)
 *
 * The third layer of the Rephrase module. Rewritten 2026-08-05 from a scoreboard
 * into a router: the first version listed "עוגן — 5 מתוך 19 · 26%" and a learner
 * could read it and still have no idea what to do.
 *
 * THE RULE THIS SCREEN EXISTS TO KEEP: never show a label bare.
 * The vocabulary is not the problem — the same word works perfectly in practice
 * feedback, because there it sits next to a real sentence and a real explanation.
 * Stripped of those it is a dead term in a table. So every row here carries
 *   label → a sentence THIS learner actually got wrong → what to do next.
 * If a label has no example to show, its row is not rendered at all.
 *
 * How this differs from screens/progress.js — they are not duplicates:
 *   progress.js         cross-module, headline counts, links INTO this screen
 *   rephrase-analyze.js this module only, with examples and next steps
 *
 * HARD rules honoured:
 *  - Data layer only (weakpoints.data.js, rephrase.data.js). Auth aside, no Supabase.
 *  - Descriptive phrasing (SITEMAP §2): describes the sessions, never labels the
 *    learner. No score, no badge, no red.
 *  - `lift` orders and highlights; it is never shown as a number.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';        // auth only
import { getWeakPoints } from '../data/weakpoints.data.js';
import { fetchRecentMistakes } from '../data/rephrase.data.js';
import { resolveTrigger } from '../lib/keys.js';
import { LEARN_BLOCKS } from './rephrase-learn.js';

const NOTABLE_LIFT = 1.25;
const LEARN_IDS = new Set(LEARN_BLOCKS.map((b) => b.id));

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export async function renderRephraseAnalyze(root) {
  await renderLayout(root, '/rephrasing');   // keep the sidebar on the module
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
    report = reports.find((r) => r.moduleId === 'rephrase') ?? null;
    examples = indexExamplesByLabel(mistakes.data || []);
  }

  el.innerHTML = `
    <div class="fade-in" style="max-width:760px">
      <div class="page-title">ניסוח מחדש — מה כדאי לתרגל</div>
      <div class="page-sub">לכל סוג: משפט אמיתי שטעית בו, ומה לעשות איתו.</div>
      ${body(userId, report, examples)}
      <div class="ra-back"><a href="#/rephrasing">← חזרה למודול</a></div>
    </div>`;
}

/**
 * Most recent wrong answer per label. The chosen slot is found from the CANONICAL
 * chosen_option_index, so the label and the explanation always describe the option
 * the learner actually clicked.
 */
function indexExamplesByLabel(rows) {
  const byLabel = new Map();   // rows arrive newest-first, so first write wins
  for (const row of rows) {
    const q = row.restatement_questions;
    const n = row.chosen_option_index;
    if (!q || !n || n < 1 || n > 3) continue;
    const t = resolveTrigger({ category: q['trigger_category_' + n], mechanism: q['mechanism_' + n] });
    if (!t || byLabel.has(t.id)) continue;
    byLabel.set(t.id, {
      source: q.original_sentence,
      chosen: q['distractor_' + n],
      why: q['explanation_' + n + '_he'],
    });
  }
  return byLabel;
}

function body(userId, r, examples) {
  if (!userId) return `<p class="ra-empty">יש להתחבר כדי לראות את הנתונים. <a href="#/home">← דף הבית</a></p>`;
  if (!r || r.status === 'not_started') {
    return `<p class="ra-empty">התרגול עוד לא התחיל.</p>
      <a class="btn-primary ra-cta" href="#/rephrase-practice">התחל תרגול ←</a>`;
  }
  if (r.status === 'insufficient_data') {
    const left = Math.max(0, r.minAttempts - r.attempts);
    return `<p class="ra-empty">נאספו ${r.attempts} תרגולים. עוד ${left} ואפשר יהיה לתאר מגמה.</p>
      <a class="btn-primary ra-cta" href="#/rephrase-practice">עוד מנה ←</a>`;
  }

  // A row without an example would be a bare label — the exact thing this screen
  // must not do. Those labels are reported as "not enough yet", not ranked.
  const withExample = r.points.filter((p) => examples.has(p.id));
  const withoutExample = r.points.filter((p) => !examples.has(p.id));

  if (!withExample.length) {
    return `<p class="ra-empty">אין עדיין טעויות שאפשר להראות מהן דוגמה.</p>
      <a class="btn-primary ra-cta" href="#/rephrase-practice">עוד מנה ←</a>`;
  }

  return `
    <div class="ra-count">${r.attempts} תרגולים נאספו</div>
    ${withExample.map((p) => row(p, examples.get(p.id))).join('')}
    ${thin(r, withoutExample)}
    <p class="ra-foot">המספרים מתארים את הסשנים שנאספו, לא הערכה כוללת.</p>`;
}

function row(p, ex) {
  const pct = Math.round(p.missRate * 100);
  const notable = p.lift !== null && p.lift >= NOTABLE_LIFT;
  const linked = LEARN_IDS.has(p.id);
  const name = linked
    ? `<a class="ra-key" href="#/rephrase-learn#rl-block-${p.id}">${esc(p.label)}</a>`
    : `<span class="ra-key">${esc(p.label)}</span>`;

  return `<section class="ra-card${notable ? ' notable' : ''}">
    <div class="ra-head">
      ${name}
      <span class="ra-nums">${p.misses} מתוך ${p.exposures} · ${pct}%</span>
    </div>
    ${notable ? `<div class="ra-note">חוזר בסשנים האחרונים יותר משאר הסוגים</div>` : ''}

    <div class="ra-ex">
      <div class="ra-ex-lbl">משפט שטעית בו</div>
      <div class="ra-en" dir="ltr">${esc(ex.source)}</div>
      <div class="ra-ex-lbl">מה שבחרת</div>
      <div class="ra-en ra-chosen" dir="ltr">${esc(ex.chosen)}</div>
      ${ex.why ? `<div class="ra-why">🔍 ${esc(ex.why)}</div>` : ''}
    </div>

    <div class="ra-actions">
      <a class="btn-primary ra-drill" href="#/rephrase-practice?key=${encodeURIComponent(p.id)}">תרגל עוד 5 מהסוג הזה ←</a>
      ${linked ? `<a class="ra-learn" href="#/rephrase-learn#rl-block-${p.id}">📘 ההסבר על ${esc(p.label)}</a>` : ''}
    </div>
  </section>`;
}

function thin(r, withoutExample) {
  const names = [...r.suppressed.map((s) => s.label), ...withoutExample.map((p) => p.label)];
  if (!names.length) return '';
  return `<p class="ra-thin">עוד לא נאספו מספיק דוגמאות כדי להראות: ${names.map(esc).join(' · ')}</p>`;
}

function ensureStyles() {
  if (document.getElementById('ra-css')) return;
  const s = document.createElement('style');
  s.id = 'ra-css';
  s.textContent = `
.ra-count{font-size:.75rem;color:var(--muted);font-weight:700;margin-bottom:.9rem}
.ra-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem 1.3rem;margin-bottom:1rem}
.ra-card.notable{border-color:var(--orange)}
.ra-head{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem}
.ra-key{font-size:1rem;font-weight:800;color:var(--green-dark);text-decoration:underline}
.ra-nums{font-size:.72rem;color:var(--muted);font-variant-numeric:tabular-nums;flex:0 0 auto}
.ra-note{font-size:.75rem;color:#b5551f;margin-top:.3rem}
.ra-ex{background:var(--bg);border-radius:var(--radius-sm);padding:.85rem .95rem;margin-top:.9rem}
.ra-ex-lbl{font-size:.7rem;font-weight:800;color:var(--muted);margin-bottom:.25rem}
.ra-en{direction:ltr;text-align:left;font-size:.9rem;line-height:1.55;margin-bottom:.7rem}
.ra-chosen{color:#b5551f}
.ra-why{background:var(--blue-light);border-radius:var(--radius-sm);padding:.55rem .75rem;font-size:.85rem;line-height:1.6}
.ra-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin-top:1rem}
.ra-drill{display:inline-block;padding:.6rem 1.1rem;font-size:.87rem;text-decoration:none}
.ra-learn{font-size:.83rem;font-weight:700;color:var(--green-dark);text-decoration:none}
.ra-learn:hover{text-decoration:underline}
.ra-cta{display:inline-block;margin-top:.9rem;padding:.7rem 1.2rem;text-decoration:none}
.ra-empty{font-size:.9rem;color:var(--muted);line-height:1.7}
.ra-empty a{color:var(--green-dark);font-weight:700}
.ra-thin{font-size:.75rem;color:var(--muted);margin-top:.9rem;line-height:1.6}
.ra-foot{font-size:.75rem;color:var(--muted);margin-top:1.1rem;line-height:1.6}
.ra-back{margin-top:1.4rem}
.ra-back a{color:var(--muted);font-size:.82rem}
`;
  document.head.appendChild(s);
}
