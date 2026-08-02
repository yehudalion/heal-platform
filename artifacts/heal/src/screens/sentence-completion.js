import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';

const FEATURES = [
  {
    id: 'collocations',
    badge: 'פיצ\'ר 1',
    title: 'צירופים באזור המילה',
    title_en: 'Collocations',
    desc: 'לומדים אילו מילים "גרות" ליד המילה שאתם לומדים — פעלים, שמות תואר ומילות קישור שמופיעות איתה בטקסטים אקדמיים.',
    color: 'var(--blue)',
    colorLight: 'var(--blue-light)',
    status: 'soon',
  },
  {
    id: 'transitions',
    badge: 'פיצ\'ר 2',
    title: 'מילות קישור',
    title_en: 'Transition Words',
    desc: 'however, therefore, nevertheless, consequently — לזהות ולהשתמש נכון במילות המעבר שמקבעות את הלוגיקה בין משפטים.',
    color: 'var(--green)',
    colorLight: 'var(--green-light)',
    status: 'soon',
  },
  {
    id: 'placeholder3',
    badge: 'פיצ\'ר 3',
    title: 'בקרוב',
    title_en: '',
    desc: '[PLACEHOLDER — תיאור הפיצ\'ר יתווסף בהמשך]',
    color: 'var(--muted)',
    colorLight: 'var(--bg)',
    status: 'soon',
  },
  {
    id: 'placeholder4',
    badge: 'פיצ\'ר 4',
    title: 'בקרוב',
    title_en: '',
    desc: '[PLACEHOLDER — תיאור הפיצ\'ר יתווסף בהמשך]',
    color: 'var(--muted)',
    colorLight: 'var(--bg)',
    status: 'soon',
  },
];

export async function renderSentenceCompletion(root) {
  await renderLayout(root, '/sentence-completion');
  const el = getPageContent();

  el.innerHTML = `
    <div class="fade-in">
      <div class="page-title">השלמת משפטים</div>
      <div class="page-sub">ארבעה מודולים שיעזרו לך לזהות ולהשתמש בנכון במילים בהקשר אקדמי.</div>

      <div class="rp-banner" style="margin-bottom:1.6rem">
        <div>
          <h2>Sentence Completion</h2>
          <p>מעבר מלמידת מילים בודדות — להבנה כיצד הן פועלות בתוך משפטים.</p>
        </div>
        <div class="rp-stat"><div class="rp-stat-n">4</div><div class="rp-stat-l">מודולים</div></div>
        <div class="rp-stat" style="opacity:.45"><div class="rp-stat-n">—</div><div class="rp-stat-l">בקרוב</div></div>
      </div>

      <div class="sec-title">בחר מודול</div>
      <div class="features-grid">
        ${FEATURES.map((f, i) => `
          <div class="fcard f${i + 1}" style="cursor:default;opacity:${f.status === 'soon' ? '.7' : '1'}">
            <div class="fbadge">${f.badge}</div>
            <div class="ftitle">${f.title}${f.title_en ? ` <span style="font-weight:400;font-size:.8em;color:var(--muted)">${f.title_en}</span>` : ''}</div>
            <div class="fdesc">${f.desc}</div>
            <div style="font-size:.75rem;font-weight:700;color:var(--muted);margin-top:auto">בקרוב ←</div>
          </div>`).join('')}
      </div>
    </div>`;
}
