/**
 * src/screens/plan-setup.js — "בנה לי תוכנית עד הבחינה".
 *
 * זהו המסך שאליו עברו שתי שאלות האונבורדינג (תאריך בחינה, דקות ביום)
 * אחרי ההחלטה של 8.9.2026 (claude/SPEC_entry_gate_final.md §4.2):
 * מיד אחרי ההתחברות התלמיד נכנס לאתר בלי אף שאלה. השאלות האלה נשאלות
 * רק כשהוא בוחר בעצמו לבנות תוכנית — ולכן הן כבר לא חיכוך אלא הצעד
 * הראשון בדבר שהוא ביקש.
 *
 * למה זה שינוי מהותי ולא העתקה: במסך האונבורדינג הישן 23 מתוך 37 נטשו
 * (DIAGNOSIS_retention_2026-09-06). המסך היה חסם בין ההתחברות למוצר.
 * כאן הוא לא חוסם כלום — מי שלא נכנס אליו פשוט מתרגל בלי תוכנית.
 *
 * הערה: `completeOnboarding` נשאר השם בשכבת הדאטה. הוא כותב את שני
 * השדות ואת `onboarding_complete`, ואנחנו משתמשים בדגל הזה עכשיו במובן
 * "יש לו תוכנית" — לא "עבר את השער".
 */
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getProfile, completeOnboarding } from '../data/profiles.data.js';
import { track } from '../lib/analytics.js';
import { renderLayout, getPageContent } from '../layout.js';

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45];

// מדידה לעולם לא חוסמת ניווט (הלקח מ-2.9.2026: track שנפל השאיר תלמידים
// תקועים על "שומר…"). אם האירוע יאבד — שיאבד.
function safeTrack(props) {
  try { track('plan_created', props); }
  catch (err) { console.warn('plan track failed:', err); }
}

