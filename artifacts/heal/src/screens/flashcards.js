import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getAllRatings } from '../supabase.js';

export async function renderFlashcards(root) {
  await renderLayout(root, '/flashcards');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const ratings  = await getAllRatings();
  const easy     = ratings.filter(r => r.rating === 'easy').length;
  const due      = ratings.length;

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
              <div class="fc-stat-n">8</div>
              <div class="fc-stat-l">בסשן זה</div>
            </div>
            <div class="fc-stat">
              <div class="fc-stat-n">${easy}</div>
              <div class="fc-stat-l">נרכשו</div>
            </div>
          </div>
          <button class="btn-study" id="btn-start">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M5 3L11 8 5 13V3z"/></svg>
            התחל תרגול
          </button>
        </div>

        <!-- SRS explanation accordion -->
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
          <button id="btn-srs-exp" style="width:100%;padding:1rem 1.2rem;display:flex;align-items:center;justify-content:space-between;background:none;border:none;font-size:.88rem;font-weight:700;color:var(--text)">
            <span style="display:flex;align-items:center;gap:8px">💡 מה זו חזרה מרווחת?</span>
            <svg id="srs-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;transition:transform .2s"><path d="M4 6l4 4 4-4"/></svg>
          </button>
          <div id="srs-exp" style="display:none;padding:0 1.2rem 1.2rem;border-top:1px solid var(--border)">
            <p style="font-size:.83rem;color:var(--muted);line-height:1.7;margin-top:.9rem">
              חזרה מרווחת (Spaced Repetition) היא שיטת למידה מבוססת מחקר שמנצלת את <strong style="color:var(--text)">"עקומת השכחה"</strong>. כל פעם שאתה מדרג מילה — <strong style="color:var(--green-dark)">קל</strong>, <strong style="color:var(--orange)">בסדר</strong> או <strong style="color:var(--red)">קשה</strong> — האלגוריתם מחשב מתי תצטרך לראות אותה שוב. מילים קשות חוזרות מהר; מילים קלות — אחרי זמן ארוך יותר.
            </p>
          </div>
        </div>
      </div>
    </div>`;

  el.querySelector('#btn-start').addEventListener('click', () => navigate('/srs'));

  const expBtn = el.querySelector('#btn-srs-exp');
  const expDiv = el.querySelector('#srs-exp');
  const chevron = el.querySelector('#srs-chevron');
  expBtn.addEventListener('click', () => {
    const open = expDiv.style.display === 'block';
    expDiv.style.display = open ? 'none' : 'block';
    chevron.style.transform = open ? '' : 'rotate(180deg)';
  });
}
