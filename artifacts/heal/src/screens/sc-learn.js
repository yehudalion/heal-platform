/**
 * src/screens/sc-learn.js — Sentence Completion, Learn layer.
 *
 * Two screens, then straight into sc-practice.js. Same shell pattern as
 * rephrase-learn.js: shown once (localStorage flag), reachable any time from
 * the practice top bar and from a "learn more" link in Analyze.
 *
 * HARD rules honoured:
 *  - Static content only — no DB, no Supabase.
 *  - Hebrew RTL UI; English study content stays English inside dir="ltr".
 *  - "מפתחות"/"למה לשים לב", never "traps" (CLAUDE.md #8).
 *  - Wellbeing: worked examples are specimens to inspect, not failures.
 *
 * ONE block per label from scKeys.js, titles copied verbatim — if a label is
 * ever reworded in scKeys.js, this file must change in the same commit
 * (SITEMAP §2: the same word in all three layers).
 *
 * Every worked example below is a REAL item from the 800-item bank (verified
 * against sentence_completion_questions, source_item_id noted per example) —
 * no invented sentences, same discipline rephrase-learn.js follows.
 */

import { navigate, subAnchor } from '../router.js';
import { CATEGORIES } from '../lib/scKeys.js';

export const LEARN_SEEN_KEY = 'hs_sc_learn_seen';

// Block id === scKeys.js label id, so a future "ללמוד עוד" deep link can hand
// a resolveKey() result straight to `sl-block-${key.id}` — same contract as
// rephrase-learn.js's LEARN_BLOCKS / CATEGORY_TO_BLOCK.
export const LEARN_BLOCKS = CATEGORIES.map((c) => ({ id: c.id, title: c.label }));

// ─── Screen 1 ────────────────────────────────────────────────────────────────
const INTRO_BODY = 'משפט אחד באנגלית עם מקום ריק, וארבע אפשרויות למלא אותו. רק אחת נכונה.';

// שוכתב 1.9.2026 לבקשת ליאון. הנוסח הקודם טען "זו לא שאלת אוצר מילים —
// לרוב אתם מכירים את כל ארבע האופציות", וזה פשוט לא נכון: תלמיד לרוב לא
// מכיר את כל ארבע המילים, וזו כן שאלת אוצר מילים. גם "אל תבחרו את המילה
// ה'יפה' ביותר" הוסר — אף אחד לא בוחר לפי יופי, וזו עצה שלא עוזרת לאיש.
const INTRO_FACTS = [
  { k: 'אוצר מילים הוא הבסיס',
    v: 'כדי לפסול אפשרות צריך לדעת מה היא אומרת. ככל שתכירו יותר מילים, יותר שאלות ייפתחו לכם.' },
  { k: 'אבל לא חייבים להכיר את כולן',
    v: 'גם כשמילה או שתיים לא מוכרות, המשפט עצמו מצמצם את מה שיכול להתאים — ולפעמים זה מספיק.' },
  { k: 'המשפט הוא שקובע',
    v: 'התשובה אינה המילה שהכי מתאימה לנושא, אלא זו שהמשפט הזה מחייב.' },
];

// ההדגמה: לא "מה נכון" אלא איך חושבים. במכוון עם מילים קלות — הרעיון הוא
// שהתלמיד יראה את מבנה החשיבה, לא שייתקע על אוצר המילים של הדוגמה עצמה.
const INTRO_DEMO = {
  stem: 'The library was completely ___ during exam week, so students had to wait outside for a seat.',
  hl: 'wait outside for a seat',
  options: ['crowded', 'empty', 'quiet', 'closed'],
  correct: 0,
  looking: 'מילה שמסבירה <strong>למה</strong> סטודנטים נאלצו לחכות בחוץ כדי לקבל מקום.',
  therefore: 'אם חיכו בחוץ למקום — הגיוני שבפנים כבר <strong>לא היה מקום</strong>. כלומר הספרייה הייתה מלאה.',
  rejects: [
    ['empty',  'ריקה — אם הייתה ריקה, לא היה צריך לחכות בכלל.'],
    ['quiet',  'שקטה — נכון לגבי ספריות, אבל לא מסביר את ההמתנה בחוץ.'],
    ['closed', 'סגורה — אז לא היה אפשר לקבל מקום בכלל, והמשפט אומר שכן קיבלו.'],
  ],
  // בלי השורה הזו ההדגמה סותרת את פרק 1: כאן נדרש כל המשפט, ופרק 1 מלמד
  // להתחיל דווקא מהמילים הצמודות. הבהרה מפורשת שזה אחד משלושה מקרים.
  bridge: 'בדוגמה הזו היה צריך את כל המשפט. לפעמים מספיקות שתי המילים הצמודות למקום הריק, ולפעמים מילת קישור אחת מכריעה — <strong>שלושת המקרים האלה הם המסך הבא</strong>.',
};

