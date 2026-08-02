import { supabase } from '../supabase.js';
import { ListeningItem } from './item-component.js';

let _currentItem = null;

export async function renderListeningItemTest(root) {
  if (_currentItem) { _currentItem.destroy(); _currentItem = null; }

  root.innerHTML = `
    <div style="direction:rtl;max-width:640px;margin:0 auto;padding:24px 16px">
      <h2 style="margin:0 0 4px;font-size:1.15rem;color:var(--text)">בדיקת פריט האזנה — M3</h2>
      <p style="margin:0 0 20px;font-size:0.82rem;color:var(--muted)">בחר/י פריט מהרשימה</p>
      <div id="item-picker" style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:10px;color:var(--muted);font-size:0.88rem">
          <div class="spinner" style="width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:lic-spin .7s linear infinite;flex-shrink:0"></div>
          טוען רשימת פריטים…
        </div>
      </div>
      <div id="item-mount"></div>
    </div>
  `;

  const pickerEl = root.querySelector('#item-picker');
  const mountEl  = root.querySelector('#item-mount');

  let items = [];
  if (supabase) {
    const { data, error } = await supabase
      .from('listening_items')
      .select('id, topic, item_type, status, accent, difficulty')
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (error) console.warn('[M3] item picker fetch error:', error.message);
    if (!error && data?.length) items = data;
  }

  if (!items.length) {
    pickerEl.innerHTML = `<p style="color:var(--muted);font-size:0.88rem">אין פריטים בבסיס הנתונים.</p>`;
    return;
  }

  pickerEl.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${items.map(it => `
        <button
          data-id="${it.id}"
          style="
            padding:8px 14px;
            border:2px solid var(--border);
            border-radius:var(--radius-sm,12px);
            background:var(--card);
            cursor:pointer;
            font-size:0.85rem;
            color:var(--text);
            -webkit-tap-highlight-color:transparent;
          "
        >
          ${escHtml(it.topic || `פריט ${String(it.id).slice(0, 8)}`)}
          <span style="font-size:0.72rem;color:var(--muted);margin-right:4px">(${it.item_type} · ${it.accent} · ⛰${it.difficulty})</span>
        </button>
      `).join('')}
    </div>
  `;

  pickerEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;

    // Highlight selected button
    pickerEl.querySelectorAll('[data-id]').forEach(b => {
      b.style.borderColor = b === btn ? 'var(--green)' : 'var(--border)';
    });

    // Destroy previous item and load new one
    if (_currentItem) { _currentItem.destroy(); _currentItem = null; }
    _currentItem = new ListeningItem(mountEl, { itemId: btn.dataset.id });
    await _currentItem.load();
  });

  // Auto-load first item
  const firstBtn = pickerEl.querySelector('[data-id]');
  if (firstBtn) firstBtn.click();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
