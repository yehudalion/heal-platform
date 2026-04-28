import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getAllRatings } from '../supabase.js';
import wordsData from '../data/words.json';

export async function renderGap(root) {
  root.innerHTML = `<div class="shell"><div class="spinner">מחשב את הכיסוי שלך…</div></div>`;

  const ratings = await getAllRatings();
  const byWord = new Map(ratings.map((r) => [r.word_id, r.rating]));

  const total = wordsData.length;
  const easy = wordsData.filter((w) => byWord.get(w.id) === 'easy').length;
  const medium = wordsData.filter((w) => byWord.get(w.id) === 'medium').length;
  const hard = wordsData.filter((w) => byWord.get(w.id) === 'hard').length;
  const unseen = total - easy - medium - hard;
  const coverage = total > 0 ? Math.round((easy / total) * 100) : 0;

  const byLevel = (lvl) => {
    const pool = wordsData.filter((w) => w.level === lvl);
    const known = pool.filter((w) => byWord.get(w.id) === 'easy').length;
    return { pool: pool.length, known };
  };
  const basic = byLevel('basic');
  const intermediate = byLevel('intermediate');
  const advanced = byLevel('advanced');

  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="gap">
        <div class="gap-eyebrow">התקדמות &middot; כיסוי אוצר מילים</div>
        <h1 class="gap-title">דו״ח הפערים שלך</h1>
        <p class="gap-sub">מדד לכמות מסט הלימוד שסימנתם כידוע. סגרו את הפער מילה אחר מילה.</p>

        <div class="gap-figure">
          <div class="gap-pct">${coverage}<span style="font-size:48px; color:var(--muted); margin-inline-start:6px;">%</span></div>
          <div class="gap-pct-label">כוסו<br/>מתוך ${total} מילים</div>
        </div>

        <div class="gap-bar">
          <div class="gap-bar-fill" style="width: ${coverage}%;"></div>
        </div>

        <div class="gap-grid">
          <div class="gap-cell">
            <div class="k">קל &mdash; ידוע</div>
            <div class="v">${easy}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">בינוני &mdash; חלקי</div>
            <div class="v">${medium}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">קשה &mdash; חדש</div>
            <div class="v">${hard}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">רמה בסיסית</div>
            <div class="v">${basic.known}<small>/ ${basic.pool}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">רמה בינונית</div>
            <div class="v">${intermediate.known}<small>/ ${intermediate.pool}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">רמה מתקדמת</div>
            <div class="v">${advanced.known}<small>/ ${advanced.pool}</small></div>
          </div>
        </div>

        <div class="upgrade">
          <div class="copy">
            <h3>פתחו את ספריית HEAL המלאה</h3>
            <p>שדרגו לגישה ליותר מ-8,000 מילים אקדמיות נבחרות, תזמון חזרות מרווחות, ודו״חות חולשה מפורטים.</p>
          </div>
          <div class="cta">
            <button class="upgrade-btn" id="upgradeBtn">שדרגו ל-Pro</button>
          </div>
        </div>

        <div class="gap-actions">
          <a href="#/card">המשך ללמוד</a>
          <a href="#/fork">חזרה לתפריט</a>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#upgradeBtn').addEventListener('click', () => {
    alert('תהליך השדרוג יגיע בקרוב.');
  });
}
