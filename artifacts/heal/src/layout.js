import { navigate } from './router.js';
import { getCurrentSession, isGuest, signOut } from './supabase.js';

const SCREEN_TITLES = {
  '/home':                 'לוח בקרה',
  '/flashcards':           'כרטיסיות',
  '/srs':                  'חזרה מרווחת',
  '/rephrasing':           'ניסוח מחדש',
  '/progress':             'ההתקדמות שלי',
  '/gap':                  'דו"ח פערים',
  '/sentence-completion':  'השלמת משפטים',
};

// Render the full shell (sidebar + topbar + empty #page-content)
// Each screen then writes into #page-content
export async function renderLayout(root, activePath) {
  const session = await getCurrentSession();
  const user    = session?.user;
  const name    = user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';
  const avatar  = user?.user_metadata?.avatar_url;
  const title   = SCREEN_TITLES[activePath] || 'HEAL';

  const avatarHtml = avatar
    ? `<img src="${avatar}" alt="">`
    : name[0];

  root.innerHTML = `
    <div class="shell fade-in">

      <!-- SIDEBAR -->
      <nav class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">H</div>
          <div class="brand-name">HE<em>AL</em></div>
        </div>

        <div class="nav-lbl">ראשי</div>
        <a class="nav-item${activePath==='/home'?' active':''}" data-nav="/home">
          <span class="nav-icon">${ico.home}</span>לוח בקרה
        </a>
        <a class="nav-item${activePath==='/flashcards'?' active':''}" data-nav="/flashcards">
          <span class="nav-icon">${ico.cards}</span>כרטיסיות
        </a>

        <div class="nav-lbl">תרגול</div>
        <a class="nav-item${activePath==='/rephrasing'?' active':''}" data-nav="/rephrasing">
          <span class="nav-icon">${ico.rephrase}</span>ניסוח מחדש
        </a>
        <a class="nav-item${activePath==='/sentence-completion'?' active':''}" data-nav="/sentence-completion">
          <span class="nav-icon">${ico.sentence}</span>השלמת משפטים
        </a>
        <a class="nav-item" style="opacity:.5;cursor:not-allowed">
          <span class="nav-icon">${ico.read}</span>קריאה
          <span class="nav-badge">בקרוב</span>
        </a>

        <div class="nav-lbl">חשבון</div>
        <a class="nav-item${activePath==='/progress'?' active':''}" data-nav="/progress">
          <span class="nav-icon">${ico.chart}</span>ההתקדמות שלי
        </a>
        <a class="nav-item${activePath==='/gap'?' active':''}" data-nav="/gap">
          <span class="nav-icon">${ico.gap}</span>דו"ח פערים
        </a>

        <div class="sidebar-foot">
          <div class="foot-av">${avatarHtml}</div>
          <div style="flex:1;min-width:0">
            <div class="foot-name">${name}</div>
            <div class="foot-plan">תוכנית חינמית</div>
          </div>
          <div class="streak-pill">🔥 0</div>
        </div>
      </nav>

      <!-- MAIN -->
      <div class="main-wrap">
        <header class="topbar">
          <div class="topbar-title" id="topbar-title">${title}</div>
          <div style="display:flex;gap:7px">
            <span class="chip chip-y">⚡ 0 XP</span>
            <span class="chip">0 מילים</span>
          </div>
        </header>
        <div class="page">
          <div id="page-content"></div>
        </div>
      </div>

    </div>`;

  // Wire nav clicks
  root.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.nav);
    });
  });
}

// After renderLayout, each screen writes to this element
export function getPageContent() {
  return document.getElementById('page-content');
}

// SVG icons (inline, keeps zero external deps)
const ico = {
  home: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2z"/></svg>`,
  cards:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M4 4V3a1 1 0 011-1h6a1 1 0 011 1v1"/></svg>`,
  rephrase:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 8H5M9 5l-3 3 3 3"/><path d="M2 8h2" stroke-dasharray="1.5 1.5"/></svg>`,
  read:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>`,
  chart:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12l4-4 3 3 5-7"/></svg>`,
  gap:     `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>`,
  sentence:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h10M3 8h7M3 11h5"/><circle cx="13" cy="11" r="2"/></svg>`,
};