export async function renderPlanSetup(root) {
  await renderLayout(root, '/plan-setup');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId  = session?.user?.id ?? null;
  if (!userId) { navigate('/'); return; }

  const { data: profile } = await getProfile(userId);
  const minDate = new Date().toISOString().slice(0, 10);
  const prevDate    = profile?.exam_date ?? '';
  const prevMinutes = profile?.daily_time_minutes ?? null;
  const isEdit      = Boolean(profile?.onboarding_complete);

  el.innerHTML = `
    <div class="fade-in ps-wrap">
      <section class="ps-card">
        <h1 class="ps-title">${isEdit ? 'התוכנית שלך' : 'בונים לך תוכנית עד הבחינה'}</h1>
        <p class="ps-sub">שתי שאלות, ואז יש לך לוח למידה עד יום הבחינה. אפשר לשנות אותן מתי שרוצים.</p>

        <div class="ps-field">
          <label class="ps-label" for="ps-exam-date">מתי הבחינה שלך?</label>
          <input type="date" id="ps-exam-date" class="ps-input" min="${minDate}" value="${prevDate}" />
          <div id="ps-date-echo" class="ps-echo"></div>
          <button type="button" id="ps-no-date" class="ps-link">עוד לא יודע/ת</button>
          <div class="ps-hint">בלי תאריך נבנה לך לוח כללי לשלושה חודשים. אפשר להוסיף תאריך בכל רגע.</div>
        </div>

        <div class="ps-field">
          <label class="ps-label">כמה דקות ביום נוח לך להשקיע?</label>
          <div id="ps-minutes" class="ps-mins">
            ${MINUTE_OPTIONS.map(m => `
              <button type="button" class="ps-min${m === prevMinutes ? ' on' : ''}" data-minutes="${m}">${m} דק׳</button>`).join('')}
          </div>
          <div class="ps-hint">המנה היומית תיבנה לפי הזמן הזה.</div>
        </div>

        <button id="ps-submit" class="ps-submit" type="button" aria-disabled="${prevMinutes ? 'false' : 'true'}">
          ${isEdit ? 'שמירה ←' : 'בנה לי תוכנית ←'}
        </button>
        <div class="ps-note" id="ps-note"></div>
        <div class="ps-fine">מתעדכנת לפי הביצועים שלך.</div>
      </section>
    </div>`;

  ensureStyles();

  let chosenMinutes = prevMinutes;
  const submitBtn = el.querySelector('#ps-submit');
  const dateInput = el.querySelector('#ps-exam-date');
  const dateEcho  = el.querySelector('#ps-date-echo');
  const note      = el.querySelector('#ps-note');

  // <input type="date"> מציג לפי ה-locale של הדפדפן: תלמיד ישראלי על דפדפן
  // אנגלי רואה 12/31/2026 ולא יודע מה חודש ומה יום. ההד בעברית מסיר את
  // הדו-משמעות בלי לוותר על בורר התאריך המקורי.
  const refreshEcho = () => {
    if (!dateInput.value) { dateEcho.textContent = ''; return; }
    const d = new Date(`${dateInput.value}T00:00:00`);
    dateEcho.textContent = isNaN(d) ? '' : d.toLocaleDateString('he-IL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };
  const refreshSubmit = () => {
    const ready = Boolean(chosenMinutes);
    submitBtn.setAttribute('aria-disabled', String(!ready));
    submitBtn.classList.toggle('is-off', !ready);
  };
  refreshEcho();
  refreshSubmit();

  el.querySelector('#ps-no-date')?.addEventListener('click', () => {
    dateInput.value = '';
    refreshEcho();
    el.querySelector('.ps-min')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  dateInput.addEventListener('change', refreshEcho);
  dateInput.addEventListener('input',  refreshEcho);

  el.querySelectorAll('.ps-min').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenMinutes = Number(btn.dataset.minutes);
      el.querySelectorAll('.ps-min').forEach(b => b.classList.toggle('on', b === btn));
      note.textContent = '';
      refreshSubmit();
    });
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    if (!chosenMinutes) {
      note.textContent = 'בחר/י כמה דקות ביום — זה מה שקובע את גודל המנה.';
      el.querySelector('.ps-min')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'שומר…';

    // study_plan (jsonb): תאריך תחילת התוכנית נקבע פעם אחת ולא זז בעריכה —
    // הלוח נמדד ממנו. update_mode לפי SPEC §8 (אוטומטי / תשאל אותי קודם).
    const prevPlan = profile?.study_plan || {};
    const answers = {
      exam_date: dateInput.value || null,
      daily_time_minutes: chosenMinutes,
      study_plan: {
        ...prevPlan,
        started_at: prevPlan.started_at || new Date().toISOString(),
        update_mode: prevPlan.update_mode || 'auto',
      },
    };
    const { error } = await completeOnboarding(userId, answers);
    if (error) {
      note.textContent = 'השמירה נכשלה — נסה שוב.';
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'שמירה ←' : 'בנה לי תוכנית ←';
      return;
    }
    safeTrack({ minutes: chosenMinutes, has_exam_date: !!dateInput.value, edit: isEdit });
    navigate('/schedule');
  });
}

let stylesDone = false;
function ensureStyles() {
  if (stylesDone) return;
  stylesDone = true;
  const s = document.createElement('style');
  s.textContent = `
    .ps-wrap{max-width:520px;margin:0 auto;padding:.5rem 0 2rem}
    .ps-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem 1.3rem}
    .ps-title{font-size:1.35rem;font-weight:800;margin:0 0 .35rem}
    .ps-sub{font-size:.92rem;color:var(--muted);margin:0 0 1.3rem;line-height:1.5}
    .ps-field{margin-bottom:1.5rem}
    .ps-label{display:block;font-size:.95rem;font-weight:700;margin-bottom:.55rem}
    .ps-input{width:100%;padding:.72rem 1rem;border:1.5px solid var(--border);border-radius:var(--radius-sm);font:inherit;font-size:.95rem;background:var(--card);color:var(--text)}
    .ps-echo{font-size:.82rem;font-weight:700;color:var(--green-dark);margin-top:.4rem;min-height:1.1em}
    .ps-link{margin-top:.35rem;background:none;border:0;padding:0;font:inherit;font-size:.82rem;font-weight:700;color:var(--green-dark);cursor:pointer;text-decoration:underline}
    .ps-hint{font-size:.78rem;color:var(--muted);margin-top:.4rem;line-height:1.45}
    .ps-mins{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .ps-min{padding:.72rem 0;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--card);font:inherit;font-size:.95rem;font-weight:700;color:var(--text);cursor:pointer}
    .ps-min.on{background:var(--green-light);border-color:var(--green);color:var(--green-dark)}
    .ps-submit{width:100%;padding:.9rem;border:none;border-radius:var(--radius-sm);background:var(--green);color:#fff;font:inherit;font-size:1rem;font-weight:700;cursor:pointer}
    .ps-submit.is-off{opacity:.55}
    .ps-note{margin-top:.7rem;font-size:.82rem;text-align:center;color:var(--red);min-height:1.2em}
    .ps-fine{margin-top:.2rem;font-size:.78rem;text-align:center;color:var(--muted)}
  `;
  document.head.appendChild(s);
}
