/**
 * schedule.data.js — הלוח עד הבחינה.
 *
 * מממש את claude/SPEC_study_plan.md (10.9.2026). העקרונות שקובעים את הצורה:
 *
 *  · §1 התוכנית היא תור מתועדף מתגלגל, לא סילבוס. לכן אין כאן "אחוז השלמה"
 *    ואין "נשאר לך X". הלוח מציג ימים ותקופות, לא כמויות חומר.
 *  · §5 שלוש תקופות: בניית בסיס → הרחבה ועומק → השבועיים האחרונים.
 *  · §6 השבועיים האחרונים מופעלים אוטומטית כשנותרו ≤14 יום.
 *  · §7 ימים שפוספסו — ויתור. יום שקט הוא יום שקט, לא אדום ולא "פספסת".
 *  · §8 שני מצבים ויזואליים: "סגור" (השבוע הקרוב) ו"משוער" (כל השאר).
 *  · §9 בלי תאריך בחינה — לוח כללי של שלושה חודשים.
 *
 * הלוח מחושב דטרמיניסטית מ-(תאריך התחלה, תאריך בחינה, ימי פעילות) ולא נשמר —
 * אותו עיקרון כמו plan.data.js. מה שכן נשמר: user_profiles.study_plan (jsonb)
 * עם started_at ו-update_mode. העמודה הייתה קיימת ו-NULL — "פשטות ניתנת
 * להרחבה" (ARCHITECTURE): לא נדרשה מיגרציה.
 */
import { supabase } from '../supabase.js'

export const COMMITTED_DAYS   = 7    // §8: השבוע הקרוב "סגור"
export const FINAL_PERIOD_DAYS = 14  // §6
export const GENERIC_PLAN_DAYS = 90  // §9
const BASE_SHARE = 0.4               // §5: חלקה של תקופת הבסיס מהזמן שלפני השבועיים האחרונים

export const PERIODS = {
  base:      { id: 'base',      label: 'בניית בסיס',       short: 'בסיס',   blurb: 'ליבת אוצר המילים והיכרות עם מבנה כל חלק בבחינה.' },
  expansion: { id: 'expansion', label: 'הרחבה ועומק',      short: 'הרחבה',  blurb: 'הרחבת המאגר, עבודה על המפתחות, תרגול מגוון.' },
  final:     { id: 'final',     label: 'השבועיים האחרונים', short: 'סיום',   blurb: 'חזרה על מילים מוכרות בלבד, הרבה יותר סימולציות.' },
}

// ─── תאריכים ─────────────────────────────────────────────────────────────────

/** YYYY-MM-DD מקומי. */
export function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function parseDay(key) {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}
export function diffDays(a, b) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((B - A) / 86400000)
}

// ─── ימי פעילות ──────────────────────────────────────────────────────────────

function localDay(ts) { return dayKey(new Date(ts)) }

/**
 * כל הימים שבהם הייתה פעילות כלשהי מאז `since` — מכל טבלאות התשובות.
 * הרחבה של getWeeklyActivity ב-plan.data.js לטווח שרירותי.
 * @returns {{ data: Set<string>, error }}
 */
export async function getActiveDays(userId, sinceIso) {
  const days = new Set()
  try {
    const q = (table, col) => supabase.from(table).select(col).eq('user_id', userId).gte(col, sinceIso)
    const [srs, lis, rep, rd, sc] = await Promise.all([
      q('srs_review_log', 'reviewed_at'),
      q('listening_question_responses', 'responded_at'),
      q('restatement_attempts', 'attempted_at'),
      q('reading_attempts', 'created_at'),
      q('sc_attempts', 'created_at'),
    ])
    for (const r of srs.data || []) days.add(localDay(r.reviewed_at))
    for (const r of lis.data || []) days.add(localDay(r.responded_at))
    for (const r of rep.data || []) days.add(localDay(r.attempted_at))
    for (const r of rd.data  || []) days.add(localDay(r.created_at))
    for (const r of sc.data  || []) days.add(localDay(r.created_at))
    return { data: days, error: null }
  } catch (error) {
    console.error('schedule.data.getActiveDays:', error)
    return { data: days, error }
  }
}

// ─── הבנייה (טהורה) ───────────────────────────────────────────────────────────

/**
 * בונה את הלוח. פונקציה טהורה — נוחה לבדיקה ולא נוגעת ברשת.
 * @param {{ startDate: Date, examDate: Date|null, activeDays: Set<string>, today?: Date }} p
 */
