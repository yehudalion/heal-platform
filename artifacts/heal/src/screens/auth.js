import { supabase, isSupabaseConfigured } from '../supabase.js';
import { track } from '../lib/analytics.js';

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
 * מצב אורח הוסר לגמרי (3.9.2026, החלטת ליאון) — ראו BACKLOG_next.md. ה-CTA
 * היחיד עכשיו הוא Google, וההרשמה לוקחת כ-10 שניות; אין יותר מסלול תרגול
 * בלי חשבון.
 */

// מספרי התוכן — אומתו מול המסד 2.9.2026.
const CONTENT = [
  { n: '800',   k: 'השלמת משפטים' },
  { n: '424',   k: 'ניסוח מחדש' },
  { n: '250',   k: 'קטעי האזנה' },
  { n: '100',   k: 'קטעי קריאה' },
  // 823 = המילים בעלות impact_score אחרי שלב ג (4.9.2026). מספר סטטי בכוונה:
  // דף הנחיתה נטען לפני התחברות ואסור שיחכה לשאילתה. לעדכן ידנית כשהמאגר גדל —
  // המקור: select count(*) from words where impact_score is not null.
  { n: '823',   k: 'מילים מדורגות' },
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

        <button class="btn-google btn-start" id="googleBtn">
          ${googleIcon}
          להתחיל לתרגל עם Google — בחינם
        </button>

        <!-- 3.9.2026 — אחרי הסרת מצב האורח זו הדרך היחידה להתנסות לפני הרשמה,
             והיא מכוונת: חמש שאלות עם הסבר מלא, בלי חשבון ובלי התחייבות.
             4.9.2026 — הורחב לארבעה כלים. דלת חינמית אחת הייתה מעט מדי:
             מבקר שלא בא בדיוק במצב רוח של מבחן לא היה לו מה לעשות כאן. כל
             ארבעתם עומדים בפני עצמם, אף אחד מהם לא דורש היסטוריית תלמיד,
             וכולם נגמרים באותה הזמנה להירשם. -->
        <a class="lp-daily" href="#/daily">
          <span class="lp-daily-k">חדש · בלי הרשמה</span>
          <span class="lp-daily-t">האתגר היומי — 5 שאלות אנגלית</span>
          <span class="lp-daily-s">אותן שאלות לכל מי שנכנס היום, עם הסבר מלא על כל אחת ←</span>
        </a>

        <div class="lp-free">
          <div class="lp-free-h">עוד דברים שפתוחים כאן בלי חשבון</div>
          <div class="lp-free-grid">
            <a class="lp-free-card" href="#/word-of-day">
              <span class="lp-free-ico">🔤</span>
              <span class="lp-free-t">המילה של היום</span>
              <span class="lp-free-s">מילה אחת, עם משפט, שמע ועוגן לזכירה</span>
            </a>
            <a class="lp-free-card" href="#/vocab-sprint">
              <span class="lp-free-ico">⚡</span>
              <span class="lp-free-t">ספרינט של דקה</span>
              <span class="lp-free-s">60 שניות. כמה מילים תספיקו?</span>
            </a>
            <a class="lp-free-card" href="#/guides">
              <span class="lp-free-ico">📖</span>
              <span class="lp-free-t">שמונה מדריכים</span>
              <span class="lp-free-s">מה זה הלאל, מבנה הבחינה, והפטור</span>
            </a>
          </div>
        </div>
        <div class="lp-fine">
          ההרשמה לוקחת כ-10 שניות. חשבון חינם שומר את ההתקדמות ופותח את הניתוח האישי.
        </div>

        <div id="notice" style="margin-top:.9rem;font-size:.82rem;text-align:center;color:var(--muted);min-height:1.2em"></div>

        <!-- מה ידוע היום על הבחינה (3.9.2026).
             במתכוון אין כאן טבלת מועדים: נכון להיום מאל״ו לא פרסמו מועדים
             רשמיים לבחינת הלאל, ולוח מועדים מומצא הוא בדיוק סוג הדבר
             שהורס אמון אצל מי שבודק אותנו מול מקור רשמי. אומרים מה ידוע,
             ואומרים במפורש מה עוד לא. -->
        <div class="lp-facts">
          <div class="lp-facts-t">מה ידוע היום על הבחינה</div>
          <ul>
            <li>מדצמבר 2026 הפסיכומטרי כבר לא כולל פרק אנגלית</li>
            <li>הבחינה החדשה ממוחשבת ומותאמת לרמת הנבחן</li>
            <li>שלוש מיומנויות: קריאה, האזנה והבעה בכתב</li>
            <li>טווח הציון 50–150, לצד רמת CEFR</li>
          </ul>
          <div class="lp-facts-note">מועדים רשמיים טרם פורסמו. ברגע שיפורסמו, הם יופיעו כאן.</div>
        </div>

        <!-- ✍️ ליאון: הטקסט הזה כתוב בשמך ומופיע לכל מבקר — עבור עליו ותקן.
             אצל המתחרה יש בדיוק בלוק כזה מהמייסד, והוא אחד הדברים שגורמים
             לאתר להרגיש אנושי ולא כמו מוצר גנרי. -->
        <div class="lp-founder">
          <div class="lp-founder-t">למה בניתי את זה</div>
          <p>
            לימדתי אנגלית לבחינות במשך חמש שנים, וראיתי את אותה סצנה חוזרת:
            תלמיד שמבין את החומר, נתקע על סוג שאלה מסוים, ואף אחד לא מראה לו
            <em>למה</em> הוא נתקע שם. כשהתפרסם שהאנגלית יוצאת מהפסיכומטרי הבנתי
            שכל חומרי ההכנה הקיימים מכוונים לבחינה אחרת — אז בניתי את מה
            שהייתי רוצה לתת לתלמידים שלי.
          </p>
          <p class="lp-founder-sig">ליאון · HighScore</p>
        </div>

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
    setMsg('Supabase לא מוגדר.', true);
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
}
