/**
 * src/screens/affix.js — שער פינת התחיליות והסופיות.
 *
 * ליאון (3.9): "אני רוצה להוסיף פינת תחיליות וסופיות לאתר שיעזרו גם במצבים
 * שהתלמיד לא יודע את המילה." הפינה נבנתה כפינה עצמאית עם שלוש השכבות, לפי
 * החלטתו, ולא כשכבה בתוך אוצר המילים.
 *
 * מה מייחד אותה מהמתחרה: אצל mypsychometric יש שישה שלבי תחיליות/סופיות
 * במסלול ה-800, אבל השאלות שם הן טריוויה ("Opposite of ancient"). כאן כל
 * פריט הוא שאלת השלמה בפורמט המבחן, שבה המילה הנכונה לא בהכרח מוכרת — וזה
 * בדיוק העניין: הפינה מלמדת לפענח, לא לזכור.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { fetchAffixAttempts } from '../data/affix.data.js';

const BLURB = 'במבחן תיתקלו במילים שלא ראיתם מעולם. זה לא כישלון — זה חלק מהתכנון. מה שאפשר לעשות זה לפרק: התחילית מספרת אם המשמעות התהפכה, והסופית מספרת אם מדובר בשם עצם, בתואר, בפועל או באדם. שתי פיסות המידע האלה לבדן הופכות ניחוש מתוך ארבע אפשרויות לניחוש מתוך שתיים.';

export async function renderAffix(root) {
  await renderLayout(root, '/affix');
  const el = getPageContent();

  el.innerHTML = `
    <div class="fade-in" style="max-width:620px">
      <div class="page-title">תחיליות וסופיות</div>
      <div class="page-sub">Prefixes &amp; Suffixes</div>

      <div class="sg-card">
        <p class="sg-blurb">${BLURB}</p>
        <button class="btn-primary sg-cta" id="afStart">התחל תרגול ←</button>
        <div class="sg-links">
          <a class="sg-guide" href="#/affix-learn">📘 מדריך</a>
          <a class="sg-guide" href="#/affix-analyze">📊 ניתוח</a>
        </div>
      </div>

      <div class="sg-stat" id="afStat" hidden></div>
    </div>`;

  el.querySelector('#afStart').addEventListener('click', () => navigate('/affix-practice'));
  showPractisedCount(el);
}

/** המספר היחיד בעמוד, ורק כשהוא אמיתי — אותה משמעת כמו בשאר השערים. */
async function showPractisedCount(el) {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!userId) return;
  const { data } = await fetchAffixAttempts(userId, { limit: 300 });
  if (!data?.length) return;
  const box = el.querySelector('#afStat');
  if (!box) return;
  box.textContent = `${data.length} שאלות שתרגלת לאחרונה`;
  box.hidden = false;
}
