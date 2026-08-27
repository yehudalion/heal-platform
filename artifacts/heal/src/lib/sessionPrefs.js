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

// ─── Practice-type preference (listening: mixed / one type only) ────────────
// Added 2026-08-26 (Lion): the 14.8 decision that the Learn LESSON stays one
// unified lesson (no split by exercise type - the student doesn't know which
// type they'll get on the real exam) is untouched. This is a different thing:
// letting the student SEE that 2 types exist and CHOOSE to drill just one, if
// they want extra reps on their weaker type. Default stays 'mixed' - the
// exam-like unpredictability - so nothing changes for a student who never
// touches this picker.

const TYPE_KEY = 'hs:sessionPrefsType';

function readAllTypes() {
  try { return JSON.parse(localStorage.getItem(TYPE_KEY) || '{}') || {}; }
  catch { return {}; }
}

/** The learner's chosen practice type for a module, or the module's default. */
export function getSessionType(module, fallback) {
  const v = readAllTypes()[module];
  return typeof v === 'string' && v ? v : fallback;
}

export function setSessionType(module, v) {
  try {
    const all = readAllTypes();
    all[module] = v;
    localStorage.setItem(TYPE_KEY, JSON.stringify(all));
  } catch { /* private mode: the choice just won't persist */ }
}

function ensureTypeStyles() {
  if (document.getElementById('hs-type-css')) return;
  const s = document.createElement('style');
  s.id = 'hs-type-css';
  // Same look as the length picker (.hs-len*) - deliberately identical, just a
  // separate class so the two pickers' wire() calls don't collide on selector.
  s.textContent = `
.hs-typerow { display:flex; gap:8px; margin:0 0 1rem; }
.hs-type {
  flex:1; border:1.5px solid var(--border); background:var(--card);
  border-radius: var(--radius-sm); padding:10px 8px; cursor:pointer;
  font-family:inherit; text-align:center; transition: border-color .15s, background .15s;
}
.hs-type-t { display:block; font-size:.85rem; font-weight:800; }
.hs-type-s { display:block; font-size:.7rem; color:var(--muted); margin-top:2px; }
.hs-type.on { border-color: var(--green-dark); background: var(--green-light); }
.hs-type.on .hs-type-t { color: var(--green-dark); }
`;
  document.head.appendChild(s);
}

/**
 * Render a practice-type picker - same shape/contract as lengthPicker().
 * @param {string} module   pref key, e.g. 'listening'
 * @param {{v:string,label:string,sub:string}[]} options
 * @param {string} fallback default when the learner never chose (e.g. 'mixed')
 * @returns {{html:string, wire:(root:HTMLElement, onChange?:(v:string)=>void)=>void}}
 */
export function typePicker(module, options, fallback) {
  const current = getSessionType(module, fallback);
  const html = `<div class="hs-typerow" data-module="${module}">` + options.map(o => `
    <button type="button" class="hs-type${o.v === current ? ' on' : ''}" data-v="${o.v}">
      <span class="hs-type-t">${o.label}</span>
      <span class="hs-type-s">${o.sub}</span>
    </button>`).join('') + `</div>`;

  function wire(root, onChange) {
    ensureTypeStyles();
    const row = root.querySelector(`.hs-typerow[data-module="${module}"]`);
    if (!row) return;
    row.querySelectorAll('.hs-type').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.v;
        setSessionType(module, v);
        row.querySelectorAll('.hs-type').forEach(b => b.classList.toggle('on', b === btn));
        if (onChange) onChange(v);
      });
    });
  }
  return { html, wire };
}
