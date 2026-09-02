/**
 * src/screens/reading.js — the Reading Comprehension gate.
 *
 * Same one job as rephrasing.js / sentence-completion.js: explain the section
 * in a sentence and send the learner in. What is different here, and the reason
 * this gate has TWO buttons instead of one (Lion, 2.9.2026): reading is the only
 * section whose real exam unit is a whole 15-minute block, so the corner offers
 * both a teaching mode (feedback after every question) and a timed section
 * simulation. Everything else about the layout follows the existing gates.
 *
 * HARD rules honoured:
 *  - No direct Supabase. The one real number comes from data/reading.data.js.
 *  - No invented statistics: silent on guests, on error, and on zero.
 *  - Wellbeing: a count, never a score or a streak.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { isGuest, getCurrentSession } from '../supabase.js';
import { fetchRecentAttempts } from '../data/reading.data.js';

const BLURB = 'קטע אנגלי אחד וחמש שאלות עליו — הפרק הארוך ביותר בבחינה, ‏15 דקות. השאלה עצמה מספרת לך כמה גדול הקטע שאתה חייב לקרוא: לפעמים משפט אחד, לפעמים פסקה שלמה, ולפעמים אין מה לחפש בכלל וצריך להשאיר אותה לסוף.';

export async function renderReading(root) {
  await renderLayout(root, '/reading');
  const el = getPageContent();

  el.innerHTML = `
    <div class="fade-in" style="max-width:620px">
      <div class="page-title">הבנת הנקרא</div>
      <div class="page-sub">Reading Comprehension</div>

      <div class="sg-card">
        <p class="sg-blurb">${BLURB}</p>
        <button class="btn-primary sg-cta" id="rdStart">התחל תרגול ←</button>
        <button class="sg-cta-alt" id="rdExam">סימולציית פרק · 15 דקות</button>
        <div class="sg-links">
          <a class="sg-guide" href="#/reading-learn">📘 שיטת החלון</a>
          <a class="sg-guide" href="#/reading-analyze">📊 ניתוח</a>
        </div>
      </div>

      <div class="sg-stat" id="rdStat" hidden></div>
    </div>`;

  el.querySelector('#rdStart').addEventListener('click', () => navigate('/reading-practice'));
  el.querySelector('#rdExam').addEventListener('click', () => navigate('/reading-practice?mode=exam'));

  showPractisedCount(el);
  ensureStyles();
}

/** The only number on this page, and only when it is real. */
async function showPractisedCount(el) {
  if (isGuest()) return;
  const session = await getCurrentSession();
  if (!session?.user?.id) return;
  const { data, error } = await fetchRecentAttempts(session.user.id, { limit: 300 });
  if (error || !data?.length) return;
  const passages = new Set(data.map((r) => r.passage_id)).size;
  const box = el.querySelector('#rdStat');
  if (!box) return;
  box.textContent = `${passages} קטעים שתרגלת לאחרונה`;
  box.hidden = false;
}

function ensureStyles() {
  if (document.getElementById('rd-gate-css')) return;
  const s = document.createElement('style');
  s.id = 'rd-gate-css';
  s.textContent = `
.sg-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 1.6rem}
.sg-blurb{font-size:.95rem;line-height:1.8;color:var(--text)}
.sg-cta{width:100%;margin-top:1.4rem;padding:.85rem 1rem;font-size:1rem}
.sg-cta-alt{width:100%;margin-top:.6rem;padding:.7rem 1rem;font-size:.9rem;font-weight:700;color:var(--green-dark);background:none;border:1.5px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-family:inherit}
.sg-cta-alt:hover{border-color:var(--green-dark)}
.sg-links{display:flex;justify-content:center;gap:1.4rem;margin-top:.9rem}
.sg-guide{color:var(--green-dark);font-weight:700;font-size:.85rem;text-decoration:none}
.sg-guide:hover{text-decoration:underline}
.sg-stat{margin-top:1rem;text-align:center;font-size:.82rem;color:var(--muted)}
`;
  document.head.appendChild(s);
}
