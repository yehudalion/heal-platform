import './styles.css';
import { route, startRouter, navigate } from './router.js';
import { installErrorLog } from './lib/errorLog.js';
import { supabase, isGuest, getCurrentSession } from './supabase.js';

// ─── Screens ─────────────────────────────────────────────────────────────────
import { renderHome }        from './screens/home.js';
import { renderPractice }    from './screens/practice.js';
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
import { renderReading }         from './screens/reading.js';
import { renderReadingLearn }    from './screens/reading-learn.js';
import { renderReadingPractice } from './screens/reading-practice.js';
import { renderReadingAnalyze }  from './screens/reading-analyze.js';

// Keep existing screens intact
import { renderAuth }  from './screens/auth.js';
import { renderOnboarding, getGuestProfile } from './screens/onboarding.js';
import { renderCard }  from './screens/card.js';
import { renderVocabLearn } from './screens/vocab-learn.js';
import { renderVocabAnalyze } from './screens/vocab-analyze.js';
import { renderDictionary } from './screens/dictionary.js';
import { renderMistakeNotebook } from './screens/mistake-notebook.js';
import { renderInsights } from './screens/insights.js';
import { renderGuides }        from './screens/guides.js';
import { renderDaily }         from './screens/daily.js';
import { renderAffix }         from './screens/affix.js';
import { renderAffixLearn }    from './screens/affix-learn.js';
import { renderAffixPractice } from './screens/affix-practice.js';
import { renderAffixAnalyze }  from './screens/affix-analyze.js';
import { renderWordWall }     from './screens/word-wall.js';
import { renderVocabSprint }  from './screens/vocab-sprint.js';
import { renderWordOfDay }    from './screens/word-of-day.js';
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
import { initPwa } from './lib/pwa.js';   // סשן שבת 5: התקנה כאפליקציה
import { renderInstall } from './screens/install.js';   // 5.9: מדריך "הוסיפו כאפליקציה" — ציבורי

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

// האתגר היומי — הנתיב הציבורי היחיד. במתכוון בלי requireAuth: זו הדלת שדרכה
// מגיע מי שראה פוסט ועוד אין לו חשבון (3.9.2026). כל שאר המסכים דורשים כניסה.
route('/daily', renderDaily);
// fork.js/level.js removed 2026-08-28 — dead pre-redesign screens, zero navigate() references anywhere in the app.

// Onboarding (SITEMAP §1 — two questions, shown once)
route('/onboarding', requireAuth(renderOnboarding));

// New main routes
route('/home',         requireOnboarded(renderHome));
route('/practice',     requireOnboarded(renderPractice));   // הטאב "תרגול" במובייל — אותה רשת פינות כמו בבית
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

// ─── תחיליות וסופיות — פינה חמישית, אותן שלוש שכבות (3.9.2026) ──────────────
route('/affix',          requireAuth(renderAffix));
route('/affix-learn',    requireAuth(renderAffixLearn));
route('/affix-practice', requireAuth(renderAffixPractice));
route('/affix-analyze',  requireAuth(renderAffixAnalyze));

// ─── אוצר מילים: שני מסכים חדשים (3.9.2026) ─────────────────────────────────
// קיר המילים מראה התקדמות שאי אפשר להרגיש מפס אחוזים; הספרינט מייצר את ההרגל
// שמחזיר לתרגול. שניהם משלימים את לולאת ה-SRS ולא מחליפים אותה.
route('/word-wall',    requireAuth(renderWordWall));
// ── כלים חינמיים, בלי חשבון (4.9.2026) ─────────────────────────────────────
// מאז שמצב האורח הוסר נשאר נתיב ציבורי אחד בלבד (/daily), בזמן שהמתחרה
// מחזיק ארבעה כלים חינמיים נפרדים. שלושת אלה נבחרו כי אף אחד מהם לא דורש
// היסטוריית תלמיד: הספרינט שומר שיא ב-localStorage, המילה של היום נבחרת
// לפי התאריך, והמדריכים הם תוכן קריאה. כל השאר נשאר מאחורי התחברות.
route('/vocab-sprint', renderVocabSprint);
route('/word-of-day',  renderWordOfDay);

// ─── Reading Comprehension (3-layer, same shape as the other corners) ────────
route('/reading',          requireAuth(renderReading));           // Section gate
route('/reading-learn',    requireAuth(renderReadingLearn));      // Learn — the Window Method
route('/reading-practice', requireAuth(renderReadingPractice));   // Practice — passage + 5 questions ( ?mode=exam for the timed section )
route('/reading-analyze',  requireAuth(renderReadingAnalyze));    // Analyze — by window size

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
// מדריכים: נגיש גם לאורח — זה תוכן פתוח, וזו נקודת הכניסה מה-SEO.
route('/guides',         renderGuides);
route('/install',        renderInstall);  // ציבורי — איך מוסיפים למסך הבית (אייפון/אנדרואיד/מחשב)   // ציבורי — ראו ההערה ליד /vocab-sprint
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
initPwa();

startRouter(app);
