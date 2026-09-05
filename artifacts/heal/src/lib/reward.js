/**
 * src/lib/reward.js — הממשק שמסכי התרגול משתמשים בו כדי להעניק XP ותגים.
 *
 * המטרה: שני שורות קוד בכל מסך תרגול, ולא לוגיקת משחוק מפוזרת בעשרה קבצים.
 *   markPractising('sc')                      — בתשובה הראשונה
 *   await rewardSession({ source:'sc', correct, total })  — בסיכום
 *
 * כל מה שכאן הוא fire-and-forget: אם השרת לא זמין, אין טוסט ואין XP, והתרגול
 * ממשיך בדיוק כרגיל. אסור שהשכבה הזו תחסום או תשבור מסך.
 */

import { XP, rankFor, badgeInfo } from './xp.js'
import { recordActivity, awardBadge } from '../data/gamification.data.js'

// מונע דיווח כפול של "התחלתי לתרגל" באותה טעינת עמוד.
const marked = new Set()

/**
 * מסמן את היום כיום פעיל ברגע שהתלמיד באמת ענה על משהו — לא בכניסה למסך.
 * הרצף נספר על עשייה, לא על ביקור.
 * @param {string} source
 */
export function markPractising(source) {
  const key = String(source || 'unknown')
  if (marked.has(key)) return
  marked.add(key)
  recordActivity(`${key}_started`, 0).catch(() => {})
}

/**
 * מחשב את ה-XP של המנה, רושם אותו, מעניק תגים רלוונטיים ומציג טוסט.
 *
 * @param {object} o
 * @param {string} o.source            מזהה המודול, למשל 'rephrase'
 * @param {number} [o.correct]         כמה נכונות
 * @param {number} [o.total]           כמה שאלות
 * @param {number} [o.extraXp]         בונוס ייעודי (הרצאה, פרק סימולציה, אתגר יומי)
 * @param {string|null} [o.userId]     דרוש רק להענקת תגים
 * @param {string[]} [o.badges]        קודי תגים לבדיקה מעבר לאוטומטיים
 * @param {boolean} [o.silent]         לדלג על הטוסט
 * @returns {Promise<object|null>}
 */
export async function rewardSession({
  source, correct = 0, total = 0, extraXp = 0, userId = null, badges = [], silent = false,
} = {}) {
  const perfect = total > 0 && correct === total
  const xp =
      (correct * XP.correct)
    + (Math.max(0, total - correct) * XP.wrong)
    + (total > 0 ? XP.sessionComplete : 0)
    + (perfect ? XP.perfectSession : 0)
    + Math.max(0, Math.round(extraXp || 0))

  const res = await recordActivity(`${source}_session`, xp)
  if (!res) return null

  // ── תגים ──
  const toAward = [...badges]
  if (res.active_days === 1) toAward.push('first_step')
  if (perfect && total >= 4)  toAward.push('perfect_pack')
  if (res.streak >= 3)  toAward.push('streak_3')
  if (res.streak >= 7)  toAward.push('streak_7')
  if (res.streak >= 21) toAward.push('streak_21')
  // רצף שהתחיל מחדש אצל מי שכבר תרגל בעבר = חזרה אחרי הפסקה, וזה מה שמתוגמל.
  if (res.streak === 1 && res.active_days >= 4) toAward.push('comeback')

  const fresh = []
  if (userId) {
    for (const code of [...new Set(toAward)]) {
      // eslint-disable-next-line no-await-in-loop
      if (await awardBadge(userId, code)) fresh.push(code)
    }
  }

  if (!silent) showRewardToast(res, fresh)
  return { ...res, newBadges: fresh }
}

/**
 * הטוסט. שורה אחת של XP, ומתחתיה רק מה שבאמת קרה עכשיו (דרגה חדשה, רצף, תג).
 * לא מציג כלום כשאין מה להציג.
 * @param {object} res תוצאת record_activity
 * @param {string[]} [newBadges]
 */
export function showRewardToast(res, newBadges = []) {
  if (!res || (!res.awarded && !res.rank_up && !newBadges.length)) return

  const lines = []
  if (res.rank_up) {
    const r = rankFor(res.xp)
    lines.push(`<div class="xt-line xt-rank">${r.icon} דרגה חדשה: ${r.name}</div>`)
  }
  if (res.streak_grew && res.streak >= 2) {
    lines.push(`<div class="xt-line">🔥 ${res.streak} ימים ברצף</div>`)
  }
  if (res.shield_used) {
    lines.push(`<div class="xt-line xt-soft">מגן הרצף שמר לך על הרצף</div>`)
  }
  for (const code of newBadges) {
    const b = badgeInfo(code)
    if (b) lines.push(`<div class="xt-line">${b.icon} תג חדש: ${b.name}</div>`)
  }
  if (res.capped) {
    lines.push(`<div class="xt-line xt-soft">הגעת לתקרת הנקודות היומית — התרגול עצמו כמובן נספר</div>`)
  }

  const el = document.createElement('div')
  el.className = 'xp-toast'
  el.setAttribute('role', 'status')
  el.innerHTML = `
    ${res.awarded ? `<div class="xt-xp">+${res.awarded} <span>XP</span></div>` : ''}
    ${lines.join('')}
  `
  document.body.appendChild(el)

  // requestAnimationFrame כדי שהמעבר יתפוס; ההסרה עם setTimeout ולא עם
  // transitionend, שלא נורה כלל כשהמשתמש ביקש prefers-reduced-motion.
  requestAnimationFrame(() => el.classList.add('is-in'))
  // סשן שבת 6, פריט 51 — התנועה היחידה שהוחלט להוסיף: המספר עולה מ-0 ל-XP
  // שהתקבל, פעם אחת, ב-600ms. בלי קונפטי. ב-prefers-reduced-motion המספר
  // פשוט מופיע.
  if (res.awarded) countUp(el.querySelector('.xt-xp'), res.awarded)
  setTimeout(() => {
    el.classList.remove('is-in')
    setTimeout(() => el.remove(), 400)
  }, 3600)
}

/** מונה עולה קטן: 0 → n בתוך ~600ms. מכבד prefers-reduced-motion. */
function countUp(node, n) {
  if (!node) return
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || n < 5) return
  const span = node.querySelector('span')
  const t0 = performance.now()
  const DUR = 600
  const step = (t) => {
    const k = Math.min(1, (t - t0) / DUR)
    const eased = 1 - Math.pow(1 - k, 3)
    node.firstChild.textContent = `+${Math.round(n * eased)} `
    if (k < 1) requestAnimationFrame(step)
  }
  node.innerHTML = `+0 `
  if (span) node.appendChild(span)
  requestAnimationFrame(step)
}
