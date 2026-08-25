import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getDueCount, getSessionStats } from '../data/srs.data.js';
import { lengthPicker, getSessionLength } from '../lib/sessionPrefs.js';

export async function renderFlashcards(root) {
  await renderLayout(root, '/flashcards');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  // Data layer only (ARCHITECTURE §2.11) — the old getAllRatings() call read
  // from a `ratings` table that does not exist in the DB and always failed
  // silently, showing 0/0 stats. Guests have no persisted SRS state.
  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  const [{ data: dueCount }, { data: stats }] = userId
    ? await Promise.all([getDueCount(userId), getSessionStats(userId)])
    : [{ data: 0 }, { data: null }];
  const due  = dueCount || 0;
  const easy = stats?.in_review || 0;
  const picker = lengthPicker('vocab', [
    { v: 6,  label: 'קצר',  sub: '6 מילים · כ־3 דק׳'  },
    { v: 12, label: 'רגיל', sub: '12 מילים · כ־6 דק׳' },
    { v: 20, label: 'ארוך', sub: '20 מילים · כ־10 דק׳' },
  ], 12);

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">כרטיסיות</div>
      <div class="page-sub">550 מילים אקדמיות עם חזרה מרווחת חכמה.</div>

      <div style="max-width:560px;margin:0 auto">
        <div class="fc-start-card">
          <div style="text-align:center;margin-bottom:1.3rem">
            <div style="font-size:2.4rem;margin-bottom:.6rem">🃏</div>
            <div style="font-size:1.15rem;font-weight:900;margin-bottom:.4rem">חזרה מרווחת</div>
            <div style="font-size:.83rem;color:var(--muted);line-height:1.55">
              המערכת בוחרת את המילים שהגיע זמנן לחזרה, לפי הדירוגים שלך.
            </div>
          </div>
          <div class="fc-start-stats">
            <div class="fc-stat">
              <div class="fc-stat-n">${Math.max(0, due - easy)}</div>
              <div class="fc-stat-l">לחזרה היום</div>
            </div>
            <div class="fc-stat">
              <div class="fc-stat-n" id="fcSessionN">${getSessionLength('vocab', 12)}</div>
              <div class="fc-stat-l">בסשן זה</div>
            </div>
            <div class="fc-stat">
              <div class="fc-stat-n">${easy}</div>
              <div class="fc-stat-l">נרכשו</div>
            </div>
          </div>
          ${picker.html}
          <button class="btn-study" id="btn-start">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M5 3L11 8 5 13V3z"/></svg>
            התחל תרגול
          </button>
        </div>

      </div>
    </div>`;

  picker.wire(el, (n) => { el.querySelector('#fcSessionN').textContent = n; });
  el.querySelector('#btn-start').addEventListener('click', () => navigate('/card'));

}
