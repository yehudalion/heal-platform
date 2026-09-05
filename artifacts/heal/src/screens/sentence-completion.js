/**
 * src/screens/sentence-completion.js — the Sentence Completion module gate.
 *
 * Rewritten 2026-08-25 (SITEMAP §3/§4): the previous version advertised four
 * invented "coming soon" feature cards (collocations / transition words / two
 * placeholders) that were never part of this module's real design — none of
 * that content exists in the DB or in scKeys.js. Replaced with the same
 * pattern rephrasing.js uses: one job, send the learner into practice.
 *
 * NO first-visit logic lives here on purpose — sc-practice.js already gates on
 * LEARN_SEEN_KEY and bounces a first-timer to /sc-learn, exactly like
 * rephrasing.js / rephrase-practice.js. Duplicating that check here would give
 * the gate two sources of truth.
 *
 * HARD rules honoured:
 *  - No direct Supabase. The one real number on this page comes from
 *    data/sentenceCompletion.data.js.
 *  - No invented statistics.
 *  - Wellbeing: a count only, same as rephrasing.js.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { isGuest } from '../supabase.js';
import { fetchRecentAttempts } from '../data/sentenceCompletion.data.js';
import { setupCard } from '../lib/sessionSetup.js';   // סשן שבת 5: הגדרות לפני מנה

const BLURB = 'משפט אנגלי אחד עם מקום ריק, וארבע אופציות. רק אחת מתאימה למקום הזה בדיוק — לא כי המילים האחרות "לא קיימות", אלא כי הן לא מתאימות למבנה או להיגיון של המשפט. זו לא שאלת אוצר מילים, זו שאלה של איפה להסתכל.';

export async function renderSentenceCompletion(root) {
  await renderLayout(root, '/sentence-completion');
  const el = getPageContent();
  const setup = setupCard('sc', { sizes: [5, 10, 20], defaultSize: 5 });

  el.innerHTML = `
    <div class="fade-in" style="max-width:620px">
      <div class="page-title">השלמת משפטים</div>
      <div class="page-sub">Sentence Completion</div>

      <div class="sg-card">
        <p class="sg-blurb">${BLURB}</p>
        ${setup.html}
        <button class="btn-primary sg-cta" id="sgStart">התחל תרגול ←</button>
        <div class="sg-links">
          <a class="sg-guide" href="#/sc-learn">📘 מדריך</a>
          <a class="sg-guide" href="#/sc-analyze">📊 ניתוח</a>
        </div>
      </div>

      <div class="sg-stat" id="sgStat" hidden></div>
    </div>`;

  setup.wire(el);
  el.querySelector('#sgStart').addEventListener('click', () => navigate('/sc-practice'));

  showPractisedCount(el);
  ensureStyles();
}

/** The only number on this page, and only when it is real. Silent on guests,
 *  on error, and on zero — same discipline as rephrasing.js. */
async function showPractisedCount(el) {
  if (isGuest()) return;
  const { data, error } = await fetchRecentAttempts({ limit: 300 });
  if (error || !data?.length) return;
  const box = el.querySelector('#sgStat');
  if (!box) return;
  box.textContent = `${data.length} שאלות שתרגלת לאחרונה`;
  box.hidden = false;
}

function ensureStyles() {
  if (document.getElementById('sg-gate-css')) return;
  const s = document.createElement('style');
  s.id = 'sg-gate-css';
  s.textContent = `
.sg-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 1.6rem}
.sg-blurb{font-size:.95rem;line-height:1.8;color:var(--text)}
.sg-cta{width:100%;margin-top:1.4rem;padding:.85rem 1rem;font-size:1rem}
.sg-links{display:flex;justify-content:center;gap:1.4rem;margin-top:.9rem}
.sg-guide{color:var(--green-dark);font-weight:700;font-size:.85rem;text-decoration:none}
.sg-guide:hover{text-decoration:underline}
.sg-stat{margin-top:1rem;text-align:center;font-size:.82rem;color:var(--muted)}
`;
  document.head.appendChild(s);
}
