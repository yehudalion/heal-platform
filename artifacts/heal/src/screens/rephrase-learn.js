/**
 * src/screens/rephrase-learn.js  (T042 — Rephrase Learn)
 *
 * The Learn layer of the Rephrase module: TWO screens, then straight into
 * rephrase-practice.js. Shown once (localStorage flag, same pattern as
 * vocab-learn.js / card.js) and reachable any time from the practice top bar.
 *
 * HARD rules honoured:
 *  - Static content only. No DB, no Supabase, no data layer needed yet — if this
 *    screen ever needs dynamic data it goes through a data/*.data.js module.
 *  - Hebrew RTL UI; English study content stays English inside dir="ltr" blocks.
 *  - Wellbeing: a wrong phrasing is shown as a specimen to inspect, never as a
 *    red-X failure. Same neutral palette rephrase-practice.js uses.
 *
 * COPY IS APPROVED AND FINAL (Lion, 2026-08-05). Do not reword without asking.
 *
 * FUTURE (not wired yet): practice feedback will deep-link "ללמוד עוד" into a
 * single block. That is why every block carries a STABLE id — see LEARN_BLOCKS
 * and CATEGORY_TO_BLOCK below, and the `id="rl-block-<id>"` on each rendered
 * block. Renaming an id breaks that future link; add, don't rename.
 */

import { navigate, subAnchor } from '../router.js';

// Exported so rephrase-practice.js gates on the SAME key — a hardcoded duplicate
// string here and there is how a first-run gate silently stops firing.
export const LEARN_SEEN_KEY = 'hs_rephrase_learn_seen';

// ─── Stable block identity (the future deep-link contract) ───────────────────
// ONE block per label, and the titles below are the labels from lib/keys.js
// verbatim (SITEMAP §2: the same word in all three layers). If you rename a
// label in keys.js you MUST rename it here in the same commit — a Learn block
// the student can't find by the name Practice used is the bug this prevents.
export const LEARN_BLOCKS = [
  { id: 'direction', title: 'כיוון היחס' },
  { id: 'ratio',     title: 'יחס' },
  { id: 'anchor',    title: 'עוגן' },
  { id: 'added',     title: 'מידע שלא נאמר' },
  { id: 'nearmiss',  title: 'פעולה קרובה אך שונה' },
];

/**
 * RAW DB trigger_category → block id. Deliberately identical to CATEGORY_TO_KEY
 * in lib/keys.js — block ids ARE label ids now, so a future "ללמוד עוד" link can
 * hand a resolveTrigger() result straight to `rl-block-${trigger.id}`.
 * Note 'unstated' → nearmiss: see note (b) in keys.js before "fixing" it.
 */
export const CATEGORY_TO_BLOCK = {
  causal:   'direction',
  logical:  'direction',
  measure:  'ratio',
  anchor:   'anchor',
  unstated: 'nearmiss',
};

// ─── Screen 1 ────────────────────────────────────────────────────────────────
const INTRO_BODY = 'משפט מקור באנגלית + 4 ניסוחים אפשריים. אחד שומר על המשמעות בול. שלושת האחרים טועים מסיבה מבנית — לא כי יש בהם מילה קשה. זו חידה לוגית, לא מבחן אוצר מילים. אתם לא צריכים להבין כל מילה — אתם צריכים לדעת איפה להסתכל.';
const INTRO_WARNINGS = [
  'אל תסמכו על אורך האופציה.',
  'אל תסמכו על כמה מילים היא חולקת עם המקור.',
];

