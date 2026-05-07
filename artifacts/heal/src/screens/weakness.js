import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

const WD_DATA = [
  { name: 'Logical Reversal',  pct: 42, seen: 18, cls: 'wb-weak' },
  { name: 'Scope Distortion',  pct: 51, seen: 14, cls: 'wb-weak' },
  { name: 'Extreme Wording',   pct: 63, seen: 22, cls: 'wb-mid'  },
  { name: 'Added Detail',      pct: 69, seen: 19, cls: 'wb-mid'  },
  { name: 'Synonym Confusion', pct: 74, seen: 12, cls: 'wb-mid'  },
  { name: 'Wrong Inference',   pct: 83, seen: 15, cls: 'wb-good' },
];

export async function renderWeakness(root) {
  await renderLayout(root, '/weakness');
  const el = getPageContent();
  const w0  = WD_DATA[0];
  const total = WD_DATA.reduce((s, w) => s + w.seen, 0);
  const weak  = WD_DATA.filter(w => w.pct < 65).length;

  const bars = WD_DATA.map(w => `
    <div class="wb-item ${w.cls}">
      <div class="wb-top">
        <span class="wb-name">${w.name}</span>
        <span class="wb-pct">${w.pct}% נכון (${w.seen} שאלות)</span>
      </div>
      <div class="wb-bar">
        <div class="wb-fill" style="width:0%" data-pct="${w.pct}"></div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.1rem">
        <button class="btn-exit" id="btn-back">← חזרה</button>
        <div class="page-title" style="margin-bottom:0">Weakness Dashboard</div>
      </div>
      <div class="page-sub">ניתוח ביצועים מבוסס על ${total} השאלות האחרונות שלך.</div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem">
        <div class="wd-score">
          <div class="wd-score-n">68%</div>
          <div class="wd-score-l">דיוק כולל</div>
        </div>
        <div>
          <h3 style="font-size:.97rem;font-weight:900;margin-bottom:3px">ניתוח ${total} שאלות</h3>
          <p style="font-size:.79rem;color:var(--muted)">זוהו ${weak} קטגוריות שדורשות תשומת לב.</p>
        </div>
      </div>

      <div class="focus-card">
        <div style="font-size:.82rem;line-height:1.5;flex:1">
          🎯 אתה נופל הרבה על <strong style="color:var(--orange)">${w0.name}</strong> — רק ${w0.pct}% נכון.
        </div>
        <button class="btn-primary" id="btn-practice" style="flex-shrink:0">תרגל עכשיו</button>
      </div>

      <div class="sec-title" style="margin-top:0">פירוט קטגוריות</div>
      ${bars}
    </div>`;

  el.querySelector('#btn-back').addEventListener('click', () => navigate('/rephrasing'));
  el.querySelector('#btn-practice').addEventListener('click', () => navigate('/trap-trainer'));

  setTimeout(() => {
    el.querySelectorAll('.wb-fill').forEach(f => { f.style.width = f.dataset.pct + '%'; });
  }, 100);
}
