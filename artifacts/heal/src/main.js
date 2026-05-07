import './styles.css';
import { route, startRouter, navigate } from './router.js';
import { supabase, isSupabaseConfigured, isGuest, getCurrentSession } from './supabase.js';

// ─── Screens ─────────────────────────────────────────────────────────────────
import { renderHome }        from './screens/home.js';
import { renderFlashcards }  from './screens/flashcards.js';
import { renderSrs }         from './screens/srs.js';
import { renderRephrasing }  from './screens/rephrasing.js';
import { renderTrapTrainer } from './screens/trap-trainer.js';
import { renderExplain }     from './screens/explain.js';
import { renderWeakness }    from './screens/weakness.js';
import { renderProgress, renderGap } from './screens/progress.js';

// Keep existing screens intact
import { renderAuth }  from './screens/auth.js';
import { renderFork }  from './screens/fork.js';
import { renderLevel } from './screens/level.js';
import { renderCard }  from './screens/card.js';

const app = document.getElementById('app');

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(handler) {
  return async (root) => {
    const session = await getCurrentSession();
    if (!session && !isGuest()) { navigate('/'); return; }
    await handler(root);
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Auth / onboarding (existing)
route('/', async (root) => {
  const session = await getCurrentSession();
  if (session || isGuest()) { navigate('/home'); return; }
  renderAuth(root);
});
route('/fork',  requireAuth(renderFork));
route('/level', requireAuth(renderLevel));

// New main routes
route('/home',         requireAuth(renderHome));
route('/flashcards',   requireAuth(renderFlashcards));
route('/srs',          requireAuth(renderSrs));
route('/rephrasing',   requireAuth(renderRephrasing));
route('/trap-trainer', requireAuth(renderTrapTrainer));
route('/explain',      requireAuth(renderExplain));
route('/weakness',     requireAuth(renderWeakness));
route('/progress',     requireAuth(renderProgress));
route('/gap',          requireAuth(renderGap));

// Keep old /card and /gap routes for backwards compatibility
route('/card', requireAuth(renderCard));

// ─── Auth state listener ──────────────────────────────────────────────────────
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const path = location.hash.replace(/^#/, '') || '/';
      // If on login screen, redirect to app
      if (path === '/' || path === '') navigate('/home');
    } else {
      navigate('/');
    }
  });
}

// ─── Config warning ───────────────────────────────────────────────────────────
if (!isSupabaseConfigured) {
  const warn = document.createElement('div');
  warn.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e53935;color:white;text-align:center;padding:8px;font-size:.82rem;z-index:9999;font-family:sans-serif;direction:rtl';
  warn.textContent = 'פרטי Supabase חסרים — ההתחברות מושבתת. השתמשו ב"המשך כאורח" כדי לנסות את האפליקציה.';
  document.body.appendChild(warn);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
startRouter(app);