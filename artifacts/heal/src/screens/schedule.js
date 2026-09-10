/**
 * src/screens/schedule.js — "הלוח שלי": הלוח עד הבחינה.
 *
 * מממש את התצוגה של claude/SPEC_study_plan.md:
 *   §8 שני מצבים ויזואליים — "סגור" (השבוע הקרוב: משימות, זמנים, צבע מלא)
 *      ו"משוער" (כל השאר: הימים קיימים, תווית תקופה בלבד, צבע בהיר).
 *      התלמיד רואה לוח שלם עד הבחינה ואף פעם לא רואה פריט ספציפי שמשתנה
 *      מתחתיו — השינויים קורים רק באזור שמעולם לא הבטיח כלום.
 *   §7 ימים שקטים הם שקטים. אין אדום, אין "פספסת".
 *   §6 השבועיים האחרונים: באנר תקופה עם שלוש הנקודות מהספק.
 *   §1 אין אחוזי השלמה. יש "יום X מתוך Y" ו"ימי תרגול" — עובדות, לא ציון.
 *
 * הרצועה השבועית (weekStripHtml) משותפת עם מסך הבית.
 * כל הדאטה דרך src/data/*.data.js.
 */
import { renderLayout, getPageContent } from '../layout.js';
import { navigate } from '../router.js';
import { getCurrentSession } from '../supabase.js';
import { getProfile } from '../data/profiles.data.js';
import { getSchedule, currentWeek, setUpdateMode, dayKey, addDays, diffDays, PERIODS } from '../data/schedule.data.js';
import { getDailyPlan } from '../data/plan.data.js';
import { effectiveMinutes } from '../lib/todayPlan.js';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const fmtDate = (d) => `${d.getDate()} ב${MONTHS[d.getMonth()]}`;

/** הרכב יום "סגור" עתידי, לפי תקופה. משוער בכנות: הפריטים האמיתיים נקבעים בבוקר. */
function composeDay(period, offset, minutes) {
  if (period === 'final') {
    return offset % 2 === 0
      ? [['חזרה על מילים', 5], ['סימולציה מלאה', 25]]
      : [['חזרה על מילים', 5], ['ניסוח מחדש', Math.max(5, Math.round(minutes * 0.5))], ['קטע קריאה', 10]];
  }
  if (period === 'expansion') {
    return [['אוצר מילים', Math.round(minutes * 0.4)], ['ניסוח מחדש', Math.round(minutes * 0.3)], ['האזנה', Math.round(minutes * 0.3)], ['קטע קריאה', 10]];
  }
  return [['אוצר מילים', Math.round(minutes * 0.5)], ['השלמת משפטים', Math.round(minutes * 0.5)], ['קטע קריאה', 10]];
}

// ─── הרצועה השבועית — משותפת לבית ─────────────────────────────────────────────
export function weekStripHtml(week, { link = true } = {}) {
  const tag = link ? 'button' : 'div';
  return `
    <${tag} class="sch-week" ${link ? 'type="button" data-nav="/schedule" title="הלוח שלי"' : ''}>
      ${week.map((d) => `
        <span class="sch-day is-${d.status}${d.isExam ? ' is-exam' : ''}${d.period ? ` p-${d.period}` : ''}">
          <span class="sch-dn">${WEEKDAYS[d.weekday]}</span>
          <span class="sch-dd">${d.date.getDate()}</span>
          <span class="sch-dot"></span>
        </span>`).join('')}
    </${tag}>`;
}

