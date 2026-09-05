import { navigate } from './router.js';
import { getCurrentSession, signOut } from './supabase.js';
import { deleteMyAccount } from './data/account.data.js';
import { isLive } from './lib/modules.js';
import { getProfile, upsertProfile } from './data/profiles.data.js';
import { reportUserIssue } from './lib/errorLog.js';
import { startGoogleSignIn } from './lib/signIn.js';
import { BRAND, BRAND_PARTS, BRAND_MARK } from './lib/brand.js';
import { canInstall, promptInstall } from './lib/pwa.js';
import { isStandalone } from './lib/installCard.js';

// A nav item whose live/soon state comes from lib/modules.js — the single
// source of truth for module availability. Shipping a module = flipping its
// status THERE; this sidebar (and, once wired, home.js) follow automatically.
function navItem(moduleId, icon, label, route, activePath) {
  if (!isLive(moduleId)) {
    return `<a class="nav-item" style="opacity:.5;cursor:not-allowed">
          <span class="nav-icon">${icon}</span>${label}
          <span class="nav-badge">בקרוב</span>
        </a>`;
  }
  return `<a class="nav-item${activePath === route ? ' active' : ''}" data-nav="${route}">
          <span class="nav-icon">${icon}</span>${label}
        </a>`;
}

const SCREEN_TITLES = {
  '/home':                 'בית',
  '/practice':             'תרגול',
  '/flashcards':           'כרטיסיות',
  '/rephrasing':           'ניסוח מחדש',
  '/progress':             'ההתקדמות שלי',
  '/sentence-completion':  'השלמת משפטים',
  '/reading':              'הבנת הנקרא',
  '/affix':                'תחיליות וסופיות',
  '/dictionary':           'מילון',
  '/mistake-notebook':     'מחברת טעויות',
  '/insights':             'התובנות שלי',
  '/simulation':           'סימולציה',
  '/guides':               'מדריכים',
  '/word-of-day':          'המילה של היום',
  '/vocab-sprint':         'ספרינט מילים',
  '/word-wall':            'קיר המילים',
};

