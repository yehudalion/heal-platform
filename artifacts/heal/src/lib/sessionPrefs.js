/**
 * src/lib/sessionPrefs.js — the student's session choices, remembered.
 *
 * Built 2026-08-25 for Lion's requirement: clicking a module must not dump the
 * learner straight into questions with a count the code chose for them. Every
 * live module's gate now shows a length picker; the practice screens read the
 * choice from here instead of hard-coding it.
 *
 * localStorage-backed so the choice survives reloads and becomes the learner's
 * default — choose once, keep practising. Guests included. Never throws:
 * a private-mode browser just falls back to the module's default.
 *
 * This is a UI/preference helper (like lib/keys.js) — it touches no data layer
 * and no Supabase, so screens may import it freely.
 */

const KEY = 'hs:sessionPrefs';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
}

/** The learner's chosen session length for a module, or the module's default. */
export function getSessionLength(module, fallback) {
  const v = readAll()[module];
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function setSessionLength(module, n) {
  try {
    const all = readAll();
    all[module] = n;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode: the choice just won't persist */ }
}

// ─── The picker widget ───────────────────────────────────────────────────────

let stylesDone = false;
function ensureStyles() {
  if (stylesDone || document.getElementById('hs-len-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-len-css';
  s.textContent = `
.hs-lenrow { display:flex; gap:8px; margin:0 0 1rem; }
.hs-len {
  flex:1; border:1.5px solid var(--border); background:var(--card);
  border-radius: var(--radius-sm); padding:10px 8px; cursor:pointer;
  font-family:inherit; text-align:center; transition: border-color .15s, background .15s;
}
.hs-len-t { display:block; font-size:.85rem; font-weight:800; }
.hs-len-s { display:block; font-size:.7rem; color:var(--muted); margin-top:2px; }
.hs-len.on { border-color: var(--green-dark); background: var(--green-light); }
.hs-len.on .hs-len-t { color: var(--green-dark); }
`;
  document.head.appendChild(s);
  stylesDone = true;
}

/**
 * Render a session-length picker.
 * @param {string} module   pref key, e.g. 'vocab' | 'rephrase' | 'listening'
 * @param {{v:number,label:string,sub:string}[]} options
 * @param {number} fallback  default when the learner never chose
 * @returns {{html:string, wire:(root:HTMLElement, onChange?:(n:number)=>void)=>void}}
 */
export function lengthPicker(module, options, fallback) {
  const current = getSessionLength(module, fallback);
  const html = `<div class="hs-lenrow" data-module="${module}">` + options.map(o => `
    <button type="button" class="hs-len${o.v === current ? ' on' : ''}" data-v="${o.v}">
      <span class="hs-len-t">${o.label}</span>
      <span class="hs-len-s">${o.sub}</span>
    </button>`).join('') + `</div>`;

  function wire(root, onChange) {
    ensureStyles();
    const row = root.querySelector(`.hs-lenrow[data-module="${module}"]`);
    if (!row) return;
    row.querySelectorAll('.hs-len').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = Number(btn.dataset.v);
        setSessionLength(module, n);
        row.querySelectorAll('.hs-len').forEach(b => b.classList.toggle('on', b === btn));
        if (onChange) onChange(n);
      });
    });
  }
  return { html, wire };
}
