import { supabase, isSupabaseConfigured, setGuest } from '../supabase.js';
import { track } from '../lib/analytics.js';
import { navigate } from '../router.js';

const googleIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;flex-shrink:0"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.61 4.1-5.35 4.1A5.4 5.4 0 1 1 12 6.6c1.7 0 2.85.72 3.5 1.34l2.4-2.32C16.36 4.27 14.4 3.4 12 3.4 7.13 3.4 3.2 7.33 3.2 12s3.93 8.6 8.8 8.6c5.07 0 8.45-3.56 8.45-8.57 0-.58-.06-1.02-.1-1.43z"/></svg>`;

/**
 * מסך הכניסה — עמוד נחיתה, לא קופסת התחברות.
 *
 * 🔴 למה זה שוכתב (2.9.2026): במדידה של 35 מפגשים מפוסט בפייסבוק, **21
 * עזבו בלי ללחוץ על שום דבר ואף אחד לא לחץ על ההרשמה**. המסך הקודם היה
 * לוגו, טאגליין ושני כפתורים — מי שהגיע מפוסט על השינוי בבחינה נחת על דלת
 * בלי חלון ראווה, ולא ראה מה יש בפנים לפני שנדרש להחליט.
 *
 * המבנה כאן: קודם החדשות (מה משתנה בדצמבר 2026), אחר כך מה המוצר עושה
 * ובמספרים אמיתיים מהמאגר, ורק אז הכפתורים. המספרים למטה הם התוכן שקיים
 * בפועל — לעדכן אותם רק מול שאילתה, לא מהזיכרון.
 *
 * "הצצה כאורח" הוחלף ב"להתחיל לתרגל": מצב האורח נפתח לתרגול אמיתי בניסוח
 * מחדש ובהשלמת משפטים, והכיתוב הישן ("כאורח אפשר לראות הכל — לתרגול צריך
 * חשבון") כבר לא היה נכון וביקש הרשמה בשביל משהו שהתלמיד כבר מקבל.
 */

// מספרי התוכן — אומתו מול המסד 2.9.2026.
const CONTENT = [
  { n: '800',   k: 'השלמת משפטים' },
  { n: '424',   k: 'ניסוח מחדש' },
  { n: '250',   k: 'קטעי האזנה' },
  { n: '100',   k: 'קטעי קריאה' },
  { n: '543',   k: 'מילים מדורגות' },
];

export function renderAuth(root) {
  root.innerHTML = `
    <div class="auth-wrap fade-in">
      <div class="auth-card lp-card">

        <div class="auth-logo">High<em>Score</em></div>
        <div class="auth-tagline">ההכנה למבחן הלאל</div>

        <div class="lp-kicker">מדצמבר 2026</div>
        <h1 class="lp-h1">האנגלית יוצאת מהפסיכומטרי.</h1>
        <p class="lp-lead">היא הופכת למבחן נפרד וממוחשב — <strong>הלאל</strong>, שיש שמכירים אותו כאמירנט. קריאה, האזנה וכתיבה, לאורך כל השנה. <strong>חומרי ההכנה הישנים לא מכסים אותו.</strong></p>

        <ul class="lp-points">
          <li><b>אבחון רמה</b> במבנה הבחינה, עם טיימר נפרד לכל פרק</li>
          <li><b>הסבר על כל טעות</b> — למה הנכונה נכונה, ומה לא עבד בבחירה שלכם</li>
          <li><b>תוכנית יומית</b> שמכוונת למה שאתם נופלים עליו שוב ושוב</li>
        </ul>

        <div class="lp-stats">
          ${CONTENT.map((c) => `<div class="lp-stat"><b>${c.n}</b><span>${c.k}</span></div>`).join('')}
        </div>

        <button id="guestBtn" class="btn-start">להתחיל לתרגל — בחינם</button>

        <button class="btn-google" id="googleBtn">
          ${googleIcon}
          המשך עם Google
        </button>
        <div class="lp-fine">
          אפשר להתחיל בלי חשבון. חשבון חינם שומר את ההתקדמות ופותח את הניתוח האישי.
        </div>

        <div id="notice" style="margin-top:.9rem;font-size:.82rem;text-align:center;color:var(--muted);min-height:1.2em"></div>

        <div style="margin-top:1.4rem;font-size:.76rem;color:var(--muted)">כלי לימוד ממוקד. ללא פרסומות. ללא רעש.</div>
        <!-- Privacy link, 2026-08-29: a policy nobody can find does not do its job,
             and this is the screen where the learner actually decides to sign up. -->
        <div style="margin-top:.5rem;font-size:.72rem;color:var(--muted)">
          <a href="/privacy/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">מדיניות פרטיות</a>
          <span style="opacity:.6"> · </span>
          <a href="/terms/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">תנאי שימוש</a>
          <span style="opacity:.6"> · </span>
          <a href="/accessibility/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">הצהרת נגישות</a>
        </div>
        <!-- SEO 2026-09-01: מסך הכניסה היה היחיד שמחבר בין האפליקציה לבין
             8 עמודי ההסבר החינמיים (mivchan-hilal ומשם הלאה) — בלעדיו הם
             היו "אי" נפרד שרק גוגל מכיר, ואף משתמש בפועל לא נתקל בו. -->
        <div style="margin-top:.4rem;font-size:.72rem;color:var(--muted)">
          <a href="/mivchan-hilal/" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:underline">מדריכים למבחן הלאל</a>
        </div>
      </div>
    </div>
  `;

  const notice = root.querySelector('#notice');
  const setMsg = (msg, isErr = false) => {
    notice.textContent = msg || '';
    notice.style.color = isErr ? 'var(--red)' : 'var(--muted)';
  };

  if (!isSupabaseConfigured) {
    setMsg('Supabase לא מוגדר — השתמשו ב"המשך כאורח".', true);
  }

  root.querySelector('#googleBtn').addEventListener('click', async () => {
    if (!supabase) { setMsg('Supabase לא מוגדר.', true); return; }
    track('auth_google_clicked');
    setMsg('מעביר ל-Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setMsg(error.message, true);
  });

  root.querySelector('#guestBtn').addEventListener('click', () => {
    track('guest_started');
    setGuest(true);
    navigate('/home');
  });
}
