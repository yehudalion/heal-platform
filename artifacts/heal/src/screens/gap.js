import { renderTopbar } from '../topbar.js';
import { navigate } from '../router.js';
import { getAllRatings } from '../supabase.js';
import wordsData from '../data/words.json';

export async function renderGap(root) {
  root.innerHTML = `<div class="shell"><div class="spinner">Computing your coverage…</div></div>`;

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
        <div class="gap-eyebrow">Progress &middot; Vocabulary Coverage</div>
        <h1 class="gap-title">Your Gap Report</h1>
        <p class="gap-sub">A measure of how much of your study set you've marked as known. Close the gap word by word.</p>

        <div class="gap-figure">
          <div class="gap-pct">${coverage}<span style="font-size:48px; color:var(--muted); margin-left:6px;">%</span></div>
          <div class="gap-pct-label">covered<br/>of ${total} words</div>
        </div>

        <div class="gap-bar">
          <div class="gap-bar-fill" style="width: ${coverage}%;"></div>
        </div>

        <div class="gap-grid">
          <div class="gap-cell">
            <div class="k">Easy &mdash; known</div>
            <div class="v">${easy}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">Medium &mdash; partial</div>
            <div class="v">${medium}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">Hard &mdash; new</div>
            <div class="v">${hard}<small>/ ${total}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">Basic band</div>
            <div class="v">${basic.known}<small>/ ${basic.pool}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">Intermediate</div>
            <div class="v">${intermediate.known}<small>/ ${intermediate.pool}</small></div>
          </div>
          <div class="gap-cell">
            <div class="k">Advanced</div>
            <div class="v">${advanced.known}<small>/ ${advanced.pool}</small></div>
          </div>
        </div>

        <div class="upgrade">
          <div class="copy">
            <h3>Unlock the full HEAL library</h3>
            <p>Upgrade to access 8,000+ curated academic words, spaced-repetition scheduling, and detailed weakness reports.</p>
          </div>
          <div class="cta">
            <button class="upgrade-btn" id="upgradeBtn">Upgrade to Pro</button>
          </div>
        </div>

        <div class="gap-actions">
          <a href="#/card">Continue studying</a>
          <a href="#/fork">Back to menu</a>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#upgradeBtn').addEventListener('click', () => {
    alert('Upgrade flow coming soon.');
  });
}
