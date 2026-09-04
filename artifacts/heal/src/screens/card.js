import { navigate } from '../router.js';
import { track } from '../lib/analytics.js';
import { getSessionLength } from '../lib/sessionPrefs.js';
import { getCurrentSession } from '../supabase.js';
import { getSavedIds, saveWord, unsaveWord } from '../data/savedWords.data.js';
import { getDueWords, rateWord } from '../data/srs.data.js';
import { getGuestSeenIds, addGuestSeenIds } from '../lib/learner.js';
import { getCoverage } from '../data/coverage.data.js';
import { markPractising, rewardSession } from '../lib/reward.js';
import { XP } from '../lib/xp.js';
import { joinWaitlist } from '../data/waitlist.data.js';
import '../lib/signIn.js';

const MAX_REQUEUES = 2;

let queue = [];
let idx = 0;
let sessionTotal = 0;   // distinct words this session — for the 'מתוך N' counter
let revealed = false;
let mnemonicIdx = 0;
let openPanel = null;
let cardStart = 0;
let userId = null;
let savedIds = new Set();   // "המילון שלי" — נטען פעם אחת בכניסה למסך

// session-local state (NOT persisted to DB)
let firstRatings = {};      // wordId -> 'again' | 'hard' | 'good'
let intraSessionReps = {};  // wordId -> count of times re-queued
let outcomes = {};          // wordId -> 'first_good' | 'recovered' | 'carry_over'

function getAssoc(word) {
  return [word.mnemonic, word.mnemonic_2, word.mnemonic_3].filter(Boolean);
}

function splitDef(word) {
  const parts = (word.definition_he || '').split(',').map(s => s.trim()).filter(Boolean);
  return { mainDef: parts[0] || '—', extraDefs: parts.slice(1) };
}

// ─── הקראה ────────────────────────────────────────────────────────────────
// הגרסה הקודמת יצרה `new Audio(url)` בלי לשמור הפניה, ולכן לא היה למי
// לומר "עצור": הקראה המשיכה לנגן אל תוך הכרטיסייה הבאה, ושתי לחיצות
// רצופות ניגנו זו על גבי זו. עכשיו יש הפניה אחת, והיא נעצרת בשלוש נקודות:
// מעבר למילה אחרת, סיום המנה, ויציאה מהמסך.
let currentAudio   = null;
let audioForWordId = null;

function stopAudio() {
  if (!currentAudio) return;
  try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (_) {}
  currentAudio = null;
}

function playAudio(url) {
  if (!url) return;
  stopAudio();                       // אף פעם לא שתי הקראות במקביל
  try {
    currentAudio = new Audio(url);
    currentAudio.play();
  } catch (_) { currentAudio = null; }
}

function handleRating(word, rating) {
  // === STEP 1: DB write — ONLY if this is the word's first rating in this session ===
  const isFirstRating = !firstRatings[word.id];
  if (isFirstRating) {
    firstRatings[word.id] = rating;
    const responseTimeMs = cardStart ? Date.now() - cardStart : null;
    const currentState = {
      state: word.state,
      interval_days: word.interval_days,
      ease: word.ease,
      reps: word.reps,
      lapses: word.lapses,
    };
    if (userId) {
      rateWord(userId, word.id, rating, { currentState, responseTimeMs })
        .catch(err => console.warn('rateWord failed:', err));
    }
  }

  // === STEP 2: queue management (local only, never writes to DB) ===
  if (rating === 'good') {
    // Word is known — remove from queue
    queue.splice(idx, 1);
    // Decide the outcome label
    if (firstRatings[word.id] === 'good' && (intraSessionReps[word.id] || 0) === 0) {
      outcomes[word.id] = 'first_good';
    } else {
      outcomes[word.id] = 'recovered';
    }
    // idx stays the same (next word slides into this position)
  } else {
    // 'again' or 'hard'
    const reps = (intraSessionReps[word.id] || 0) + 1;
    intraSessionReps[word.id] = reps;

    if (reps >= MAX_REQUEUES) {
      // Hit the cap — drop from session, mark as carry_over
      queue.splice(idx, 1);
      outcomes[word.id] = 'carry_over';
      // idx stays the same
    } else {
      // Re-queue: pull current word out and re-insert further back
      const [w] = queue.splice(idx, 1);
      const offset = rating === 'again' ? 2 : 5;
      const insertPos = Math.min(idx + offset, queue.length);
      queue.splice(insertPos, 0, w);
      // idx stays the same — next card slides in
    }
  }

  // Reset per-card UI state
  revealed = false;
  openPanel = null;
  mnemonicIdx = 0;
  cardStart = 0;

  // Session complete?
  if (queue.length === 0 || idx >= queue.length) {
    finishSession();
    return;
  }

  // Adjust idx if it went out of bounds (shouldn't, but safety)
  if (idx >= queue.length) idx = 0;
}

