import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';

export function renderFork(root) {
  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="fork">
        <div class="fork-eyebrow">Today's Session</div>
        <h1 class="fork-title">What would you like to do?</h1>

        <div class="fork-grid">
          <button class="fork-card" data-go="/card">
            <div class="num">I.</div>
            <div class="label">Start Working</div>
            <div class="desc">Step through a queue of words, reveal definitions, and rate what you know.</div>
            <div class="arrow">Begin &rarr;</div>
          </button>

          <button class="fork-card" data-go="/level">
            <div class="num">II.</div>
            <div class="label">Set My Level</div>
            <div class="desc">Choose a difficulty band — basic, intermediate, or advanced — to tune your queue.</div>
            <div class="arrow">Choose &rarr;</div>
          </button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.fork-card').forEach((b) => {
    b.addEventListener('click', () => navigate(b.dataset.go));
  });
}
