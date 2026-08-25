/**
 * src/screens/rephrasing.js — the Rephrase module gate.
 *
 * This is the page the sidebar points at. Its ONLY job is to send the learner
 * into the module. Rewritten 2026-08-05: the previous version advertised the
 * retired 6-trap model (Trap Trainer / Explain / Weakness), hardcoded invented
 * stats, and carried [PLACEHOLDER] copy.
 *
 * NO first-visit logic lives here on purpose. rephrase-practice.js already gates
 * on LEARN_SEEN_KEY and bounces a first-timer to /rephrase-learn, so the CTA
 * links straight to practice and the detour happens by itself. Duplicating that
 * check here would give the gate two sources of truth.
 *
 * HARD rules honoured:
 *  - No direct Supabase. The one real number on this page comes from
 *    data/rephrase.data.js.
 *  - No invented statistics. If the number isn't real, nothing is shown.
 *  - Wellbeing: a count only. Accuracy belongs to the Analyze layer (T044), and
 *    a low score on the module's front door is exactly the framing rule 6 bans.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { isGuest } from '../supabase.js';
import { fetchRecentAttempts } from '../data/rephrase.data.js';
import { lengthPicker } from '../lib/sessionPrefs.js';

// Verbatim excerpt from rephrase-learn.js screen 1 (approved copy, Lion 2026-08-05).
// SOURCE OF TRUTH is rephrase-learn.js — if that text changes, change it here too.
const BLURB = 'משפט מקור באנגלית + 4 ניסוחים אפשריים. אחד שומר על המשמעות בול. שלושת האחרים טועים מסיבה מבנית — לא כי יש בהם מילה קשה. זו חידה לוגית, לא מבחן אוצר מילים.';

export async function renderRephrasing(root) {
  await renderLayout(root, '/rephrasing');
  const el = getPageContent();
  const picker = lengthPicker('rephrase', [
    { v: 3, label: 'קצר',  sub: '3 שאלות · כ־4 דק׳'  },
    { v: 5, label: 'רגיל', sub: '5 שאלות · כ־7 דק׳'  },
    { v: 8, label: 'ארוך', sub: '8 שאלות · כ־11 דק׳' },
  ], 5);

  el.innerHTML = `
    <div class="fade-in" style="max-width:620px">
      <div class="page-title">ניסוח מחדש</div>
      <div class="page-sub">Restatement</div>

      <div class="rg-card">
        <p class="rg-blurb">${BLURB}</p>
        ${picker.html}
        <button class="btn-primary rg-cta" id="rgStart">התחל תרגול ←</button>
        <div class="rg-links">
          <a class="rg-guide" href="#/rephrase-learn">📘 מדריך</a>
          <a class="rg-guide" href="#/rephrase-analyze">📊 ניתוח</a>
        </div>
      </div>

      <div class="rg-stat" id="rgStat" hidden></div>
    </div>`;

  picker.wire(el);
  el.querySelector('#rgStart').addEventListener('click', () => navigate('/rephrase-practice'));

  showPractisedCount(el);
  ensureStyles();
}

/**
 * The only number on this page, and only when it is real. Silent on guests (no
 * user rows to read), on error, and on zero — an empty state beats a fake one.
 */
async function showPractisedCount(el) {
  if (isGuest()) return;
  const { data, error } = await fetchRecentAttempts({ limit: 300 });
  if (error || !data?.length) return;
  const box = el.querySelector('#rgStat');
  if (!box) return;
  // "לאחרונה" is not decoration: the query is capped at 300, so this is a recent
  // count, not a lifetime total. Do not reword it into an all-time claim.
  box.textContent = `${data.length} שאלות שתרגלת לאחרונה`;
  box.hidden = false;
}

function ensureStyles() {
  if (document.getElementById('rg-gate-css')) return;
  const s = document.createElement('style');
  s.id = 'rg-gate-css';
  s.textContent = `
.rg-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 1.6rem}
.rg-blurb{font-size:.95rem;line-height:1.8;color:var(--text)}
.rg-cta{width:100%;margin-top:1.4rem;padding:.85rem 1rem;font-size:1rem}
.rg-links{display:flex;justify-content:center;gap:1.4rem;margin-top:.9rem}
.rg-guide{color:var(--green-dark);font-weight:700;font-size:.85rem;text-decoration:none}
.rg-guide:hover{text-decoration:underline}
.rg-stat{margin-top:1rem;text-align:center;font-size:.82rem;color:var(--muted)}
`;
  document.head.appendChild(s);
}
