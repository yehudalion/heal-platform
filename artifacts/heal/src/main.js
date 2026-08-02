import './styles.css';
import { route, startRouter, navigate } from './router.js';
import { supabase, isGuest, getCurrentSession } from './supabase.js';

// ─── Screens ─────────────────────────────────────────────────────────────────
import { renderHome }        from './screens/home.js';
import { renderFlashcards }  from './screens/flashcards.js';
import { renderSrs }         from './screens/srs.js';
import { renderRephrasing }  from './screens/rephrasing.js';
import { renderRephrasePractice } from './screens/rephrase-practice.js';
import { renderTrapTrainer } from './screens/trap-trainer.js';
import { renderExplain }     from './screens/explain.js';
import { renderWeakness }    from './screens/weakness.js';
import { renderProgress, renderGap } from './screens/progress.js';
import { renderSentenceCompletion } from './screens/sentence-completion.js';

// Keep existing screens intact
import { renderAuth }  from './screens/auth.js';
import { renderFork }  from './screens/fork.js';
import { renderLevel } from './screens/level.js';
import { renderCard }  from './screens/card.js';
import { renderVocabLearn } from './screens/vocab-learn.js';
import { renderVocabAnalyze } from './screens/vocab-analyze.js';

// ─── Listening section ────────────────────────────────────────────────────────
import { renderListeningTest }     from './listening/test-page.js';
import { renderListeningItemTest } from './listening/item-test-page.js';
import { renderDiagnostic }        from './listening/diagnostic.js';
import { renderSession }              from './listening/session.js';
import { renderListeningDashboard }  from './listening/dashboard.js';

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
route('/rephrase-practice', requireAuth(renderRephrasePractice));
route('/trap-trainer', requireAuth(renderTrapTrainer));
route('/explain',      requireAuth(renderExplain));
route('/weakness',     requireAuth(renderWeakness));
route('/progress',     requireAuth(renderProgress));
route('/gap',          requireAuth(renderGap));
route('/sentence-completion', requireAuth(renderSentenceCompletion));

// Keep old /card and /gap routes for backwards compatibility
route('/card', requireAuth(renderCard));
route('/vocab-learn', requireAuth(renderVocabLearn));
route('/vocab-analyze', requireAuth(renderVocabAnalyze));

// ─── Listening section routes ────────────────────────────────────────────────
route('/listening/test',       renderListeningTest);                   // M2 audio player test (no auth)
route('/listening/item-test',  requireAuth(renderListeningItemTest));  // M3 full item test
route('/listening/diagnostic', requireAuth(renderDiagnostic));         // M4 diagnostic flow
route('/listening/session',    requireAuth(renderSession));            // M5 practice session
route('/listening',            requireAuth(renderListeningDashboard)); // M7 section dashboard

// ─── Auth state listener ──────────────────────────────────────────────────────
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const path = location.hash.replace(/^#/, '') || '/';
      if (path === '/' || path === '') navigate('/home');
    } else if (event === 'SIGNED_OUT') {
      navigate('/');
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
startRouter(app);