function finishSession() {
  stopAudio();
  // Bundle outcomes for analyze screen
  const summary = {
    total: Object.keys(outcomes).length,
    first_good: Object.values(outcomes).filter(o => o === 'first_good').length,
    recovered:  Object.values(outcomes).filter(o => o === 'recovered').length,
    carry_over: Object.values(outcomes).filter(o => o === 'carry_over').length,
    timestamp: Date.now(),
  };
  sessionStorage.setItem('hs_last_session_summary', JSON.stringify(summary));
  // XP: מילה שנזכרה מיד = נכונה, מילה שחזרה אחרי טעות = עדיין למידה.
  // first_good + recovered נספרות כ"נכונות" כי שתיהן מסתיימות בידיעה.
  rewardSession({
    source: 'vocab',
    correct: summary.first_good + summary.recovered,
    total: summary.total,
    userId,
  }).catch(() => {});
  track('vocab_session_completed', {
    total:      summary.total,
    first_good: summary.first_good,
    recovered:  summary.recovered,
    carry_over: summary.carry_over,
  });
  navigate('/vocab-analyze');
}

function draw(root) {
  if (!queue.length) {
    finishSession();
    return;
  }

  const word = queue[idx];

  // draw() רץ גם על אותה כרטיסייה (חשיפה, פתיחת פאנל), ושם דווקא אסור
  // לקטוע הקראה באמצע. לכן העצירה מותנית בכך שהמילה עצמה התחלפה.
  if (audioForWordId !== word.id) { stopAudio(); audioForWordId = word.id; }

  const { mainDef, extraDefs } = splitDef(word);
  const assoc = getAssoc(word);
  const counter = `${Object.keys(outcomes).length + 1}`;

  const hiddenZone = `<div class="reveal-prompt">
    <button class="reveal-btn" id="revealBtn">חשוף הגדרה</button>
  </div>`;

  const panelBtns = [];
  if (word.surface_1) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='sentence'?'open':''}" data-panel="sentence">📝 משפט</button>`);
  }
  if (extraDefs.length) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='extras'?'open':''}" data-panel="extras">📖 פירושים נוספים</button>`);
  }
  if (assoc.length) {
    panelBtns.push(`<button class="vc-panel-btn ${openPanel==='mnemonic'?'open':''}" data-panel="mnemonic">💡 אסוציאציה</button>`);
  }

  let panelContent = '';
  if (openPanel === 'sentence' && word.surface_1) {
    const sentenceAudioBtn = word.audio_sentence_url
      ? `<button class="vc-sent-audio-btn" id="sentAudioBtn" title="השמע משפט" aria-label="השמע את המשפט">🔊</button>`
      : '';
    panelContent = `<div class="vc-panel-content vc-sent-row">
      <span class="vc-sent-text" dir="ltr">${word.surface_1}</span>
      ${sentenceAudioBtn}
    </div>`;
  } else if (openPanel === 'extras' && extraDefs.length) {
    panelContent = `<div class="vc-panel-content vc-panel-rtl">${extraDefs.join('  ·  ')}</div>`;
  } else if (openPanel === 'mnemonic' && assoc.length) {
    const cyclerHtml = assoc.length > 1
      ? `<button class="vc-mnem-cycle" id="mnemCycleBtn" title="אסוציאציה הבאה">↻</button>`
      : '';
    panelContent = `<div class="vc-panel-content vc-panel-rtl vc-mnem-row">
      <div class="vc-mnem-wrap">
        <div class="vc-mnem-hint">🔗 עוגנים לזכירה — הקשר, שימוש במשפט, ומאיפה המילה באה</div>
        <span id="mnemText">${assoc[mnemonicIdx]}</span>
      </div>
      ${cyclerHtml}
    </div>`;
  }

  const revealedZone = `
    <div class="def-block">
      <div class="section-label">הגדרה</div>
      <div class="main-definition" dir="rtl">${mainDef}</div>
    </div>
    <div class="vc-panel-row">${panelBtns.join('')}</div>
    ${panelContent}
    <div class="vc-save-row">
      <button class="vc-save-btn${savedIds.has(word.id) ? ' is-on' : ''}" id="vcSave">
        ${savedIds.has(word.id) ? '★ במילון שלי' : '☆ שמור למילון שלי'}
      </button>
    </div>
    <div class="rate-bar">
      <button class="rate-btn" data-rating="again">✗ שוב</button>
      <button class="rate-btn" data-rating="hard">~ קשה</button>
      <button class="rate-btn" data-rating="good">✓ ידעתי</button>
    </div>`;

  root.innerHTML = `<div class="vc-shell fade-in">
    <header class="vc-topbar">
      <a class="brand-mark vc-brand" href="#/home">hSc</a>
      <div class="vc-topbar-right">
        <button class="card-help-btn" id="helpBtn" title="הסבר שוב" aria-label="הסבר איך הפינה עובדת">?</button>
        <span class="card-counter">מילה ${counter} מתוך ${sessionTotal}</span>
      </div>
    </header>
    <main class="vc-main">
      <div class="vc-card">
        <div class="card-headword-row">
          <div class="card-headword" dir="ltr">${word.headword}</div>
          ${word.audio_word_url ? `<button class="audio-btn" id="audioBtn" title="השמע" aria-label="השמע את המילה">🔊</button>` : ''}
        </div>
        <div class="reveal-zone">
          ${revealed ? revealedZone : hiddenZone}
        </div>
      </div>
      <div class="card-footer"><a href="#/home">← דף הבית</a></div>
    </main>
  </div>`;

  root.querySelector('#audioBtn')?.addEventListener('click', () => playAudio(word.audio_word_url));
  root.querySelector('#helpBtn')?.addEventListener('click', () => {
    localStorage.removeItem('hs_vocab_learn_seen');
    navigate('/vocab-learn');
  });

  if (!revealed) {
    root.querySelector('#revealBtn').addEventListener('click', () => {
      revealed = true;
      openPanel = null;
      mnemonicIdx = 0;
      cardStart = Date.now();
      draw(root);
    });
    return;
  }

  root.querySelectorAll('.vc-panel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.panel;
      openPanel = (openPanel === p) ? null : p;
      if (openPanel === 'mnemonic') mnemonicIdx = 0;
      draw(root);
    });
  });

  root.querySelector('#mnemCycleBtn')?.addEventListener('click', () => {
    mnemonicIdx = (mnemonicIdx + 1) % assoc.length;
    const txt = root.querySelector('#mnemText');
    if (txt) txt.textContent = assoc[mnemonicIdx];
  });

  root.querySelector('#sentAudioBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    playAudio(word.audio_sentence_url);
  });

  root.querySelector('#vcSave')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!userId) {
      btn.textContent = 'צריך חשבון חינם';
      setTimeout(() => { btn.textContent = '☆ שמור למילון שלי'; }, 1800);
      return;
    }
    const on = savedIds.has(word.id);
    // אופטימי: הכוכב מתהפך מיד. כישלון מחזיר אותו — לא עוצרים תרגול בשביל
    // כתיבה שנכשלה.
    if (on) savedIds.delete(word.id); else savedIds.add(word.id);
    btn.classList.toggle('is-on', !on);
    btn.textContent = on ? '☆ שמור למילון שלי' : '★ במילון שלי';
    const { error } = on ? await unsaveWord(userId, word.id) : await saveWord(userId, word.id);
    if (error) {
      if (on) savedIds.add(word.id); else savedIds.delete(word.id);
      btn.classList.toggle('is-on', on);
      btn.textContent = on ? '★ במילון שלי' : '☆ שמור למילון שלי';
    }
  });

  root.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating;
      handleRating(word, rating);
      draw(root);
    });
  });
}