// ─── Screen 2 ────────────────────────────────────────────────────────────────
const BLOCKS = [
  {
    id: 'closeCompletion',
    n: 1,
    title: 'השלמה קרובה',
    kicker: 'המילים הצמודות למקום הריק',
    intro: 'לפני שקוראים את כל המשפט — יש להסתכל רק במילה-שתיים הצמודות למקום הריק. לפעמים זה כבר מספיק.',
    parts: [
      {
        label: 'צירוף קבוע',
        stem: "Much of the movie's dramatic coastal footage was ___ along a remote stretch of volcanic coastline rather than in a studio.",
        options: ['filmed', 'filed', 'filled', 'failed'],
        correct: 0,
        note: 'ארבע האופציות נשמעות דומה — אבל "footage was ___" הוא צירוף קבוע: תיעוד קולנועי מצולם (filmed), לא מוגש, מתמלא או נכשל.',
      },
      {
        label: 'צורת דקדוק מחייבת',
        stem: 'Employees at the downtown office can be caught off guard by sudden reorganizations, especially those who had been ___ nothing but a routine review.',
        options: ['planned', 'planning', 'plans', 'plan'],
        correct: 1,
        note: '"had been ___" דורש בינוני-פועל (-ing) — זו עובדה דקדוקית, לא עניין של משמעות. שלוש האופציות האחרות לא יכולות לבוא אחרי had been, בלי קשר לתוכן המשפט.',
      },
    ],
  },
  {
    id: 'connectorDecides',
    n: 2,
    title: 'מילת הקישור קובעת',
    kicker: 'but / because / although / so…',
    intro: 'מילת קישור במשפט (או תבנית קישור כמו "so…that") קובעת אם היחס הוא ניגוד, סיבה או תוצאה. היא נותנת את התשובה — לא הנושא הכללי של המשפט.',
    parts: [
      {
        label: 'ניגוד',
        stem: 'In most desert climates, nights can be surprisingly ___ even though daytime temperatures soar to extreme highs.',
        options: ['loud', 'cool', 'heavy', 'sweet'],
        correct: 1,
        note: '"even though" מבטיחה ניגוד לחום הקיצוני שמופיע בהמשך המשפט — ולכן צריך תואר של טמפרטורה שמנוגד לחום. רק "cool" עונה על כך.',
      },
      {
        label: 'סיבה־תוצאה',
        stem: "Lichens are so ___ to air pollution that their presence or absence is used to assess a region's air quality.",
        options: ['generous', 'joyful', 'restless', 'responsive'],
        correct: 3,
        note: '"so ___ that" קושרת בין התכונה החסרה לתוצאה שמופיעה אחריה — שימוש בחזזית למדידת זיהום אוויר. רק תכונה של תגובה לזיהום (responsive) יוצרת את הקשר הזה.',
      },
    ],
  },
  {
    id: 'wholeSentence',
    n: 3,
    title: 'המשפט כולו',
    kicker: null,
    intro: 'לא מילה צמודה ולא מילת קישור — צריך להבין את המשפט בשלמותו. תת-מקרה שכיח: המשפט עצמו נותן הגדרה למילה החסרה.',
    parts: [
      {
        label: 'הבנה כללית של המשפט',
        stem: 'The radio signals ___ by pulsars reach radio telescopes with such precise regularity that astronomers have used them as natural clocks.',
        options: ['erased', 'emitted', 'faked', 'voided'],
        correct: 1,
        note: 'הפועל "reach" בהמשך המשפט קובע שהאותות בהכרח מגיעים ליעדם — מה שמוריד "נמחקים" ו"מבוטלים" (סותרים "מגיעים"), ו"מזויפים" לא הגיוני לגוף טבעי. רק "נפלטים" (emitted) מתיישב עם כל המשפט.',
      },
      {
        label: 'תת-מקרה: הגדרה בתוך המשפט',
        sub: true,
        stem: 'A decibel is the ___ used to measure the loudness of a sound.',
        options: ['unit', 'opinion', 'fabric', 'penalty'],
        correct: 0,
        note: 'המשפט מגדיר את המילה החסרה במפורש: "used to measure the loudness of a sound" — משהו שמודדים בו קול. זו יחידת מידה (unit), לא דעה, בד או קנס.',
      },
    ],
  },
];