// Render the full shell (sidebar + topbar + empty #page-content)
// Each screen then writes into #page-content
export async function renderLayout(root, activePath) {
  const session = await getCurrentSession();
  const user    = session?.user;
  const name    = user?.user_metadata?.full_name?.split(' ')[0] || 'חבר/ה';
  const avatar  = user?.user_metadata?.avatar_url;
  const title   = SCREEN_TITLES[activePath] || BRAND;

  const avatarHtml = avatar
    ? `<img src="${avatar}" alt="">`
    : name[0];


  // ── מבקר שלא התחבר (4.9.2026) ───────────────────────────────────────────
  // מאז שמצב האורח הוסר, חלק מהמסכים נפתחים בלי חשבון: האתגר היומי, ספרינט
  // המילים, המילה של היום והמדריכים. הם עדיין משתמשים באותו shell, ולכן בלי
  // הענף הזה מבקר כזה היה רואה סרגל מלא של קישורים שכולם מחזירים אותו לדף
  // הנחיתה — הבטחה שנשברת בלחיצה. כאן הוא מקבל סרגל שמראה רק את מה שפתוח לו,
  // וכפתור התחברות במקום תפריט חשבון שאין לו.
  const anon = !session;

  const guestTools = [
    ['/daily',       '📅', 'האתגר היומי'],
    ['/vocab-sprint','⚡', 'ספרינט של דקה'],
    ['/word-of-day', '🔤', 'המילה של היום'],
    ['/guides',      '📖', 'מדריכים'],
  ];

  const guestSidebar = `
      <nav class="sidebar" id="sidebar" aria-label="ניווט ראשי">
        <div class="brand">
          <div class="brand-mark">${BRAND_MARK}</div>
          <div class="brand-name">${BRAND_PARTS[0]}<em>${BRAND_PARTS[1]}</em></div>
        </div>

        <div class="nav-lbl">חינם, בלי חשבון</div>
        ${guestTools.map(([route, icon, label]) => `
        <a class="nav-item${activePath === route ? ' active' : ''}" data-nav="${route}">
          <span class="nav-icon">${icon}</span>${label}
        </a>`).join('')}

        <div class="guest-cta">
          <p class="guest-cta-t">רוצים לשמור את ההתקדמות?</p>
          <p class="guest-cta-s">חשבון חינם פותח את התרגול המלא, את המילון ואת המעקב.</p>
          <button class="btn-primary" id="guestSignIn" type="button">להתחבר עם Google</button>
        </div>
      </nav>`;

  const guestBottomNav = `
      <nav class="bottomnav" aria-label="ניווט תחתון">
        ${guestTools.map(([route, icon, label]) => `
        <a class="bn-item${activePath === route ? ' active' : ''}" data-nav="${route}">
          <span class="bn-ico">${icon}</span>${label}
        </a>`).join('')}
      </nav>`;

  const sidebarHtml   = anon ? guestSidebar    : `
      <nav class="sidebar" id="sidebar" aria-label="ניווט ראשי">
        <div class="brand">
          <div class="brand-mark">${BRAND_MARK}</div>
          <div class="brand-name">${BRAND_PARTS[0]}<em>${BRAND_PARTS[1]}</em></div>
        </div>

        <a class="nav-item${activePath==='/home'?' active':''}" data-nav="/home">
          <span class="nav-icon">${ico.home}</span>בית
        </a>

        <!-- סשן שבת 1 (5.9.2026), החלטת יהודה: שתי קבוצות — "הפינות" (שש,
             נקודת צבע בגוון הפינה, אותו גוון כמו במשבצות הבית) ואז "כלים".
             לפני כן היו שלוש קבוצות ותשע כניסות, ומחברת הטעויות ישבה כ"פינה"
             למרות שהיא דוח — היא עברה לתוך "ההתקדמות שלי". -->
        <div class="nav-lbl">הפינות</div>
        <a class="nav-item${activePath==='/flashcards'?' active':''}" data-nav="/flashcards">
          <span class="nav-icon"><i class="nav-hue nav-hue-g"></i></span>אוצר מילים
        </a>
        <a class="nav-item${activePath==='/rephrasing'?' active':''}" data-nav="/rephrasing">
          <span class="nav-icon"><i class="nav-hue nav-hue-o"></i></span>ניסוח מחדש
        </a>
        <a class="nav-item${activePath==='/listening'?' active':''}" data-nav="/listening">
          <span class="nav-icon"><i class="nav-hue nav-hue-b"></i></span>האזנה
        </a>
        ${navItem('sc', '<i class="nav-hue nav-hue-y"></i>', 'השלמת משפטים', '/sentence-completion', activePath)}
        ${navItem('reading', '<i class="nav-hue nav-hue-p"></i>', 'הבנת הנקרא', '/reading', activePath)}
        ${navItem('affix', '<i class="nav-hue nav-hue-c"></i>', 'תחיליות וסופיות', '/affix', activePath)}

        <div class="nav-lbl">כלים</div>
        <a class="nav-item${activePath==='/simulation'?' active':''}" data-nav="/simulation">
          <span class="nav-icon">🧪</span>סימולציה
        </a>
        <a class="nav-item${activePath==='/dictionary'?' active':''}" data-nav="/dictionary">
          <span class="nav-icon">${ico.book}</span>מילון
        </a>
        <a class="nav-item${activePath==='/progress'?' active':''}" data-nav="/progress">
          <span class="nav-icon">${ico.chart}</span>ההתקדמות שלי
        </a>
        <a class="nav-item nav-item--quiet${activePath==='/guides'?' active':''}" data-nav="/guides">
          <span class="nav-icon">📖</span>מדריכים
        </a>
        <!-- סשן שבת 5 (פריט 31): כפתור התקנה כאפליקציה — מופיע רק כשהדפדפן
             ירה beforeinstallprompt (lib/pwa.js), אחרת נשאר hidden. -->
        <button class="nav-item nav-item--quiet pwa-install" id="pwaInstall" type="button">
          <span class="nav-icon">📲</span>להוסיף כאפליקציה
        </button>
        <!-- The "דו״ח פערים" item was removed 2026-08-05: /gap merged into
             /progress, so it pointed at the same screen under a different name.
             The ROUTE survives as a redirect for old links — see progress.js. -->

        <!-- streak pill removed 2026-08-17 — wellbeing rule (no streaks);
             replaced product-wide by the weekly pace widget on /home -->
        <!-- מצב אורח הוסר לגמרי 3.9.2026 (ראו BACKLOG_next.md) — כל מי
             שמגיע לכאן כבר מחובר, אז אין יותר ענף תפריט לאורח. -->
        <div class="acct-menu" id="acctMenu" hidden>
          <button class="acct-item" id="acctSettings">⚙️ הגדרות</button>
          <button class="acct-item acct-item--quiet" id="acctSignout">התנתקות</button>
          <button class="acct-item acct-item--danger" id="acctDelete">מחיקת חשבון</button>
          <div class="acct-legal">
            <a href="/accessibility/" target="_blank" rel="noopener">נגישות</a> ·
            <a href="/privacy/" target="_blank" rel="noopener">פרטיות</a> ·
            <a href="/terms/" target="_blank" rel="noopener">תנאים</a>
          </div>
        </div>
        <button class="sidebar-foot" id="acctBtn" type="button" title="חשבון" aria-haspopup="menu" aria-controls="acctMenu">
          <div class="foot-av">${avatarHtml}</div>
          <div style="flex:1;min-width:0;text-align:right">
            <div class="foot-name">${name}</div>
            <div class="foot-plan">תוכנית חינמית</div>
          </div>
          <span class="acct-chev">⌄</span>
        </button>
      </nav>`;
  const bottomNavHtml = anon ? guestBottomNav  : `
      <nav class="bottomnav" aria-label="ניווט תחתון">
        <a class="bn-item${activePath==='/home'?' active':''}" data-nav="/home">
          <span class="bn-ico">${ico.home}</span>בית
        </a>
        <a class="bn-item${activePath==='/practice'?' active':''}" data-nav="/practice">
          <span class="bn-ico">${ico.target}</span>תרגול
        </a>
        <a class="bn-item${activePath==='/dictionary'?' active':''}" data-nav="/dictionary">
          <span class="bn-ico">${ico.book}</span>מילון
        </a>
        <a class="bn-item${activePath==='/progress'?' active':''}" data-nav="/progress">
          <span class="bn-ico">${ico.chart}</span>התקדמות
        </a>
      </nav>`;

  root.innerHTML = `
    <div class="shell fade-in">

      <!-- SIDEBAR -->
      <a class="skip-link" href="#page-content">דילוג לתוכן הראשי</a>
      ${sidebarHtml}

      <!-- MAIN -->
      <div class="main-wrap">
        <!-- fake XP/word chips removed 2026-08-17 — they were hardcoded zeros -->
        <header class="topbar">
          <div class="topbar-title" id="topbar-title">${title}</div>
        </header>
        <div class="page">
          <main id="page-content" tabindex="-1"></main>
        </div>
      </div>

      <!-- Mobile bottom nav (2026-08-17): below 900px the sidebar disappears
           and previously left NO navigation at all. Minimal by decision —
           full visual design pass comes later. -->
      ${bottomNavHtml}

      <button class="flag-fab" id="flagFab" type="button" title="דיווח על תקלה" aria-label="דיווח על תקלה">🚩</button>

    </div>`;

  // Wire nav clicks
  root.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.nav);
    });
  });

  // התקנה כאפליקציה — שני הכפתורים (סרגל צדדי / מעל הסרגל התחתון) מוסתרים
  // עד ש-beforeinstallprompt נורה.
  // 5.9: הפס הצף מעל הסרגל התחתון הוסר — הפס במסך הבית ממלא את מקומו.
  // פריט הסרגל תמיד גלוי (חוץ מבתוך האפליקציה) — בלי prompt הוא מוביל
  // למדריך #/install, כי באייפון beforeinstallprompt לא נורה לעולם.
  const sideInstall = root.querySelector('#pwaInstall');
  if (sideInstall) {
    if (isStandalone()) sideInstall.hidden = true;
    else sideInstall.addEventListener('click', async () => {
      if (canInstall()) { if (await promptInstall()) sideInstall.hidden = true; }
      else navigate('/install');
    });
  }

  // מבקר לא מחובר: אין תפריט חשבון לחווט, יש כפתור התחברות.
  if (anon) {
    root.querySelector('#guestSignIn')?.addEventListener('click', () => { startGoogleSignIn(); });
  } else {
    wireAccountMenu(root, user);
  }
}