export function buildSchedule({ startDate, examDate, activeDays, today = new Date() }) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const generic = !examDate
  const exam = generic ? addDays(start, GENERIC_PLAN_DAYS) : new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate())
  const todayKey = dayKey(today)

  const totalDays = Math.max(1, diffDays(start, exam))
  // §6: השבועיים האחרונים הם תמיד 14 הימים שלפני הבחינה (או הכול, אם אין יותר).
  const finalStart = totalDays > FINAL_PERIOD_DAYS ? addDays(exam, -FINAL_PERIOD_DAYS) : start
  const preFinalDays = Math.max(0, diffDays(start, finalStart))
  // §5: הבסיס הוא ~40% מהזמן שלפני השבועיים האחרונים; פחות משבועיים לפני הסיום — הכול בסיס.
  const baseDays = preFinalDays < 14 ? preFinalDays : Math.round(preFinalDays * BASE_SHARE)
  const expansionStart = addDays(start, baseDays)

  const periodOf = (d) => {
    if (diffDays(d, finalStart) <= 0) return PERIODS.final
    if (diffDays(d, expansionStart) <= 0) return PERIODS.expansion
    return PERIODS.base
  }

  const committedEnd = addDays(today, COMMITTED_DAYS - 1)
  const days = []
  for (let d = start; diffDays(d, exam) >= 0; d = addDays(d, 1)) {
    const key = dayKey(d)
    const rel = diffDays(today, d) // שלילי = עבר
    let status
    if (key === todayKey)            status = 'today'
    else if (rel < 0)                status = activeDays.has(key) ? 'done' : 'quiet'
    else if (diffDays(d, committedEnd) >= 0) status = 'committed'
    else                             status = 'projected'
    days.push({
      key, date: d, status,
      period: periodOf(d).id,
      isExam: diffDays(d, exam) === 0,
      weekday: d.getDay(),
    })
  }

  const daysLeft = Math.max(0, diffDays(today, exam))
  const dayIndex = Math.min(totalDays, Math.max(0, diffDays(start, today))) + 1
  const current = periodOf(today)
  const doneCount = days.filter(x => x.status === 'done').length

  return {
    generic, start, exam, totalDays, daysLeft, dayIndex,
    currentPeriod: current.id,
    finalMode: current.id === PERIODS.final.id,
    periods: [
      { ...PERIODS.base,      from: start,          to: addDays(expansionStart, -1) },
      { ...PERIODS.expansion, from: expansionStart, to: addDays(finalStart, -1) },
      { ...PERIODS.final,     from: finalStart,     to: exam },
    ].filter(p => diffDays(p.from, p.to) >= 0),
    days, doneCount,
  }
}

/** שבעת הימים שמתחילים ביום ראשון של השבוע הנוכחי — לרצועה במסך הבית. */
export function currentWeek(schedule, today = new Date()) {
  const sunday = addDays(today, -today.getDay())
  const byKey = new Map(schedule.days.map(d => [d.key, d]))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(sunday, i)
    const key = dayKey(d)
    return byKey.get(key) ?? { key, date: d, status: diffDays(today, d) < 0 ? 'quiet' : 'projected', period: null, weekday: i, outside: true }
  })
}

// ─── הקריאה המלאה ─────────────────────────────────────────────────────────────

/**
 * הלוח של תלמיד. `profile` הוא user_profiles (כבר נטען במסך הבית — לא טוענים שוב).
 * מחזיר null אם אין תוכנית (onboarding_complete=false).
 */
export async function getSchedule(userId, profile) {
  if (!profile?.onboarding_complete) return { data: null, error: null }
  try {
    const startedAt = profile.study_plan?.started_at ?? profile.created_at ?? new Date().toISOString()
    const startDate = new Date(startedAt)
    const examDate  = profile.exam_date ? parseDay(profile.exam_date) : null
    const { data: activeDays } = await getActiveDays(userId, new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).toISOString())
    const schedule = buildSchedule({ startDate, examDate, activeDays })
    schedule.updateMode = profile.study_plan?.update_mode ?? 'auto'
    return { data: schedule, error: null }
  } catch (error) {
    console.error('schedule.data.getSchedule:', error)
    return { data: null, error }
  }
}

/** §8: אוטומטי / "תשאל אותי קודם". לא "כבוי". */
export async function setUpdateMode(userId, mode, profile) {
  const { upsertProfile } = await import('./profiles.data.js')
  const study_plan = { ...(profile?.study_plan || {}), update_mode: mode === 'ask' ? 'ask' : 'auto' }
  return upsertProfile(userId, { study_plan })
}
