/**
 * src/screens/install.js — #/install: המדריך "איך מוסיפים את האתר כאפליקציה".
 * ציבורי (בלי חשבון) — מקושר מהנחיתה, ממסך הבית ומהסרגל. 5.9.2026.
 *
 * למה דף ולא חלון קופץ: באייפון אין חלון התקנה של הדפדפן בכלל — התלמיד
 * צריך לעשות 3 צעדים ידניים, ודף עם הצעדים במסך מלא הוא הדבר היחיד שעובד.
 * הדף מזהה את המכשיר ומציג את הצעדים שלו קודם; השאר מקופלים מתחת.
 */
import { renderLayout, getPageContent } from '../layout.js';
import { canInstall, promptInstall } from '../lib/pwa.js';
import { isStandalone, platform } from '../lib/installCard.js';
import { BRAND } from '../lib/brand.js';

function ensureStyles() {
  if (document.getElementById('hs-installpg-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-installpg-css';
  s.textContent = `
.ip-wrap{max-width:640px;margin:0 auto}
.ip-h{font-size:1.5rem;font-weight:800;margin:0 0 .3rem}
.ip-sub{color:var(--muted);line-height:1.7;margin:0 0 1.2rem}
.ip-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius,14px);padding:1.1rem 1.2rem;margin-bottom:.9rem}
.ip-card.is-you{border:2px solid var(--green-dark,#16412F)}
.ip-card h2{font-size:1.05rem;margin:0 0 .6rem;display:flex;align-items:center;gap:.5rem}
.ip-you{font-size:.7rem;font-weight:800;background:var(--green-dark,#16412F);color:#fff;border-radius:99px;padding:.15rem .55rem}
.ip-steps{margin:0;padding:0;list-style:none;display:grid;gap:.55rem;counter-reset:st}
.ip-steps li{display:flex;gap:.7rem;align-items:flex-start;line-height:1.6}
.ip-steps li::before{counter-increment:st;content:counter(st);flex:0 0 1.6rem;height:1.6rem;border-radius:50%;
  background:var(--green-dark,#16412F);color:#fff;font-weight:800;font-size:.8rem;display:grid;place-items:center}
.ip-key{display:inline-block;border:1px solid var(--border);border-radius:6px;padding:0 .4rem;font-weight:700;background:#fff;color:var(--text)}
.ip-btn{background:var(--green-dark,#16412F);color:#fff;border:0;border-radius:99px;padding:.6rem 1.1rem;font:inherit;font-weight:800;cursor:pointer;margin-top:.6rem}
.ip-done{border:1.5px dashed var(--green-dark,#16412F);border-radius:12px;padding:.8rem 1rem;font-weight:700}
.ip-why{font-size:.84rem;color:var(--muted);line-height:1.7;margin-top:1rem}
details.ip-card summary{cursor:pointer;font-weight:800;font-size:1rem}
`;
  document.head.appendChild(s);
}

const IOS = () => `
  <ol class="ip-steps">
    <li><span>פותחים את <b>highscore-eight.vercel.app</b> ב-<b>Safari</b> (לא בכרום — באייפון רק ספארי יודע להוסיף למסך הבית).</span></li>
    <li><span>לוחצים על כפתור <b>השיתוף</b> <span class="ip-key">⎋</span> — הריבוע עם החץ למעלה, בתחתית המסך.</span></li>
    <li><span>גוללים ברשימה ובוחרים <b>"הוסף למסך הבית"</b> <span class="ip-key">⊕</span>, ואז <b>"הוסף"</b> בפינה.</span></li>
  </ol>
  <p class="ip-why">זהו. האייקון של ${BRAND} יופיע במסך הבית ליד שאר האפליקציות, ייפתח במסך מלא בלי סרגל כתובת, וההתקדמות שלכם נשמרת בחשבון כרגיל.</p>`;

const ANDROID = `
  <ol class="ip-steps">
    <li><span>פותחים את <b>highscore-eight.vercel.app</b> ב-<b>Chrome</b>.</span></li>
    <li><span>אם מופיע כפתור <b>"להתקין עכשיו"</b> למטה — לוחצים עליו וזהו.</span></li>
    <li><span>אחרת: תפריט <span class="ip-key">⋮</span> בפינה → <b>"הוסף למסך הבית"</b> (או "התקנת אפליקציה") → <b>"התקן"</b>.</span></li>
  </ol>`;

const DESKTOP = () => `
  <ol class="ip-steps">
    <li><span>ב-<b>Chrome</b> או <b>Edge</b>: בצד שורת הכתובת מופיע אייקון התקנה קטן <span class="ip-key">⊕</span> — לוחצים עליו → <b>"התקן"</b>.</span></li>
    <li><span>או: תפריט <span class="ip-key">⋮</span> → <b>"שמירה ושיתוף"</b> → <b>"התקנת ${BRAND}"</b>.</span></li>
  </ol>`;

export async function renderInstall(root) {
  await renderLayout(root, '/install');
  ensureStyles();
  const el = getPageContent();
  const p = platform();
  const card = (id, title, body, isYou, open) => isYou
    ? `<section class="ip-card is-you" id="${id}"><h2>${title} <span class="ip-you">המכשיר שלכם</span></h2>${body}</section>`
    : `<details class="ip-card" id="${id}"${open ? ' open' : ''}><summary>${title}</summary>${body}</details>`;

  el.innerHTML = `<div class="ip-wrap fade-in">
    <h1 class="ip-h">📲 ${BRAND} כאפליקציה</h1>
    <p class="ip-sub">אייקון במסך הבית, מסך מלא, פתיחה בלחיצה — בלי חנות אפליקציות ובלי הורדה. לוקח פחות מדקה.</p>
    ${isStandalone() ? `<div class="ip-done">✓ אתם כבר בתוך האפליקציה. אין מה להוסיף.</div>` : ''}
    ${canInstall() ? `<div class="ip-card is-you"><h2>לחיצה אחת</h2><p>הדפדפן שלכם יודע להתקין ישירות:</p><button class="ip-btn" id="ipNow" type="button">להתקין עכשיו</button></div>` : ''}
    ${card('ios', '🍎 אייפון / אייפד', IOS(), p === 'ios' && !canInstall())}
    ${card('android', '🤖 אנדרואיד', ANDROID, p === 'android' && !canInstall())}
    ${card('desktop', '💻 מחשב', DESKTOP(), p === 'desktop' && !canInstall())}
    <p class="ip-why">למה זה שווה: תלמיד שיש לו אייקון פותח את המנה היומית פי כמה יותר ממי שצריך לזכור כתובת. וזה לא "עוד אפליקציה" — זה אותו אתר, אותו חשבון, אותה התקדמות.</p>
  </div>`;
  el.querySelector('#ipNow')?.addEventListener('click', async () => { if (await promptInstall()) location.reload(); });
}
