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

export const GUEST_PROFILE_KEY = 'guest_profile';

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45];

export function getGuestProfile() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY)) || null;
  } catch {
    return null;
  }
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
            style="width:100%;padding:.72rem 1rem;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.95rem;font-family:inherit;background:white" />
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
                style="padding:.72rem 0;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:white;font-size:.95rem;font-weight:700;font-family:inherit;color:var(--text)">
                ${m} דק׳
              </button>`).join('')}
          </div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:.35rem">
            המנה היומית תיבנה לפי הזמן הזה. גם זה ניתן לשינוי.
          </div>
        </div>

        <button id="ob-submit" disabled
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
  const notice    = root.querySelector('#ob-notice');

  const refreshSubmit = () => {
    const ready = Boolean(dateInput.value && chosenMinutes);
    submitBtn.disabled = !ready;
    submitBtn.style.opacity = ready ? '1' : '.5';
    submitBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
  };

  dateInput.addEventListener('change', refreshSubmit);

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
    });
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
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
    navigate('/home');
  });
}
