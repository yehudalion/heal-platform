/**
 * src/screens/simulation.js — שער הכניסה לאבחון.
 *
 * זה העמוד שכל עמודי ה-SEO מפנים אליו, ולכן הוא עונה על שתי שאלות לפני
 * שמישהו לוחץ "התחלה": מה עומד לקרות כאן, ומה מקבלים בסוף.
 *
 * טופס אבחון אחד בלבד (sim-1). ארבעת הטפסים הנוספים קיימים בבסיס הנתונים
 * אבל אינם מפורסמים — הם מיועדים לשימושים אחרים שיוגדרו בשיחת ה-paywall.
 * listForms() מחזיר רק מפורסמים, ולכן המסך הזה לא צריך לדעת עליהם.
 *
 * הבנת הנקרא עדיין לא כאן: אין בנק קטעים, ולכתוב שיש פרק שאין זה בדיוק סוג
 * ההבטחה שאנחנו לא נותנים. מקומו שמור בטופס (פרק 3) ויתמלא כשהבנק ייבנה.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { listForms, listAttempts, loadForm } from '../data/simulation.data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function ensureStyles() {
  if (document.getElementById('sim-intro-css')) return;
  const s = document.createElement('style');
  s.id = 'sim-intro-css';
  s.textContent = `
.si-hero { background:var(--card); border:1px solid var(--border); border-radius:12px;
  padding:1.6rem 1.7rem; margin-bottom:1.4rem; }
.si-h1 { font-size:1.45rem; font-weight:900; margin-bottom:.5rem; }
.si-lede { color:var(--muted); line-height:1.8; margin-bottom:1.1rem; }
.si-facts { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1.2rem; }
.si-fact { background:var(--green-light); color:var(--green-dark); border-radius:99px;
  padding:.3rem .85rem; font-size:.82rem; font-weight:700; }
.si-map { width:100%; border-collapse:collapse; font-size:.9rem; margin:.4rem 0 0; }
.si-map th { text-align:right; font-size:.76rem; font-weight:800; color:var(--muted);
  padding:.4rem .6rem; border-bottom:1px solid var(--border); }
.si-map td { text-align:right; padding:.5rem .6rem; border-bottom:1px solid var(--border); }
.si-map tr.soon td { color:var(--muted); }
.si-tag { font-size:.7rem; font-weight:800; border-radius:99px; padding:.1rem .5rem; margin-inline-start:.35rem; }
.si-tag-pilot { background:var(--orange-light,#F2E9D8); color:var(--orange,#B08442); }
.si-tag-soon { background:var(--border); color:var(--muted); }
.si-note { background:var(--orange-light,#F2E9D8); border-inline-start:3px solid var(--orange,#B08442);
  border-radius:8px; padding:.85rem 1.1rem; font-size:.88rem; line-height:1.75; margin:1.2rem 0; }
.si-start { display:flex; align-items:center; gap:.9rem; flex-wrap:wrap; margin-top:1.4rem; }
.si-btn { background:var(--green-dark); color:#fff; border:0; border-radius:8px;
  padding:.8rem 1.9rem; font-family:inherit; font-weight:800; font-size:1rem; cursor:pointer; }
.si-prev { font-size:.86rem; color:var(--muted); }
.si-h2 { font-size:1.05rem; font-weight:800; margin:1.6rem 0 .3rem; }
`;
  document.head.appendChild(s);
}

export async function renderSimulation(root) {
  await renderLayout(root, '/simulation');
  const page = getPageContent();
  ensureStyles();
  page.innerHTML = `<div class="si-hero"><div class="si-lede">טוען…</div></div>`;

  const learner = await getLearner();
  const [{ data: forms }, { data: attempts }] = await Promise.all([
    listForms(),
    listAttempts(learner.id, 5),
  ]);

  const form = (forms || [])[0];
  if (!form) {
    page.innerHTML = `<div class="si-hero"><div class="si-lede">האבחון אינו זמין כרגע.</div></div>`;
    return;
  }

  // הפרקים מגיעים מהטופס עצמו ולא מרשימה קשיחה כאן, כדי שפרק הבנת הנקרא
  // יופיע אוטומטית ברגע שיהיו לו פריטים.
  const { data: full } = await loadForm(form.code);
  const live = full?.sections ?? [];
  const totalQ = live.reduce((n, s) => n + s.items.length, 0);
  const totalMin = Math.round(live.reduce((n, s) => n + s.seconds, 0) / 60);

  const rows = live.map((s) => `
    <tr>
      <td>${esc(s.title)}${s.isPilot ? '<span class="si-tag si-tag-pilot">ניסיוני</span>' : ''}</td>
      <td>${s.items.length}</td>
      <td>${Math.round(s.seconds / 60)} דק'</td>
    </tr>`).join('');

  const last = (attempts || [])[0];
  const lastPct = last && last.total_answered
    ? Math.round((last.total_correct / last.total_answered) * 100) : null;

  page.innerHTML = `
    <div class="si-hero">
      <div class="si-h1">אבחון רמה</div>
      <p class="si-lede">
        תמונה אמיתית של איפה אתם עומדים — לא תחושה ולא ניחוש. בסוף מחכה דוח
        פערים שמראה באיזו מיומנות אתם חזקים, איפה נופלים, ובאיזו רמת קושי
        אתם מפסיקים להיות עקביים.
      </p>

      <div class="si-facts">
        <span class="si-fact">${totalQ} שאלות</span>
        <span class="si-fact">כ-${totalMin} דקות</span>
        <span class="si-fact">זמן לכל פרק</span>
        <span class="si-fact">בלי הרשמה</span>
      </div>

      <p class="si-lede" style="margin-bottom:.4rem">
        המבנה בנוי לפי הרצף שמפרסם המרכז הארצי לבחינות ולהערכה (מאל״ו), וכמו
        בבחינה עצמה <strong>הזמן מנוהל ברמת הפרק</strong>: לכל פרק שעון משלו,
        בתוכו אפשר לנוע בין השאלות ולשנות תשובות, וזמן שנשאר לא עובר הלאה.
      </p>

      <table class="si-map">
        <thead><tr><th>פרק</th><th>שאלות</th><th>זמן</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="soon">
            <td>הבנת הנקרא<span class="si-tag si-tag-soon">בקרוב</span></td>
            <td>5</td><td>15 דק'</td>
          </tr>
        </tbody>
      </table>

      <div class="si-note">
        <strong>מה שלא תקבלו כאן: ציון בסולם 50–150.</strong> כדי לתרגם ביצועים
        לציון כזה צריך כיול פסיכומטרי של כל שאלה, ואין לנו אותו — מספר שהיינו
        ממציאים עלול לגרום לכם להחליט אם לגשת למבחן על סמך ניחוש. במקום זה
        תקבלו אחוזי הצלחה לכל מיומנות בנפרד, ומפה מדויקת של הפערים.
      </div>

      <div class="si-start">
        <button class="si-btn" id="siStart">להתחיל את האבחון</button>
        ${lastPct != null ? `<span class="si-prev">האבחון האחרון שלכם: ${lastPct}%</span>` : ''}
      </div>
    </div>`;

  page.querySelector('#siStart').addEventListener('click', () => {
    navigate(`/simulation/run?form=${form.code}`);
  });
}
