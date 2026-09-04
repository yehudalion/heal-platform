import { BRAND, BRAND_PARTS } from '../lib/brand.js';
/**
 * src/screens/daily.js — האתגר היומי. העמוד הציבורי היחיד של המוצר.
 *
 * מסך עצמאי בכוונה: בלי סיידבר, בלי layout, בלי דרישת חשבון. מי שמגיע מפוסט
 * בפייסבוק צריך לפתור שאלה תוך שלוש שניות מהנחיתה, לא לעבור אונבורדינג.
 *
 * ההסבר נפתח מיד אחרי כל תשובה, גם למי שאינו רשום. זו החלטה מכוונת מול
 * המתחרה, שנועל שם את ההסברים מאחורי הרשמה: אנחנו חוסמים שמירת התקדמות,
 * לא הבנה. מי שמבין משהו חדש בארבע דקות חוזר; מי שנתקל בקיר לא.
 */

import { navigate } from '../router.js'
import { track } from '../lib/analytics.js'
import { getCurrentSession } from '../supabase.js'
import { startGoogleSignIn } from '../lib/signIn.js'
import { attachKeyNav, KEY_HINT_HTML } from '../lib/keyNav.js'
import { XP } from '../lib/xp.js'
import { rewardSession } from '../lib/reward.js'
import {
  getDailyChallenge, saveDailyResult, getDailyStats,
  todayKey, playedToday, markPlayed, lastResult,
} from '../data/daily.data.js'

let S = null
let detachKeys = null

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

export async function renderDaily(root) {
  ensureStyles()
  const date = todayKey()
  const session = await getCurrentSession()
  const userId = session?.user?.id ?? null

  root.innerHTML = shell(`<div class="dc-center">טוען את האתגר של היום…</div>`)

  // כבר שיחק היום — מציגים את התוצאה במקום להתחיל מחדש.
  if (playedToday(date)) {
    const prev = lastResult()
    if (prev && prev.date === date) {
      S = { date, userId, items: [], answers: prev.answers || [], correct: prev.correct,
            total: prev.total, elapsedMs: prev.elapsedMs || 0, replay: true }
      await drawResult(root)
      return
    }
  }

  let challenge
  try {
    challenge = await getDailyChallenge(date)
  } catch (err) {
    console.warn('daily: load failed', err)
    root.innerHTML = shell(`<div class="dc-center">
      לא הצלחנו לטעון את האתגר כרגע.<br>
      <a class="dc-link" href="#/">חזרה לעמוד הראשי</a>
    </div>`)
    return
  }

  if (!challenge.items.length) {
    root.innerHTML = shell(`<div class="dc-center">
      האתגר של היום עוד לא מוכן. נסו שוב עוד מעט.<br>
      <a class="dc-link" href="#/">חזרה לעמוד הראשי</a>
    </div>`)
    return
  }

  S = {
    date, userId, items: challenge.items, idx: 0,
    answers: [], correct: 0, total: challenge.items.length,
    startedAt: null, elapsedMs: 0, tick: null, replay: false,
  }
  track('daily_opened', { signed_in: !!userId })
  drawIntro(root)
}

/* ── מסכים ─────────────────────────────────────────────────────────────────── */

function shell(inner) {
  return `<div class="dc-wrap"><div class="dc-card">${inner}</div>
    <div class="dc-foot">
      <a href="/privacy/" target="_blank" rel="noopener">פרטיות</a> ·
      <a href="/accessibility/" target="_blank" rel="noopener">נגישות</a> ·
      <a href="#/">${BRAND}</a>
    </div></div>`
}