// ─── Account menu: settings + sign-out (audit 2026-08-25 item 2) ─────────────
// Before this there was NO way to sign out or to change the exam date /
// daily minutes chosen at onboarding. Built as an overlay inside the layout
// on purpose: no new route, so main.js (held by the SC chat) stays untouched.

function ensureAcctStyles() {
  if (document.getElementById('acct-css')) return;
  const s = document.createElement('style');
  s.id = 'acct-css';
  s.textContent = `
.sidebar-foot { background:none; border:0; border-top:1px solid var(--border); width:100%; cursor:pointer; font-family:inherit; }
.sidebar-foot:hover { background: var(--green-light); }
.acct-chev { color: var(--muted); font-size:.9rem; }
.acct-menu { position:absolute; bottom:64px; right:12px; left:12px; background:var(--card);
  border:1px solid var(--border); border-radius:var(--radius-sm); box-shadow:0 8px 24px rgba(0,0,0,.12); padding:5px; z-index:200; }
.acct-item { display:block; width:100%; text-align:right; background:none; border:0; font-family:inherit;
  font-size:.86rem; font-weight:600; padding:9px 11px; border-radius:7px; cursor:pointer; color:var(--text); }
.acct-item:hover { background: var(--green-light); }
.acct-item--quiet { color: var(--muted); font-weight:500; }
.acct-legal { padding:.55rem .9rem .35rem; font-size:.72rem; color:var(--muted); border-top:1px solid var(--border); text-align:center; }
.acct-legal a { color:var(--muted); text-decoration:underline; }
.acct-item--cta { color: var(--green-dark); font-weight:800; background: var(--green-light);
  border-bottom:1px solid var(--border); }
.acct-item--cta:hover { background: var(--green-light); filter:brightness(.97); }
.acct-item--danger { color: var(--red, #B4553E); font-weight:500; border-top:1px solid var(--border); }
.acct-item--danger:hover { background: var(--red-light, #F4E4DD); }
.del-confirm-input { width:100%; margin-top:6px; padding:9px 11px; border:1.5px solid var(--border);
  border-radius:var(--radius-sm); font-family:inherit; font-size:.95rem; }
.btn-danger { background: var(--red, #B4553E); color:#fff; border:0; border-radius:var(--radius-sm);
  padding:.6rem 1.1rem; font-family:inherit; font-weight:800; cursor:pointer; }
.btn-danger:disabled { opacity:.45; cursor:not-allowed; }
.acct-overlay { position:fixed; inset:0; background:rgba(20,32,26,.45); z-index:300;
  display:flex; align-items:center; justify-content:center; }
.acct-card { background:var(--card); border-radius:var(--radius); padding:1.6rem 1.7rem; width:min(420px, 92vw);
  display:flex; flex-direction:column; gap:1rem; }
.acct-min { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
.acct-min button { border:1.5px solid var(--border); background:var(--card); border-radius:var(--radius-sm);
  padding:9px 4px; font-family:inherit; font-size:.85rem; font-weight:700; cursor:pointer; }
.acct-min button.on { border-color:var(--green-dark); background:var(--green-light); color:var(--green-dark); }
.flag-fab { position:fixed; bottom:18px; left:18px; width:46px; height:46px; border-radius:50%;
  background:var(--card); border:1.5px solid var(--border); box-shadow:0 4px 14px rgba(0,0,0,.15);
  font-size:1.2rem; cursor:pointer; z-index:250; display:flex; align-items:center; justify-content:center; }
.flag-fab:hover { background:var(--green-light); }
@media (max-width: 900px) { .flag-fab { bottom:78px; } } /* מעל ה-bottomnav במובייל */
`;
  document.head.appendChild(s);
}