// ─── State ───────────────────────────────────────────────────────────────────
let step = 1;

export function renderScLearn(root) {
  ensureStyles();
  const wanted = LEARN_BLOCKS.find((b) => subAnchor() === `sl-block-${b.id}`);
  step = wanted ? 2 : 1;
  draw(root);
  if (!wanted) return;
  requestAnimationFrame(() => {
    const el = document.getElementById(`sl-block-${wanted.id}`);
    if (!el) return;
    el.classList.add('open');
    el.querySelector('[data-block-toggle]')?.setAttribute('aria-expanded', 'true');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('sl-focus');
  });
}

function draw(root) {
  root.innerHTML = shell(step === 1 ? screenOne() : screenTwo());

  if (step === 1) {
    root.querySelector('#slNext').addEventListener('click', () => { step = 2; draw(root); window.scrollTo(0, 0); });
  } else {
    root.querySelectorAll('[data-block-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = btn.closest('.sl-block');
        const open = sec.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    root.querySelector('#slBack').addEventListener('click', () => { step = 1; draw(root); window.scrollTo(0, 0); });
    root.querySelector('#slStart').addEventListener('click', () => {
      localStorage.setItem(LEARN_SEEN_KEY, 'true');
      navigate('/sc-practice');
    });
  }
}

function shell(inner) {
  return `<div class="sl-shell fade-in">
    <div class="sl-top">
      <a class="sl-brand" href="#/sentence-completion">← השלמת משפטים</a>
      <span class="sl-chip">שלב ${step} / 2</span>
    </div>
    ${inner}
    <div class="sl-foot"><a href="#/home">← דף הבית</a></div>
  </div>`;
}

function screenOne() {
  const d = INTRO_DEMO;
  const stemHtml = d.stem.replace(d.hl, `<span class="sl-hl">${d.hl}</span>`);
  const opts = d.options.map((o, i) => `
    <span class="sl-demo-opt${i === d.correct ? ' is-correct' : ''}" dir="ltr">${o}</span>`).join('');

  return `<div class="sl-card">
    <h1 class="sl-h1">מה זו שאלת השלמת משפט</h1>
    <p class="sl-lead">${INTRO_BODY}</p>

    <div class="sl-facts">
      ${INTRO_FACTS.map((f) => `
        <div class="sl-fact">
          <div class="sl-fact-k">${f.k}</div>
          <div class="sl-fact-v">${f.v}</div>
        </div>`).join('')}
    </div>

    <div class="sl-demo">
      <div class="sl-demo-lbl">איך זה נראה בפועל</div>
      <div class="sl-demo-stem" dir="ltr">${stemHtml}</div>
      <div class="sl-demo-opts">${opts}</div>

      <div class="sl-demo-step">
        <span class="sl-demo-tag">אנחנו מחפשים</span>${d.looking}
      </div>
      <div class="sl-demo-step">
        <span class="sl-demo-tag">ולכן הגיוני ש…</span>${d.therefore}
      </div>

      <div class="sl-demo-rej">
        ${d.rejects.map(([w, why]) => `
          <div class="sl-demo-rej-row"><span dir="ltr">${w}</span> — ${why}</div>`).join('')}
      </div>

      <div class="sl-demo-bridge">${d.bridge}</div>
    </div>

    <button class="btn-primary sl-cta" id="slNext">המשך ←</button>
  </div>`;
}

function screenTwo() {
  return `<div class="sl-page-head">
      <h1 class="sl-h1">איפה מסתתרת התשובה</h1>
      <p class="sl-sub">שלושה מקומות להסתכל בהם. זה כל המשחק.</p>
    </div>
    ${BLOCKS.map(block).join('')}
    <div class="sl-end">
      <button class="btn-primary sl-cta" id="slStart">קדימה לתרגול ←</button>
      <button class="sl-link" id="slBack">← חזרה לשלב הקודם</button>
      <p class="sl-note">אפשר תמיד לחזור לכאן מתוך התרגול</p>
    </div>`;
}

// Progressive disclosure (same pattern as rephrase-learn.js): number + title
// always visible, worked examples collapsed by default and opened on click.
// Deep links (see renderScLearn) force one block open.
function block(b) {
  return `<section class="sl-card sl-block" id="sl-block-${b.id}">
    <button type="button" class="sl-block-head" data-block-toggle aria-expanded="false">
      <span class="sl-num">${b.n}</span>
      <h2 class="sl-h2">${b.title}${b.kicker ? ` <span class="sl-kicker" dir="ltr">(${b.kicker})</span>` : ''}</h2>
      <span class="sl-chev">▾</span>
    </button>
    <div class="sl-block-body">
      ${b.intro ? `<p class="sl-intro">${b.intro}</p>` : ''}
      ${b.parts.map(part).join('')}
    </div>
  </section>`;
}

function part(p) {
  return `<div class="sl-part${p.sub ? ' sl-part-sub' : ''}">
    <div class="sl-part-label">${p.sub ? '↳ ' : ''}${p.label}</div>
    <div class="sl-ex">
      <div class="sl-stem" dir="ltr">${withBlank(p.stem)}</div>
      <div class="sl-opts">
        ${p.options.map((o, i) => `<span class="sl-opt${i === p.correct ? ' correct' : ''}" dir="ltr">${o}</span>`).join('')}
      </div>
      <div class="sl-note-row">🔍 ${p.note}</div>
    </div>
  </div>`;
}

function withBlank(stem) {
  return stem.replace('___', '<span class="sl-blank">___</span>');
}

// ─── Scoped styles (injected once; styles.css untouched) ─────────────────────
function ensureStyles() {
  if (document.getElementById('sl-learn-css')) return;
  const s = document.createElement('style');
  s.id = 'sl-learn-css';
  s.textContent = SL_CSS;
  document.head.appendChild(s);
}

const SL_CSS = `
.sl-shell{max-width:720px;margin:0 auto;padding:1.1rem 1rem 3rem;direction:rtl}
.sl-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:1rem}
.sl-brand{font-weight:800;color:var(--green-dark);text-decoration:none;font-size:.9rem}
.sl-chip{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.75rem;font-weight:700;color:var(--muted)}
.sl-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem 1.5rem;margin-bottom:1rem}
.sl-h1{font-size:1.45rem;font-weight:800;line-height:1.35;margin-bottom:.6rem}
.sl-lead{font-size:1rem;line-height:1.85}
.sl-page-head{padding:0 .3rem 1rem}
.sl-sub{font-size:.9rem;color:var(--muted);margin-top:.35rem}
.sl-facts{display:flex;flex-direction:column;gap:.7rem;margin-top:1.2rem}
.sl-fact{border-inline-start:3px solid var(--green);padding-inline-start:.8rem}
.sl-fact-k{font-weight:800;font-size:.9rem;margin-bottom:.15rem}
.sl-fact-v{font-size:.88rem;color:var(--muted);line-height:1.7}
.sl-demo{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem 1.1rem;margin-top:1.3rem}
.sl-demo-lbl{font-size:.76rem;font-weight:800;letter-spacing:.08em;color:var(--muted);margin-bottom:.6rem}
.sl-demo-stem{font-family:var(--eng);font-size:.95rem;line-height:1.9;text-align:left;margin-bottom:.7rem}
.sl-hl{background:var(--orange-light);border-radius:3px;padding:.05em .25em;font-weight:700}
.sl-demo-opts{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.9rem}
.sl-demo-opt{font-family:var(--eng);font-size:.88rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.15rem .5rem;color:var(--muted)}
.sl-demo-opt.is-correct{border-color:var(--green);color:var(--green-dark);font-weight:700}
.sl-demo-step{font-size:.9rem;line-height:1.8;margin-bottom:.5rem}
.sl-demo-tag{display:inline-block;font-size:.75rem;font-weight:800;background:var(--green-light);color:var(--green-dark);border-radius:99px;padding:.1rem .55rem;margin-inline-end:.4rem}
.sl-demo-rej{border-top:1px solid var(--border);margin-top:.7rem;padding-top:.6rem}
.sl-demo-rej-row{font-size:.84rem;color:var(--muted);line-height:1.75}
.sl-demo-rej-row span{font-family:var(--eng);font-weight:700;color:var(--text)}
.sl-demo-bridge{font-size:.86rem;line-height:1.75;color:var(--text);background:var(--green-light);border-radius:var(--radius-sm);padding:.6rem .8rem;margin-top:.8rem}
.sl-warns{display:flex;flex-direction:column;gap:.5rem;margin-top:1.2rem}
.sl-warn{background:var(--orange-light);color:#b5551f;border-radius:var(--radius-sm);padding:.6rem .9rem;font-size:.88rem;font-weight:700;line-height:1.5}
.sl-cta{width:100%;margin-top:1.4rem;padding:.85rem 1rem;font-size:1rem}

.sl-focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-light)}
.sl-block-head{display:flex;gap:.8rem;align-items:center;width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;text-align:right;font:inherit;color:inherit}
.sl-num{flex:0 0 auto;width:1.85rem;height:1.85rem;border-radius:999px;background:var(--green-light);color:var(--green-dark);font-weight:900;font-size:.9rem;display:flex;align-items:center;justify-content:center}
.sl-h2{flex:1;font-size:1.1rem;font-weight:800;line-height:1.4}
.sl-kicker{font-weight:700;font-size:.85rem;color:var(--muted)}
.sl-chev{flex:0 0 auto;font-size:.8rem;color:var(--muted);transition:transform .2s ease}
.sl-block.open .sl-chev{transform:rotate(180deg)}
.sl-block-body{display:none;margin-top:1.1rem}
.sl-block.open .sl-block-body{display:block}
.sl-intro{font-size:.9rem;line-height:1.65;color:var(--text);margin-top:.3rem}

.sl-part{border-top:1px solid var(--border);padding-top:.9rem;margin-top:.9rem}
.sl-block .sl-part:first-of-type{border-top:none;padding-top:0;margin-top:0}
.sl-part-sub{margin-right:1rem}
.sl-part-label{font-size:.82rem;font-weight:800;color:var(--muted);margin-bottom:.5rem}

.sl-ex{background:var(--bg);border-radius:var(--radius-sm);padding:.85rem .95rem;display:flex;flex-direction:column;gap:.6rem}
.sl-stem{direction:ltr;text-align:left;font-size:.95rem;line-height:1.6;color:var(--text)}
.sl-blank{font-weight:800;color:var(--green-dark);border-bottom:2px solid var(--green)}
.sl-opts{display:flex;flex-wrap:wrap;gap:.4rem}
.sl-opt{direction:ltr;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.2rem .7rem;font-size:.8rem;font-weight:700;color:var(--muted)}
.sl-opt.correct{background:var(--green-light);border-color:var(--green);color:var(--green-dark)}
.sl-note-row{background:var(--blue-light);border-radius:var(--radius-sm);padding:.55rem .75rem;font-size:.85rem;line-height:1.6}

.sl-end{text-align:center;padding:.4rem .3rem 0}
.sl-link{background:none;border:none;color:var(--green-dark);font-weight:700;font-size:.83rem;cursor:pointer;padding:.7rem 0;text-decoration:underline}
.sl-note{font-size:.8rem;color:var(--muted)}
.sl-foot{margin-top:1.4rem;text-align:center}
.sl-foot a{color:var(--muted);font-size:.82rem;text-decoration:none}

@media (max-width:520px){
  .sl-card{padding:1.1rem 1rem}
}
`;
