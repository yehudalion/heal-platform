import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

let isIntroVisible = true;

const INTRO = {
  title: 'ברוכים הבאים למודול הניסוח מחדש',
  subtitle: 'Restatement — מה זה, למה זה קשה, ואיך מתאמנים',
  body: `
    <p><strong>מה זה Restatement?</strong><br>
    שאלות Restatement בוחנות את יכולתך לזהות את <em>אותו רעיון</em> כשהוא מנוסח בצורה שונה.
    זה לא תרגום, לא פירוש, ולא הסקת מסקנות — אלא ניסוח מחדש <strong>מדויק</strong> של אותו תוכן.
    אם המשפט המקורי אומר "רוב החולים השתפרו", ניסוח נכון יאמר "הרוב הגיב לטיפול" — לא "כולם החלימו".</p>

    <p><strong>למה זה קשה?</strong><br>
    השאלות מטמינות 6 סוגי מלכודות קלאסיות: ניסוח קיצוני, היפוך לוגי, פרט שנוסף, עיוות היקף,
    בלבול מילים נרדפות, והסקה שגויה. כל תשובה שגויה היא מלכודת מכוונת — לא טעות אקראית.
    ההבנה של <em>למה</em> תשובה שגויה היא שגויה חשובה לא פחות מזיהוי הנכונה.</p>

    <p><strong>איך לומדים כאן — הנתיב המומלץ:</strong></p>
    <ol style="padding-right:1.2rem;line-height:2">
      <li><strong>Trap Trainer</strong> — מכירים כל אחת מ-6 המלכודות לפני שרואים שאלה אמיתית. כל קטגוריה כוללת הסבר, דוגמאות מנותחות ותרגיל זיהוי.</li>
      <li><strong>Explain Your Answer</strong> — עונים על שאלה ואז מסבירים <em>מה הטריק</em> בתשובות השגויות. כל שאלה מלמדת פי שניים.</li>
      <li><strong>Weakness Dashboard</strong> — הפלטפורמה מנתחת היכן נופלים ומפנה לתרגול ממוקד.</li>
    </ol>

    <hr style="border:none;border-top:1px solid var(--border);margin:1.2rem 0">

    <p><strong>דוגמה 1 — ניסוח קיצוני (Extreme Wording)</strong></p>
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:.9rem 1rem;margin:.4rem 0;font-size:.85rem">
      <div style="margin-bottom:.4rem"><span style="color:var(--muted);font-weight:700">משפט מקורי:</span> [PLACEHOLDER — יש להחליף בדוגמה אמיתית]</div>
      <div style="margin-bottom:.4rem"><span style="color:var(--red);font-weight:700">✗ מלכודת:</span> [PLACEHOLDER — תשובה קיצונית שגויה]</div>
      <div><span style="color:var(--green-dark);font-weight:700">✓ נכון:</span> [PLACEHOLDER — ניסוח מדויק]</div>
    </div>

    <p style="margin-top:1rem"><strong>דוגמה 2 — היפוך לוגי (Logical Reversal)</strong></p>
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:.9rem 1rem;margin:.4rem 0;font-size:.85rem">
      <div style="margin-bottom:.4rem"><span style="color:var(--muted);font-weight:700">משפט מקורי:</span> [PLACEHOLDER — יש להחליף בדוגמה אמיתית]</div>
      <div style="margin-bottom:.4rem"><span style="color:var(--red);font-weight:700">✗ מלכודת:</span> [PLACEHOLDER — סיבה ותוצאה מתחלפים]</div>
      <div><span style="color:var(--green-dark);font-weight:700">✓ נכון:</span> [PLACEHOLDER — ניסוח מדויק]</div>
    </div>

    <p style="color:var(--green-dark);font-weight:700;margin-top:1rem">המטרה: לא לנחש — לזהות. כל שאלה היא הזדמנות להבין לוגיקה אקדמית.</p>
  `,
};

