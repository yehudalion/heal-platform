import { supabase, isSupabaseConfigured, setGuest } from '../supabase.js';
import { track } from '../lib/analytics.js';
import { navigate } from '../router.js';

const googleIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;flex-shrink:0"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.61 4.1-5.35 4.1A5.4 5.4 0 1 1 12 6.6c1.7 0 2.85.72 3.5 1.34l2.4-2.32C16.36 4.27 14.4 3.4 12 3.4 7.13 3.4 3.2 7.33 3.2 12s3.93 8.6 8.8 8.6c5.07 0 8.45-3.56 8.45-8.57 0-.58-.06-1.02-.1-1.43z"/></svg>`;

export function renderAuth(root) {
  root.innerHTML = `
    <div class="auth-wrap fade-in">
      <div class="auth-card">

        <div class="auth-logo">High<em>Score</em></div>
        <div class="auth-tagline">ההכנה למבחן הלאל</div>

        <button class="btn-google" id="googleBtn">
          ${googleIcon}
          המשך עם Google
        </button>

        <button id="guestBtn" style="width:100%;padding:.82rem;border:2px solid var(--border);border-radius:var(--radius-sm);background:var(--card);font-size:.9rem;font-weight:700;color:var(--text)">
          הצצה כאורח
        </button>
        <div style="margin-top:.45rem;font-size:.73rem;text-align:center;color:var(--muted);line-height:1.5">
          כאורח אפשר לראות הכל — לתרגול ולשמירת התקדמות צריך חשבון חינם (10 שניות עם Google).
        </div>

        <div id="notice" style="margin-top:.9rem;font-size:.82rem;text-align:center;color:var(--muted);min-height:1.2em"></div>

        <div style="margin-top:1.4rem;font-size:.76rem;color:var(--muted)">כלי לימוד ממוקד. ללא פרסומות. ללא רעש.</div>
        <!-- Privacy link, 2026-08-29: a policy nobody can find does not do its job,
             and this is the screen where the learner actually decides to sign up. -->
        <div style="margin-top:.5rem;font-size:.72rem;color:var(--muted)">
          <a href="/privacy/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">מדיניות פרטיות</a>
          <span style="opacity:.6"> · </span>
          <a href="/terms/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">תנאי שימוש</a>
        </div>
        <!-- SEO 2026-09-01: מסך הכניסה היה היחיד שמחבר בין האפליקציה לבין
             8 עמודי ההסבר החינמיים (mivchan-hilal ומשם הלאה) — בלעדיו הם
             היו "אי" נפרד שרק גוגל מכיר, ואף משתמש בפועל לא נתקל בו. -->
        <div style="margin-top:.4rem;font-size:.72rem;color:var(--muted)">
          <a href="/mivchan-hilal/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">מדריכים למבחן הלאל</a>
        </div>
      </div>
    </div>
  `;

  const notice = root.querySelector('#notice');
  const setMsg = (msg, isErr = false) => {
    notice.textContent = msg || '';
    notice.style.color = isErr ? 'var(--red)' : 'var(--muted)';
  };

  if (!isSupabaseConfigured) {
    setMsg('Supabase לא מוגדר — השתמשו ב"המשך כאורח".', true);
  }

  root.querySelector('#googleBtn').addEventListener('click', async () => {
    if (!supabase) { setMsg('Supabase לא מוגדר.', true); return; }
    track('auth_google_clicked');
    setMsg('מעביר ל-Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setMsg(error.message, true);
  });

  root.querySelector('#guestBtn').addEventListener('click', () => {
    track('guest_started');
    setGuest(true);
    navigate('/home');
  });
}