// ─── Screen 2 ────────────────────────────────────────────────────────────────
// Each example: `src` / `wrong` are English (rendered LTR), `note` is Hebrew.
// <strong> marks the flag — the exact word or phrase the technique turns on.
const BLOCKS = [
  {
    id: 'direction',
    n: 1,
    title: 'כיוון היחס',
    kicker: 'מי עשה למי',
    intro: 'זהה את שני החלקים, הבן את הכיוון, ודא שהתשובה שומרת עליהם — באותו כיוון.',
    parts: [
      {
        label: 'מילות קישור',
        chips: ['but', 'although', 'while', 'because', 'so'],
        src: '<strong>While</strong> tinkering with a headache remedy, John Pemberton invented Coca-Cola.',
        wrong: "John Pemberton's headache remedy <strong>is an adaptation of</strong> Coca-Cola.",
        note: 'הכיוון התהפך — כאן התרופה נוצרה מהקוקה קולה, במקור זה הפוך.',
      },
      {
        label: 'מילות זמן',
        chips: ['until', 'since', 'before', 'after', 'originally'],
        src: '<strong>After</strong> their conquest of Britain in the 1st century, the Romans held sway over the region for almost four centuries.',
        wrong: '…four hundred years of Roman rule in Britain <strong>came to an end</strong>.',
        note: 'יחס הזמן התהפך — כאן השלטון מסתיים במאה הראשונה, במקור הוא שם מתחיל.',
      },
      {
        label: 'סיבתיות',
        chips: ['driven by', 'eliminated', 'caused', 'led to'],
        src: '…the onset of the Cold War <strong>eliminated</strong> the Soviet Union as a participant in the Marshall Plan.',
        wrong: "The Soviet Union's participation… was <strong>a contributing factor</strong> in the outbreak of the Cold War.",
        note: 'כיוון הסיבתיות התהפך — כאן ההשתתפות גורמת למלחמה, במקור המלחמה גורמת לביטול ההשתתפות.',
      },
    ],
  },
  {
    id: 'ratio',
    n: 2,
    title: 'יחס',
    kicker: 'כמה, כמה חזק, מי גדול',
    intro: 'לא הכיוון, המידה. שמירה על אותה מידה — גם החלשה היא שגיאה, לא רק הגזמה.',
    parts: [
      {
        label: 'היקף / כמת',
        chips: ['all', 'only', 'none', 'most', 'some', 'parts of'],
        src: 'Apart from bats, mammals are <strong>not able to fly at all</strong>.',
        wrong: '<strong>Some</strong> mammals, like bats, are able to fly.',
        note: '"אף אחד" הפך ל"חלק" — מהיקף מוחלט לחלקי.',
      },
      {
        label: 'עוצמה / ודאות',
        chips: ['record', 'principal', 'main', 'leading'],
        src: 'Flour is the <strong>principal</strong> ingredient of ordinary bread.',
        wrong: 'Flour is <strong>commonly found</strong> in ordinary bread.',
        note: '"principal" (המרכיב העיקרי) נעלם, נשארה טענה חלשה בהרבה.',
      },
      {
        label: 'דירוג / השוואה',
        chips: ['as…as', 'record', 'followed by'],
        src: '<strong>No one has ever scored as many</strong> game points as Wilt Chamberlain did: 100.',
        wrong: 'Wilt Chamberlain, who scored 100 points, was <strong>the finest scorer in league history</strong>.',
        note: 'טענה מדויקת וניתנת-להשוואה הפכה לשיפוט כללי — לא אותו סוג טענה.',
      },
    ],
  },
  {
    id: 'anchor',
    n: 3,
    title: 'עוגן',
    kicker: 'ישות קבועה: שם, מספר, תאריך',
    intro: 'המבחן לא יכול לשנות אותם. אם כל האופציות חולקות אותו עוגן — הוא לא המבחן; השאלה היא מה נטען עליו.',
    parts: [
      {
        label: null,
        chips: [],
        src: 'The Great Pyramid of Giza measures <strong>230 meters across at its base</strong>…',
        wrong: 'The Great Pyramid of Giza rises <strong>230 meters high</strong> above a base…',
        note: 'אותו מספר, 230 — אבל הוחלף בין הממדים: מרוחב הבסיס לגובה.',
      },
    ],
  },
  // Blocks 4 and 5 are the two checks read off the OPTION, not off a word in the
  // stem. They share the lead-in below, but each is its own block because each is
  // its own label in keys.js.
  {
    id: 'added',
    n: 4,
    title: 'מידע שלא נאמר',
    kicker: null,
    lead: 'שלוש הקטגוריות למעלה תלויות במילה במשפט המקור. שתי הבדיקות הבאות נעשות על האופציה עצמה.',
    intro: null,
    parts: [
      // Replaced 2026-08-05. The previous example (Archaeologists unearthed → have
      // confirmed) is tagged R7 in the DB, so Practice labels it "פעולה קרובה אך שונה"
      // — Learn was teaching it under the wrong block. This one is a real R3:
      // restatement_questions fcd5c1e7-b3ca-4412-a051-5f853f930cbf, distractor 3.
      {
        label: null,
        chips: [],
        src: "Vincent van Gogh's use of impasto in his paintings <strong>challenged the conventions</strong> of his day.",
        wrong: "Vincent van Gogh's original use of paint was <strong>imitated by several of his contemporaries</strong>.",
        note: 'הטענה "imitated by several of his contemporaries" היא מידע חדש שלא הופיע במקור בכלל — המקור מדבר על כך שואן גוך חרג מהמוסכמות, לא על כך שאחרים חיקו אותו.',
      },
    ],
  },
  {
    id: 'nearmiss',
    n: 5,
    title: 'פעולה קרובה אך שונה',
    kicker: null,
    intro: null,
    parts: [
      {
        label: null,
        chips: [],
        src: 'A date palm can <strong>yield edible fruit</strong> for as long as one hundred years.',
        wrong: 'Date fruit can <strong>be preserved</strong> for as long as one hundred years.',
        note: 'אותה מאה שנה, אותו נושא — אבל "מניב פרי" הפך ל"פרי משתמר". שאלה אחרת לגמרי.',
      },
    ],
  },
];

