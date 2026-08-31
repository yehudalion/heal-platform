/**
 * Listening — Learn layer (שכבת הלמידה)
 *
 * REWRITTEN 2026-08-14 per SITEMAP §3 ("למידה | לקח אחד: לאן הקטע הולך ומתי
 * הוא משנה כיוון | listening/readiness.js | חלקי — דורש שכתוב").
 * The old content of this file was an M6 readiness-score computation that
 * queried tables that do not exist (listening_responses / listening_items /
 * listening_user_state) — it could never run, and the readiness-score feature
 * has no owner in the map. Removed entirely.
 *
 * The lesson is ONE lesson (Lion, 2026-08-14: teaching passage types
 * complicates — the student doesn't know which passage he'll get):
 * a passage goes somewhere, and connective words signal when it changes
 * direction. This is also where the highlighted-connective feature lives
 * (Lion: "שיהיה מודגש בו מילת הקישור הרלוונטית… אולי לרן").
 *
 * RESTRUCTURED 2026-08-31 (Lion): collapsed into an accordion under three
 * headers he asked for by name — "מה הפינה בכלל" / "דברים טכניים על הפינה" /
 * "איך לומדים" — same interaction pattern as rephrase-learn.js's blocks
 * (data-block-toggle / .open / aria-expanded). No new pedagogical claims were
 * added; every sentence below already existed in the pre-restructure version,
 * just regrouped under the three headers. If this pattern reads well, the
 * same treatment is a candidate for sc-learn.js / vocab-learn.js — see
 * BACKLOG_next.md.
 *
 * Static content — no DB reads. UI Hebrew/RTL, examples English.
 */
import { navigate } from '../router.js';
import './dashboard.css';

const SECTIONS = [
  {
    id: 'what',
    title: 'מה הפינה בכלל',
    open: true, // first section starts open — orientation before mechanics
    body: `
      <p style="margin:0;line-height:1.7;">
        כל קטע במבחן <strong>הולך לאנשהו</strong> — הוא מציג רעיון, ולפעמים
        משנה כיוון באמצע. מי ששומע <strong>לאן הקטע הולך</strong> עונה נכון גם
        כשלא הבין כל מילה. מי שנאחז במילים בודדות — נופל בדיוק במקום שבו
        הקטע שינה כיוון.
      </p>`,
  },
  {
    id: 'how',
    title: 'איך לומדים',
    body: `
      <p style="margin:0 0 10px;line-height:1.7;">
        מילים כמו אלה הן רמזור. כששומעים אותן — הקטע מודיע מה יקרה עכשיו:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:.92rem;">
        <div><span dir="ltr" style="font-weight:700;color:var(--green, #1F5C43);">however · but · even so</span> — שינוי כיוון: מה שנאמר עד עכשיו מקבל "אבל"</div>
        <div><span dir="ltr" style="font-weight:700;color:var(--green, #1F5C43);">therefore · as a result</span> — מסקנה: עכשיו יגיע "ולכן…"</div>
        <div><span dir="ltr" style="font-weight:700;color:var(--green, #1F5C43);">for example · for one thing</span> — פירוט: דוגמה לרעיון שכבר נאמר</div>
        <div><span dir="ltr" style="font-weight:700;color:var(--green, #1F5C43);">in other words</span> — ניסוח מחדש: אותו רעיון במילים אחרות</div>
      </div>
      <p class="la-sub-title">דוגמה — שימו לב למילה המודגשת</p>
      <p dir="ltr" style="margin:0 0 12px;text-align:left;line-height:1.8;font-size:.95rem;background:var(--bg, #F5F1E8);border-radius:10px;padding:12px 14px;">
        Ancient Roman soldiers were paid an allowance to buy salt, called a
        "salarium."
        <mark style="background:#FFE9A8;border-radius:4px;padding:0 4px;font-weight:700;">Over time, however,</mark>
        the word came to refer to payment in general, not just for salt.
      </p>
      <p style="margin:0;line-height:1.7;">
        עד המילה המודגשת הקטע דיבר על <strong>מלח</strong>. המילה
        <span dir="ltr" style="font-weight:700;">however</span> מודיעה: הכיוון משתנה —
        ומכאן הקטע כבר מדבר על <strong>משכורת באופן כללי</strong>.
        שאלה שתגיע על הקטע הזה תיבדק בדיוק כאן: האם שמעת את שינוי הכיוון,
        או נשארת אצל המלח.
      </p>`,
  },
  {
    id: 'technical',
    title: 'דברים טכניים על הפינה',
    body: `
      <p style="margin:0;line-height:1.7;">
        אפשר להשמיע כל קטע <strong>שוב מההתחלה</strong> (אבל לא להתקדם/לחזור בתוכו), בדיוק כמו במבחן. אחריו שאלה (או שתיים)
        עם 4 תשובות. אחרי כל תשובה תקבל הסבר מלא — כולל ציטוט מילת הכיוון
        מהקטע, כדי שתדע <strong>איך יכולת לדעת</strong>.
      </p>`,
  },
];

export function renderListeningLearn(root) {
  ensureStyles();
  root.className = 'ldash-wrap';
  root.innerHTML = `
    <div class="ldash-body" style="gap:20px;">

      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn-ldash-link" id="btn-back" style="padding:6px 12px;">→ חזרה</button>
        <h1 class="ldash-title" style="margin:0;">איך מקשיבים נכון 🎧</h1>
      </div>

      ${SECTIONS.map(section).join('')}

      <div class="ldash-main" style="align-items:center;">
        <button class="btn-ldash-primary" id="btn-practice" style="max-width:280px;">
          לתרגול ←
        </button>
      </div>

    </div>`;

  root.querySelectorAll('[data-la-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.la-block');
      const open = sec.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  root.querySelector('#btn-back').addEventListener('click', () => navigate('/listening'));
  root.querySelector('#btn-practice').addEventListener('click', () => navigate('/listening/session'));
}

function section(s) {
  return `<section class="la-card la-block${s.open ? ' open' : ''}" id="la-block-${s.id}">
    <button type="button" class="la-block-head" data-la-toggle aria-expanded="${s.open ? 'true' : 'false'}">
      <h2 class="la-h2">${s.title}</h2>
      <span class="la-chev">▾</span>
    </button>
    <div class="la-block-body">${s.body}</div>
  </section>`;
}

// ─── Scoped styles (injected once; dashboard.css untouched) ─────────────────
function ensureStyles() {
  if (document.getElementById('la-learn-css')) return;
  const s = document.createElement('style');
  s.id = 'la-learn-css';
  s.textContent = LA_CSS;
  document.head.appendChild(s);
}

const LA_CSS = `
.la-card{background:var(--card, #FFFDF7);border:1px solid var(--border, #E3DDCC);border-radius:var(--radius, 8px);padding:1.2rem 1.3rem;text-align:right}
.la-block-head{display:flex;gap:.8rem;align-items:center;width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;text-align:right;font:inherit;color:inherit}
.la-h2{flex:1;font-size:1.05rem;font-weight:800;line-height:1.4;margin:0}
.la-chev{flex:0 0 auto;font-size:.8rem;color:var(--muted, #5C6B60);transition:transform .2s ease}
.la-block.open .la-chev{transform:rotate(180deg)}
.la-block-body{display:none;margin-top:1rem}
.la-block.open .la-block-body{display:block}
.la-sub-title{font-weight:800;font-size:.95rem;margin:1rem 0 .6rem}
`;
