/**
 * Onboarding — exactly two questions (SITEMAP §1, approved 2026-08-17).
 *
 *   1. When is your exam?        → user_profiles.exam_date
 *   2. How many minutes per day? → user_profiles.daily_time_minutes
 *
 * No placement test — deliberate decision (SITEMAP §1): a test at the door adds
 * friction and labels the student before we've taught them anything. Level is
 * calibrated from practice itself.
 *
 * Guests have no auth.users row (every user FK points at auth.users, hard rule),
 * so their answers live in localStorage under GUEST_PROFILE_KEY and are read by
 * the same helpers the dashboard uses.
 */
import { navigate } from '../router.js';
import { getCurrentSession, isGuest } from '../supabase.js';
import { completeOnboarding } from '../data/profiles.data.js';
import { track } from '../lib/analytics.js';

export const GUEST_PROFILE_KEY = 'guest_profile';

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45];

export function getGuestProfile() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY)) || null;
  } catch {
    return null;
  }
}

/**
 * 🔴 2.9.2026 — track() נקרא כאן בלי שיובא, וזרק ReferenceError בדיוק בין
 * שמירת הפרופיל לבין navigate('/home'). התוצאה: הכפתור נשאר "שומר…" ונעול,
 * והתלמיד תקוע במסך מת אחרי שסיים את ההרשמה. 12 מכשירים שונים נפגעו
 * ביום אחד (client_errors), וזה הסביר 34 מבקרים מול אפס חשבונות פעילים.
 *
 * הייבוא תוקן, אבל התיקון האמיתי הוא כאן: מדידה לעולם לא חוסמת ניווט.
 * אם track ייפול שוב מסיבה כלשהי, התלמיד ימשיך הלאה ואנחנו נאבד אירוע —
 * זה הכיוון הנכון של הכשל.
 */
function safeTrack(props) {
  try { track('onboarding_completed', props); }
  catch (err) { console.warn('onboarding track failed:', err); }
}