// Short, approved glosses reused by screens/progress.js to fix a real bug: the
// cross-module report named a key (e.g. "עוגן") with zero context (Lion,
// 2026-08-26 — "אני לא אוהב שזה חסר משמעות"). Pulled verbatim from each
// block's `kicker` above — do not add new wording here, and do not reword the
// kickers themselves without asking (same COPY IS APPROVED rule as the file
// header). Only 3 of the 5 blocks have a kicker; 'added' and 'nearmiss' fall
// back to their bare title wherever KEY_GLOSS is consulted.
export const KEY_GLOSS = Object.fromEntries(
  BLOCKS.filter((b) => b.kicker).map((b) => [b.id, b.kicker])
);

// ─── State ───────────────────────────────────────────────────────────────────
let step = 1;

export function renderRephraseLearn(root) {
  ensureStyles();
  // Deep link from Analyze / practice feedback: '#/rephrase-learn#rl-block-ratio'
  // opens screen 2 straight at that block instead of making the learner scroll.
  const wanted = LEARN_BLOCKS.find((b) => subAnchor() === `rl-block-${b.id}`);
  step = wanted ? 2 : 1;
  draw(root);
  if (!wanted) return;
  requestAnimationFrame(() => {
    const el = document.getElementById(`rl-block-${wanted.id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('rl-focus');
  });
}

function draw(root) {
  root.innerHTML = shell(step === 1 ? screenOne() : screenTwo());

  if (step === 1) {
    root.querySelector('#rlNext').addEventListener('click', () => { step = 2; draw(root); window.scrollTo(0, 0); });
  } else {
    root.querySelector('#rlBack').addEventListener('click', () => { step = 1; draw(root); window.scrollTo(0, 0); });
    root.querySelector('#rlStart').addEventListener('click', () => {
      localStorage.setItem(LEARN_SEEN_KEY, 'true');
      navigate('/rephrase-practice');
    });
  }
}

function shell(inner) {
  return `<div class="rl-shell fade-in">
    <div class="rl-top">
      <a class="rl-brand" href="#/rephrasing">← ניסוח מחדש</a>
      <span class="rl-chip">שלב ${step} / 2</span>
    </div>
    ${inner}
    <div class="rl-foot"><a href="#/home">← דף הבית</a></div>
  </div>`;
}

function screenOne() {
  return `<div class="rl-card">
    <h1 class="rl-h1">מה זו שאלת ניסוח-מחדש</h1>
    <p class="rl-lead">${INTRO_BODY}</p>
    <div class="rl-warns">
      ${INTRO_WARNINGS.map((w) => `<div class="rl-warn">⚠️ ${w}</div>`).join('')}
    </div>
    <button class="btn-primary rl-cta" id="rlNext">המשך ←</button>
  </div>`;
}

function screenTwo() {
  return `<div class="rl-page-head">
      <h1 class="rl-h1">על מה לשים לב</h1>
      <p class="rl-sub">חמישה מקומות להסתכל בהם. זה כל המשחק.</p>
    </div>
    ${BLOCKS.map(block).join('')}
    <div class="rl-end">
      <button class="btn-primary rl-cta" id="rlStart">קדימה לתרגול ←</button>
      <button class="rl-link" id="rlBack">← חזרה לשלב הקודם</button>
      <p class="rl-note">אפשר תמיד לחזור לכאן מתוך התרגול</p>
    </div>`;
}

// STABLE id — the future "ללמוד עוד" link from practice targets rl-block-<id>.
function block(b) {
  return `${b.lead ? `<p class="rl-lead-in">${b.lead}</p>` : ''}
  <section class="rl-card rl-block" id="rl-block-${b.id}">
    <div class="rl-block-head">
      <span class="rl-num">${b.n}</span>
      <div>
        <h2 class="rl-h2">${b.title}${b.kicker ? ` <span class="rl-kicker">(${b.kicker})</span>` : ''}</h2>
        ${b.intro ? `<p class="rl-intro">${b.intro}</p>` : ''}
      </div>
    </div>
    ${b.parts.map(part).join('')}
  </section>`;
}

function part(p) {
  return `<div class="rl-part">
    ${p.label ? `<div class="rl-part-label">${p.label}</div>` : ''}
    ${p.chips.length ? `<div class="rl-chips">${p.chips.map((c) => `<span class="rl-word" dir="ltr">${c}</span>`).join('')}</div>` : ''}
    <div class="rl-ex">
      <div class="rl-ex-row">
        <span class="rl-tag rl-tag-src">מקור</span>
        <span class="rl-en" dir="ltr">${p.src}</span>
      </div>
      <div class="rl-ex-row">
        <span class="rl-tag rl-tag-wrong">ניסוח שגוי</span>
        <span class="rl-en" dir="ltr">${p.wrong}</span>
      </div>
      <div class="rl-note-row">🔍 ${p.note}</div>
    </div>
  </div>`;
}

// ─── Scoped styles (injected once; styles.css untouched) ─────────────────────
function ensureStyles() {
  if (document.getElementById('rl-learn-css')) return;
  const s = document.createElement('style');
  s.id = 'rl-learn-css';
  s.textContent = RL_CSS;
  document.head.appendChild(s);
}

const RL_CSS = `
.rl-shell{max-width:720px;margin:0 auto;padding:1.1rem 1rem 3rem;direction:rtl}
.rl-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:1rem}
.rl-brand{font-weight:800;color:var(--green-dark);text-decoration:none;font-size:.9rem}
.rl-chip{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;font-size:.75rem;font-weight:700;color:var(--muted)}
.rl-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem 1.5rem;margin-bottom:1rem}
.rl-h1{font-size:1.45rem;font-weight:800;line-height:1.35;margin-bottom:.6rem}
.rl-lead{font-size:1rem;line-height:1.85}
.rl-page-head{padding:0 .3rem 1rem}
.rl-lead-in{padding:.5rem .3rem 1rem;font-size:.88rem;line-height:1.65;color:var(--muted)}
.rl-sub{font-size:.9rem;color:var(--muted);margin-top:.35rem}
.rl-warns{display:flex;flex-direction:column;gap:.5rem;margin-top:1.2rem}
.rl-warn{background:var(--orange-light);color:var(--orange);border-radius:var(--radius-sm);padding:.6rem .9rem;font-size:.88rem;font-weight:700;line-height:1.5}
.rl-cta{width:100%;margin-top:1.4rem;padding:.85rem 1rem;font-size:1rem}

.rl-focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-light)}
.rl-block-head{display:flex;gap:.8rem;align-items:flex-start;margin-bottom:1.1rem}
.rl-num{flex:0 0 auto;width:1.85rem;height:1.85rem;border-radius:999px;background:var(--green-light);color:var(--green-dark);font-weight:900;font-size:.9rem;display:flex;align-items:center;justify-content:center}
.rl-h2{font-size:1.1rem;font-weight:800;line-height:1.4}
.rl-kicker{font-weight:700;font-size:.85rem;color:var(--muted)}
.rl-intro{font-size:.9rem;line-height:1.65;color:var(--text);margin-top:.3rem}

