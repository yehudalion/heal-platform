import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';

export function renderFork(root) {
  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="fork">
        <div class="fork-eyebrow">המפגש להיום</div>
        <h1 class="fork-title">מה תרצו לעשות?</h1>

        <div class="fork-grid">
          <button class="fork-card" data-go="/card">
            <div class="num">I.</div>
            <div class="label">התחל לעבוד</div>
            <div class="desc">עברו על רשימת מילים, חשפו הגדרות ודרגו את מה שאתם יודעים.</div>
            <div class="arrow">להתחלה &rarr;</div>
          </button>

          <button class="fork-card" data-go="/level">
            <div class="num">II.</div>
            <div class="label">הגדר את הרמה שלי</div>
            <div class="desc">בחרו רמת קושי — בסיסי, בינוני או מתקדם — כדי לכוון את הרשימה.</div>
            <div class="arrow">לבחירה &rarr;</div>
          </button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.fork-card').forEach((b) => {
    b.addEventListener('click', () => navigate(b.dataset.go));
  });
}