/**
 * The free-tier learner has exhausted the 198-word core (impact_percentile >= 64)
 * — meta.coreExhausted from getDueWords(). This IS the conversion moment
 * (Lion, 31.8: "טוב לי שתלמיד לא פרימיום יראה אוצר לא שלם"), so it gets its own
 * screen instead of the generic "come back tomorrow" dead end. Numbers are real
 * (getCoverage), never invented — same discipline as progress.js.
 */
async function renderCoreExhausted(root, userId) {
  let locked = null;
  try {
    const coverage = await getCoverage(userId);
    const core = coverage?.vocabCore ?? coverage?.vocab;
    if (core && Number.isFinite(core.reachable) && Number.isFinite(core.total)) {
      locked = core.total - core.reachable;
    }
  } catch (_) { /* screen still works without the exact count */ }

  const lockedLine = locked > 0
    ? `<p style="font-size:.85rem;color:var(--muted);margin:.3rem 0 0">${locked} מילים נוספות ממתינות בגרסה המלאה.</p>`
    : '';

  root.innerHTML = `<div class="vc-shell fade-in">
    <header class="vc-topbar">
      <a class="brand-mark vc-brand" href="#/home">hSc</a>
    </header>
    <main class="vc-main">
      <div class="vc-card" style="text-align:center;padding:2rem 1.6rem">
        <div style="font-size:2rem;margin-bottom:.6rem">🌱</div>
        <h3 style="font-size:1.05rem;font-weight:900;margin-bottom:.5rem">סיימתם את כל מילות הליבה החינמית</h3>
        <p style="font-size:.88rem;color:var(--muted);line-height:1.7;margin-bottom:.2rem">התרגול שלכם ממשיך לרוץ על המילים האלה במרווחים הנכונים, בדיוק כמו עד היום — הן לא נעלמות.</p>
        ${lockedLine}
        <div class="lock-upsell" style="margin-top:1.3rem">
          <div style="font-size:1.6rem;margin-bottom:.4rem">🔒</div>
          <h4 style="font-size:.92rem;font-weight:900;margin-bottom:.4rem">מילים נוספות נפתחות בגרסה המלאה</h4>
          <p style="font-size:.8rem;color:var(--muted);line-height:1.5;margin-bottom:.9rem">כל 550 המילים המדורגות והמאומתות, מעבר ל-198 הראשונות. נפתח בקרוב.</p>
          <form id="waitForm" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <input id="waitEmail" type="email" required placeholder="המייל שלך" dir="ltr"
                   style="flex:1;min-width:180px;max-width:260px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:.85rem">
            <button class="btn-primary" type="submit">שמרו לי מקום במחיר השקה</button>
          </form>
          <p id="waitMsg" style="font-size:.78rem;color:var(--muted);margin-top:.6rem">בלי ספאם — עדכון אחד כשהמסלול נפתח, במחיר מוזל למצטרפים מוקדם.</p>
        </div>
        <p style="font-size:.82rem;margin-top:1.3rem"><a href="#/home" style="color:var(--green-dark);font-weight:700;text-decoration:none">להמשך תרגול במודולים אחרים ←</a></p>
      </div>
    </main>
  </div>`;

  track('vocab_core_exhausted_seen', {});

  const form = root.querySelector('#waitForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#waitMsg');
    const res = await joinWaitlist(root.querySelector('#waitEmail').value, 'vocab_core_exhausted');
    if (res.invalid) { msg.textContent = 'כתובת המייל לא נראית תקינה — בדקו אותה.'; return; }
    if (!res.ok)     { msg.textContent = 'השמירה נכשלה — נסו שוב עוד רגע.'; return; }
    track('waitlist_joined', { source: 'vocab_core_exhausted', already: !!res.already });
    form.style.display = 'none';
    msg.textContent = res.already
      ? '✓ המייל הזה כבר שמור אצלנו — נעדכן אתכם ראשונים.'
      : '✓ שמור לכם מקום — נעדכן במייל כשהמסלול נפתח.';
  });
}

