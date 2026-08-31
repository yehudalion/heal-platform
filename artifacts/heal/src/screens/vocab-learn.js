/**
 * src/screens/vocab-learn.js — Vocabulary, Learn layer.
 *
 * RESTRUCTURED 2026-08-31 (Lion, second round): "אני לא רוצה שיהיה רק את
 * ה-3 שהצעתי, הן היו דוגמאות... אני רוצה שתחשוב אתה מה רלוונטי". This screen
 * has a different shape than rephrase-learn.js/sc-learn.js (no "keys"/labels
 * to teach — it's a single linear explainer of the SRS mechanic + a demo),
 * so instead of copying their 5-block structure it's grouped into three
 * sections chosen for THIS content:
 *   - מה הפינה בכלל   — what the module is and why it uses flashcards
 *   - דברים טכניים על הפינה — how spaced repetition picks what to show, and
 *     what the three ratings do (this is the "mechanism", the reason a
 *     student would trust the choices the app makes for them)
 *   - איך לומדים      — the worked example: what one card actually looks like
 * No content was invented — every sentence already existed in the previous
 * version, just regrouped. Same accordion interaction as readiness.js /
 * rephrase-learn.js (data-block-toggle / .open / aria-expanded), prefix `vl-`.
 */
import { navigate } from '../router.js';

const SECTIONS = [
  {
    id: 'what',
    title: 'מה הפינה בכלל',
    open: true,
    body: `
      <p dir="rtl" style="margin:0;line-height:1.7;">
        מבחן הלאל בנוי במידה רבה על אוצר מילים אקדמי באנגלית. כאן זה המקום
        ללמוד אותו — לעומק, לא בשינון. לומדים באמצעות כרטיסיות: כל מילה
        מוצגת לבד, מנסים להיזכר, ואז חושפים את ההגדרה. ככה זוכרים.
      </p>`,
  },
  {
    id: 'technical',
    title: 'דברים טכניים על הפינה',
    body: `
      <p class="vl-srs-text" dir="rtl">המוח שלנו שוכח לפי דפוס ידוע — תוך יום מאבדים כ-60% ממה שלמדנו, ועוד יותר אחרי שבוע. אבל יש דרך לעקוף את זה: כשחוזרים על מילה בדיוק לפני שאנחנו עומדים לשכוח אותה, היא נצרבת עמוק יותר בכל פעם. זה הרעיון של חזרה מרווחת — לא שינון, אלא תזמון חכם.</p>
      <p class="vl-srs-text" dir="rtl">כאן זה עובד ככה: אחרי כל מילה מדרגים את עצמכם — שוב / קשה / ידעתי. המערכת לומדת מהדירוגים שלכם ומחליטה מתי כל מילה תחזור. מילה שדירגתם 'שוב' תחזור תוך דקות. 'קשה' — תוך שעות. 'ידעתי' — בעוד יום, ועם כל חזרה מוצלחת המרווח גדל. ככה תרגול של 15 דקות ביום מספיק לאוצר מילים שלם — חוזרים רק על מה שצריך, ולא מבזבזים זמן על מה שכבר יודעים.</p>
      <p class="vl-rating-title">בסוף כל כרטיסייה תדרגו את עצמכם:</p>
      <div class="vl-pills">
        <div class="vl-pill">
          <span class="vl-pill-label">🔴 שוב</span>
          <span class="vl-pill-desc">לא זכרתי, תראה לי שוב בקרוב</span>
        </div>
        <div class="vl-pill">
          <span class="vl-pill-label">🟠 קשה</span>
          <span class="vl-pill-desc">זכרתי בקושי, חזרה קרובה</span>
        </div>
        <div class="vl-pill">
          <span class="vl-pill-label">🟢 ידעתי</span>
          <span class="vl-pill-desc">זכרתי, חזרה רגילה</span>
        </div>
      </div>`,
  },
  {
    id: 'how',
    title: 'איך לומדים',
    body: `
      <p class="vl-divider-label" style="text-align:right;">ככה זה נראה בפועל:</p>
      <div class="card vl-mock-card">
        <div class="card-headword" dir="ltr">resilient</div>
        <div class="vl-mock-section">
          <span class="vl-tag">הגדרה</span>
          <p class="definition" dir="rtl">מסוגלות, חוסן — היכולת להתאושש ממצב קשה</p>
        </div>
        <div class="vl-mock-section">
          <span class="vl-tag">משפט</span>
          <p class="surface-sentence" dir="ltr">She showed remarkable resilience after the setback.</p>
        </div>
        <div class="vl-mock-section">
          <span class="vl-tag">אסוציאציה</span>
          <p class="vl-mock-mnemonic" dir="rtl">💡 רֶזִילִיֶנְט — 'ריזילי' כמו 'ריזיליינג' — קופץ חזרה כמו קפיץ</p>
        </div>
      </div>`,
  },
];