// ─── לוח חודשי ────────────────────────────────────────────────────────────────
function monthsHtml(schedule) {
  const byKey = new Map(schedule.days.map((d) => [d.key, d]));
  const first = new Date(schedule.start.getFullYear(), schedule.start.getMonth(), 1);
  const last  = new Date(schedule.exam.getFullYear(), schedule.exam.getMonth(), 1);
  const out = [];
  for (let m = first; m <= last; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const cells = [];
    for (let i = 0; i < m.getDay(); i++) cells.push('<span class="sch-cell is-empty"></span>');
    const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysIn; day++) {
      const d = new Date(m.getFullYear(), m.getMonth(), day);
      const info = byKey.get(dayKey(d));
      if (!info) { cells.push(`<span class="sch-cell is-outside">${day}</span>`); continue; }
      const title = info.isExam ? 'יום הבחינה' : {
        done: 'תרגלת', today: 'היום', quiet: 'יום שקט', committed: 'השבוע הקרוב', projected: PERIODS[info.period].label,
      }[info.status];
      cells.push(`<span class="sch-cell is-${info.status} p-${info.period}${info.isExam ? ' is-exam' : ''}" title="${esc(title)}">${info.isExam ? '★' : day}</span>`);
    }
    out.push(`
      <div class="sch-month">
        <div class="sch-mh">${MONTHS[m.getMonth()]} ${m.getFullYear()}</div>
        <div class="sch-grid sch-grid-h">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="sch-grid">${cells.join('')}</div>
      </div>`);
  }
  return out.join('');
}

