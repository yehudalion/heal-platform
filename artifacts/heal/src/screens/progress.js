import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getProgressStats } from '../supabase.js';

export async function renderProgress(root) {
  await renderLayout(root, '/progress');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const stats    = await getProgressStats();
  const acquired = stats?.acquired   || 0;
  const streak   = stats?.streak     || 0;
  const target   = stats?.targetScore|| 130;

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">ההתקדמות שלי</div>
      <div class="page-sub">כל השיפור שעשית מאז שהתחלת — ממוחש ויזואלית.</div>

      <!-- Highlight row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:1.4rem">
        <div class="stat-card" style="border-top:3px solid var(--green)">
          <div class="stat-lbl">ימים ברצף</div>
          <div class="stat-val">${streak} 🔥</div>
          <div class="stat-sub">שיא: 14 ימים</div>
        </div>
        <div class="stat-card" style="border-top:3px solid var(--yellow)">
          <div class="stat-lbl">מילים נרכשו</div>
          <div class="stat-val">${acquired}</div>
          <div class="stat-sub">מתוך 550</div>
        </div>
        <div class="stat-card" style="border-top:3px solid var(--purple)">
          <div class="stat-lbl">דיוק Restatement</div>
          <div class="stat-val">68%</div>
          <div class="stat-sub">יעד: 80%+</div>
        </div>
      </div>

      <!-- Before / Now -->
      <div class="sec-title">אז מול עכשיו</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1.4rem">
        <div class="prog-card">
          <div class="stat-lbl" style="margin-bottom:.5rem">🃏 כרטיסיות — דיוק</div>
          <div class="prog-bars">
            <div class="prog-bar-col">
              <div class="prog-bar-wrap"><div class="prog-bar-inner then" style="height:30px"></div></div>
              <div style="font-size:.82rem;font-weight:800">30%</div>
              <div style="font-size:.7rem;color:var(--muted)">שבוע 1</div>
            </div>
            <div style="font-size:1.2rem;color:var(--muted);padding-bottom:24px">→</div>
            <div class="prog-bar-col">
              <div class="prog-bar-wrap"><div class="prog-bar-inner now" style="height:70px"></div></div>
              <div style="font-size:.82rem;font-weight:800;color:var(--green-dark)">70%</div>
              <div style="font-size:.7rem;color:var(--muted)">היום</div>
            </div>
          </div>
          <div class="prog-delta">📈 +40% מאז שהתחלת</div>
        </div>
        <div class="prog-card">
          <div class="stat-lbl" style="margin-bottom:.5rem">🔄 Restatement — דיוק</div>
          <div class="prog-bars">
            <div class="prog-bar-col">
              <div class="prog-bar-wrap"><div class="prog-bar-inner then" style="height:14px"></div></div>
              <div style="font-size:.82rem;font-weight:800">20%</div>
              <div style="font-size:.7rem;color:var(--muted)">שבוע 1</div>
            </div>
            <div style="font-size:1.2rem;color:var(--muted);padding-bottom:24px">→</div>
            <div class="prog-bar-col">
              <div class="prog-bar-wrap"><div class="prog-bar-inner now" style="height:55px"></div></div>
              <div style="font-size:.82rem;font-weight:800;color:var(--green-dark)">68%</div>
              <div style="font-size:.7rem;color:var(--muted)">היום</div>
            </div>
          </div>
          <div class="prog-delta">📈 +48% מאז שהתחלת</div>
        </div>
      </div>

      <!-- Social proof -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.3rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:12px">
        <div style="font-size:1.5rem">👥</div>
        <div style="font-size:.82rem;color:var(--muted)"><strong style="color:var(--text)">342 תלמידים</strong> כמוך עברו לפטור בשנה האחרונה — בממוצע 11 שבועות של לימוד עקבי.</div>
      </div>

      <!-- Upsell -->
      <div class="upsell-banner">
        <h3>⚡ אתה כבר במסלול הנכון — עכשיו תאיץ</h3>
        <p>בקצב הנוכחי שלך אתה על המסלול לפטור. עם מסלול הכסף תקבל את כל הכלים שמכפילים את הקצב:</p>
        <div class="upsell-feats">
          <div class="upsell-feat">✓ שאלות בחינה אמיתיות מכל השנים</div>
          <div class="upsell-feat">✓ ניתוח AI של שגיאות</div>
          <div class="upsell-feat">✓ תוכנית לימודים אישית</div>
          <div class="upsell-feat">✓ מסלולי Sprint / Marathon / Rescue</div>
        </div>
        <button class="btn-upsell">🚀 שדרג עכשיו — ספרינט ב-₪99</button>
      </div>
    </div>`;
}

export async function renderGap(root) {
  await renderLayout(root, '/gap');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const stats    = await getProgressStats();
  const acquired = stats?.acquired   || 0;
  const target   = stats?.targetScore|| 130;
  const examDate = stats?.examDate;
  const daysLeft = examDate ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000)) : 86;

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">דו"ח פערים</div>
      <div class="page-sub">מה עוד חסר לך כדי להגיע לציון ${target} ולקבל פטור.</div>

      <!-- Target banner -->
      <div style="background:linear-gradient(135deg,var(--blue),#1f6fcf);border-radius:var(--radius);padding:1.4rem 1.7rem;color:white;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
        <div>
          <h2 style="font-size:1.1rem;font-weight:900;margin-bottom:4px">ציון יעד: ${target} — פטור</h2>
          <p style="font-size:.82rem;opacity:.85;line-height:1.45">לפי הביצועים שלך, נדרש שיפור ממוקד ב-3 תחומים כדי לסגור את הפער.</p>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.18);border-radius:var(--radius-sm);padding:.8rem 1.2rem;flex-shrink:0">
          <div style="font-size:2.2rem;font-weight:900;line-height:1">~25</div>
          <div style="font-size:.7rem;opacity:.8">נקודות לסגירה</div>
        </div>
      </div>

      <div class="sec-title">פירוט פערים לפי מודול</div>

      ${gapRow('🃏', 'Vocabulary — כרטיסיות Tier A', acquired, 277, 'var(--green)', 'עוד ' + (277 - acquired) + ' מילים', 'var(--red)')}
      ${gapRow('🔄', 'Restatement — ניסוח מחדש', 68, 100, 'var(--orange)', 'עוד 12%', 'var(--orange)')}
      ${gapRow('✍️', 'השלמת משפטים', 0, 100, 'var(--border)', 'טרם התחלת', 'var(--red)')}
      ${gapRow('📖', 'קריאה', 0, 100, 'var(--border)', 'טרם התחלת', 'var(--red)')}

      <!-- Locked upsell -->
      <div class="lock-upsell">
        <div style="font-size:1.8rem;margin-bottom:.5rem">🔒</div>
        <h4 style="font-size:.95rem;font-weight:900;margin-bottom:.4rem">ניתוח מלא נעול — דרוש מסלול כסף</h4>
        <p style="font-size:.82rem;color:var(--muted);line-height:1.5;margin-bottom:.9rem">תוכנית אישית מדויקת — אילו מילים ללמוד, אילו שאלות לתרגל, מה לעשות כל יום.</p>
        <button class="btn-primary" style="background:var(--blue)">🎯 קבל תוכנית אישית ← ₪99 לספרינט</button>
      </div>

      <!-- Urgency -->
      <div style="background:var(--red-light);border:1.5px solid var(--red);border-radius:var(--radius-sm);padding:.9rem 1.1rem;margin-top:1rem;font-size:.83rem;color:var(--red);display:flex;align-items:center;gap:9px">
        <span style="font-size:1.1rem">⏰</span>
        <span><strong>${daysLeft} ימים נותרו.</strong> כדי לסגור את הפער, צריך להתקדם בממוצע 2 מילים + 3 שאלות Restatement ביום.</span>
      </div>
    </div>`;
}

function gapRow(icon, name, val, total, color, needed, neededColor) {
  const pct = Math.min(100, Math.round(val / total * 100));
  return `
    <div class="gap-module-row">
      <div style="font-size:1.2rem;flex-shrink:0">${icon}</div>
      <div style="flex:1">
        <div style="font-size:.87rem;font-weight:800;margin-bottom:3px">${name}</div>
        <div class="gap-module-bar">
          <div class="gap-module-fill" style="background:${color};width:${pct}%"></div>
        </div>
        <div style="font-size:.7rem;color:var(--muted);margin-top:3px">${pct}% הושלם</div>
      </div>
      <div style="font-size:.75rem;font-weight:700;color:${neededColor};min-width:80px;text-align:center;flex-shrink:0">${needed}</div>
    </div>`;
}
