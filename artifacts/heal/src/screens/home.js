import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getProgressStats, getCurrentSession } from '../supabase.js';

export async function renderHome(root) {
  await renderLayout(root, '/home');
  const el = getPageContent();

  // Show loading
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const name    = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';
  const stats   = await getProgressStats();

  const acquired   = stats?.acquired   || 0;
  const streak     = stats?.streak     || 0;
  const target     = stats?.targetScore|| 130;
  const examDate   = stats?.examDate;
  const daysLeft   = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : 86;
  const targetPct  = Math.min(100, Math.round(acquired / 277 * 60));

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title" id="home-greeting">בוקר טוב, ${name} 👋</div>
      <div class="page-sub">${streak} ימים ברצף — המשך כך! יש לך ${daysLeft} ימים עד הבחינה.</div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-lbl">כרטיסיות Tier A</div>
          <div style="display:flex;align-items:baseline;gap:7px">
            <div class="stat-val">${acquired}</div>
            <div class="stat-abs">/ 277</div>
          </div>
          <div class="stat-sub">מילים שנרכשו</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ניסוח מחדש</div>
          <div class="stat-val">68%</div>
          <div class="stat-sub">דיוק ממוצע</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ימים ברצף</div>
          <div class="stat-val">${streak} 🔥</div>
          <div class="stat-sub">שיא: 14 ימים</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ציון יעד</div>
          <div class="stat-val">${target}</div>
          <div class="stat-sub">מסלול פטור</div>
        </div>
      </div>

      <!-- Target score banner -->
      <div class="cdb">
        <div>
          <div class="cdb-days">${daysLeft}</div>
          <div class="cdb-days-lbl">ימים עד הבחינה</div>
        </div>
        <div class="cdb-bar-wrap">
          <div class="cdb-bar-lbl">
            <span>התקדמות לציון יעד ${target}</span>
            <strong>${targetPct}%</strong>
          </div>
          <div class="cdb-bar-outer">
            <div class="cdb-bar-fill" style="width:${targetPct}%"></div>
          </div>
          <div class="cdb-bar-note">מחושב לפי מילים שנרכשו + דיוק Restatement</div>
        </div>
        <div class="cdb-score">
          <div class="cdb-score-n">${target}</div>
          <div class="cdb-score-l">ציון יעד</div>
        </div>
      </div>

      <!-- Daily session card -->
      <div class="sec-title">האימון היומי</div>
      <div class="session-card" id="btn-daily">
        <div class="session-info">
          <h3>אימון יומי</h3>
          <p>חזרה חכמה על מילים + שאלות ניסוח מחדש</p>
          <div class="session-chips">
            <div class="session-chip">⏱ ~20 דקות</div>
            <div class="session-chip">🃏 8 כרטיסיות</div>
            <div class="session-chip">🔄 3 שאלות</div>
          </div>
        </div>
        <button class="btn-session-cta">התחל עכשיו ←</button>
      </div>

      <!-- Module grid -->
      <div class="sec-title">מודולים</div>
      <div class="module-grid">
        <div class="mc mc-g" data-nav="/flashcards">
          <span class="mc-icon">🃏</span>
          <div class="mc-name">כרטיסיות</div>
          <div class="mc-desc">550 מילים עם אסוציאציות, אודיו וחזרה חכמה</div>
          <div class="mc-bar"><div class="mc-fill" style="width:${Math.round(acquired/550*100)}%"></div></div>
          <div class="mc-pct">${Math.round(acquired/550*100)}% הושלם</div>
        </div>
        <div class="mc mc-p" data-nav="/rephrasing">
          <span class="mc-icon">🔄</span>
          <div class="mc-name">ניסוח מחדש</div>
          <div class="mc-desc">לוגיקה, מלכודות ואקוויוולנטים אקדמיים</div>
          <div class="mc-bar"><div class="mc-fill" style="width:8%"></div></div>
          <div class="mc-pct">8% הושלם</div>
        </div>
        <div class="mc mc-o mc-locked">
          <span class="lock-tag">🔒 בקרוב</span>
          <span class="mc-icon">✍️</span>
          <div class="mc-name">השלמת משפטים</div>
          <div class="mc-desc">בחר את המילה הנכונה להשלמת המשפט</div>
          <div class="mc-bar"><div class="mc-fill" style="width:0%"></div></div>
          <div class="mc-pct">בקרוב</div>
        </div>
        <div class="mc mc-b mc-locked">
          <span class="lock-tag">🔒 בקרוב</span>
          <span class="mc-icon">📖</span>
          <div class="mc-name">קריאה</div>
          <div class="mc-desc">קטעים אקדמיים, 5 סוגי שאלות</div>
          <div class="mc-bar"><div class="mc-fill" style="width:0%"></div></div>
          <div class="mc-pct">בקרוב</div>
        </div>
      </div>
    </div>`;

  el.querySelector('#btn-daily').addEventListener('click', () => navigate('/flashcards'));
  el.querySelectorAll('[data-nav]').forEach(el2 => {
    el2.addEventListener('click', () => navigate(el2.dataset.nav));
  });
}