// ─── המסך ─────────────────────────────────────────────────────────────────────
export async function renderSchedule(root) {
  await renderLayout(root, '/schedule');
  const el = getPageContent();
  el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  ensureScheduleStyles();

  const session = await getCurrentSession();
  const userId = session?.user?.id ?? null;
  if (!userId) { navigate('/'); return; }

  const { data: profile } = await getProfile(userId);
  const { data: sch } = await getSchedule(userId, profile);

  if (!sch) {
    el.innerHTML = `
      <div class="fade-in sch-wrap">
        <section class="sch-empty">
          <div class="sch-empty-ico">🗓️</div>
          <h1>עוד אין לך לוח</h1>
          <p>שתי שאלות — מתי הבחינה וכמה דקות ביום — ויש לך לוח למידה עד יום הבחינה, שמתעדכן לפי הביצועים שלך.</p>
          <button class="sch-btn" type="button" data-nav="/plan-setup">בנה לי תוכנית ←</button>
        </section>
      </div>`;
    wire(el);
    return;
  }

  const minutes = effectiveMinutes(profile?.daily_time_minutes ?? 20);
  const { data: plan } = await getDailyPlan(userId, minutes, { finalMode: sch.finalMode, dayIndex: sch.dayIndex });
  const today = new Date();
  const week = currentWeek(sch, today);
  const period = PERIODS[sch.currentPeriod];

  // ── כותרת ──
  // 10.9.2026: תאריך בחינה שכבר עבר הוא מצב אמיתי (תלמיד שהקליד תאריך ישן,
  // או שהמועד חלף) — בלי הענף הזה הכותרת מציגה "0 ימים לבחינה" והלוח ממשיך
  // להתנהג כאילו הוא בשבועיים האחרונים.
  const headline = sch.examPassed
    ? `תאריך הבחינה שהגדרת כבר עבר`
    : sch.generic
      ? `לוח כללי · יום <b>${sch.dayIndex}</b> מתוך ${sch.totalDays}`
      : `יום <b>${sch.dayIndex}</b> מתוך ${sch.totalDays} · <b>${sch.daysLeft}</b> ימים לבחינה`;
  const sub = sch.examPassed
    ? `הלוח נבנה סביב ${fmtDate(sch.exam)}. עדכן את התאריך ואבנה אותו מחדש.`
    : sch.generic
      ? 'בלי תאריך בחינה בניתי לך שלושה חודשים. ברגע שתוסיף תאריך — הלוח ייבנה מחדש סביבו.'
      : `הבחינה ב-${fmtDate(sch.exam)}.`;

  // ── השבוע הקרוב (סגור) ──
  const committed = sch.days.filter((d) => d.status === 'today' || d.status === 'committed');
  const weekList = committed.map((d, i) => {
    const isToday = d.status === 'today';
    const rows = isToday && plan?.legs?.length
      ? plan.legs.map((l) => `<li class="${l.done ? 'is-done' : ''}"><span>${esc(l.label)}${l.targetItems > 1 ? ` · ${l.targetItems}` : ''}</span><span class="sch-min">${l.estimatedMinutes} דק׳</span></li>`)
      : composeDay(d.period, sch.dayIndex + i, minutes).map(([label, m]) => `<li><span>${label}</span><span class="sch-min">${m} דק׳</span></li>`);
    const total = isToday && plan ? plan.totalMinutes : composeDay(d.period, sch.dayIndex + i, minutes).reduce((s, [, m]) => s + m, 0);
    return `
      <div class="sch-dayc${isToday ? ' is-today' : ''}${d.isExam ? ' is-exam' : ''}">
        <div class="sch-dayh">
          <span class="sch-dayt">${isToday ? 'היום' : `יום ${WEEKDAYS[d.weekday]}׳`} · ${fmtDate(d.date)}${d.isExam ? ' · <b>יום הבחינה</b>' : ''}</span>
          <span class="sch-daym">${d.isExam ? '' : `כ-${total} דק׳`}</span>
        </div>
        ${d.isExam ? '<p class="sch-examday">בהצלחה. היום לא מתרגלים — ישנים טוב ומגיעים רגועים.</p>' : `<ul class="sch-tasks">${rows.join('')}</ul>`}
        ${isToday && plan?.legs?.length ? `<button class="sch-go" type="button" data-nav="${plan.legs.find((l) => !l.done)?.route ?? '/practice'}">${plan.finished ? 'עוד תרגול ←' : plan.started ? 'להמשיך ←' : 'להתחיל ←'}</button>` : ''}
      </div>`;
  }).join('');

  // ── באנר השבועיים האחרונים (§6) ──
  const finalBanner = sch.finalMode ? `
    <section class="sch-final">
      <div class="sch-final-t">נכנסת לשבועיים האחרונים</div>
      <p>עד עכשיו בנינו. עכשיו אוספים. שלושה דברים שכדאי לדעת על התקופה הזו:</p>
      <ol>
        <li><b>תופסים את מה שאפשר לתפוס.</b> זה לא הזמן לתקוף את החולשה הגדולה ביותר.</li>
        <li><b>משקיעים בבינוני, לא בחלש.</b> נושא שאתה ברמה בינונית בו אפשר להעלות לרמה טובה בשבועיים; נושא שאתה חלש בו מאוד דורש חודשים.</li>
        <li><b>אפשר להשתפר המון בזמן הזה</b> — בתנאי שמכוונים נכון. מהיום: רק חזרה על מילים מוכרות, והרבה יותר סימולציות.</li>
      </ol>
      <button class="sch-btn" type="button" data-nav="/simulation">לסימולציה ←</button>
    </section>` : '';

  el.innerHTML = `
    <div class="fade-in sch-wrap">
      <section class="sch-head">
        <div class="sch-headline">${headline}</div>
        <div class="sch-sub">${sub}</div>
        <div class="sch-period p-${period.id}">
          <span class="sch-period-lbl">התקופה עכשיו</span>
          <b>${period.label}</b>
          <span class="sch-period-b">${period.blurb}</span>
        </div>
        ${weekStripHtml(week, { link: false })}
        <div class="sch-foot">
          <span>מתעדכנת לפי הביצועים שלך · ${profile?.daily_time_minutes ?? minutes} דק׳ ביום</span>
          <button type="button" class="sch-link" data-nav="/plan-setup">לשינוי ←</button>
        </div>
      </section>

      ${finalBanner}

      <div class="sec-title sch-sec">השבוע הקרוב <span class="sch-tag sch-tag-c">סגור</span></div>
      <div class="sch-weeklist">${weekList}</div>

      <div class="sec-title sch-sec">עד הבחינה <span class="sch-tag sch-tag-p">משוער</span></div>
      <p class="sch-note">הימים כאן מסומנים לפי תקופה בלבד. מה בדיוק נכנס בכל יום נקבע בבוקר שלו, לפי מה שעשית עד אז — כך שאף פעם לא תראה משימה שהובטחה ונעלמה.</p>
      <div class="sch-months">${monthsHtml(sch)}</div>
      <div class="sch-legend">
        <span><i class="sch-sw is-done"></i>תרגלת</span>
        <span><i class="sch-sw p-base"></i>${PERIODS.base.label}</span>
        <span><i class="sch-sw p-expansion"></i>${PERIODS.expansion.label}</span>
        <span><i class="sch-sw p-final"></i>${PERIODS.final.label}</span>
        <span><i class="sch-sw is-exam">★</i>הבחינה</span>
      </div>

      <div class="sec-title sch-sec">התקופות</div>
      <div class="sch-periods">
        ${sch.periods.map((p) => `
          <div class="sch-pcard p-${p.id}${p.id === period.id ? ' is-now' : ''}">
            <b>${p.label}</b>
            <span class="sch-pd">${fmtDate(p.from)} – ${fmtDate(p.to)}</span>
            <span class="sch-pb">${p.blurb}</span>
          </div>`).join('')}
      </div>

      <section class="sch-settings">
        <div class="sch-set-t">כשהביצועים משתנים, הלוח —</div>
        <div class="sch-toggle" role="radiogroup" aria-label="מצב עדכון">
          <button type="button" class="sch-opt${sch.updateMode === 'auto' ? ' on' : ''}" data-mode="auto">מתעדכן לבד</button>
          <button type="button" class="sch-opt${sch.updateMode === 'ask' ? ' on' : ''}" data-mode="ask">שואל אותי קודם</button>
        </div>
        <div class="sch-set-h">בשני המצבים השבוע הקרוב לא זז. ההבדל הוא רק במה שמעבר לו.</div>
      </section>
    </div>`;

  wire(el);
  el.querySelectorAll('.sch-opt').forEach((b) => b.addEventListener('click', async () => {
    el.querySelectorAll('.sch-opt').forEach((x) => x.classList.toggle('on', x === b));
    await setUpdateMode(userId, b.dataset.mode, profile);
  }));
}