const FEATURES = {
  trap: {
    color: 'p', title: 'Trap Trainer',
    sub: 'ללמוד את הטריקים לפני שנחשפים לשאלות אמיתיות — 6 קטגוריות עם הסבר, דוגמאות ותרגיל.',
    steps: [
      '<strong>הסבר הטריק</strong> — מה בדיוק השאלות עושים ואיך הם מבלבלים.',
      '<strong>דוגמאות מנותחות</strong> — מקור, מלכודת עם מילת המפתח מסומנת, וניסוח נכון.',
      '<strong>תרגיל זיהוי</strong> — שאלה אחת מיידית עם פידבק.',
      '<strong>6 קטגוריות ברצף</strong> — Extreme Wording, Logical Reversal ועוד.',
    ],
    note: '⏱ כ-10 דקות', route: '/trap-trainer',
  },
  explain: {
    color: 'g', title: 'Explain Your Answer',
    sub: 'שאלות Restatement שבהן כל תשובה — נכונה או שגויה — מלמדת אותך משהו חדש.',
    steps: [
      '<strong>קרא את המשפט המקורי</strong> — קטע אקדמי קצר, כמו בבחינה.',
      '<strong>בחר מתוך 4 ניסוחים</strong> — אחד נכון, שלושה עם מלכודות שונות.',
      '<strong>זהה את הטריק</strong> — שלב נוסף לבחירת סוג המלכודת.',
      '<strong>קבל הסבר מלא + בונוס XP</strong> אם זיהית נכון.',
    ],
    note: '⏱ כ-2 דקות לשאלה', route: '/explain',
  },
  weakness: {
    color: 'o', title: 'Weakness Dashboard',
    sub: 'הדאשבורד שנבנה מנתוני הביצועים שלך ומראה בדיוק איפה כדאי להשקיע.',
    steps: [
      '<strong>דיוק לכל קטגוריית מלכודת</strong> — כמה אחוז פתרת נכון.',
      '<strong>המלצה ממוקדת</strong> — "אתה נופל הרבה על Logical Reversal."',
      '<strong>קישור ישיר לתרגול</strong> ממוקד על הקטגוריה החלשה.',
    ],
    note: 'דרוש: 20+ שאלות פתורות', route: '/weakness',
  },
};

