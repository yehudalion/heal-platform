/**
 * src/screens/simulation.js — שער הכניסה לאבחון (שכבת Learn + בחירת טופס).
 *
 * זה העמוד שכל עמודי ה-SEO מפנים אליו בסופו של דבר, ולכן הוא צריך לענות על
 * שתי שאלות לפני שמישהו לוחץ "התחלה": מה עומד לקרות כאן, ומה אני מקבל בסוף.
 *
 * חמישה טפסים קבועים, בלי חפיפה ביניהם — מי שרוצה לבדוק את עצמו שוב אחרי
 * חודש מקבל שאלות שלא ראה. הטופס עצמו רץ ב-simulation-run.js.
 *
 * הבנת הנקרא עדיין לא כאן: אין לנו בנק קטעים, ולכתוב שיש פרק שאין זה בדיוק
 * סוג ההבטחה שאנחנו לא נותנים. כשהבנק ייבנה, הפרק ייכנס לטפסים הקיימים.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getLearner } from '../lib/learner.js';
import { listForms, listAttempts, SECTION_LABELS } from '../data/simulation.data.js';

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
.si-skills { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:.6rem; margin:1.2rem 0; }
.si-skill { border:1px solid var(--border); border-radius:8px; padding:.7rem .9rem; background:var(--bg); }
.si-skill-n { font-weight:800; font-size:.9rem; margin-bottom:.15rem; }
.si-skill-d { font-size:.8rem; color:var(--muted); line-height:1.6; }
.si-note { background:var(--orange-light,#F2E9D8); border-inline-start:3px solid var(--orange,#B08442);
  border-radius:8px; padding:.85rem 1.1rem; font-size:.88rem; line-height:1.75; margin:1.2rem 0; }
.si-forms { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.7rem; margin-top:.8rem; }
.si-form { background:var(--card); border:1.5px solid var(--border); border-radius:10px;
  padding:1rem 1.1rem; text-align:right; font-family:inherit; cursor:pointer; color:var(--text); }
.si-form:hover { border-color:var(--green); }
.si-form-t { font-weight:800; margin-bottom:.2rem; }
.si-form-s { font-size:.8rem; color:var(--muted); }
.si-form-done { font-size:.78rem; color:var(--green-dark); font-weight:700; margin-top:.4rem; }
.si-h2 { font-size:1.05rem; font-weight:800; margin:1.8rem 0 .3rem; }
.si-past { font-size:.86rem; color:var(--muted); margin-top:.5rem; }
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
    listAttempts(learner.id, 10),
  ]);

  const doneCodes = new Map();
  (attempts || []).forEach((a) => {
    const code = a.simulation_forms?.code;
    if (code && !doneCodes.has(code)) doneCodes.set(code, a);
  });

  const formCards = (forms || []).map((f) => {
    const done = doneCodes.get(f.code);
    const pct = done && done.total_answered
      ? Math.round((done.total_correct / done.total_answered) * 100) : null;
    return `
      <button class="si-form" data-code="${esc(f.code)}">
        <div class="si-form-t">${esc(f.title)}</div>
        <div class="si-form-s">${f.total_questions} שאלות · כ-${f.estimated_minutes} דקות</div>
        ${done ? `<div class="si-form-done">✓ הושלם${pct != null ? ` · ${pct}%` : ''}</div>` : ''}
      </button>`;
  }).join('');

  page.innerHTML = `
    <div class="si-hero">
      <div class="si-h1">אבחון רמה</div>
      <p class="si-lede">
        ארבעים דקות שנותנות לך תמונה אמיתית של איפה אתה עומד — לא תחושה, ולא ניחוש.
        בסוף מחכה דוח פערים שמראה בדיוק באיזו מיומנות אתה חזק, איפה נופל, ובאיזו
        רמת קושי אתה מפסיק להיות עקבי.
      </p>

      <div class="si-facts">
        <span class="si-fact">22 שאלות</span>
        <span class="si-fact">4 מיומנויות</span>
        <span class="si-fact">כ-25 דקות</span>
        <span class="si-fact">בלי הרשמה</span>
      </div>

      <p class="si-lede" style="margin-bottom:0">
        המבנה בנוי לפי הרצף הרשמי שמפרסם המרכז הארצי לבחינות ולהערכה
        (מאל״ו): שלושה פרקי השלמת משפטים בני 4 שאלות, שני פרקי ניסוח מחדש
        בני 3, ופרק הבנת נקרא בן 5 שיצטרף בהמשך. בסוף מגיע פרק ההאזנה —
        פרק ניסיוני, בדיוק כמו במבחן עצמו.
      </p>

      <div class="si-skills">
        <div class="si-skill">
          <div class="si-skill-n">${esc(SECTION_LABELS.sc)}</div>
          <div class="si-skill-d">משפט עם חסר וארבע השלמות. בודק בעיקר אוצר מילים ומבנה.</div>
        </div>
        <div class="si-skill">
          <div class="si-skill-n">${esc(SECTION_LABELS.continuation)}</div>
          <div class="si-skill-d">קטע נקטע באמצע — לבחור את ההמשך ההגיוני.</div>
        </div>
        <div class="si-skill">
          <div class="si-skill-n">${esc(SECTION_LABELS.restatement)}</div>
          <div class="si-skill-d">ארבע גרסאות למשפט אחד, רק אחת שומרת על המשמעות.</div>
        </div>
        <div class="si-skill">
          <div class="si-skill-n">${esc(SECTION_LABELS.lecture_qa)}</div>
          <div class="si-skill-d">הרצאה או שיחה, ושאלות הבנה עליה.</div>
        </div>
      </div>

      <div class="si-note">
        <strong>מה שלא תקבלו כאן: ציון בסולם 50–150.</strong> כדי לתרגם ביצועים לציון
        כזה צריך כיול פסיכומטרי של כל שאלה, ואין לנו אותו — מספר שהיינו ממציאים
        עלול לגרום לכם להחליט אם לגשת למבחן על סמך ניחוש. במקום זה תקבלו משהו
        שימושי יותר: מפה מדויקת של הפערים.
        <br><br>
        <strong>הבנת הנקרא עדיין לא כלולה.</strong> היא חלק מהמבחן האמיתי, ותיכנס
        לאבחון כשבנק הקטעים שלנו יהיה מוכן.
      </div>
    </div>

    <div class="si-h2">בחרו טופס</div>
    <div class="si-past">חמישה טפסים שונים לגמרי, בלי שאלות חוזרות ביניהם — אפשר לחזור ולבדוק את עצמכם בעוד חודש.</div>
    <div class="si-forms">${formCards || '<div class="si-past">אין טפסים זמינים כרגע.</div>'}</div>
  `;

  page.querySelectorAll('.si-form').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`/simulation/run?form=${btn.dataset.code}`));
  });
}