export function renderOnboarding(root) {
  const today = new Date();
  // Default exam date: the December 2026 sitting the product targets.
  const minDate = today.toISOString().slice(0, 10);

  root.innerHTML = `
    <div class="auth-wrap fade-in">
      <div class="auth-card" style="max-width:430px">
        <div class="auth-logo">High<em>Score</em></div>
        <div class="auth-tagline">שתי שאלות קצרות ומתחילים</div>

        <div style="text-align:right;margin-top:1.4rem">
          <label style="display:block;font-size:.92rem;font-weight:700;margin-bottom:.5rem">
            מתי הבחינה שלך?
          </label>
          <input type="date" id="ob-exam-date" min="${minDate}"
            style="width:100%;padding:.72rem 1rem;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.95rem;font-family:inherit;background:var(--card)" />
          <div id="ob-date-echo" style="font-size:.82rem;font-weight:700;color:var(--green-dark);margin-top:.4rem;min-height:1.1em"></div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.35rem">
            עוד לא נרשמת? בחר תאריך משוער — אפשר לעדכן בכל רגע.
          </div>
        </div>

        <div style="text-align:right;margin-top:1.5rem">
          <label style="display:block;font-size:.92rem;font-weight:700;margin-bottom:.5rem">
            כמה דקות ביום נוח לך להשקיע?
          </label>
          <div id="ob-minutes" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${MINUTE_OPTIONS.map(m => `
              <button type="button" class="ob-min-btn" data-minutes="${m}"
                style="padding:.72rem 0;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--card);font-size:.95rem;font-weight:700;font-family:inherit;color:var(--text)">
                ${m} דק׳
              </button>`).join('')}
          </div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.35rem">
            המנה היומית תיבנה לפי הזמן הזה. גם זה ניתן לשינוי.
          </div>
        </div>

        <button id="ob-submit" aria-disabled="true"
          style="width:100%;margin-top:1.6rem;padding:.9rem;border:none;border-radius:var(--radius-sm);background:var(--green);color:white;font-size:1rem;font-weight:700;font-family:inherit;opacity:.5;cursor:not-allowed">
          בוא נתחיל ←
        </button>

        <div id="ob-notice" style="margin-top:.7rem;font-size:.8rem;text-align:center;color:var(--red);min-height:1.2em"></div>
      </div>
    </div>
  `;

  let chosenMinutes = null;
  const submitBtn = root.querySelector('#ob-submit');
  const dateInput = root.querySelector('#ob-exam-date');
  const dateEcho  = root.querySelector('#ob-date-echo');
  const notice    = root.querySelector('#ob-notice');

  // AUDIT fix: <input type="date"> renders in the BROWSER's locale, so an
  // Israeli student on an en-US browser sees 12/31/2026 and can't tell month
  // from day. Echoing the choice back in Hebrew words removes the ambiguity
  // without giving up the native date picker.
  const refreshDateEcho = () => {
    if (!dateInput.value) { dateEcho.textContent = ''; return; }
    const d = new Date(`${dateInput.value}T00:00:00`);
    if (isNaN(d)) { dateEcho.textContent = ''; return; }
    dateEcho.textContent = d.toLocaleDateString('he-IL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  // 3.9.2026 — נמצא בבדיקה מקצה לקצה: הכפתור היה `disabled` עד שממלאים גם
  // תאריך וגם דקות. כפתור disabled לא מגיב ללחיצה בכלל (הדפדפן לא שולח
  // אירוע) — תלמיד שלחץ ולא קרה כלום לא קיבל שום רמז מה חסר, ובמובייל גם
  // לא ברור שבורר התאריך לחיץ. המשתמש הרשום הראשון (3.9, 10:47) נעצר בדיוק
  // במסך הזה. עכשיו הכפתור "רך": נראה כבוי, אבל לחיצה עליו אומרת מה חסר
  // ומכוונת לשדה. `disabled` האמיתי נשאר רק לזמן השמירה (למניעת לחיצה כפולה).
  const isReady = () => Boolean(dateInput.value && chosenMinutes);
  const refreshSubmit = () => {
    const ready = isReady();
    submitBtn.disabled = false;
    submitBtn.setAttribute('aria-disabled', String(!ready));
    submitBtn.style.opacity = ready ? '1' : '.5';
    submitBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
  };
  const explainMissing = () => {
    const missing = [];
    if (!dateInput.value) missing.push('תאריך בחינה');
    if (!chosenMinutes)   missing.push('כמה דקות ביום');
    notice.textContent = `כדי להמשיך צריך לבחור ${missing.join(' ו')} — אפשר לשנות אחר כך.`;
    if (!dateInput.value) {
      dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { dateInput.showPicker?.(); } catch (_) {}
      dateInput.focus();
    } else {
      root.querySelector('.ob-min-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const clearNotice = () => { if (notice.textContent.startsWith('כדי להמשיך')) notice.textContent = ''; };
  dateInput.addEventListener('change', () => { refreshDateEcho(); refreshSubmit(); clearNotice(); });
  dateInput.addEventListener('input',  () => { refreshDateEcho(); refreshSubmit(); });

  root.querySelectorAll('.ob-min-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenMinutes = Number(btn.dataset.minutes);
      root.querySelectorAll('.ob-min-btn').forEach(b => {
        const on = b === btn;
        b.style.background   = on ? 'var(--green-light)' : 'white';
        b.style.borderColor  = on ? 'var(--green)' : 'var(--border)';
        b.style.color        = on ? 'var(--green-dark)' : 'var(--text)';
      });
      refreshSubmit();
      clearNotice();
    });
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    if (!isReady()) { explainMissing(); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = 'שומר…';

    const answers = {
      exam_date: dateInput.value,
      daily_time_minutes: chosenMinutes,
    };

    if (isGuest()) {
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify({
        ...answers, onboarding_complete: true,
      }));
      safeTrack({ as: 'guest', minutes: chosenMinutes, has_exam_date: !!dateInput.value });
      navigate('/home');
      return;
    }

    const session = await getCurrentSession();
    const userId  = session?.user?.id;
    if (!userId) { navigate('/'); return; }

    const { error } = await completeOnboarding(userId, answers);
    if (error) {
      notice.textContent = 'השמירה נכשלה — נסה שוב.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'בוא נתחיל ←';
      return;
    }
    safeTrack({ as: 'user', minutes: chosenMinutes, has_exam_date: !!dateInput.value });
    navigate('/home');
  });
}
