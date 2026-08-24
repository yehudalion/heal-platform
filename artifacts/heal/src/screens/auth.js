import { supabase, isSupabaseConfigured, setGuest } from '../supabase.js';
import { navigate } from '../router.js';

const googleIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;flex-shrink:0"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.61 4.1-5.35 4.1A5.4 5.4 0 1 1 12 6.6c1.7 0 2.85.72 3.5 1.34l2.4-2.32C16.36 4.27 14.4 3.4 12 3.4 7.13 3.4 3.2 7.33 3.2 12s3.93 8.6 8.8 8.6c5.07 0 8.45-3.56 8.45-8.57 0-.58-.06-1.02-.1-1.43z"/></svg>`;

export function renderAuth(root) {
  root.innerHTML = `
    <div class="auth-wrap fade-in">
      <div class="auth-card">

        <div class="auth-logo">High<em>Score</em></div>
        <div class="auth-tagline">ההכנה למבחן האנגלית החדש</div>

        <button class="btn-google" id="googleBtn">
          ${googleIcon}
          המשך עם Google
        </button>

        <div class="auth-social">או באמצעות דוא״ל</div>

        <form id="emailForm" style="display:flex;gap:8px;margin-top:.8rem">
          <input
            type="email" id="emailInput"
            placeholder="כתובת דוא״ל"
            required autocomplete="email"
            style="flex:1;padding:.72rem 1rem;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.88rem;font-family:inherit;direction:rtl"
          />
          <button type="submit" style="padding:.72rem 1rem;background:var(--green);color:white;border:none;border-radius:var(--radius-sm);font-size:.85rem;font-weight:700;white-space:nowrap">
            שלח קישור
          </button>
        </form>

        <div style="display:flex;align-items:center;gap:10px;margin:1.1rem 0;color:var(--muted);font-size:.78rem">
          <div style="flex:1;height:1px;background:var(--border)"></div>
          או
          <div style="flex:1;height:1px;background:var(--border)"></div>
        </div>

        <button id="guestBtn" style="width:100%;padding:.82rem;border:2px solid var(--border);border-radius:var(--radius-sm);background:white;font-size:.9rem;font-weight:700;color:var(--text)">
          המשך כאורח
        </button>

        <div id="notice" style="margin-top:.9rem;font-size:.82rem;text-align:center;color:var(--muted);min-height:1.2em"></div>

        <div style="margin-top:1.4rem;font-size:.76rem;color:var(--muted)">כלי לימוד ממוקד. ללא פרסומות. ללא רעש.</div>
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
    setMsg('מעביר ל-Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setMsg(error.message, true);
  });

  root.querySelector('#emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) { setMsg('Supabase לא מוגדר.', true); return; }
    const email = root.querySelector('#emailInput').value.trim();
    if (!email) return;
    setMsg('שולח קישור התחברות…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setMsg(error.message, true);
    else setMsg('בדקו את תיבת הדוא״ל — הקישור יחבר אתכם.');
  });

  root.querySelector('#guestBtn').addEventListener('click', () => {
    setGuest(true);
    navigate('/home');
  });
}
