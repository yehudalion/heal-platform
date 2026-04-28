import { isGuest, getCurrentSession, signOut } from './supabase.js';
import { navigate } from './router.js';

let cachedEmail = null;

export function renderTopbar() {
  const guest = isGuest();
  const who = guest ? 'Guest' : (cachedEmail || 'Signed in');
  return `
    <div class="topbar">
      <a class="brand" href="#/fork">
        <span class="brand-mark">HEAL</span>
        <span class="brand-sub">vocabulary</span>
      </a>
      <div class="topbar-right">
        <span class="who" data-who>${who}</span>
        <a class="link" href="#/gap">Gap report</a>
        <a class="link" href="#" data-signout>Sign out</a>
      </div>
    </div>
  `;
}

export async function attachTopbar(root) {
  // resolve real email after session lookup
  const session = await getCurrentSession();
  if (session && session.user && session.user.email) {
    cachedEmail = session.user.email;
    const el = root.querySelector('[data-who]');
    if (el) el.textContent = cachedEmail;
  }

  const out = root.querySelector('[data-signout]');
  if (out) {
    out.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut();
      cachedEmail = null;
      navigate('/');
    });
  }
}