function drawIntro(root) {
  root.innerHTML = shell(`
    <div class="dc-logo">${BRAND_PARTS[0]}<em>${BRAND_PARTS[1]}</em></div>
    <div class="dc-kicker">האתגר היומי</div>
    <h1 class="dc-h1">חמש שאלות אנגלית. בערך ארבע דקות.</h1>
    <p class="dc-lead">
      אותן חמש שאלות לכל מי שנכנס היום. אחרי כל תשובה מופיע ההסבר המלא —
      גם בלי חשבון, וגם אם טעיתם.
    </p>
    <ul class="dc-points">
      <li>שאלות בפורמט של בחינת האנגלית החדשה (הלאל / אמירנט)</li>
      <li>הסבר על כל מסיח, לא רק על התשובה הנכונה</li>
      <li>בסוף: איך ענו שאר הנבחנים היום</li>
    </ul>
    <button class="dc-btn dc-btn-lg" id="dcStart">מתחילים ←</button>
    <div class="dc-fine">בלי הרשמה · בלי כרטיס אשראי · פעם ביום</div>
  `)
  root.querySelector('#dcStart').addEventListener('click', () => {
    S.startedAt = Date.now()
    S.tick = setInterval(() => {
      const el = document.getElementById('dcClock')
      if (el) el.textContent = fmt(Date.now() - S.startedAt)
    }, 1000)
    track('daily_started', {})
    drawQuestion(root)
  })
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function drawQuestion(root) {
  const q = S.items[S.idx]
  const answered = S.answers[S.idx]
  const picked = answered ? answered.pick : null

  const opts = q.options.map((o, i) => {
    let cls = ''
    if (answered) {
      if (i === q.correct) cls = 'is-correct'
      else if (i === picked) cls = 'is-wrong'
      else cls = 'is-dim'
    }
    return `<button class="dc-opt ${cls}" data-i="${i}" ${answered ? 'disabled' : ''}>
      <span class="dc-opt-n">${i + 1}</span>
      <span class="dc-opt-t" dir="ltr">${esc(o)}</span>
    </button>`
  }).join('')

  const expl = answered ? explBlock(q, picked) : ''

  root.innerHTML = shell(`
    <div class="dc-top">
      <span class="dc-badge">${esc(q.kindLabel)}</span>
      <span class="dc-prog">שאלה ${S.idx + 1} מתוך ${S.total}</span>
      <span class="dc-clock" id="dcClock">${fmt(Date.now() - S.startedAt)}</span>
    </div>
    <div class="dc-bar"><div class="dc-bar-fill" style="width:${(S.idx / S.total) * 100}%"></div></div>
    <div class="dc-stem" dir="ltr">${esc(q.stem)}</div>
    <div class="dc-opts">${opts}</div>
    ${answered ? '' : KEY_HINT_HTML}
    ${expl}
    ${answered ? `<button class="dc-btn" id="dcNext">${
      S.idx === S.total - 1 ? 'לתוצאה ←' : 'לשאלה הבאה ←'}</button>` : ''}
  `)

  detachKeys?.()
  if (!answered) {
    root.querySelectorAll('.dc-opt').forEach((b) =>
      b.addEventListener('click', () => choose(root, Number(b.dataset.i))))
    detachKeys = attachKeyNav({
      options: q.options.length,
      onPick: (i) => root.querySelectorAll('.dc-opt')[i]?.click(),
    })
  } else {
    detachKeys = attachKeyNav({ onNext: () => root.querySelector('#dcNext')?.click() })
    root.querySelector('#dcNext').addEventListener('click', () => {
      if (S.idx === S.total - 1) finish(root)
      else { S.idx += 1; drawQuestion(root) }
    })
  }
}

function explBlock(q, picked) {
  const ok = picked === q.correct
  const mine = q.explanations?.[picked]
  const right = q.explanations?.[q.correct]
  return `
    <div class="dc-expl ${ok ? 'is-ok' : 'is-no'}">
      <div class="dc-expl-head">${ok ? '✓ נכון' : '✗ לא נכון'}</div>
      ${!ok && mine ? `<p><b>מה שבחרתם:</b> ${esc(mine)}</p>` : ''}
      ${right ? `<p><b>התשובה הנכונה:</b> ${esc(right)}</p>` : ''}
      ${q.note ? `<p class="dc-expl-note">🔤 ${esc(q.note)}</p>` : ''}
    </div>`
}

function choose(root, i) {
  const q = S.items[S.idx]
  const isCorrect = i === q.correct
  if (isCorrect) S.correct += 1
  S.answers[S.idx] = { i: S.idx, pick: i, correct: isCorrect }
  drawQuestion(root)
}

async function finish(root) {
  clearInterval(S.tick)
  S.elapsedMs = Date.now() - S.startedAt
  markPlayed(S.date, {
    date: S.date, correct: S.correct, total: S.total,
    elapsedMs: S.elapsedMs, answers: S.answers,
  })
  track('daily_completed', { correct: S.correct, total: S.total })

  saveDailyResult({
    date: S.date, correct: S.correct, total: S.total,
    elapsedMs: S.elapsedMs, userId: S.userId,
    answers: S.answers.map((a) => ({ i: a.i, correct: a.correct })),
  }).catch(() => {})

  // XP רק למי שמחובר — למי שלא, זו בדיוק הסיבה להירשם.
  if (S.userId) {
    rewardSession({
      source: 'daily', correct: S.correct, total: S.total,
      extraXp: XP.dailyChallenge, userId: S.userId, badges: ['daily_3'],
    }).catch(() => {})
  }

  await drawResult(root)
}

async function drawResult(root) {
  const grid = (S.answers || []).map((a) => (a.correct ? '🟩' : '🟥')).join('')
  const pct = S.total ? Math.round((S.correct / S.total) * 100) : 0
  const line = pct === 100 ? 'חמש מתוך חמש. יום טוב להיות אתם.'
    : pct >= 60 ? 'יפה. הפער בין זה לבין ציון גבוה הוא בדיוק מה שאפשר לתרגל.'
    : 'התחלה. כל שאלה כאן היא סוג שחוזר בבחינה — וזה בדיוק מה שאפשר ללמוד.'

  root.innerHTML = shell(`
    <div class="dc-kicker">האתגר היומי · ${esc(S.date)}</div>
    <div class="dc-score">${S.correct} <span>/ ${S.total}</span></div>
    <div class="dc-grid">${grid}</div>
    <p class="dc-lead">${line}</p>
    <div class="dc-crowd" id="dcCrowd">טוען השוואה לשאר הנבחנים…</div>
    <div class="dc-actions">
      <button class="dc-btn" id="dcShare">📤 שיתוף התוצאה</button>
      ${S.userId
        ? `<button class="dc-btn dc-btn-lg" id="dcHome">לתרגול המלא ←</button>`
        : `<button class="dc-btn dc-btn-lg" id="dcSignup">לשמור את ההתקדמות — חשבון חינם</button>`}
    </div>
    ${S.userId ? '' : `<div class="dc-fine">
      חשבון חינם שומר את מה שפתרתם, בונה תוכנית יומית לפי הטעויות, ופותח את
      חמש הפינות המלאות. ההרשמה לוקחת כ-10 שניות עם Google.
    </div>`}
    <div class="dc-fine">אתגר חדש כל יום בחצות.</div>
  `)

  root.querySelector('#dcShare')?.addEventListener('click', () => share(grid))
  root.querySelector('#dcHome')?.addEventListener('click', () => navigate('/home'))
  root.querySelector('#dcSignup')?.addEventListener('click', () => {
    track('daily_signup_clicked', {})
    startGoogleSignIn()
  })

  // ההשוואה לקהל מגיעה אחרי הציור — היא נחמדה, היא לא קריטית.
  const stats = await getDailyStats(S.date)
  const box = document.getElementById('dcCrowd')
  if (!box) return
  if (!stats || !stats.players || stats.players < 5) {
    box.innerHTML = `<span class="dc-crowd-soft">אתם מהראשונים שפתרו את האתגר היום.</span>`
    return
  }
  const per = stats.per_question || {}
  const rows = (S.answers || []).map((a, i) => {
    const p = per[String(i)]
    if (p === undefined) return ''
    return `<div class="dc-crowd-row">
      <span>שאלה ${i + 1}</span>
      <span class="dc-crowd-bar"><i style="width:${Math.max(3, Number(p))}%"></i></span>
      <span class="dc-crowd-pct">${Number(p)}% ענו נכון</span>
    </div>`
  }).join('')
  box.innerHTML = `
    <div class="dc-crowd-head">${stats.players} נבחנים פתרו היום · ממוצע ${stats.avg_correct} מתוך ${S.total}</div>
    ${rows}`
}

function share(grid) {
  const text = `${BRAND} · האתגר היומי ${S.date}\n${S.correct}/${S.total} ${grid}\nhttps://highscore-eight.vercel.app/#/daily`
  if (navigator.share) {
    navigator.share({ text }).catch(() => {})
    return
  }
  navigator.clipboard?.writeText(text).then(() => {
    const b = document.getElementById('dcShare')
    if (b) { b.textContent = '✓ הועתק'; setTimeout(() => { b.textContent = '📤 שיתוף התוצאה' }, 2000) }
  }).catch(() => {})
}

/* ── עיצוב ─────────────────────────────────────────────────────────────────── */
function ensureStyles() {
  if (document.getElementById('dc-styles')) return
  const el = document.createElement('style')
  el.id = 'dc-styles'
  el.textContent = `
.dc-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:1.4rem 1rem;background:var(--bg,#F5F1E8)}
.dc-card{width:100%;max-width:34rem;background:var(--card,#fff);border:1px solid var(--border,#e6e2d8);
  border-radius:var(--radius,16px);padding:1.6rem 1.4rem;box-shadow:0 8px 30px rgba(0,0,0,.06)}
.dc-center{text-align:center;color:var(--muted,#6b7280);padding:2rem 0;line-height:1.9}
.dc-logo{font-family:var(--font-serif,Georgia,serif);font-size:1.5rem;font-weight:700;text-align:center;
  color:var(--green-dark,#16412F);margin-bottom:.9rem}
.dc-logo em{font-style:normal;color:var(--gold,#B08442)}
.dc-kicker{text-align:center;font-size:.76rem;font-weight:800;letter-spacing:.08em;
  color:var(--gold,#B08442);text-transform:uppercase}
.dc-h1{text-align:center;font-size:1.42rem;line-height:1.35;margin:.5rem 0 .7rem;color:var(--text,#14201a)}
.dc-lead{text-align:center;font-size:.92rem;line-height:1.7;color:var(--muted,#5C6B60);margin:0 0 1rem}
.dc-points{list-style:none;padding:0;margin:0 0 1.2rem}
.dc-points li{position:relative;padding-inline-start:1.3rem;margin-bottom:.45rem;font-size:.88rem;line-height:1.6}
.dc-points li::before{content:'✓';position:absolute;inset-inline-start:0;color:var(--green,#1F5C43);font-weight:800}
.dc-btn{display:block;width:100%;margin-top:.6rem;padding:.78rem 1rem;border:0;border-radius:var(--radius-sm,10px);
  background:var(--card,#fff);border:1.5px solid var(--border,#e6e2d8);color:var(--text,#14201a);
  font:inherit;font-weight:700;cursor:pointer}
.dc-btn:hover{border-color:var(--green,#1F5C43)}
.dc-btn-lg{background:var(--green-dark,#16412F);color:#fff;border-color:var(--green-dark,#16412F);font-size:1rem;padding:.85rem 1rem}
.dc-btn-lg:hover{filter:brightness(1.1)}
.dc-fine{text-align:center;font-size:.76rem;color:var(--muted,#6b7280);margin-top:.7rem;line-height:1.6}
.dc-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:.76rem;color:var(--muted,#6b7280)}
.dc-badge{background:var(--green-light,#e8f0ea);color:var(--green-dark,#16412F);font-weight:800;
  padding:.2rem .6rem;border-radius:99px}
.dc-clock{font-variant-numeric:tabular-nums;font-weight:700}
.dc-bar{height:4px;background:var(--green-light,#e8f0ea);border-radius:99px;margin:.7rem 0 1.1rem;overflow:hidden}
.dc-bar-fill{height:100%;background:var(--green,#1F5C43);transition:width .3s ease}
.dc-stem{direction:ltr;text-align:left;font-size:1.02rem;line-height:1.7;margin-bottom:1rem;color:var(--text,#14201a)}
.dc-opts{display:flex;flex-direction:column;gap:.5rem}
.dc-opt{display:flex;align-items:flex-start;gap:.6rem;width:100%;text-align:start;background:var(--card,#fff);
  border:1.5px solid var(--border,#e6e2d8);border-radius:var(--radius-sm,10px);padding:.7rem .85rem;
  cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
.dc-opt:hover:not(:disabled){border-color:var(--green,#1F5C43)}
.dc-opt:disabled{cursor:default}
.dc-opt-n{flex:none;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--bg,#F5F1E8);
  display:flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:800;color:var(--muted,#6b7280)}
.dc-opt-t{direction:ltr;text-align:left;font-size:.94rem;line-height:1.55}
.dc-opt.is-correct{border-color:var(--green,#1F5C43);background:var(--green-light,#e8f0ea)}
.dc-opt.is-correct .dc-opt-n{background:var(--green,#1F5C43);color:#fff}
.dc-opt.is-wrong{border-color:var(--red,#B4553E);background:#fbecea}
.dc-opt.is-wrong .dc-opt-n{background:var(--red,#B4553E);color:#fff}
.dc-opt.is-dim{opacity:.5}
.dc-expl{margin-top:.9rem;padding:.8rem .95rem;border-radius:var(--radius-sm,10px);font-size:.88rem;line-height:1.7}
.dc-expl.is-ok{background:var(--green-light,#e8f0ea)}
.dc-expl.is-no{background:#fbecea}
.dc-expl-head{font-weight:800;margin-bottom:.35rem}
.dc-expl p{margin:.3rem 0}
.dc-expl-note{padding-top:.4rem;border-top:1px dashed rgba(0,0,0,.12);color:var(--muted,#5C6B60)}
.dc-score{text-align:center;font-size:3rem;font-weight:800;color:var(--green-dark,#16412F);line-height:1.1;margin:.5rem 0}
.dc-score span{font-size:1.3rem;color:var(--muted,#6b7280);font-weight:700}
.dc-grid{text-align:center;font-size:1.6rem;letter-spacing:.18em;margin-bottom:.8rem}
.dc-crowd{margin:1rem 0;padding:.85rem;background:var(--bg,#F5F1E8);border-radius:var(--radius-sm,10px);font-size:.82rem}
.dc-crowd-head{font-weight:700;margin-bottom:.5rem;text-align:center}
.dc-crowd-soft{color:var(--muted,#6b7280)}
.dc-crowd-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem}
.dc-crowd-row>span:first-child{flex:none;width:4.4rem;color:var(--muted,#6b7280)}
.dc-crowd-bar{flex:1;height:6px;background:#e6e2d8;border-radius:99px;overflow:hidden}
.dc-crowd-bar i{display:block;height:100%;background:var(--green,#1F5C43)}
.dc-crowd-pct{flex:none;width:6.2rem;text-align:end;color:var(--muted,#6b7280)}
.dc-actions{margin-top:.4rem}
.dc-foot{margin-top:1rem;font-size:.74rem;color:var(--muted,#6b7280)}
.dc-foot a{color:inherit;text-decoration:underline}
.dc-link{color:var(--green-dark,#16412F);font-weight:700}
`
  document.head.appendChild(el)
}
