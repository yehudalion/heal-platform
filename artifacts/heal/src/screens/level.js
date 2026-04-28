import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getLevel, setLevel } from '../supabase.js';

const LEVELS = [
  { id: 'basic', name: 'Basic', meta: 'High-frequency words. Build a confident foundation.' },
  { id: 'intermediate', name: 'Intermediate', meta: 'Everyday academic vocabulary used across disciplines.' },
  { id: 'advanced', name: 'Advanced', meta: 'Less common, precise terms — graduate and research level.' },
];

export function renderLevel(root) {
  const current = getLevel();

  root.innerHTML = `
    <div class="shell fade-in">
      ${renderTopbar()}
      <div class="level-screen">
        <div class="fork-eyebrow">Difficulty</div>
        <h1 class="fork-title" style="margin-bottom:0;">Set my level</h1>
        <p style="color:var(--muted); font-size:14px; margin-top:12px; max-width:520px;">
          Pick the band you want to study from. You can change this any time.
        </p>

        <div class="level-list">
          ${LEVELS.map(
            (l) => `
            <button class="level-item ${l.id === current ? 'active' : ''}" data-id="${l.id}">
              <div>
                <div class="name">${l.name}</div>
                <div class="meta">${l.meta}</div>
              </div>
              <div class="badge">${l.id === current ? 'Current' : 'Select'}</div>
            </button>
          `
          ).join('')}
        </div>

        <div style="margin-top:36px; display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" style="width:auto; padding:14px 28px;" id="continueBtn">Continue to Study</button>
          <button class="btn-ghost btn" style="width:auto; padding:14px 22px;" id="backBtn">Back</button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.level-item').forEach((el) => {
    el.addEventListener('click', () => {
      setLevel(el.dataset.id);
      root.querySelectorAll('.level-item').forEach((x) => {
        x.classList.toggle('active', x === el);
        x.querySelector('.badge').textContent = x === el ? 'Current' : 'Select';
      });
    });
  });

  root.querySelector('#continueBtn').addEventListener('click', () => navigate('/card'));
  root.querySelector('#backBtn').addEventListener('click', () => navigate('/fork'));
}
