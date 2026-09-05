/**
 * src/screens/affix-analyze.js — שכבת הניתוח של פינת התחיליות והסופיות.
 *
 * תיאורי, לא אבחנתי (SITEMAP §2): מה קרה בפועל, על הציר היחיד שהפינה מלמדת —
 * משפחת התחילית/הסופית. בלי ציון, בלי תווית על התלמיד, ובלי מספרי רמה.
 * כל משפחה חלשה מקושרת ישירות לסעיף שלה במדריך, כדי שהניתוח יהיה צעד ולא דוח.
 */

import { renderLayout, getPageContent } from '../layout.js';
import { getCurrentSession } from '../supabase.js';
import { fetchAffixSummary } from '../data/affix.data.js';
import { familyInfo } from '../lib/affixKeys.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function renderAffixAnalyze(root) {
  await renderLayout(root, '/affix');
  const el = getPageContent();
  ensureStyles();

  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  const { data } = await fetchAffixSummary(userId, { limit: 300 });

  if (!data || !data.total) {
    el.innerHTML = wrap(`
      <section class="aa-card aa-center">
        עוד לא תרגלת בפינה הזו.<br>
        <span class="aa-sub">הניתוח נבנה מהתשובות עצמן, ולכן הוא ייפתח אחרי המנה הראשונה.</span>
        <div style="margin-top:1rem"><a class="btn-primary" href="#/affix-practice">להתחיל לתרגל ←</a></div>
      </section>`);
    return;
  }

  const acc = Math.round((data.correct / data.total) * 100);
  const rows = data.families.map((f) => {
    const info = familyInfo(f.code);
    return `
      <div class="aa-row">
        <div class="aa-row-top">
          <a class="aa-fam" href="#/affix-learn#al-block-${esc(f.code)}">${esc(info.label)}</a>
          <span class="aa-num">${f.correct}/${f.total}</span>
        </div>
        <a class="aa-drill" href="#/affix-practice?key=${encodeURIComponent(f.code)}">לתרגל ${esc(info.label)} ←</a>
        <div class="aa-bar"><i style="width:${Math.max(3, f.accuracy)}%"></i></div>
      </div>`;
  }).join('');

  const weakest = data.families[0];
  const insight = (weakest && weakest.total >= 3 && weakest.accuracy < 70)
    ? `<div class="aa-insight">המשפחה שהכי כדאי לחזור עליה עכשיו היא
       <b>${esc(familyInfo(weakest.code).label)}</b> —
       <a href="#/affix-practice?key=${encodeURIComponent(weakest.code)}">מנה ממוקדת ←</a> ·
       <a href="#/affix-learn#al-block-${esc(weakest.code)}">ההסבר במדריך</a></div>`
    : `<div class="aa-insight">אין עדיין משפחה שבולטת לרעה. עוד כמה מנות ויהיה אפשר לומר משהו מדויק.</div>`;

  el.innerHTML = wrap(`
    <section class="aa-card">
      <div class="aa-top">
        <div><div class="aa-big">${data.total}</div><div class="aa-lbl">שאלות שתרגלת</div></div>
        <div><div class="aa-big">${acc}%</div><div class="aa-lbl">דיוק כולל</div></div>
      </div>
    </section>

    <div class="sec-title" style="margin-top:1.3rem">לפי משפחה</div>
    <section class="aa-card">${rows}</section>
    ${insight}
    <div style="margin-top:1.2rem"><a class="btn-primary" href="#/affix-practice" style="display:block;text-align:center">מנה נוספת ←</a></div>
  `);
}

function wrap(inner) {
  return `<div class="fade-in" style="max-width:620px">
    <div class="page-title">תחיליות וסופיות — ניתוח</div>
    <div class="page-sub">מה עבד, ואיפה כדאי לחזור למדריך</div>
    ${inner}
  </div>`;
}

function ensureStyles() {
  if (document.getElementById('affix-analyze-styles')) return;
  const s = document.createElement('style');
  s.id = 'affix-analyze-styles';
  s.textContent = `
.aa-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem}
.aa-center{text-align:center;line-height:1.9}
.aa-sub{color:var(--muted);font-size:.88rem}
.aa-top{display:flex;gap:1.5rem;justify-content:center;text-align:center}
.aa-big{font-size:2rem;font-weight:800;color:var(--green-dark,#16412F)}
.aa-lbl{font-size:.78rem;color:var(--muted)}
.aa-row{margin-bottom:.85rem}
.aa-row:last-child{margin-bottom:0}
.aa-row-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.3rem}
.aa-fam{font-weight:700;font-size:.9rem;color:var(--green-dark,#16412F);text-decoration:none}
.aa-fam:hover{text-decoration:underline}
.aa-drill{display:inline-block;margin-top:.25rem;font-size:.78rem;font-weight:800;color:var(--gold,#B08442);text-decoration:none}
.aa-drill:hover{text-decoration:underline}
.aa-num{font-size:.8rem;color:var(--muted);font-variant-numeric:tabular-nums}
.aa-bar{height:7px;background:var(--green-light,#e8f0ea);border-radius:99px;overflow:hidden}
.aa-bar i{display:block;height:100%;background:var(--green,#1F5C43)}
.aa-insight{margin-top:1rem;padding:.85rem 1rem;background:var(--green-light,#e8f0ea);
  border-radius:var(--radius-sm,10px);font-size:.9rem;line-height:1.7}
.aa-insight a{color:var(--green-dark,#16412F);font-weight:700}
`;
  document.head.appendChild(s);
}
