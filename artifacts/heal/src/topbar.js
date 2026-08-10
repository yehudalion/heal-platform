import { isGuest, getCurrentSession, signOut } from './supabase.js';
import { navigate } from './router.js';

let cachedEmail = null;

export function renderTopbar() {
  const guest = isGuest();
  const who = guest ? 'אורח' : (cachedEmail || 'מחובר');
  return `
    <div class="topbar">
      <a class="brand" href="#/fork">
        <span class="brand-mark">HEAL</span>
        <span class="brand-sub">אוצר מילים</span>
      </a>
      <div class="topbar-right">
        <span class="who" data-who>${who}</span>
        <a class="link" href="#/progress">ההתקדמות שלי</a>
        <a class="link" href="#" data-signout>התנתק</a>
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
