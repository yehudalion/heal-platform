import { route, startRouter, navigate } from './router.js';
import { renderAuth } from './screens/auth.js';
import { renderFork } from './screens/fork.js';
import { renderLevel } from './screens/level.js';
import { renderCard } from './screens/card.js';
import { renderGap } from './screens/gap.js';
import { attachTopbar } from './topbar.js';
import { supabase, isSupabaseConfigured, isGuest, getCurrentSession } from './supabase.js';

const app = document.getElementById('app');

function requireAuth(handler) {
  return async (root) => {
    const session = await getCurrentSession();
    if (!session && !isGuest()) {
      navigate('/');
      return;
    }
    await handler(root);
    await attachTopbar(root);
  };
}

route('/', async (root) => {
  // If already signed in or guest, skip to fork.
  const session = await getCurrentSession();
  if (session || isGuest()) {
    navigate('/fork');
    return;
  }
  renderAuth(root);
});

route('/fork', requireAuth(renderFork));
route('/level', requireAuth(renderLevel));
route('/card', requireAuth(renderCard));
route('/gap', requireAuth(renderGap));

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && location.hash === '#/') {
      navigate('/fork');
    }
  });
}

if (!isSupabaseConfigured) {
  const warn = document.createElement('div');
  warn.className = 'config-warn';
  warn.textContent =
    'Supabase credentials missing — sign-in is disabled. Use "Continue as Guest" to try the app.';
  document.body.appendChild(warn);
}

startRouter(app);