function wireAccountMenu(root, user) {
  ensureAcctStyles();
  const btn  = root.querySelector('#acctBtn');
  const menu = root.querySelector('#acctMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  // One global click-away closer for the whole app lifetime. renderLayout runs
  // on every navigation, so a per-render document listener would pile up.
  if (!document.__acctCloser) {
    document.__acctCloser = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.acct-menu').forEach(m => { m.hidden = true; });
    });
  }

  root.querySelector('#acctSignout')?.addEventListener('click', async () => {
    await signOut();
    location.hash = '#/';
    location.reload();
  });

  root.querySelector('#acctSettings')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    menu.hidden = true;
    await openSettingsOverlay(user);
  });

  root.querySelector('#acctDelete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = true;
    openDeleteOverlay(user);
  });

  root.querySelector('#flagFab')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openFlagOverlay();
  });
}

// ─── "🚩 משהו לא בסדר" ────────────────────────────────────────────────────────
// חלופה קלה לקבוצת וואטסאפ (2026-09-01): לחיצה אחת, הערה אופציונלית, בלי
// שום דרישת התחייבות. לתקלות טכניות (JS שקרס) כבר יש errorLog.js אוטומטי —
// זה בשביל "משהו לא ברור/לא נכון" שלא זורק שגיאה.
function openFlagOverlay() {
  const ov = document.createElement('div');
  ov.className = 'acct-overlay';
  ov.innerHTML = `
    <div class="acct-card" dir="rtl">
      <div style="font-size:1.05rem;font-weight:900">🚩 משהו לא בסדר?</div>
      <div style="font-size:.86rem;line-height:1.6;color:var(--muted)">
        אפשר לכתוב במילה-שתיים מה קרה — ואפשר גם לשלוח בלי לכתוב כלום.
        זה מגיע ישר אליי.
      </div>
      <textarea id="flagNote" rows="3" placeholder="לא חובה…" style="width:100%;padding:.6rem .7rem;
        border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;
        font-size:.88rem;resize:vertical"></textarea>
      <div id="flagMsg" style="font-size:.82rem;color:var(--muted);min-height:1.1em"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="acct-item acct-item--quiet" id="flagCancel" style="width:auto">ביטול</button>
        <button class="btn-danger" id="flagSend" style="background:var(--green-dark,var(--green))">שליחה</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.querySelector('#flagCancel').addEventListener('click', close);

  const sendBtn = ov.querySelector('#flagSend');
  const msg = ov.querySelector('#flagMsg');
  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    msg.textContent = 'שולח…';
    const note = ov.querySelector('#flagNote').value.trim();
    const ok = await reportUserIssue(note);
    if (ok) {
      msg.textContent = 'תודה, קיבלתי!';
      setTimeout(close, 1100);
    } else {
      msg.textContent = 'לא הצלחתי לשלוח — נסה שוב בעוד רגע.';
      sendBtn.disabled = false;
    }
  });
}

// ─── מחיקת חשבון ─────────────────────────────────────────────────────────────
// זכות חוקית, ומדיניות הפרטיות שלנו כבר מבטיחה אותה. המחיקה עצמה רצה בפונקציית
// הקצה 'delete-account' בהרשאות שירות: הלקוח לא יכול למחוק משתמש בעצמו, ואסור
// שיוכל. הזהות נלקחת שם מה-JWT ולא מגוף הבקשה, כך שאי אפשר למחוק חשבון של אחר.
// המשתמש מקליד מילה כדי לאשר — לא confirm() — כדי שהפעולה תהיה מכוונת ולא החלקה.
const DELETE_CONFIRM_WORD = 'מחק';

function openDeleteOverlay(user) {
  const ov = document.createElement('div');
  ov.className = 'acct-overlay';
  ov.innerHTML = `
    <div class="acct-card" dir="rtl">
      <div style="font-size:1.05rem;font-weight:900">מחיקת החשבון</div>
      <div style="font-size:.9rem;line-height:1.6">
        הפעולה הזו <strong>אינה הפיכה</strong>. יימחקו לצמיתות ההתקדמות שלך באוצר
        המילים, היסטוריית התרגול בכל הפינות, מחברת הטעויות וההגדרות. לא נשמור עותק.
      </div>
      <label style="font-size:.83rem;font-weight:700">
        כדי לאשר, הקלד/י <span style="color:var(--red,#B4553E)">${DELETE_CONFIRM_WORD}</span>
        <input type="text" class="del-confirm-input" id="delWord" autocomplete="off" dir="rtl">
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-start">
        <button class="btn-danger" id="delGo" disabled>מחיקה סופית</button>
        <button class="acct-item acct-item--quiet" id="delCancel" style="width:auto">ביטול</button>
      </div>
      <div id="delMsg" style="font-size:.8rem;color:var(--muted)"></div>
    </div>`;
  document.body.appendChild(ov);

  const input = ov.querySelector('#delWord');
  const go    = ov.querySelector('#delGo');
  const msg   = ov.querySelector('#delMsg');

  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.querySelector('#delCancel').addEventListener('click', close);

  input.addEventListener('input', () => {
    go.disabled = input.value.trim() !== DELETE_CONFIRM_WORD;
  });
  input.focus();

  go.addEventListener('click', async () => {
    go.disabled = true;
    msg.textContent = 'מוחק…';
    const { error } = await deleteMyAccount();
    if (error) {
      // נשארים במסך: עדיף שהתלמיד יראה שהמחיקה נכשלה מאשר שיחשוב שהיא הצליחה.
      msg.textContent = `המחיקה נכשלה: ${error}. אפשר לנסות שוב, או לפנות אלינו במייל.`;
      go.disabled = false;
      return;
    }
    await signOut();
    location.hash = '#/';
    location.reload();
  });
}

async function openSettingsOverlay(user) {
  // Current values: profile row for a signed-in user, localStorage for a guest.
  // 'guest_profile' is onboarding.js's key — read directly to avoid importing a
  // screen into the layout (see GUEST_PROFILE_KEY there; keep the two in sync).
  let examDate = '', minutes = 20;
  if (user?.id) {
    const { data } = await getProfile(user.id);
    examDate = data?.exam_date ?? '';
    minutes  = data?.daily_time_minutes ?? 20;
  } else {
    try {
      const g = JSON.parse(localStorage.getItem('guest_profile')) || {};
      examDate = g.exam_date ?? ''; minutes = g.daily_time_minutes ?? 20;
    } catch { /* defaults stand */ }
  }

  const MINUTES = [5, 10, 15, 20, 30, 45];
  const ov = document.createElement('div');
  ov.className = 'acct-overlay';
  ov.innerHTML = `
    <div class="acct-card" dir="rtl">
      <div style="font-size:1.05rem;font-weight:900">הגדרות</div>
      <label style="font-size:.83rem;font-weight:700">מתי הבחינה שלך?
        <input type="date" id="setDate" value="${examDate}"
          style="display:block;width:100%;margin-top:6px;padding:9px 11px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:inherit">
      </label>
      <div style="font-size:.83rem;font-weight:700">כמה דקות ביום?
        <div class="acct-min" id="setMin" style="margin-top:6px">
          ${MINUTES.map(m => `<button type="button" data-m="${m}" class="${m === minutes ? 'on' : ''}">${m} דק׳</button>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-start">
        <button class="btn-primary" id="setSave">שמירה</button>
        <button class="acct-item acct-item--quiet" id="setCancel" style="width:auto">ביטול</button>
      </div>
      <div id="setMsg" style="font-size:.78rem;color:var(--muted)"></div>
    </div>`;
  document.body.appendChild(ov);

  let chosen = minutes;
  ov.querySelector('#setMin').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (!b) return;
    chosen = Number(b.dataset.m);
    ov.querySelectorAll('#setMin button').forEach(x => x.classList.toggle('on', x === b));
  });
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  ov.querySelector('#setCancel').addEventListener('click', () => ov.remove());

  ov.querySelector('#setSave').addEventListener('click', async () => {
    const date = ov.querySelector('#setDate').value || null;
    const msg  = ov.querySelector('#setMsg');
    if (user?.id) {
      const { error } = await upsertProfile(user.id, { exam_date: date, daily_time_minutes: chosen });
      if (error) { msg.textContent = 'השמירה נכשלה — נסו שוב.'; return; }
    } else {
      try {
        const g = JSON.parse(localStorage.getItem('guest_profile')) || {};
        localStorage.setItem('guest_profile',
          JSON.stringify({ ...g, exam_date: date, daily_time_minutes: chosen, onboarding_complete: true }));
      } catch { msg.textContent = 'השמירה נכשלה בדפדפן הזה.'; return; }
    }
    ov.remove();
    location.reload();   // simplest correct refresh: every screen re-reads the profile
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
  chart:   `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12l4-4 3 3 5-7"/></svg>`,
  target:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".6" fill="currentColor"/></svg>`,
  listen:  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10v-1a5 5 0 0110 0v1"/><rect x="2" y="10" width="3" height="4" rx="1"/><rect x="11" y="10" width="3" height="4" rx="1"/></svg>`,
  sentence:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h10M3 8h7M3 11h5"/><circle cx="13" cy="11" r="2"/></svg>`,
  book:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3.6c-1.4-1-3.2-1.2-5-.9v9c1.8-.3 3.6-.1 5 .9 1.4-1 3.2-1.2 5-.9v-9c-1.8-.3-3.6-.1-5 .9z"/><path d="M8 3.6v9"/></svg>`,
  notebook:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="2" width="11" height="12" rx="1.5"/><path d="M5.5 6h5M5.5 9h5M5.5 12h3"/></svg>`,
  reading:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M5 6h6M5 8.5h6M5 11h3.5"/></svg>`,
  insights:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 14V2M2 14h12"/><rect x="4" y="9" width="2.4" height="5" rx=".5"/><rect x="7.8" y="6" width="2.4" height="8" rx=".5"/><rect x="11.6" y="3.5" width="2.4" height="10.5" rx=".5"/></svg>`,
};
