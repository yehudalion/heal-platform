/**
 * Home reads through the data layer only (SITEMAP §6). It used to call
 * getProgressStats() out of supabase.js, which queried `user_profiles.id` (the
 * column is `user_id`) and a `ratings` table that does not exist — both failed on
 * every load, so every number it produced was the fallback, not the learner's.
 *
 * Real sources now:
 *   profiles.data.getProfile   → streak_days, target_score, exam_date
 *   srs.data.getSessionStats   → vocabulary progress, from srs_progress
 *   weakpoints.data.getWeakPoints → rephrase practice volume
 *
 * The listening tile no longer queries `listening_user_state` directly: that table
 * does not exist either, so the call 404'd every load and the tile always rendered
 * its "not started" state anyway. The listening module owns that data and is being
 * fixed separately — the tile keeps its neutral state until it is.
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';        // auth only
import { getProfile } from '../data/profiles.data.js';
import { getSessionStats } from '../data/srs.data.js';
import { getWeakPoints } from '../data/weakpoints.data.js';

export async function renderHome(root) {
  await renderLayout(root, '/home');
  const el = getPageContent();

  // Show loading
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  const name    = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';

  const [profileRes, srsRes, reports] = await Promise.all([
    userId ? getProfile(userId)      : Promise.resolve({ data: null }),
    userId ? getSessionStats(userId) : Promise.resolve({ data: null }),
    userId ? getWeakPoints(userId)   : Promise.resolve([]),
  ]);

  const profile  = profileRes?.data ?? null;
  const srs      = srsRes?.data ?? null;
  const rephrase = reports.find((r) => r.moduleId === 'rephrase') ?? null;

  // Words that have graduated out of learning — the real "acquired" count.
  const acquired   = srs?.in_review ?? 0;
  const seenWords  = srs?.total_seen ?? 0;
  const rpAttempts = rephrase?.attempts ?? 0;
  const streak     = profile?.streak_days ?? 0;
  const target     = profile?.target_score ?? null;
  const examDate   = profile?.exam_date ?? null;
  const daysLeft   = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null;

  // Listening progress lives in a table that does not exist yet — neutral state.
  const listeningScore = 0;
  const listeningLabel = 'התחל עכשיו';

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title" id="home-greeting">בוקר טוב, ${name} 👋</div>
      <div class="page-sub">${daysLeft !== null ? `נותרו ${daysLeft} ימים עד הבחינה.` : 'אפשר להגדיר תאריך בחינה בפרופיל.'}</div>

      <!-- Stats row — every number here comes from the data layer or is not shown -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-lbl">כרטיסיות</div>
          <div class="stat-val">${acquired}</div>
          <div class="stat-sub">${seenWords ? `מילים שנרכשו מתוך ${seenWords} שנלמדו` : 'עוד לא התחלת'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ניסוח מחדש</div>
          <div class="stat-val">${rpAttempts}</div>
          <div class="stat-sub">${rpAttempts ? 'שאלות שתרגלת' : 'עוד לא התחלת'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ימים ברצף</div>
          <div class="stat-val">${streak} 🔥</div>
          <div class="stat-sub">רצף נוכחי</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">ציון יעד</div>
          <div class="stat-val">${target ?? '—'}</div>
          <div class="stat-sub">${target ? 'מסלול פטור' : 'לא הוגדר בפרופיל'}</div>
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
        <div class="mc mc-g" data-nav="/card">
          <span class="mc-icon">🃏</span>
          <div class="mc-name">כרטיסיות</div>
          <div class="mc-desc">550 מילים עם אסוציאציות, אודיו וחזרה חכמה</div>
          <div class="mc-bar"><div class="mc-fill" style="width:${Math.round(acquired / 550 * 100)}%"></div></div>
          <div class="mc-pct">${acquired} מתוך 550</div>
        </div>
        <div class="mc mc-p" data-nav="/rephrasing">
          <span class="mc-icon">🔄</span>
          <div class="mc-name">ניסוח מחדש</div>
          <div class="mc-desc">לוגיקה, מפתחות הטעיה ואקוויוולנטים אקדמיים</div>
          <div class="mc-pct">${rpAttempts ? `${rpAttempts} שאלות שתרגלת` : 'עוד לא התחלת'}</div>
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
        <div class="mc mc-g" data-nav="/listening">
          <span class="mc-icon">🎧</span>
          <div class="mc-name">האזנה</div>
          <div class="mc-desc">פגישות תרגול ממוקדות, ציון מוכנות וניתוח חולשות</div>
          <div class="mc-bar"><div class="mc-fill" style="width:${listeningScore}%"></div></div>
          <div class="mc-pct">${listeningLabel}</div>
        </div>
      </div>
    </div>`;

  el.querySelector('#btn-daily').addEventListener('click', () => navigate('/card'));
  el.querySelectorAll('[data-nav]').forEach(el2 => {
    el2.addEventListener('click', () => navigate(el2.dataset.nav));
  });
}