export function renderVocabLearn(rootEl) {
  injectStyles();

  rootEl.innerHTML = `
    <div class="shell" dir="rtl">
      <nav class="topbar">
        <a class="brand" href="#/home"><span class="brand-mark">HighScore</span></a>
      </nav>
      <div class="vl-wrap">

        <div class="vl-header">
          <h1 class="vl-title">כך עובד תרגול המילים</h1>
          <p class="vl-subtitle">לוחצים על כותרת כדי לפתוח</p>
        </div>

        ${SECTIONS.map(section).join('')}

        <button class="vl-cta" id="vlStartBtn">בואו נתחיל ✦</button>

        <p class="vl-footer-note">אפשר תמיד לחזור לכאן מתוך התרגול</p>

      </div>
    </div>
  `;

  rootEl.querySelectorAll('[data-vl-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.vl-block');
      const open = sec.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  rootEl.querySelector('#vlStartBtn').addEventListener('click', () => {
    localStorage.setItem('hs_vocab_learn_seen', 'true');
    navigate('/card');
  });
}

function section(s) {
  return `<section class="vl-block${s.open ? ' open' : ''}" id="vl-block-${s.id}">
    <button type="button" class="vl-block-head" data-vl-toggle aria-expanded="${s.open ? 'true' : 'false'}">
      <h2 class="vl-h2">${s.title}</h2>
      <span class="vl-chev">▾</span>
    </button>
    <div class="vl-block-body">${s.body}</div>
  </section>`;
}

function injectStyles() {
  if (document.getElementById('vl-styles')) return;
  const style = document.createElement('style');
  style.id = 'vl-styles';
  style.textContent = `
    .vl-wrap {
      max-width: 600px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .vl-header { text-align: center; }
    .vl-title {
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0 0 0.4rem;
    }
    .vl-subtitle {
      font-size: 0.95rem;
      opacity: 0.55;
      margin: 0;
    }

    /* ── accordion (same interaction pattern as readiness.js / rephrase-learn.js) ── */
    .vl-block {
      background: var(--card, #FFFDF7);
      border: 1px solid var(--border, #E3DDCC);
      border-radius: var(--radius, 8px);
      padding: 1.2rem 1.3rem;
      text-align: right;
    }
    .vl-block-head {
      display: flex; gap: .8rem; align-items: center; width: 100%;
      background: none; border: none; padding: 0; margin: 0;
      cursor: pointer; text-align: right; font: inherit; color: inherit;
    }
    .vl-h2 { flex: 1; font-size: 1.05rem; font-weight: 800; line-height: 1.4; margin: 0; }
    .vl-chev { flex: 0 0 auto; font-size: .8rem; color: var(--muted); transition: transform .2s ease; }
    .vl-block.open .vl-chev { transform: rotate(180deg); }
    .vl-block-body { display: none; margin-top: 1rem; }
    .vl-block.open .vl-block-body { display: block; }

    .vl-mock-card {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      pointer-events: none;
    }
    .vl-mock-section {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .vl-tag {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.45;
      border: 1px solid currentColor;
      border-radius: 4px;
      padding: 0.1rem 0.45rem;
      align-self: flex-start;
    }
    .vl-mock-mnemonic {
      font-size: 0.9rem;
      opacity: 0.75;
      margin: 0;
      line-height: 1.5;
    }
    .vl-rating-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 1rem 0 .65rem;
    }
    .vl-pills {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .vl-pill {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: rgba(128, 128, 128, 0.08);
      border-radius: 8px;
      padding: 0.6rem 0.7rem;
    }
    .vl-pill-label {
      font-size: 0.9rem;
      font-weight: 700;
    }
    .vl-pill-desc {
      font-size: 0.75rem;
      opacity: 0.6;
      line-height: 1.4;
    }
    .vl-srs-text {
      font-size: 0.88rem;
      line-height: 1.7;
      opacity: 0.75;
      background: rgba(31, 92, 67, 0.06);
      border-radius: 8px;
      padding: 0.9rem 1rem;
      margin: 0 0 .75rem;
    }
    .vl-cta {
      width: 100%;
      padding: 0.9rem;
      font-size: 1.1rem;
      font-weight: 700;
      background: var(--green);
      color: #fff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .vl-cta:hover { opacity: 0.88; }
    .vl-divider-label {
      text-align: center;
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0.45;
      margin: 0 0 .8rem;
      letter-spacing: 0.04em;
    }
    .vl-footer-note {
      text-align: center;
      font-size: 0.8rem;
      opacity: 0.38;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}