function wire(el) {
  el.querySelectorAll('[data-nav]').forEach((t) => t.addEventListener('click', () => navigate(t.dataset.nav)));
}

// ─── עיצוב ────────────────────────────────────────────────────────────────────
let stylesDone = false;
export function ensureScheduleStyles() {
  if (stylesDone) return;
  stylesDone = true;
  const s = document.createElement('style');
  s.textContent = `
    .sch-wrap{max-width:720px;margin:0 auto;padding-bottom:2rem}
    .sch-head{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem 1.2rem 1rem}
    .sch-headline{font-family:var(--serif);font-size:1.45rem;font-weight:700;line-height:1.3}
    .sch-headline b{color:var(--green-dark)}
    .sch-sub{font-size:.9rem;color:var(--muted);margin-top:.25rem}
    .sch-period{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .6rem;margin:.9rem 0;padding:.7rem .9rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg)}
    .sch-period-lbl{font-size:.76rem;color:var(--muted);font-weight:700}
    .sch-period b{font-size:1rem}
    .sch-period-b{flex-basis:100%;font-size:.86rem;color:var(--muted)}
    .sch-period.p-base{border-color:var(--green);background:var(--green-light)}
    .sch-period.p-expansion{border-color:var(--blue);background:var(--blue-light)}
    .sch-period.p-final{border-color:var(--orange);background:var(--orange-light)}
    .sch-foot{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.8rem;font-size:.82rem;color:var(--muted)}
    .sch-link{background:none;border:0;padding:0;font:inherit;font-weight:700;color:var(--green-dark);cursor:pointer}

    /* רצועה שבועית */
    .sch-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;width:100%;margin-top:.9rem;padding:0;border:0;background:none;font:inherit;cursor:default;text-align:center}
    button.sch-week{cursor:pointer}
    .sch-day{display:flex;flex-direction:column;align-items:center;gap:2px;padding:.5rem 0 .55rem;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:var(--bg)}
    .sch-dn{font-size:.72rem;font-weight:700;color:var(--muted)}
    .sch-dd{font-size:1rem;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums}
    .sch-dot{width:7px;height:7px;border-radius:50%;background:var(--border);margin-top:2px}
    .sch-day.is-done{background:var(--green);border-color:var(--green)}
    .sch-day.is-done .sch-dn,.sch-day.is-done .sch-dd{color:#F1F6F2}
    .sch-day.is-done .sch-dot{background:#F1F6F2}
    .sch-day.is-today{border-color:var(--green);background:var(--green-light)}
    .sch-day.is-today .sch-dd,.sch-day.is-today .sch-dn{color:var(--green-dark)}
    .sch-day.is-today .sch-dot{background:var(--green);box-shadow:0 0 0 3px rgba(31,92,67,.18)}
    .sch-day.is-committed .sch-dot{background:var(--green)}
    .sch-day.is-exam{border-color:var(--orange);background:var(--orange-light)}
    .sch-day.is-exam .sch-dot{background:var(--orange)}

    .sch-sec{margin-top:1.4rem}
    .sch-tag{display:inline-block;font-size:.7rem;font-weight:800;padding:.1rem .5rem;border-radius:99px;margin-right:.4rem;vertical-align:middle}
    .sch-tag-c{background:var(--green);color:#fff}
    .sch-tag-p{background:var(--border);color:var(--muted)}
    .sch-note{font-size:.84rem;color:var(--muted);margin:.3rem 0 .8rem;line-height:1.5}

    /* השבוע הקרוב */
    .sch-weeklist{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.7rem}
    .sch-dayc{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:.8rem .9rem}
    .sch-dayc.is-today{border-color:var(--green);box-shadow:0 0 0 2px var(--green-light)}
    .sch-dayc.is-exam{border-color:var(--orange);background:var(--orange-light)}
    .sch-dayh{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;margin-bottom:.45rem}
    .sch-dayt{font-weight:800;font-size:.9rem}
    .sch-daym{font-size:.78rem;color:var(--muted);white-space:nowrap}
    .sch-tasks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.3rem}
    .sch-tasks li{display:flex;justify-content:space-between;gap:.5rem;font-size:.86rem;padding:.35rem .5rem;border-radius:var(--radius-sm);background:var(--bg)}
    .sch-tasks li.is-done{color:var(--muted);text-decoration:line-through}
    .sch-min{color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
    .sch-examday{font-size:.88rem;margin:0}
    .sch-go{margin-top:.6rem;width:100%;padding:.6rem;border:0;border-radius:var(--radius-sm);background:var(--green);color:#fff;font:inherit;font-weight:800;cursor:pointer}

    /* לוח חודשי */
    .sch-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.9rem}
    .sch-month{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:.7rem .8rem}
    .sch-mh{font-weight:800;font-size:.92rem;margin-bottom:.4rem}
    .sch-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
    .sch-grid-h span{font-size:.68rem;color:var(--muted);text-align:center;font-weight:700;padding-bottom:2px}
    .sch-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:.76rem;border-radius:5px;color:var(--text);font-variant-numeric:tabular-nums;border:1px solid transparent}
    .sch-cell.is-empty,.sch-cell.is-outside{background:transparent;color:transparent}
    .sch-cell.is-quiet{background:var(--bg);color:var(--muted)}
    .sch-cell.is-done{background:var(--green);color:#F1F6F2;font-weight:700}
    .sch-cell.is-today{border-color:var(--green);background:var(--green-light);color:var(--green-dark);font-weight:800}
    .sch-cell.is-committed.p-base,.sch-cell.is-committed.p-expansion,.sch-cell.is-committed.p-final{font-weight:700;color:#fff}
    .sch-cell.is-committed.p-base{background:var(--green)}
    .sch-cell.is-committed.p-expansion{background:var(--blue)}
    .sch-cell.is-committed.p-final{background:var(--orange)}
    .sch-cell.is-projected.p-base{background:var(--green-light);color:var(--green-dark)}
    .sch-cell.is-projected.p-expansion{background:var(--blue-light);color:var(--blue)}
    .sch-cell.is-projected.p-final{background:var(--orange-light);color:var(--orange)}
    .sch-cell.is-exam{background:var(--orange)!important;color:#fff!important;font-weight:800}
    .sch-legend{display:flex;flex-wrap:wrap;gap:.5rem 1rem;margin:.7rem 0 0;font-size:.78rem;color:var(--muted)}
    .sch-legend span{display:inline-flex;align-items:center;gap:.35rem}
    .sch-sw{width:14px;height:14px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:.6rem;color:#fff;font-style:normal}
    .sch-sw.is-done{background:var(--green)}
    .sch-sw.p-base{background:var(--green-light);border:1px solid var(--green)}
    .sch-sw.p-expansion{background:var(--blue-light);border:1px solid var(--blue)}
    .sch-sw.p-final{background:var(--orange-light);border:1px solid var(--orange)}
    .sch-sw.is-exam{background:var(--orange)}

    /* תקופות */
    .sch-periods{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.7rem}
    .sch-pcard{display:flex;flex-direction:column;gap:.2rem;background:var(--card);border:1px solid var(--border);border-right-width:4px;border-radius:var(--radius);padding:.75rem .9rem}
    .sch-pcard.p-base{border-right-color:var(--green)}
    .sch-pcard.p-expansion{border-right-color:var(--blue)}
    .sch-pcard.p-final{border-right-color:var(--orange)}
    .sch-pcard.is-now{box-shadow:0 0 0 2px var(--green-light)}
    .sch-pd{font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums}
    .sch-pb{font-size:.84rem;color:var(--muted);line-height:1.45}

    /* השבועיים האחרונים */
    .sch-final{margin-top:1rem;background:var(--orange-light);border:1px solid var(--orange);border-radius:var(--radius);padding:1rem 1.1rem}
    .sch-final-t{font-family:var(--serif);font-weight:700;font-size:1.15rem;margin-bottom:.3rem}
    .sch-final p{font-size:.9rem;margin:0 0 .5rem}
    .sch-final ol{margin:0 0 .8rem;padding-right:1.2rem;font-size:.9rem;line-height:1.55}
    .sch-final li{margin-bottom:.3rem}

    .sch-btn{display:inline-block;padding:.65rem 1.2rem;border:0;border-radius:var(--radius-sm);background:var(--green);color:#fff;font:inherit;font-weight:800;cursor:pointer}
    .sch-settings{margin-top:1.4rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:.9rem 1rem}
    .sch-set-t{font-weight:800;font-size:.9rem;margin-bottom:.5rem}
    .sch-toggle{display:inline-flex;border:1.5px solid var(--border);border-radius:99px;padding:3px;background:var(--bg)}
    .sch-opt{border:0;background:none;padding:.4rem .9rem;border-radius:99px;font:inherit;font-size:.86rem;font-weight:700;color:var(--muted);cursor:pointer}
    .sch-opt.on{background:var(--green);color:#fff}
    .sch-set-h{font-size:.78rem;color:var(--muted);margin-top:.5rem}
    .sch-empty{text-align:center;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem 1.2rem}
    .sch-empty-ico{font-size:2.2rem}
    .sch-empty h1{font-family:var(--serif);font-size:1.4rem;margin:.4rem 0}
    .sch-empty p{color:var(--muted);max-width:32rem;margin:0 auto 1rem;line-height:1.55}
    @media(max-width:560px){.sch-headline{font-size:1.25rem}.sch-weeklist{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}
