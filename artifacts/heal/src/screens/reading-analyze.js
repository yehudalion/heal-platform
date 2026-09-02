/**
 * src/screens/reading-analyze.js — Reading Comprehension, Analyze layer.
 *
 * Reports on the ONE axis the learner is taught: window size (עוגן / פסקה /
 * טקסט). Question type is shown second, because it is the axis the Mastery-Hint
 * rule runs on and so the learner meets it anyway.
 *
 * Three disciplines carried over from the other analyze screens:
 *  - Descriptive, never diagnostic. "רוב הטעויות היו בשאלות פסקה", never
 *    "אתה נוטה לקרוא חלון קטן מדי" (SITEMAP §2 phrasing rule).
 *  - A bucket with too few answers behind it shows a COUNT, not a percentage.
 *    A 0% built on one question is a lie with a number attached.
 *  - A finding is never shown bare: the mistakes list carries the actual item
 *    and its explanation, so the learner can see what happened.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { getLearner } from '../lib/learner.js';
import { fetchAnalyzeSummary, fetchRecentMistakes } from '../data/reading.data.js';

const MIN_FOR_RATE = 5;   // below this, a percentage is noise

const WINDOW_LABEL = {
  anchor:    'שאלות עוגן',
  paragraph: 'שאלות פסקה',
  text:      'שאלות טקסט',
};
const WINDOW_NOTE = {
  anchor:    'השאלה מצטטת ניסוח, שם או מונח — החלון הוא משפט ±1.',
  paragraph: 'השאלה נוקבת בפסקה — החלון הוא הפסקה כולה.',
  text:      'לשאלה אין עוגן — היא על כל הקטע, ונענית אחרונה.',
};
const TYPE_LABEL = {
  main_idea:         'רעיון מרכזי / כותרת',
  explicit_detail:   'פרט מפורש',
  inference:         'הסקה',
  vocab_in_context:  'אוצר מילים בהקשר',
  paragraph_purpose: 'תפקיד הפסקה',
  reference_word:    'מילת ייחוס',
};

export async function renderReadingAnalyze(root) {
  await renderLayout(root, '/reading');
  const el = getPageContent();
  ensureStyles();

  const { id: userId, isGuest } = await getLearner();

  if (isGuest) {
    el.innerHTML = wrap(`<section class="ra-card"><div class="ra-center">
      הניתוח נשמר רק למי שמחובר.<br>
      <span class="ra-sub">אפשר להמשיך לתרגל כאורח — פשוט בלי מעקב לאורך זמן.</span>
      <div class="ra-links"><a class="ra-link" href="#/reading-practice">להמשיך לתרגל ←</a></div>
    </div></section>`);
    return;
  }

  el.innerHTML = wrap(`<div class="ra-center">טוען…</div>`);

  const [{ data: sum, error }, { data: mistakes }] = await Promise.all([
    fetchAnalyzeSummary(userId, { limit: 300 }),
    fetchRecentMistakes(userId, { limit: 12 }),
  ]);

  if (error) {
    el.innerHTML = wrap(`<section class="ra-card"><div class="ra-center">
      אירעה תקלה בטעינת הניתוח.<br><span class="ra-sub">אפשר לנסות שוב מאוחר יותר.</span>
    </div></section>`);
    return;
  }

  if (!sum || !sum.total) {
    el.innerHTML = wrap(`<section class="ra-card"><div class="ra-center">
      עוד לא תרגלת קטעים.<br><span class="ra-sub">אחרי הקטע הראשון יופיע כאן פירוט לפי גודל החלון.</span>
      <div class="ra-links"><a class="ra-link" href="#/reading-practice">להתחיל ←</a></div>
    </div></section>`);
    return;
  }

  el.innerHTML = wrap(`
    <section class="ra-card">
      <div class="ra-top">
        <div class="ra-big">${sum.correct} מתוך ${sum.total}</div>
        <div class="ra-sub">שאלות שענית עליהן לאחרונה</div>
      </div>
    </section>

    <h3 class="ra-h">לפי גודל החלון</h3>
    <section class="ra-card">
      ${['anchor', 'paragraph', 'text'].map((k) => bucketRow(WINDOW_LABEL[k], sum.byWindow[k], WINDOW_NOTE[k])).join('')}
      <p class="ra-foot">גודל החלון הוא מה שהשאלה מחייבת אותך לקרוא. זה הציר ששיטת החלון מלמדת.</p>
    </section>

    <h3 class="ra-h">לפי סוג השאלה</h3>
    <section class="ra-card">
      ${Object.keys(TYPE_LABEL)
        .filter((k) => sum.byType[k])
        .map((k) => bucketRow(TYPE_LABEL[k], sum.byType[k], masteryNote(sum.typeStreaks[k])))
        .join('') || `<div class="ra-center ra-sub">אין עדיין מספיק נתונים.</div>`}
    </section>

    ${mistakes?.length ? mistakesSection(mistakes) : ''}

    <div class="ra-links ra-bottom">
      <a class="ra-link" href="#/reading-practice">לתרגול נוסף ←</a>
      <a class="ra-link" href="#/reading-learn">📘 שיטת החלון</a>
    </div>`);

  el.querySelectorAll('[data-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const box = el.querySelector(`#${b.dataset.toggle}`);
      if (box) box.hidden = !box.hidden;
    }));
}

function bucketRow(label, stat, note) {
  if (!stat || !stat.total) {
    return `<div class="ra-row ra-row-empty"><div class="ra-row-label">${label}</div>
      <div class="ra-row-val ra-sub">—</div></div>`;
  }
  const enough = stat.total >= MIN_FOR_RATE;
  const pct = Math.round((stat.correct / stat.total) * 100);
  return `
    <div class="ra-row">
      <div class="ra-row-label">${label}${note ? `<span class="ra-note">${note}</span>` : ''}</div>
      <div class="ra-row-val">${enough ? `${pct}%` : `${stat.correct}/${stat.total}`}
        <span class="ra-sub">${enough ? `(${stat.correct}/${stat.total})` : 'עדיין מעט'}</span>
      </div>
    </div>`;
}

function masteryNote(streak) {
  return streak >= 3 ? 'שלוש נכונות ברצף — הרמז כבר לא מוצע כאן.' : '';
}

function mistakesSection(rows) {
  return `
    <h3 class="ra-h">שאלות שטעית בהן</h3>
    <section class="ra-card">
      ${rows.map((r, i) => {
        const q = r.reading_questions;
        if (!q) return '';
        const expl = q.explanations_he || [];
        const id = `raM${i}`;
        return `
        <div class="ra-mistake">
          <button class="ra-mistake-head" data-toggle="${id}">
            <span dir="ltr">${esc(q.question_text)}</span>
            <span class="ra-note">${esc(r.reading_passages?.title || '')} · ${WINDOW_LABEL[r.window_size] || ''}</span>
          </button>
          <div class="ra-mistake-body" id="${id}" hidden>
            ${expl[r.chosen_option] ? `<p class="ra-line"><b>מה שסימנת:</b> ${esc(expl[r.chosen_option])}</p>` : ''}
            ${expl[q.correct_option_index] ? `<p class="ra-line"><b>התשובה:</b> ${esc(expl[q.correct_option_index])}</p>` : ''}
          </div>
        </div>`;
      }).join('')}
    </section>`;
}

function wrap(inner) {
  return `<div class="ra-wrap fade-in">
      <div class="page-title">ניתוח — הבנת הנקרא</div>
      <div class="page-sub">מה קרה בתרגולים האחרונים</div>
      ${inner}
    </div>`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ensureStyles() {
  if (document.getElementById('ra-css')) return;
  const s = document.createElement('style');
  s.id = 'ra-css';
  s.textContent = `
.ra-wrap{max-width:680px}
.ra-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.15rem 1.35rem;margin-bottom:1rem}
.ra-h{font-size:1rem;font-weight:800;margin:1.5rem 0 .7rem}
.ra-top{text-align:center;padding:.4rem 0}
.ra-big{font-size:1.9rem;font-weight:800;color:var(--green-dark)}
.ra-sub{font-size:.82rem;color:var(--muted);font-weight:400}
.ra-center{text-align:center;color:var(--muted);padding:1.6rem 1rem;line-height:1.9}
.ra-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:.75rem 0;border-bottom:1px solid var(--border)}
.ra-row:last-of-type{border-bottom:none}
.ra-row-empty{opacity:.55}
.ra-row-label{font-size:.92rem;font-weight:700;line-height:1.6}
.ra-note{display:block;font-size:.79rem;font-weight:400;color:var(--muted);line-height:1.65;margin-top:.15rem}
.ra-row-val{flex:0 0 auto;font-size:1rem;font-weight:800;text-align:left;white-space:nowrap}
.ra-row-val .ra-sub{display:block;font-weight:400}
.ra-foot{font-size:.84rem;color:var(--muted);line-height:1.8;margin:.9rem 0 0;padding-top:.8rem;border-top:1px solid var(--border)}
.ra-mistake{border-bottom:1px solid var(--border)}
.ra-mistake:last-child{border-bottom:none}
.ra-mistake-head{width:100%;text-align:right;background:none;border:none;font:inherit;font-size:.9rem;line-height:1.7;color:var(--text);cursor:pointer;padding:.75rem 0}
.ra-mistake-body{padding:0 0 .85rem}
.ra-line{font-size:.87rem;line-height:1.8;margin:.3rem 0 0}
.ra-links{display:flex;justify-content:center;gap:1.4rem;margin-top:.9rem}
.ra-bottom{margin-top:1.4rem}
.ra-link{color:var(--green-dark);font-weight:700;font-size:.88rem;text-decoration:none}
.ra-link:hover{text-decoration:underline}
`;
  document.head.appendChild(s);
}