/**
 * Rare edge: a premium/extended learner has exhausted BOTH pools (550 core +
 * 2,116 extension). No paywall here — they're already paying. Just a clean
 * "you did it" instead of the generic dead end.
 */
function renderAllWordsExhausted(root) {
  root.innerHTML = `<div class="vc-shell fade-in">
    <header class="vc-topbar">
      <a class="brand-mark vc-brand" href="#/home">hSc</a>
    </header>
    <main class="vc-main">
      <div class="vc-card" style="text-align:center;padding:2rem 1.6rem">
        <div style="font-size:2rem;margin-bottom:.6rem">🏆</div>
        <h3 style="font-size:1.05rem;font-weight:900;margin-bottom:.5rem">תרגלתם את כל אוצר המילים</h3>
        <p style="font-size:.88rem;color:var(--muted);line-height:1.7">אין כרגע מילים חדשות ללמוד — התרגול ימשיך במילים שכבר הכרתם, במרווחים הנכונים. חזרו מחר.</p>
        <p style="font-size:.82rem;margin-top:1.3rem"><a href="#/home" style="color:var(--green-dark);font-weight:700;text-decoration:none">← דף הבית</a></p>
      </div>
    </main>
  </div>`;
}

function renderNothingDueToday(root) {
  root.innerHTML = `<div class="vc-shell">
      <header class="vc-topbar">
        <a class="brand-mark vc-brand" href="#/home">hSc</a>
      </header>
      <main class="vc-main">
        <div class="vc-card">
          <p dir="rtl" style="text-align:center;color:var(--muted);padding:2rem">אין מילים לתרגול כרגע. חזור מחר!</p>
        </div>
        <div class="card-footer"><a href="#/home">← חזרה לדף הבית</a></div>
      </main>
    </div>`;
}

