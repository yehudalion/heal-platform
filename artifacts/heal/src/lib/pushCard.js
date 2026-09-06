/**
 * src/lib/pushCard.js — ההצעה "להזכיר לי מחר", בסוף מנה מוצלחת.
 *
 * למה דווקא כאן (6.9.2026): זה הרגע היחיד שבו הלומד כבר יודע מה הוא
 * מקבל — הוא בדיוק סיים מנה וראה כמה מילים ידע. בקשת רשות בטעינת הדף
 * הייתה נדחית מיד, וגם הדפדפנים חוסמים בקשה שלא באה מלחיצה.
 *
 * לא נודניק: "לא עכשיו" משתיק ל-30 יום, וסירוב בדפדפן לא נשאל שוב לעולם.
 */
import { shouldOffer, needsInstallFirst, enablePush, snooze } from './push.js';
import { navigate } from '../router.js';

function ensureStyles() {
  if (document.getElementById('hs-pushcard-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-pushcard-css';
  s.textContent = `
.pc-card{margin:1.1rem 0 0;padding:.9rem 1rem;border-radius:12px;border:1.5px solid var(--gold,#B08442);
  background:rgba(176,132,66,.07);text-align:right}
.pc-t{font-weight:800;font-size:.92rem;margin-bottom:.2rem}
.pc-s{font-size:.8rem;color:var(--muted);line-height:1.6}
.pc-acts{display:flex;gap:.5rem;margin-top:.7rem;flex-wrap:wrap}
.pc-yes{background:var(--green-dark,#16412F);color:#fff;border:0;border-radius:99px;padding:.5rem 1rem;
  font:inherit;font-size:.84rem;font-weight:800;cursor:pointer}
.pc-no{background:none;border:0;color:var(--muted);font:inherit;font-size:.8rem;cursor:pointer;text-decoration:underline}
.pc-done{font-size:.86rem;font-weight:700;color:var(--green-dark,#16412F)}
`;
  document.head.appendChild(s);
}

/** '' אם אין מה להציע (לא נתמך / כבר הוחלט / נדחה לאחרונה). */
export function pushCardHtml() {
  if (needsInstallFirst()) {
    return `<div class="pc-card" id="hsPushCard">
      <div class="pc-t">🔔 שאזכיר לך מחר?</div>
      <div class="pc-s">באייפון צריך קודם להוסיף את האתר למסך הבית — אחרי זה אפשר לקבל תזכורת יומית אחת.</div>
      <div class="pc-acts">
        <button class="pc-yes" type="button" data-pc="install">איך מוסיפים ←</button>
        <button class="pc-no" type="button" data-pc="no">לא עכשיו</button>
      </div>
    </div>`;
  }
  if (!shouldOffer()) return '';
  return `<div class="pc-card" id="hsPushCard">
    <div class="pc-t">🔔 שאזכיר לך מחר?</div>
    <div class="pc-s">תזכורת אחת ביום, רק כשבאמת מחכות לך חזרות. אפשר לכבות בכל רגע.</div>
    <div class="pc-acts">
      <button class="pc-yes" type="button" data-pc="yes">כן, להזכיר לי</button>
      <button class="pc-no" type="button" data-pc="no">לא עכשיו</button>
    </div>
  </div>`;
}

export function wirePushCard(root) {
  const card = root.querySelector('#hsPushCard');
  if (!card) return;
  ensureStyles();
  const replace = (html) => { card.innerHTML = html; };

  card.querySelector('[data-pc="install"]')?.addEventListener('click', () => navigate('/install'));
  card.querySelector('[data-pc="no"]')?.addEventListener('click', () => { snooze(); card.remove(); });
  card.querySelector('[data-pc="yes"]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'רגע…';
    const res = await enablePush();
    if (res === 'granted') replace('<div class="pc-done">✓ מעולה. אזכיר לך מחר, פעם אחת.</div>');
    else if (res === 'denied') replace('<div class="pc-s">ההתראות חסומות בדפדפן. אפשר לפתוח אותן בהגדרות האתר בדפדפן.</div>');
    else replace('<div class="pc-s">משהו לא עבד. אפשר לנסות שוב מההגדרות.</div>');
  });
}
