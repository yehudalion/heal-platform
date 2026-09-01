import './styles.css';
import { route, startRouter, navigate } from './router.js';
import { installErrorLog } from './lib/errorLog.js';
import { supabase, isGuest, getCurrentSession } from './supabase.js';

// ─── Screens ─────────────────────────────────────────────────────────────────
import { renderHome }        from './screens/home.js';
import { renderFlashcards }  from './screens/flashcards.js';
import { renderRephrasing }  from './screens/rephrasing.js';
import { renderRephraseLearn }    from './screens/rephrase-learn.js';
import { renderRephrasePractice } from './screens/rephrase-practice.js';
import { renderRephraseAnalyze }  from './screens/rephrase-analyze.js';
import { renderProgress, renderGap } from './screens/progress.js';
import { renderSentenceCompletion } from './screens/sentence-completion.js';
import { renderScLearn }    from './screens/sc-learn.js';
import { renderScPractice } from './screens/sc-practice.js';
import { renderScAnalyze }  from './screens/sc-analyze.js';

// Keep existing screens intact
import { renderAuth }  from './screens/auth.js';
import { renderOnboarding, getGuestProfile } from './screens/onboarding.js';
import { renderCard }  from './screens/card.js';
import { renderVocabLearn } from './screens/vocab-learn.js';
import { renderVocabAnalyze } from './screens/vocab-analyze.js';
import { renderDictionary } from './screens/dictionary.js';
import { renderMistakeNotebook } from './screens/mistake-notebook.js';
import { renderInsights } from './screens/insights.js';
import { renderSimulation }    from './screens/simulation.js';
import { renderSimulationRun } from './screens/simulation-run.js';

// ─── Listening section ────────────────────────────────────────────────────────
// test-page.js + item-test-page.js deleted 2026-08-14 (SITEMAP §4 "נמחקים,
// אושר ע"י ליאון" — old dev screens).
import { renderDiagnostic }          from './listening/diagnostic.js';
import { renderSession }             from './listening/session.js';
import { renderListeningDashboard }  from './listening/dashboard.js';
import { renderListeningLearn }      from './listening/readiness.js';
import { renderListeningAnalyze }    from './listening/analyze.js';

const app = document.getElementById('app');

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(handler) {
  return async (root) => {
    const session = await getCurrentSession();
    if (!session && !isGuest()) { navigate('/'); return; }
    await handler(root);
  };
}

// ─── Onboarding guard (SITEMAP §1) ───────────────────────────────────────────
// Applied to /home only: the dashboard is the entry point, so this is the one
// gate — direct links into modules stay friction-free.
function requireOnboarded(handler) {
  return requireAuth(async (root) => {
    if (isGuest()) {
      if (!getGuestProfile()?.onboarding_complete) { navigate('/onboarding'); return; }
    } else {
      const session = await getCurrentSession();
      const { getProfile } = await import('./data/profiles.data.js');
      const { data: profile } = await getProfile(session.user.id);
      if (!profile?.onboarding_complete) { navigate('/onboarding'); return; }
    }
    await handler(root);
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Auth / onboarding (existing)
route('/', async (root) => {
  const session = await getCurrentSession();
  if (session || isGuest()) { navigate('/home'); return; }
  renderAuth(root);
});
// fork.js/level.js removed 2026-08-28 — dead pre-redesign screens, zero navigate() references anywhere in the app.

// Onboarding (SITEMAP §1 — two questions, shown once)
route('/onboarding', requireAuth(renderOnboarding));

// New main routes
route('/home',         requireOnboarded(renderHome));
route('/flashcards',   requireAuth(renderFlashcards));
route('/rephrasing',   requireAuth(renderRephrasing));
route('/rephrase-learn',    requireAuth(renderRephraseLearn));
route('/rephrase-practice', requireAuth(renderRephrasePractice));
route('/rephrase-analyze',  requireAuth(renderRephraseAnalyze));
route('/progress',     requireAuth(renderProgress));
route('/gap',          requireAuth(renderGap));
route('/sentence-completion', requireAuth(renderSentenceCompletion));
route('/sc-learn',     requireAuth(renderScLearn));
route('/sc-practice',  requireAuth(renderScPractice));
route('/sc-analyze',   requireAuth(renderScAnalyze));

// Keep old /card and /gap routes for backwards compatibility
route('/card', requireAuth(renderCard));
route('/vocab-learn', requireAuth(renderVocabLearn));
route('/vocab-analyze', requireAuth(renderVocabAnalyze));
route('/dictionary', requireAuth(renderDictionary));
route('/mistake-notebook', requireAuth(renderMistakeNotebook));
route('/insights', requireAuth(renderInsights));

// ─── Simulation / אבחון רמה ──────────────────────────────────────────────────
// requireAuth ולא requireOnboarded: זה שער הכניסה מה-SEO, ואורח צריך להגיע
// אליו בלי חיכוך. הדוח נשמר רק למי שמחובר — ההצעה להירשם מגיעה בסופו.
route('/simulation',     requireAuth(renderSimulation));
route('/simulation/run', requireAuth(renderSimulationRun));

// ─── Listening section routes ────────────────────────────────────────────────
route('/listening/diagnostic', requireAuth(renderDiagnostic));         // M4 — PARKED, not in the entry path (SITEMAP: "לא נמחק, לא פעיל"). Reachable by direct URL only; nothing links here.
route('/listening/learn',      requireAuth(renderListeningLearn));     // Learn layer — the one lesson (direction)
route('/listening/session',    requireAuth(renderSession));            // Practice layer — session loop
route('/listening/analyze',    requireAuth(renderListeningAnalyze));   // Analyze layer — cumulative descriptive report
route('/listening',            requireAuth(renderListeningDashboard)); // Section dashboard (3-layer entry)

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
// לפני הראוטר: שגיאה בטעינת המסך הראשון היא בדיוק זו שנרצה לראות.
installErrorLog();

startRouter(app);