.rl-part{border-top:1px solid var(--border);padding-top:.9rem;margin-top:.9rem}
.rl-block .rl-part:first-of-type{border-top:none;padding-top:0;margin-top:0}
.rl-part-label{font-size:.82rem;font-weight:800;color:var(--muted);margin-bottom:.5rem}
.rl-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.7rem}
.rl-word{direction:ltr;background:var(--purple-light);color:var(--purple);border-radius:999px;padding:.2rem .6rem;font-size:.75rem;font-weight:700}

.rl-ex{background:var(--bg);border-radius:var(--radius-sm);padding:.85rem .95rem;display:flex;flex-direction:column;gap:.55rem}
.rl-ex-row{display:flex;gap:.6rem;align-items:baseline}
.rl-tag{flex:0 0 auto;font-size:.7rem;font-weight:800;border-radius:999px;padding:.15rem .55rem}
.rl-tag-src{background:var(--card);color:var(--muted);border:1px solid var(--border)}
.rl-tag-wrong{background:var(--orange-light);color:var(--orange)}
/* flex:1 — without it a short English line shrinks to its own width and, inside an
   RTL row, drifts to the right instead of aligning under the line above it. */
.rl-en{flex:1 1 auto;direction:ltr;text-align:left;font-size:.92rem;line-height:1.55;color:var(--text)}
/* Yellow, NOT green: green means "correct" everywhere else in this module, and the
   flag is highlighted inside the wrong phrasing too. Yellow carries no verdict. */
.rl-en strong{font-weight:800;color:var(--text);background:var(--yellow);border-radius:4px;padding:.05rem .2rem}
.rl-note-row{background:var(--blue-light);border-radius:var(--radius-sm);padding:.55rem .75rem;font-size:.85rem;line-height:1.6}

.rl-end{text-align:center;padding:.4rem .3rem 0}
.rl-link{background:none;border:none;color:var(--green-dark);font-weight:700;font-size:.83rem;cursor:pointer;padding:.7rem 0;text-decoration:underline}
.rl-note{font-size:.8rem;color:var(--muted)}
.rl-foot{margin-top:1.4rem;text-align:center}
.rl-foot a{color:var(--muted);font-size:.82rem;text-decoration:none}

@media (max-width:520px){
  .rl-card{padding:1.1rem 1rem}
  .rl-ex-row{flex-direction:column;gap:.25rem}
  .rl-tag{align-self:flex-start}
}
`;
