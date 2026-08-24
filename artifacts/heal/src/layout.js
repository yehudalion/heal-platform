import { navigate } from './router.js';
import { getCurrentSession, isGuest, signOut } from './supabase.js';

const SCREEN_TITLES = {
  '/home':                 'לוח בקרה',
  '/flashcards':           'כרטיסיות',
  '/rephrasing':           'ניסוח מחדש',
  '/progress':             'ההתקדמות שלי',
  '/sentence-completion':  'השלמת משפטים',
};

// Render the full shell (sidebar + topbar + empty #page-content)
// Each screen then writes into #page-content
export async function renderLayout(root, activePath) {
  const session = await getCurrentSession();
  const user    = session?.user;
  const name    = user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';
  const avatar  = user?.user_metadata?.avatar_url;
  const title   = SCREEN_TITLES[activePath] || 'HighScore';

  const avatarHtml = avatar
    ? `<img src="${avatar}" alt="">`
    : name[0];

  root.innerHTML = `
    <div class="shell fade-in">

      <!-- SIDEBAR -->
      <nav class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">HS</div>
          <div class="brand-name">High<em>Score</em></div>
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
        <a class="nav-item" style="opacity:.5;cursor:not-allowed">
          <span class="nav-icon">${ico.sentence}</span>השלמת משפטים
          <span class="nav-badge">בקרוב</span>
        </a>
        <a class="nav-item" style="opacity:.5;cursor:not-allowed">
          <span class="nav-icon">${ico.read}</span>קריאה
          <span class="nav-badge">בקרוב</span>
        </a>

        <div class="nav-lbl">חשבון</div>
        <a class="nav-item${activePath==='/progress'?' active':''}" data-nav="/progress">
          <span class="nav-icon">${ico.chart}</span>ההתקדמות שלי
        </a>
        <!-- The "דו״ח פערים" item was removed 2026-08-05: /gap merged into
             /progress, so it pointed at the same screen under a different name.
             The ROUTE survives as a redirect for old links — see progress.js. -->

        <!-- streak pill removed 2026-08-17 — wellbeing rule (no streaks);
             replaced product-wide by the weekly pace widget on /home -->
        <div class="sidebar-foot">
          <div class="foot-av">${avatarHtml}</div>
          <div style="flex:1;min-width:0">
            <div class="foot-name">${name}</div>
            <div class="foot-plan">תוכנית חינמית</div>
          </div>
        </div>
      </nav>

      <!-- MAIN -->
      <div class="main-wrap">
        <!-- fake XP/word chips removed 2026-08-17 — they were hardcoded zeros -->
        <header class="topbar">
          <div class="topbar-title" id="topbar-title">${title}</div>
        </header>
        <div class="page">
          <div id="page-content"></div>
        </div>
      </div>

      <!-- Mobile bottom nav (2026-08-17): below 900px the sidebar disappears
           and previously left NO navigation at all. Minimal by decision —
           full visual design pass comes later. -->
      <nav class="bottomnav">
        <a class="bn-item${activePath==='/home'?' active':''}" data-nav="/home">
          <span class="bn-ico">${ico.home}</span>בית
        </a>
        <a class="bn-item${activePath==='/listening'?' active':''}" data-nav="/listening">
          <span class="bn-ico">${ico.listen}</span>האזנה
        </a>
        <a class="bn-item${activePath==='/flashcards'?' active':''}" data-nav="/card">
          <span class="bn-ico">${ico.cards}</span>מילים
        </a>
        <a class="bn-item${activePath==='/rephrasing'?' active':''}" data-nav="/rephrasing">
          <span class="bn-ico">${ico.rephrase}</span>ניסוח
        </a>
        <a class="bn-item${activePath==='/progress'?' active':''}" data-nav="/progress">
          <span class="bn-ico">${ico.chart}</span>התקדמות
        </a>
      </nav>

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
  listen:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10v-1a5 5 0 0110 0v1"/><rect x="2" y="10" width="3" height="4" rx="1"/><rect x="11" y="10" width="3" height="4" rx="1"/></svg>`,
  sentence:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h10M3 8h7M3 11h5"/><circle cx="13" cy="11" r="2"/></svg>`,
};
