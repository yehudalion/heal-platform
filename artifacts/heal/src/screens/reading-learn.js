/**
 * src/screens/reading-learn.js — Reading Comprehension, Learn layer.
 *
 * Teaches ONE thing: שיטת החלון, in the final two-rule form Lion approved on
 * 1.9.2026 (READING_FORMAT.md §5.4). Not a general "how to read" lesson — the
 * single decision the section actually turns on is how much text this question
 * obliges you to read, and that decision is readable off the question itself.
 *
 * Every number on this page is measured, from the 166-passage / 830-question
 * truth corpus and from the 10 real AMIRNET items Lion pulled from NITE's own
 * practice test. Nothing here is estimated — project rule, and the reason the
 * page is allowed to make claims about the exam at all.
 *
 * NOT taught here, deliberately (READING_FORMAT.md §6, decided with Lion): there
 * is no distractor-"keys" vocabulary in Reading. The learner is never asked to
 * name a category. Per-item Hebrew explanations do that job in practice, and the
 * one axis shown and tracked is window size.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

/** Practice reads this to send a first-timer through the method once. */
export const LEARN_SEEN_KEY = 'hs:reading:learn-seen';

export async function renderReadingLearn(root) {
  await renderLayout(root, '/reading');
  const el = getPageContent();

  el.innerHTML = `
    <div class="rl-wrap fade-in">
      <div class="page-title">שיטת החלון</div>
      <div class="page-sub">איך ניגשים לפרק הבנת הנקרא</div>

      <section class="rl-card">
        <p class="rl-lead">בפרק הזה יש קטע אחד וחמש שאלות, ו-15 דקות. זה הרבה זמן — קטע של 285 מילים בקצב איטי לוקח כשלוש דקות. <b>הבעיה בפרק הזה היא לא מהירות.</b></p>
        <p class="rl-lead">הבעיה היא שרוב השאלות לא נפתרות בסריקה. בדקנו את זה על עשר שאלות אמיתיות ממבחן ההתנסות הרשמי של מאל"ו: <b>רק אחת מתוך עשר</b> נפתרה בקריאת המשפט שהשאלה מפנה אליו. בכל השאר צריך לקרוא יותר.</p>
        <p class="rl-lead">אז השאלה האמיתית היא לא "לקרוא או לסרוק". היא <b>כמה לקרוא</b> — ועל זה השאלה עצמה עונה לך.</p>
      </section>

      <h3 class="rl-h">כלל 1 — השאלה קובעת את גודל החלון</h3>
      <section class="rl-card">
        <div class="rl-row">
          <div class="rl-tag">שאלת עוגן</div>
          <div class="rl-body">
            <p class="rl-what">השאלה מצטטת ניסוח מהקטע, או נוקבת בשם או במונח.</p>
            <p class="rl-do"><b>מה עושים:</b> קוראים את המשפט הזה, ואת המשפט שלפניו ואחריו. לא יותר.</p>
          </div>
        </div>
        <div class="rl-row">
          <div class="rl-tag">שאלת פסקה</div>
          <div class="rl-body">
            <p class="rl-what">השאלה נוקבת בפסקה — "מטרת הפסקה השנייה", "לפי הפסקה האחרונה".</p>
            <p class="rl-do"><b>מה עושים:</b> קוראים את <b>כל</b> הפסקה, לא רק את המשפט הפותח.</p>
            <p class="rl-why">זה הכלל שהכי קל לפספס, והוא נמדד: האופציות בשאלות מטרת-פסקה בנויות כמעט תמיד מהמשפט הראשון או האחרון של הפסקה כשקוראים אותו לבד. מי שקורא רק את השורה הראשונה נוחת בדיוק על האופציה השגויה. הפסקאות כאן קצרות — קריאה מלאה עולה כ-25 שניות.</p>
          </div>
        </div>
        <div class="rl-row">
          <div class="rl-tag">שאלת טקסט</div>
          <div class="rl-body">
            <p class="rl-what">כותרת מתאימה, רעיון מרכזי — אין בשאלה שום דבר לסרוק אחריו.</p>
            <p class="rl-do"><b>מה עושים:</b> לא עונים עכשיו. מסמנים ועוברים הלאה.</p>
          </div>
        </div>
      </section>

      <h3 class="rl-h">כלל 2 — השאלה בלי עוגן נענית אחרונה</h3>
      <section class="rl-card">
        <p class="rl-lead">במבחן, השאלה הראשונה היא שאלה גלובלית ב-54% מהמקרים. זאת אומרת שרוב הנבחנים פוגשים כבר בשאלה הראשונה שאלה שאי אפשר לסרוק בשבילה — ומתחילים את הפרק בתחושה שהם תקועים.</p>
        <p class="rl-lead">אחרי שענית על ארבע השאלות האחרות, כבר עברת בפועל על רוב הקטע — הן שלחו אותך לשם. <b>זו המפה, והיא נבנתה בחינם.</b> עכשיו השאלה הגלובלית קלה בהרבה.</p>
        <p class="rl-lead">ואם בסוף נשארה פסקה שאף שאלה לא נגעה בה — זה הרגע לקרוא רק אותה. לא לחזור על כל הקטע.</p>
      </section>

      <h3 class="rl-h">ואז: אימות</h3>
      <section class="rl-card">
        <p class="rl-lead">לפני שסוגרים תשובה, בודקים אותה מול החלון שקראת — <b>על היחס, לא על המילים</b>. מי עשה למי, לאיזה כיוון, מתי, ובאיזה היקף.</p>
        <p class="rl-lead">למה זה חשוב: התשובה הנכונה משתמשת במילים מהקטע בערך ב-70% מהפריטים — אבל <b>גם האופציות השגויות עושות את זה, לפעמים אפילו מילולית יותר</b>. דמיון למילים של הקטע לא מבחין בין נכון לשגוי. רק היחס מבחין.</p>
      </section>

      <div class="rl-cta-row">
        <button class="btn-primary rl-cta" id="rlGo">מתחילים לתרגל ←</button>
      </div>
    </div>`;

  el.querySelector('#rlGo').addEventListener('click', () => {
    try { localStorage.setItem(LEARN_SEEN_KEY, '1'); } catch (_) {}
    navigate('/reading-practice');
  });

  // Reaching the page at all counts as having met the method — a learner who
  // reads it and navigates away should not be bounced back here next time.
  try { localStorage.setItem(LEARN_SEEN_KEY, '1'); } catch (_) {}

  ensureStyles();
}