export async function renderRephrasing(root) {
  await renderLayout(root, '/rephrasing');
  const el = getPageContent();

  if (isIntroVisible) {
    el.innerHTML = `
      <div class="fade-in" style="max-width:660px;margin:0 auto">
        <div class="page-title">${INTRO.title}</div>
        <div class="page-sub">${INTRO.subtitle}</div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.6rem 1.8rem;line-height:1.8;font-size:.9rem;color:var(--text)">
          ${INTRO.body}
        </div>
        <div style="margin-top:1.4rem;text-align:center">
          <button class="btn-primary" id="btn-intro-done" style="padding:.85rem 2.2rem;font-size:1rem">
            הבנתי, נתחיל ←
          </button>
        </div>
      </div>`;
    el.querySelector('#btn-intro-done').addEventListener('click', () => {
      isIntroVisible = false;
      renderRephrasing(root);
    });
    return;
  }

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">מודול ניסוח מחדש</div>
      <div class="page-sub">שלט את טכניקת ה-Restatement. זהה מלכודות, הבן לוגיקה, בנה זיהוי תבניות.</div>

      <div class="rp-banner">
        <div>
          <h2>תרגול Restatement</h2>
          <p>תוצג לך משפט מקורי ועליך לבחור את ניסוחו האקדמי מתוך 4 אפשרויות.</p>
        </div>
        <div class="rp-stat"><div class="rp-stat-n">68%</div><div class="rp-stat-l">דיוק שלך</div></div>
        <div class="rp-stat"><div class="rp-stat-n">50</div><div class="rp-stat-l">שאלות פתורות</div></div>
      </div>

      <div class="sec-title">בחר מצב תרגול</div>
      <div class="features-grid">
        <div class="fcard f1" data-feat="trap">
          <div class="fbadge">פיצ'ר 1</div>
          <div class="ftitle">Trap Trainer</div>
          <div class="fdesc">לפני שאתה רואה שאלת בחינה — לומד כל טריק בנפרד עם הסבר, דוגמאות ותרגיל זיהוי.</div>
          <div style="font-size:.75rem;font-weight:700;color:var(--purple)">פתח Trap Trainer ←</div>
        </div>
        <div class="fcard f2" data-feat="explain">
          <div class="fbadge">פיצ'ר 2</div>
          <div class="ftitle">Explain Your Answer</div>
          <div class="fdesc">אחרי שבחרת תשובה — לא רק "נכון / לא נכון". זיהית את הטריק? כל שאלה מלמדת פי שניים.</div>
          <div style="font-size:.75rem;font-weight:700;color:var(--green-dark)">פתח Explain Your Answer ←</div>
        </div>
        <div class="fcard f3" data-feat="weakness">
          <div class="fbadge">פיצ'ר 3</div>
          <div class="ftitle">Weakness Dashboard</div>
          <div class="fdesc">הפלטפורמה מנתחת היכן אתה נופל ומפנה אותך לתרגול ממוקד בטריקים החלשים ביותר.</div>
          <div style="font-size:.75rem;font-weight:700;color:var(--orange)">צפה בדאשבורד ←</div>
        </div>
        <div class="fcard f4" style="opacity:.55;cursor:not-allowed">
          <div class="fbadge">פיצ'ר 4</div>
          <div class="ftitle">בקרוב</div>
          <div class="fdesc">פיצ'ר נוסף בפיתוח.</div>
        </div>
      </div>
    </div>

    <!-- Feature modal overlay -->
    <div class="feat-overlay" id="feat-overlay">
      <div class="feat-modal">
        <div class="feat-hero" id="feat-hero">
          <button class="btn-feat-close" id="btn-feat-close">✕</button>
          <h2 id="feat-title"></h2>
          <p id="feat-sub"></p>
        </div>
        <div class="feat-body" id="feat-steps"></div>
        <div class="feat-foot">
          <span class="feat-note" id="feat-note"></span>
          <button class="btn-feat-start" id="btn-feat-start">▶ התחל</button>
        </div>
      </div>
    </div>`;

  let currentRoute = null;

  el.querySelectorAll('[data-feat]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.feat;
      const cfg = FEATURES[key];
      if (!cfg) return;
      currentRoute = cfg.route;

      const hero = el.querySelector('#feat-hero');
      hero.className = `feat-hero ${cfg.color}`;
      el.querySelector('#feat-title').textContent = cfg.title;
      el.querySelector('#feat-sub').textContent   = cfg.sub;
      el.querySelector('#feat-note').textContent  = cfg.note;
      el.querySelector('#feat-steps').innerHTML   = cfg.steps.map((s, i) => `
        <div class="feat-step">
          <div class="feat-step-num ${cfg.color}">${i + 1}</div>
          <div class="feat-step-text">${s}</div>
        </div>`).join('');

      const startBtn = el.querySelector('#btn-feat-start');
      startBtn.className = `btn-feat-start ${cfg.color}`;
      el.querySelector('#feat-overlay').classList.add('open');
    });
  });

  el.querySelector('#btn-feat-close').addEventListener('click', () => {
    el.querySelector('#feat-overlay').classList.remove('open');
  });
  el.querySelector('#feat-overlay').addEventListener('click', e => {
    if (e.target === el.querySelector('#feat-overlay'))
      el.querySelector('#feat-overlay').classList.remove('open');
  });
  el.querySelector('#btn-feat-start').addEventListener('click', () => {
    if (currentRoute) navigate(currentRoute);
  });
}
