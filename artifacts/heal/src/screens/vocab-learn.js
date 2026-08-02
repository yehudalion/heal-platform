import { navigate } from '../router.js';

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
          <p class="vl-subtitle">30 שניות ואתה מוכן להתחיל</p>
        </div>

        <div class="vl-intro">
          <p dir="rtl">מבחן הלאל בנוי במידה רבה על אוצר מילים אקדמי באנגלית. כאן זה המקום ללמוד אותו — לעומק, לא בשינון. נלמד באמצעות כרטיסיות: כל מילה מוצגת לבד, אתה מנסה להיזכר, ואז חושף את ההגדרה. ככה תזכור.</p>
        </div>

        <div class="vl-srs-section">
          <div class="section-label">איך המערכת בוחרת מה להציג</div>
          <p class="vl-srs-text" dir="rtl">המוח שלנו שוכח לפי דפוס ידוע — תוך יום מאבדים כ-60% ממה שלמדנו, ועוד יותר אחרי שבוע. אבל יש דרך לעקוף את זה: כשחוזרים על מילה בדיוק לפני שאנחנו עומדים לשכוח אותה, היא נצרבת עמוק יותר בכל פעם. זה הרעיון של חזרה מרווחת — לא שינון, אלא תזמון חכם.</p>
          <p class="vl-srs-text" dir="rtl">כאן זה עובד ככה: אחרי כל מילה אתה מדרג את עצמך — שוב / קשה / ידעתי. המערכת לומדת מהדירוגים שלך ומחליטה מתי כל מילה תחזור. מילה שלחצת עליה 'שוב' תחזור תוך דקות. 'קשה' — תוך שעות. 'ידעתי' — בעוד יום, ועם כל חזרה מוצלחת המרווח גדל. ככה תרגול של 15 דקות ביום מספיק לאוצר מילים שלם — חוזרים רק על מה שצריך, ולא מבזבזים זמן על מה שכבר יודעים.</p>
        </div>

        <div class="vl-rating-section">
          <p class="vl-rating-title">בסוף כל כרטיסייה תדרג את עצמך:</p>
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
          </div>
        </div>

        <p class="vl-divider-label">ככה זה נראה בפועל:</p>

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
        </div>

        <button class="vl-cta" id="vlStartBtn">בואו נתחיל ✦</button>

        <p class="vl-footer-note">אפשר תמיד לחזור לכאן מתוך התרגול</p>

      </div>
    </div>
  `;

  rootEl.querySelector('#vlStartBtn').addEventListener('click', () => {
    localStorage.setItem('hs_vocab_learn_seen', 'true');
    navigate('/card');
  });
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
      gap: 1.5rem;
    }
    .vl-header { text-align: center; }
    .vl-intro p {
      font-size: 0.95rem;
      line-height: 1.7;
      margin: 0 0 0.25rem;
    }
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
    .vl-rating-section {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .vl-rating-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
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
    .vl-srs-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .vl-srs-text {
      font-size: 0.88rem;
      line-height: 1.7;
      opacity: 0.75;
      background: rgba(37, 99, 235, 0.06);
      border-radius: 8px;
      padding: 0.9rem 1rem;
      margin: 0;
    }
    .vl-cta {
      width: 100%;
      padding: 0.9rem;
      font-size: 1.1rem;
      font-weight: 700;
      background: var(--accent, #2563eb);
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
      margin: 0;
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