function ensureStyles() {
  if (document.getElementById('rl-css')) return;
  const s = document.createElement('style');
  s.id = 'rl-css';
  s.textContent = `
.rl-wrap{max-width:680px}
.rl-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.3rem 1.5rem;margin-bottom:1rem}
.rl-lead{font-size:.94rem;line-height:1.9;margin:0 0 .8rem}
.rl-lead:last-child{margin-bottom:0}
.rl-h{font-size:1rem;font-weight:800;margin:1.6rem 0 .7rem}
.rl-row{display:flex;gap:.9rem;padding:.9rem 0;border-bottom:1px solid var(--border)}
.rl-row:last-child{border-bottom:none;padding-bottom:0}
.rl-row:first-child{padding-top:0}
.rl-tag{flex:0 0 5.6rem;font-weight:800;font-size:.86rem;color:var(--green-dark);line-height:1.7}
.rl-body{flex:1 1 auto}
.rl-what{font-size:.9rem;line-height:1.8;margin:0 0 .35rem;color:var(--muted)}
.rl-do{font-size:.92rem;line-height:1.8;margin:0}
.rl-why{font-size:.86rem;line-height:1.8;margin:.5rem 0 0;padding:.6rem .8rem;background:var(--bg);border-radius:var(--radius-sm)}
.rl-cta-row{margin-top:1.4rem}
.rl-cta{width:100%;padding:.85rem 1rem;font-size:1rem}
`;
  document.head.appendChild(s);
}
