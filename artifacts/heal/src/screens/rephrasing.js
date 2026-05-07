import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

const FEATURES = {
  trap: {
    color: 'p', title: 'Trap Trainer',
    sub: 'ללמוד את הטריקים לפני שנחשפים לשאלות אמיתיות — 6 קטגוריות עם הסבר, דוגמאות ותרגיל.',
    steps: [
      '<strong>הסבר הטריק</strong> — מה בדיוק השאלאים עושים ואיך הם מבלבלים.',
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
