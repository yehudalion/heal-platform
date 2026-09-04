/**
 * src/screens/affix-learn.js — שכבת הלמידה של פינת התחיליות והסופיות.
 *
 * מבנה אקורדיון בחשיפה הדרגתית, כמו rephrase-learn ו-sc-learn. הרעיון של
 * "כלל זהב → עצרו וחשבו → מלכודת נפוצה" נלקח מהמתחרה, שם המיקרו-שיעור בנוי
 * טוב — עם שני שינויים: אצלם התשובה מוצגת לפני שהתלמיד ניסה (ולכן הרמז הוא
 * התשובה), וכאן "עצרו וחשבו" באמת נסגר עד שלוחצים. וכמובן, בשפה שלנו זו
 * לא "מלכודת" אלא "למה לשים לב".
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate, subAnchor } from '../router.js';
import { AFFIX_FAMILIES } from '../lib/affixKeys.js';

export const AFFIX_LEARN_SEEN = 'hs_affix_learn_seen';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GOLDEN = {
  title: 'כלל הזהב',
  body: 'לפני שמסתכלים באפשרויות — קראו את המשפט ושאלו: איזה <b>סוג</b> מילה חסר כאן? פועל? שם עצם? תואר? ואיזה <b>כיוון</b> נדרש — חיובי או שלילי? התשובה כמעט תמיד מסתתרת בסוף המילה ובתחילתה, גם כשהמילה עצמה זרה לחלוטין.',
};

const STOP_AND_THINK = {
  q: 'המשפט אומר: <span dir="ltr">The results were <b>inconclusive</b>, so the team ran the experiment again.</span> גם בלי להכיר את המילה — מה אפשר לדעת עליה?',
  a: 'שלושה דברים. <b>in-</b> בהתחלה מסמנת שלילה. <b>-ive</b> בסוף מסמנת שם תואר. והשורש <b>conclude</b> מוכר — להסיק. ביחד: תוצאות שלא מאפשרות להסיק. הרמז מאשר: אם הריצו שוב, כנראה לא הגיעו למסקנה.',
};

const WATCH_FOR = {
  title: 'למה לשים לב',
  body: 'סופית קובעת <b>תפקיד</b> ולא משמעות. אחרי <span dir="ltr">will / can / to</span> תמיד יבוא פועל, ואחרי שם תואר כמו <span dir="ltr">main</span> תמיד יבוא שם עצם. הרבה שאלות נפתרות בשלב הזה בלבד, בלי להבין את המילה כלל — וזו הסיבה שכדאי לבדוק את התפקיד לפני שמתאמצים על המשמעות.',
};

const PRO_TIP = {
  title: 'טיפ למקרה שנתקעתם',
  body: 'לא מכירים אף אחת מהאפשרויות? חפשו את השורש. <span dir="ltr">unfounded</span> מכיל <span dir="ltr">found</span>, <span dir="ltr">misinterpreted</span> מכיל <span dir="ltr">interpret</span>. גם זיהוי של שורש אחד מתוך ארבע אפשרויות מוריד את הניחוש מארבע לשלוש — וזה שווה נקודות לאורך פרק שלם.',
};

export async function renderAffixLearn(root) {
  await renderLayout(root, '/affix');
  const el = getPageContent();

  const families = Object.entries(AFFIX_FAMILIES).map(([code, f], i) => `
    <details class="al-block" id="al-block-${code}" ${i === 0 ? 'open' : ''}>
      <summary>
        <span class="al-fam">${esc(f.label)}</span>
        <span class="al-hint">${esc(f.hint)}</span>
      </summary>
      <ul class="al-ex">${f.examples.map((x) => `<li dir="auto">${esc(x)}</li>`).join('')}</ul>
    </details>`).join('');

  el.innerHTML = `
    <div class="fade-in" style="max-width:660px">
      <div class="page-title">תחיליות וסופיות — המדריך</div>
      <div class="page-sub">איך לפענח מילה שלא ראיתם מעולם</div>

      <section class="al-card al-golden">
        <div class="al-card-k">${GOLDEN.title}</div>
        <p>${GOLDEN.body}</p>
      </section>

      <details class="al-card al-think">
        <summary><span class="al-card-k">עצרו וחשבו</span><p>${STOP_AND_THINK.q}</p></summary>
        <div class="al-answer"><b>התשובה:</b> ${STOP_AND_THINK.a}</div>
      </details>

      <div class="sec-title" style="margin-top:1.4rem">שתים־עשרה המשפחות</div>
      <div class="al-list">${families}</div>

      <section class="al-card al-watch">
        <div class="al-card-k">${WATCH_FOR.title}</div>
        <p>${WATCH_FOR.body}</p>
      </section>

      <section class="al-card">
        <div class="al-card-k">${PRO_TIP.title}</div>
        <p>${PRO_TIP.body}</p>
      </section>

      <button class="btn-primary" id="alGo" style="width:100%;margin-top:1.2rem">בואו נתרגל ←</button>
      <div style="text-align:center;margin-top:.7rem"><a class="sg-guide" href="#/affix">← חזרה לפינה</a></div>
    </div>`;

  el.querySelector('#alGo').addEventListener('click', () => {
    try { localStorage.setItem(AFFIX_LEARN_SEEN, 'true'); } catch (_) { /* מצב פרטי */ }
    navigate('/affix-practice');
  });

  ensureStyles();

  // קישור עמוק למשפחה מסוימת, כמו בטיפ היומי (#/affix-learn#al-block-NEGATION)
  const anchor = subAnchor();
  if (anchor) {
    const target = document.getElementById(anchor);
    if (target) { target.open = true; target.scrollIntoView({ block: 'center' }); }
  }
}

function ensureStyles() {
  if (document.getElementById('affix-learn-styles')) return;
  const s = document.createElement('style');
  s.id = 'affix-learn-styles';
  s.textContent = `
.al-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
  padding:1rem 1.1rem;margin-top:.9rem;line-height:1.75;font-size:.92rem}
.al-card p{margin:.3rem 0 0}
.al-card-k{font-size:.74rem;font-weight:800;letter-spacing:.05em;color:var(--gold,#B08442)}
.al-golden{border-inline-start:4px solid var(--gold,#B08442)}
.al-watch{border-inline-start:4px solid var(--red,#B4553E)}
.al-think summary{cursor:pointer;list-style:none}
.al-think summary::-webkit-details-marker{display:none}
.al-think summary::after{content:'גלו את התשובה ←';display:inline-block;margin-top:.5rem;
  font-size:.82rem;font-weight:700;color:var(--green-dark,#16412F)}
.al-think[open] summary::after{content:''}
.al-answer{margin-top:.6rem;padding-top:.6rem;border-top:1px dashed var(--border)}
.al-list{display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem}
.al-block{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm,10px);padding:.75rem .95rem}
.al-block summary{cursor:pointer;list-style:none;display:flex;flex-direction:column;gap:.15rem}
.al-block summary::-webkit-details-marker{display:none}
.al-fam{font-weight:800;font-size:.95rem}
.al-hint{font-size:.8rem;color:var(--muted);line-height:1.5}
.al-ex{margin:.6rem 0 0;padding-inline-start:1.1rem;font-size:.86rem;line-height:1.8;color:var(--text)}
`;
  document.head.appendChild(s);
}