export async function renderCard(root) {
  // יציאה מהמסך (קישור דף הבית, סרגל, כפתור אחורה) עוצרת הקראה שרצה.
  // מאזין אחד לכל חיי האפליקציה — renderCard נקרא שוב בכל כניסה למסך.
  if (!window.__vcAudioStopper) {
    window.__vcAudioStopper = true;
    window.addEventListener('hashchange', stopAudio);
  }

  const learnSeen = localStorage.getItem('hs_vocab_learn_seen');
  if (!learnSeen) {
    navigate('/vocab-learn');
    return;
  }

  root.innerHTML = '<div class="vc-shell"><div class="spinner">טוען מילים…</div></div>';

  const session = await getCurrentSession();
  userId = session?.user?.id ?? null;

  // "המילון שלי" — נטען פעם אחת לכניסה למסך, כדי שהכוכב יופיע במצב הנכון
  // כבר בכרטיסייה הראשונה. כישלון כאן לא מעניין: Set ריק פשוט מציג כוכב ריק.
  savedIds = (await getSavedIds(userId)).data;

  // 2.9.2026 (ליאון): "אני לא רואה סיבה שלא לתת לאורח להשתמש בכל
  // המודולים" — ובדיקה מעמיקה מאשרת שהוא צודק: handleRating() כבר עוטף את
  // rateWord ב-if (userId) (למטה), getSavedIds/getCoverage כבר
  // מוגנות ל-userId ריק. getDueWords תוקנה ב-3.9 (ראו שם). הקיר כאן היה שריד מלפני
  // getLearner()/PLAN_guest_mode_and_payments.md §1 (ראו lib/learner.js) —
  // בלי סיבה מבנית אמיתית. ההבדל היחיד לאורח: שום דירוג לא נשמר בין
  // ביקורים, אז כל פעם הוא מתחיל מאותה חבילת מילים לפי impact_score,
  // בלי זכרון של מה שכבר ראה — פשרה מודעת, לא תקלה.

  // 3.9.2026: לאורח מעבירים את מה שכבר ראה בדפדפן הזה (localStorage, עד 300
  // מזהים — lib/learner.js), כדי שכניסה חוזרת לא תתחיל מאותה חבילה. ראו את
  // ההערה בתוך getDueWords על למה זה חייב לעקוף את srs_progress לגמרי.
  const { data, error, meta } = await getDueWords(userId, {
    limit: getSessionLength('vocab', 12),
    guestSeenIds: userId ? [] : getGuestSeenIds('vocab'),
  });
  if (!userId && data?.length) addGuestSeenIds('vocab', data.map(w => w.word_id || w.id));

  if (error) {
    renderNothingDueToday(root);
    return;
  }

  if (!data?.length) {
    if (meta?.coreExhausted && !meta?.isPremium) {
      await renderCoreExhausted(root, userId);
    } else if (meta?.coreExhausted && meta?.isPremium) {
      renderAllWordsExhausted(root);
    } else {
      renderNothingDueToday(root);
    }
    return;
  }

  // Reset session state
  queue = [...data];
  sessionTotal = data.length;
  idx = 0;
  revealed = false;
  openPanel = null;
  mnemonicIdx = 0;
  cardStart = 0;
  firstRatings = {};
  intraSessionReps = {};
  outcomes = {};

  draw(root);
}
