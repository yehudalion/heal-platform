/**
 * src/screens/guides.js — מדד המדריכים בתוך האפליקציה.
 *
 * עמודי ההסבר חיים תחת `public/` כ-HTML סטטי, מחוץ ל-SPA. הם נבנו
 * ל-SEO, ולכן עד עכשיו רק גוגל הכיר אותם: משתמש שכבר נרשם והתחיל לתרגל
 * לא נתקל בהם בשום מקום. זה בזבוז כפול — התוכן שווה גם ללומדים שלנו,
 * וקישורים פנימיים מהאפליקציה גם עוזרים לעמודים לדרג.
 *
 * הקישורים כאן הם `<a href>` רגילים ולא `data-nav`: היעד אינו מסך בראוטר
 * אלא עמוד סטטי נפרד, וניווט ב-hash לא היה מגיע אליו.
 *
 * המקור לרשימה הוא `public/sitemap.xml`. מי שמוסיף עמוד — שיוסיף גם כאן.
 */

import { renderLayout, getPageContent } from '../layout.js';

/**
 * `featured` מסמן את שלושת המדריכים שמופיעים במסך הבית. הבחירה היא של
 * ליאון (1.9.2026): עמוד העוגן שמסביר מה קורה, מבנה המבחן, והפטור — שהוא
 * מונח החיפוש עם הביקוש הגדול ביותר. לשנות כאן, לא ב-home.js.
 */
export const GUIDES = [
  {
    href:  '/mivchan-hilal/',
    featured: true,
    title: 'מבחן הלאל — מה זה ומתי הוא מתחיל',
    desc:  'האנגלית יוצאת מהפסיכומטרי והופכת לבחינה נפרדת. מה ידוע היום, ומה עוד לא פורסם רשמית.',
    tag:   'להתחיל כאן',
  },
  {
    href:  '/amir-amiram-amirant/',
    title: 'אמיר, אמירם, אמירנט והלאל — מה ההבדל',
    desc:  'ארבעה שמות לאותו תחום. מה הקשר ביניהם, למה הציונים ברי-השוואה, ומה באמת יהיה בדצמבר 2026.',
  },
  {
    href:  '/amirant-ledugma/',
    title: 'שאלות לדוגמה, עם הסבר מלא',
    desc:  'שלוש שאלות אמיתיות מהמאגר — ולמה כל תשובה שגויה שגויה, לא רק מה נכון.',
  },
  {
    href:  '/mivne-hamivchan/',
    featured: true,
    title: 'מבנה המבחן וחלקיו',
    desc:  'שלוש המיומנויות, איך עובד מבחן אדפטיבי, וסולם 50–150.',
  },
  {
    href:  '/chelek-haazana/',
    title: 'חלק ההאזנה',
    desc:  'החלק שמפתיע הכי הרבה נבחנים — מה באמת נבדק שם, ומילות הכיוון שכדאי להכיר.',
  },
  {
    href:  '/otzar-milim/',
    title: 'אוצר מילים — מה באמת קובע',
    desc:  'למה זה הגורם היחיד שמשפיע כמעט על כל סוגי השאלות, ואיך לומדים מילים שנשארות.',
  },
  {
    href:  '/ptor-anglit/',
    featured: true,
    title: 'פטור באנגלית באוניברסיטה',
    desc:  'הרמות, הציונים, וארבעת המסלולים להגיע לפטור.',
  },
  {
    href:  '/estrategia-hilal-amirnet/',
    featured: true,
    title: 'אסטרטגיית הלאל ואמירנט — איך ניגשים למבחן מותאם',
    desc:  'אי אפשר לחזור אחורה, קשה זה סימן טוב, ותקציב זמן לשאלה. שש אסטרטגיות ומה לעשות בפועל.',
  },
  {
    href:  '/moadim-vehareshama/',
    title: 'מועדי אמירנט והרשמה',
    desc:  'המבחן מתקיים לאורך כל השנה. איך נרשמים, כמה עולה, כלל 35 הימים, ומתי מגיע הציון.',
  },
  {
    href:  '/kama-zman/',
    title: 'כמה זמן צריך להתכונן',
    desc:  'למה אין תשובה אחת, מה נבנה לאט ומה מהר, ואיך בונים לוח זמנים אישי.',
  },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function ensureStyles() {
  if (document.getElementById('guides-css')) return;
  const s = document.createElement('style');
  s.id = 'guides-css';
  s.textContent = `
.gd-lede { color:var(--muted); line-height:1.8; margin-bottom:1.4rem; max-width:44rem; }
.gd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:.8rem; }
.gd-card { display:block; background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:1.1rem 1.2rem; text-decoration:none; color:var(--text); }
.gd-card:hover { border-color:var(--green); }
.gd-tag { display:inline-block; font-size:.7rem; font-weight:800; background:var(--green-light);
  color:var(--green-dark); border-radius:99px; padding:.15rem .6rem; margin-bottom:.5rem; }
.gd-title { font-weight:800; font-size:.98rem; line-height:1.5; margin-bottom:.35rem; }
.gd-desc { font-size:.85rem; color:var(--muted); line-height:1.65; }
.gd-foot { margin-top:1.6rem; font-size:.84rem; color:var(--muted); line-height:1.7; }
`;
  document.head.appendChild(s);
}

export async function renderGuides(root) {
  await renderLayout(root, '/guides');
  const page = getPageContent();
  ensureStyles();

  const cards = GUIDES.map((g) => `
    <a class="gd-card" href="${esc(g.href)}">
      ${g.tag ? `<span class="gd-tag">${esc(g.tag)}</span>` : ''}
      <div class="gd-title">${esc(g.title)}</div>
      <div class="gd-desc">${esc(g.desc)}</div>
    </a>`).join('');

  page.innerHTML = `
    <div class="fade-in">
      <div class="page-title">מדריכים</div>
      <p class="gd-lede">
        כל מה שכדאי להבין על הבחינה לפני שמתחילים לתרגל — פתוח וחינמי, בלי הרשמה.
        כל עובדה במדריכים מגובה במקור, ואיפה שאין מקור רשמי כתוב את זה במפורש.
      </p>
      <div class="gd-grid">${cards}</div>
      <p class="gd-foot">
        המדריכים נפתחים כעמוד נפרד — אפשר לשתף את הקישור עם מי שרוצה.
      </p>
    </div>`;
}
