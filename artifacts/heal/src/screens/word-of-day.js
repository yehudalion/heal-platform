/**
 * src/screens/word-of-day.js — "המילה של היום" כעמוד עצמאי, פתוח בלי חשבון.
 *
 * למה עמוד ולא רק הפינה במסך הבית (4.9.2026, ליאון): אחרי שמצב האורח הוסר
 * נשארה דלת חינמית אחת בלבד — האתגר היומי. המתחרה מחזיק ארבעה כלים חינמיים
 * נפרדים תחת הכותרת "כלים חינמיים - בלי הרשמה", וכל אחד מהם עומד בפני עצמו
 * ונגמר בהזמנה להירשם. זה הכלי השני שלנו מאותו סוג.
 *
 * למה דווקא מילה אחת ביום ולא המילון: המילון הוא הנכס עצמו, והוא גם החלק
 * הכי בר-העתקה במוצר (ההחלטה של ליאון על "כיול, לא כיסוי"). מילה אחת ביום
 * נותנת טעימה אמיתית, לא מוסרת את המאגר, ומייצרת בדיוק את הפריט שכבר תוכנן
 * כתוכן לרשתות ("מילה של היום").
 *
 * הבחירה דטרמיניסטית לפי התאריך — אותה מילה לכולם, כל היום. אותו כלל של
 * הפינה במסך הבית, ומאותו מקור בדיוק (`wordOfDay.data.js`), כדי שתלמיד
 * שרואה את שניהם לא יראה שתי מילים שונות באותו יום.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getWordOfDay } from '../data/wordOfDay.data.js';
import { startGoogleSignIn } from '../lib/signIn.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ensureStyles() {
  if (document.getElementById('wodStyles')) return;
  const el = document.createElement('style');
  el.id = 'wodStyles';
  el.textContent = `
.wod-wrap{max-width:620px;margin:0 auto}
.wod-date{font-size:.76rem;color:var(--muted);letter-spacing:.04em}
.wod-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
  padding:1.4rem 1.3rem;margin-top:.6rem}
.wod-head{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.wod-word{direction:ltr;font-family:var(--eng),Georgia,serif;font-size:2.3rem;font-weight:600;
  line-height:1.15;color:var(--text)}
.wod-audio{background:none;border:1px solid var(--border);border-radius:99px;width:2.1rem;height:2.1rem;
  font-size:.95rem;cursor:pointer;line-height:1}
.wod-audio:hover{border-color:var(--green)}
.wod-def{font-size:1.05rem;font-weight:700;margin-top:.5rem}
.wod-sent{direction:ltr;text-align:left;font-family:var(--eng),Georgia,serif;font-size:1rem;
  line-height:1.75;margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--border);color:var(--text)}
.wod-mnem{margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--border);display:grid;gap:.5rem}
.wod-mnem-h{font-size:.76rem;font-weight:800;color:var(--muted);letter-spacing:.03em}
.wod-mnem p{margin:0;font-size:.9rem;line-height:1.7}
.wod-acts{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
.wod-ghost{background:none;border:1.5px solid var(--border);border-radius:var(--radius-sm);
  padding:.5rem .9rem;font:inherit;font-size:.84rem;font-weight:700;cursor:pointer;color:var(--text)}
.wod-ghost:hover{border-color:var(--green)}
.wod-msg{font-size:.8rem;color:var(--muted);min-height:1.2em;margin-top:.4rem}
.wod-cta{margin-top:1.1rem;padding:1rem 1.1rem;border-radius:var(--radius-sm);
  border:1.5px dashed var(--orange);background:rgba(176,132,66,.06)}
.wod-cta-t{font-weight:800;margin-bottom:.25rem}
.wod-cta-s{font-size:.84rem;color:var(--muted);line-height:1.6;margin-bottom:.7rem}
.wod-more{margin-top:1.1rem;font-size:.82rem;color:var(--muted);line-height:1.7}
.wod-more a{color:var(--green-dark);font-weight:700}
.wod-empty{text-align:center;color:var(--muted);padding:2rem 0;line-height:1.9}
`;
  document.head.appendChild(el);
}

const HE_DATE = () => new Date().toLocaleDateString('he-IL', {
  weekday: 'long', day: 'numeric', month: 'long',
});

export async function renderWordOfDay(root) {
  await renderLayout(root, '/word-of-day');
  const el = getPageContent();
  ensureStyles();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const signedIn = Boolean(session?.user?.id);

  const { word } = await getWordOfDay();

  if (!word) {
    el.innerHTML = `<div class="wod-wrap fade-in">
      <div class="page-title">המילה של היום</div>
      <p class="wod-empty">לא הצלחנו לטעון את המילה של היום. אפשר לנסות שוב עוד רגע.</p>
    </div>`;
    return;
  }

  // שלוש האסוציאציות נשמרות בשלוש עמודות נפרדות; מוצגות רק אלה שקיימות.
  const mnemonics = [word.mnemonic].filter(Boolean);

  el.innerHTML = `
    <div class="wod-wrap fade-in">
      <div class="page-title">המילה של היום</div>
      <div class="wod-date">${esc(HE_DATE())} · אותה מילה לכל מי שנכנס היום</div>

      <section class="wod-card">
        <div class="wod-head">
          <span class="wod-word">${esc(word.headword)}</span>
          ${word.audio_word_url
            ? `<button class="wod-audio" id="wodAudio" title="השמע את המילה" aria-label="השמע את המילה">🔊</button>`
            : ''}
        </div>
        <div class="wod-def">${esc(word.definition_he)}</div>

        ${word.surface_1 ? `
        <div class="wod-sent">
          ${esc(word.surface_1)}
          ${word.audio_sentence_url
            ? `<button class="wod-audio" id="wodSentAudio" title="השמע את המשפט" aria-label="השמע את המשפט">🔊</button>`
            : ''}
        </div>` : ''}

        ${mnemonics.length ? `
        <div class="wod-mnem">
          <div class="wod-mnem-h">עוגן לזכירה</div>
          ${mnemonics.map((m) => `<p>${esc(m)}</p>`).join('')}
        </div>` : ''}

        <div class="wod-acts">
          <button class="wod-ghost" id="wodShare">↗ לשתף את המילה</button>
          <button class="wod-ghost" id="wodDaily">📅 לאתגר היומי</button>
        </div>
        <div class="wod-msg" id="wodMsg"></div>
      </section>

      ${signedIn ? `
      <p class="wod-more">
        המילה הזו היא אחת מ-823 מילות הליבה שלנו.
        <a href="#/dictionary" data-nav="/dictionary">למילון המלא ←</a>
      </p>` : `
      <div class="wod-cta">
        <div class="wod-cta-t">מילה ביום זה התחלה, לא תוכנית.</div>
        <p class="wod-cta-s">
          חשבון חינם פותח את המילון המלא, חזרות מרווחות שמביאות לכם את המילה
          שוב בדיוק לפני שתשכחו אותה, ומעקב אחרי מה שכבר נכנס לזיכרון.
        </p>
        <button class="btn-primary" id="wodSignIn" type="button">להתחבר עם Google</button>
      </div>`}
    </div>`;

  const msg = el.querySelector('#wodMsg');
  const play = (url) => { if (url) new Audio(url).play().catch(() => {}); };

  el.querySelector('#wodAudio')?.addEventListener('click', () => play(word.audio_word_url));
  el.querySelector('#wodSentAudio')?.addEventListener('click', () => play(word.audio_sentence_url));
  el.querySelector('#wodDaily')?.addEventListener('click', () => navigate('/daily'));
  el.querySelector('#wodSignIn')?.addEventListener('click', () => { startGoogleSignIn(); });

  el.querySelector('#wodShare')?.addEventListener('click', async () => {
    const text = `${word.headword} — ${word.definition_he}\nהמילה של היום ב-HighScore`;
    const url = `${location.origin}/#/word-of-day`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'המילה של היום', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      msg.textContent = 'הועתק — אפשר להדביק בכל מקום.';
    } catch {
      // המשתמש ביטל את חלון השיתוף, או שאין הרשאה ללוח. לא שגיאה.
    }
  });
}
