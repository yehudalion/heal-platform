import { supabase, isSupabaseConfigured, setGuest } from '../supabase.js';
import { navigate } from '../router.js';

const googleIcon = `<svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.61 4.1-5.35 4.1A5.4 5.4 0 1 1 12 6.6c1.7 0 2.85.72 3.5 1.34l2.4-2.32C16.36 4.27 14.4 3.4 12 3.4 7.13 3.4 3.2 7.33 3.2 12s3.93 8.6 8.8 8.6c5.07 0 8.45-3.56 8.45-8.57 0-.58-.06-1.02-.1-1.43z"/></svg>`;
const mailIcon = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/></svg>`;

export function renderAuth(root) {
  root.innerHTML = `
    <div class="auth fade-in">
      <div class="auth-inner">
        <div class="auth-mark">HEAL</div>
        <div class="auth-tag">Vocabulary &middot; Daily Practice</div>

        <h1 class="auth-title">Sign in to begin your study</h1>

        <div class="auth-stack">
          <button class="btn" id="googleBtn">${googleIcon}Continue with Google</button>

          <div class="auth-divider">or with email</div>

          <form class="email-row" id="emailForm">
            <input type="email" id="emailInput" placeholder="you@university.edu" required autocomplete="email" />
            <button type="submit">${mailIcon}Send link</button>
          </form>

          <div class="auth-divider">or</div>

          <button class="btn-ghost btn" id="guestBtn">Continue as Guest</button>
        </div>

        <div id="notice" class="notice"></div>

        <div class="foot-note">A focused study tool. No ads. No noise.</div>
      </div>
    </div>
  `;

  const notice = root.querySelector('#notice');
  const setMsg = (msg, isErr = false) => {
    notice.textContent = msg || '';
    notice.classList.toggle('error', isErr);
  };

  if (!isSupabaseConfigured) {
    setMsg('Supabase is not configured — guest mode still works.', true);
  }

  root.querySelector('#googleBtn').addEventListener('click', async () => {
    if (!supabase) {
      setMsg('Supabase is not configured.', true);
      return;
    }
    setMsg('Redirecting to Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setMsg(error.message, true);
  });

  root.querySelector('#emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) {
      setMsg('Supabase is not configured.', true);
      return;
    }
    const email = root.querySelector('#emailInput').value.trim();
    if (!email) return;
    setMsg('Sending magic link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setMsg(error.message, true);
    } else {
      setMsg('Check your inbox — the link will sign you in.');
    }
  });

  root.querySelector('#guestBtn').addEventListener('click', () => {
    setGuest(true);
    navigate('/fork');
  });
}
