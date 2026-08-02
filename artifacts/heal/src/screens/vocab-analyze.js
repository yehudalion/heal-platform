import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getProfile } from '../data/profiles.data.js';

export async function renderVocabAnalyze(root) {
  const raw = sessionStorage.getItem('hs_last_session_summary');
  if (!raw) {
    // No summary — bounce home
    navigate('/home');
    return;
  }

  let summary;
  try { summary = JSON.parse(raw); }
  catch { navigate('/home'); return; }

  // Try to fetch streak from profile (optional, fail silently)
  let streakDays = 0;
  try {
    const session = await getCurrentSession();
    if (session?.user?.id) {
      const { data: profile } = await getProfile(session.user.id);
      streakDays = profile?.streak_days || 0;
    }
  } catch (_) {}

  const { total, first_good, recovered, carry_over } = summary;

  const streakRow = streakDays > 0
    ? `<div class="va-streak">🔥 ${streakDays} ימים ברצף</div>`
    : '';

  const carryOverRow = carry_over > 0
    ? `<div class="va-row va-row-carry">
         <div class="va-row-n">${carry_over}</div>
         <div class="va-row-l">קשה — נחזור עליה מחר</div>
       </div>`
    : '';

  const recoveredRow = recovered > 0
    ? `<div class="va-row va-row-recovered">
         <div class="va-row-n">${recovered}</div>
         <div class="va-row-l">התאמצת ובסוף ידעת</div>
       </div>`
    : '';

  root.innerHTML = `<div class="vc-shell fade-in">
    <header class="vc-topbar">
      <a class="brand-mark vc-brand" href="#/home">hSc</a>
    </header>
    <main class="vc-main">
      <div class="va-card">
        <div class="va-celebrate">🎯</div>
        <h1 class="va-title">סיימת ${total} מילים!</h1>

        <div class="va-rows">
          <div class="va-row va-row-good">
            <div class="va-row-n">${first_good}</div>
            <div class="va-row-l">ידעת בפעם הראשונה</div>
          </div>
          ${recoveredRow}
          ${carryOverRow}
        </div>

        ${streakRow}

        <div class="va-cta-row">
          <button class="va-cta va-cta-secondary" id="vaHomeBtn">דף הבית</button>
          <button class="va-cta va-cta-primary" id="vaAgainBtn">עוד סשן ←</button>
        </div>
      </div>
    </main>
  </div>`;

  root.querySelector('#vaAgainBtn').addEventListener('click', () => {
    sessionStorage.removeItem('hs_last_session_summary');
    navigate('/card');
  });
  root.querySelector('#vaHomeBtn').addEventListener('click', () => {
    sessionStorage.removeItem('hs_last_session_summary');
    navigate('/home');
  });
}
