import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getLevel, setLevel } from '../supabase.js';

const LEVELS = [
  { id: 'basic', name: 'בסיסי', meta: 'מילים בתדירות גבוהה. בניית בסיס איתן.' },
  { id: 'intermediate', name: 'בינוני', meta: 'אוצר מילים אקדמי יומיומי בכל התחומים.' },
  { id: 'advanced', name: 'מתקדם', meta: 'מונחים מדויקים ופחות נפוצים — ברמת תואר שני ומחקר.' },
];

export function renderLevel(root) {
  const current = getLevel();

  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="level-screen">
        <div class="fork-eyebrow">רמת קושי</div>
        <h1 class="fork-title" style="margin-bottom:0;">הגדר את הרמה שלי</h1>
        <p style="color:var(--muted); font-size:14px; margin-top:12px; max-width:520px;">
          בחרו את הרמה שממנה תרצו ללמוד. תוכלו לשנות זאת בכל עת.
        </p>

        <div class="level-list">
          ${LEVELS.map(
            (l) => `
            <button class="level-item ${l.id === current ? 'active' : ''}" data-id="${l.id}">
              <div>
                <div class="name">${l.name}</div>
                <div class="meta">${l.meta}</div>
              </div>
              <div class="badge">${l.id === current ? 'נוכחי' : 'בחר'}</div>
            </button>
          `
          ).join('')}
        </div>

        <div style="margin-top:36px; display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" style="width:auto; padding:14px 28px;" id="continueBtn">המשך ללימוד</button>
          <button class="btn-ghost btn" style="width:auto; padding:14px 22px;" id="backBtn">חזרה</button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.level-item').forEach((el) => {
    el.addEventListener('click', () => {
      setLevel(el.dataset.id);
      root.querySelectorAll('.level-item').forEach((x) => {
        x.classList.toggle('active', x === el);
        x.querySelector('.badge').textContent = x === el ? 'נוכחי' : 'בחר';
      });
    });
  });

  root.querySelector('#continueBtn').addEventListener('click', () => navigate('/card'));
  root.querySelector('#backBtn').addEventListener('click', () => navigate('/fork'));
}
