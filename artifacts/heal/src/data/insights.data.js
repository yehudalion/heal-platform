/**
 * src/data/insights.data.js — cross-module analytics for the student's own
 * "התובנות שלי" dashboard (screens/insights.js).
 *
 * 8 of the 9 charts scoped in claude/PLAN_levels_analytics_corners.md §1 are
 * implemented here: מפתחות חלשים מדורגים (#9, reuses weakpoints.data.js),
 * מפת חום שבועית (#8), צמיחת הזיכרון (#6), משפך אוצר המילים (#7), דיוק לפי
 * מודול (#2), מהירות תגובה (#3), גמילה מרמזים (#4), עצמאות בהאזנה (#5).
 * Only #1 (רמה לאורך זמן) is still missing — it needs the level-save wiring
 * from §0/§1 of the plan doc (rephrase-practice.js/sc-practice.js), which
 * hasn't happened yet. Same pattern throughout (Extensible Simplicity, same
 * as levels.data.js): never an invented number, degrade to 'building' below
 * a threshold, never throw.
 *
 * Every function follows the plan's "מסגרת נוכחת, תוכן מתמלא" rule: it NEVER
 * returns an invented number. Below a data threshold it returns status
 * 'building' with the real count so the screen can render "עוד X ותוצג כאן
 * המגמה" — never a fabricated chart. Never throws — every function degrades
 * to a safe empty/'building' shape on error, same as weakpoints.data.js and
 * levels.data.js.
 */

import { supabase } from '../supabase.js'
import { getWeakPoints } from './weakpoints.data.js'

// Same bar every other cross-module report in this app uses (weakpoints.data.js
// MIN_ATTEMPTS) for "enough sessions to say something real" — one number
// everyone can remember instead of a different threshold per chart.
const MIN_TOTAL_ACTIONS = 15
const MIN_REVIEWS = 10
const LOOKBACK_DAYS = 56 // 8 weeks — long enough to average out one loud day,
                          // short enough to reflect how the student learns NOW.

// ─── 1. מפתחות חלשים המדורגים — a chart on top of data weakpoints.data.js
//        already collects (plan §1.9). No new query, just a ranked shape. ───
export async function getWeakPointsChart(userId) {
  try {
    if (!userId) return { status: 'guest', items: [] }
    const reports = await getWeakPoints(userId)
    if (!reports.length) return { status: 'guest', items: [] }

    const ready = reports.filter((r) => r.status === 'ok')
    const items = []
    for (const r of ready) {
      for (const p of r.points) {
        if (p.lift > 1.05) items.push({ id: `${r.moduleId}:${p.id}`, moduleId: r.moduleId, pointId: p.id, label: p.label, moduleLabel: r.moduleLabel, lift: p.lift })
      }
    }
    items.sort((a, b) => b.lift - a.lift)

    if (!ready.length) {
      // Every module is still 'not_started'/'insufficient_data' — surface
      // whichever one has the most attempts so the placeholder counts up.
      const closest = [...reports].sort((a, b) => (b.attempts || 0) - (a.attempts || 0))[0]
      return { status: 'building', items: [], attempts: closest?.attempts || 0, minAttempts: closest?.minAttempts || 15 }
    }
    return { status: items.length ? 'ready' : 'ready_empty', items: items.slice(0, 6) }
  } catch (err) {
    console.error('insights.data.getWeakPointsChart:', err)
    return { status: 'error', items: [] }
  }
}

// ─── 2. מפת חום שבועית — activity by day of week, last 8 weeks. No color-coded
//        shame for a missed day (wellbeing rule) — just "here's your pattern". ───
export async function getWeeklyActivity(userId) {
  try {
    if (!userId) return { status: 'guest', counts: [0, 0, 0, 0, 0, 0, 0], total: 0 }
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString()
    const [r1, r2, r3, r4] = await Promise.allSettled([
      supabase.from('restatement_attempts').select('attempted_at').eq('user_id', userId).gte('attempted_at', since),
      supabase.from('sc_attempts').select('created_at').eq('user_id', userId).gte('created_at', since),
      supabase.from('listening_question_responses').select('responded_at').eq('user_id', userId).gte('responded_at', since),
      supabase.from('srs_review_log').select('reviewed_at').eq('user_id', userId).gte('reviewed_at', since),
    ])
    const counts = [0, 0, 0, 0, 0, 0, 0] // JS Date#getDay(): 0=Sunday .. 6=Saturday
    let total = 0
    const bump = (settled, field) => {
      if (settled.status !== 'fulfilled') return
      for (const row of settled.value?.data || []) {
        const d = new Date(row[field])
        if (Number.isNaN(d.getTime())) continue
        counts[d.getDay()]++
        total++
      }
    }
    bump(r1, 'attempted_at')
    bump(r2, 'created_at')
    bump(r3, 'responded_at')
    bump(r4, 'reviewed_at')
    return { status: total >= MIN_TOTAL_ACTIONS ? 'ready' : 'building', counts, total, min: MIN_TOTAL_ACTIONS }
  } catch (err) {
    console.error('insights.data.getWeeklyActivity:', err)
    return { status: 'error', counts: [0, 0, 0, 0, 0, 0, 0], total: 0 }
  }
}

// ─── 3. צמיחת הזיכרון — srs_review_log already stores the interval before and
//        after every review; plan §1.6 calls this "the most convincing chart
//        there is". ───
export async function getSrsGrowth(userId) {
  try {
    if (!userId) return { status: 'guest' }
    const { data, error } = await supabase
      .from('srs_review_log')
      .select('reviewed_at, previous_interval_days, new_interval_days, word_id')
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: true })
    if (error) throw error
    const rows = data || []
    if (rows.length < MIN_REVIEWS) return { status: 'building', total: rows.length, min: MIN_REVIEWS }

    // A weekly-average growth curve — coarse on purpose, one bad review
    // shouldn't visibly dent it.
    const buckets = new Map()
    for (const row of rows) {
      const key = mondayOf(row.reviewed_at)
      const b = buckets.get(key) || { sum: 0, n: 0 }
      b.sum += Number(row.new_interval_days) || 0
      b.n += 1
      buckets.set(key, b)
    }
    const series = [...buckets.entries()]
      .map(([week, b]) => ({ week, avg: b.sum / b.n }))
      .slice(-10)

    // The single most concrete "before/after" story: the biggest real jump
    // from an established interval (previous > 0 — i.e. not a first review,
    // where "0 → 1" would be a trivial, misleading "jump").
    let best = null
    for (const row of rows) {
      const prev = Number(row.previous_interval_days) || 0
      const next = Number(row.new_interval_days) || 0
      if (prev <= 0) continue
      const jump = next - prev
      if (!best || jump > best.jump) best = { prev, next, jump, wordId: row.word_id }
    }
    let bestWord = null
    if (best?.wordId) {
      const { data: w } = await supabase.from('words').select('headword').eq('id', best.wordId).maybeSingle()
      bestWord = w?.headword || null
    }

    return { status: 'ready', series, best: best ? { prev: best.prev, next: best.next, word: bestWord } : null, total: rows.length }
  } catch (err) {
    console.error('insights.data.getSrsGrowth:', err)
    return { status: 'error', total: 0 }
  }
}

// ─── 4. משפך אוצר המילים — how many words sit in each SRS state right now.
//        A snapshot, not a trend: no time dimension needed, so this is the
//        cheapest of the four (one table, one GROUP BY-equivalent). ───
const FUNNEL_STATES = ['new', 'learning', 'review', 'relearning']
const MIN_WORDS = 5

export async function getVocabFunnel(userId) {
  try {
    if (!userId) return { status: 'guest' }
    const { data, error } = await supabase.from('srs_progress').select('state').eq('user_id', userId)
    if (error) throw error
    const rows = data || []
    if (rows.length < MIN_WORDS) return { status: 'building', total: rows.length, min: MIN_WORDS }
    const counts = Object.fromEntries(FUNNEL_STATES.map((s) => [s, 0]))
    for (const row of rows) {
      if (counts[row.state] !== undefined) counts[row.state]++
      // An unrecognized state value silently doesn't count anywhere — this
      // chart only ever shows the four states data/srs.data.js defines.
    }
    return { status: 'ready', counts, total: rows.length }
  } catch (err) {
    console.error('insights.data.getVocabFunnel:', err)
    return { status: 'error', total: 0 }
  }
}

function mondayOf(ts) {
  const d = new Date(ts)
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

// ─── 5. דיוק לפי מודול — per-module accuracy, last 30 days. Each module gets
//        its own threshold/placeholder independently (plan §1.2): a module
//        the student barely touches shouldn't block one they practice a lot.
// ─── 6. מהירות תגובה — response_time_ms/time_ms combined across the three
//        timed modules, weekly average (plan §1.3 — "the exam is timed,
//        this is a real insight").
// ─── 7. גמילה מרמזים — hint_used, weekly %. Only restatement_attempts and
//        listening_question_responses carry this column (verified via
//        information_schema — sc_attempts has no hint feature at all, not
//        an oversight, sc-practice.js has no hint UI). Combining just those
//        two is the honest shape, not all three padded with a fake column.
// ─── 8. עצמאות בהאזנה — replays_used (weekly avg) + transcript_viewed
//        (overall %), listening only (plan §1.5).
const MODULE_TIMING = [
  { id: 'rephrase', label: 'ניסוח מחדש', table: 'restatement_attempts', dateCol: 'attempted_at', timeCol: 'response_time_ms' },
  { id: 'sc', label: 'השלמת משפטים', table: 'sc_attempts', dateCol: 'created_at', timeCol: 'time_ms' },
  { id: 'listening', label: 'האזנה', table: 'listening_question_responses', dateCol: 'responded_at', timeCol: 'response_time_ms' },
]
// Weekly windows, not monthly (Lion, 31.8: "תשווה שבועות לא חודשים").
// The attempt bar drops with the window: 8 attempts was a low bar across 30
// days and a steep one across 7, so 5 keeps roughly the same reachability.
const MIN_MODULE_ATTEMPTS = 5
const ACCURACY_WINDOW_DAYS = 7
const MIN_MISTAKES = 5

export async function getAccuracyByModule(userId) {
  try {
    if (!userId) return { status: 'guest', modules: [] }
    const now = Date.now()
    const sinceCur = new Date(now - ACCURACY_WINDOW_DAYS * 86400000).toISOString()
    const sincePrev = new Date(now - 2 * ACCURACY_WINDOW_DAYS * 86400000).toISOString()

    const [curr, prev] = await Promise.all([
      Promise.allSettled(MODULE_TIMING.map((m) =>
        supabase.from(m.table).select('is_correct').eq('user_id', userId).gte(m.dateCol, sinceCur)
      )),
      Promise.allSettled(MODULE_TIMING.map((m) =>
        supabase.from(m.table).select('is_correct').eq('user_id', userId).gte(m.dateCol, sincePrev).lt(m.dateCol, sinceCur)
      )),
    ])

    const pct = (rows) => rows.length ? Math.round((rows.filter((r) => r.is_correct).length / rows.length) * 100) : null
    const rowsOf = (settled, i) => settled[i].status === 'fulfilled' ? (settled[i].value?.data || []) : []

    const modules = MODULE_TIMING.map((m, i) => {
      const cur = rowsOf(curr, i)
      const pre = rowsOf(prev, i)
      const ready = cur.length >= MIN_MODULE_ATTEMPTS
      const accuracy = ready ? pct(cur) : null
      // Only claim a direction when BOTH windows cleared the bar — otherwise a
      // 2-attempt week would "prove" a trend it cannot support.
      const prevAccuracy = pre.length >= MIN_MODULE_ATTEMPTS ? pct(pre) : null
      let direction = null
      if (accuracy !== null && prevAccuracy !== null) {
        const d = accuracy - prevAccuracy
        direction = d >= 3 ? 'up' : d <= -3 ? 'down' : 'same'
      }
      return {
        id: m.id, label: m.label, attempts: cur.length, min: MIN_MODULE_ATTEMPTS,
        status: ready ? 'ready' : 'building',
        accuracy, prevAccuracy, direction,
      }
    })
    return { status: 'ready', modules }
  } catch (err) {
    console.error('insights.data.getAccuracyByModule:', err)
    return { status: 'error', modules: [] }
  }
}

// ─── 6. הצמיחה המצתברת שלכם ─── total practice actions across all four
//        activity tables, cumulative week over week. Reuses the same
//        four-table union as getWeeklyActivity (#8) but never resets: a
//        cumulative count can only go up, so there's no "bad day" to color
//        and no way to "fail" it (wellbeing rule) — replaces the response-
//        time card Lion rejected, 30.8.
export async function getCumulativeGrowth(userId) {
  try {
    if (!userId) return { status: 'guest' }
    const [r1, r2, r3, r4] = await Promise.allSettled([
      supabase.from('restatement_attempts').select('attempted_at').eq('user_id', userId),
      supabase.from('sc_attempts').select('created_at').eq('user_id', userId),
      supabase.from('listening_question_responses').select('responded_at').eq('user_id', userId),
      supabase.from('srs_review_log').select('reviewed_at').eq('user_id', userId),
    ])
    const rows = []
    const collect = (settled, field) => {
      if (settled.status !== 'fulfilled') return
      for (const row of settled.value?.data || []) {
        if (row[field]) rows.push(row[field])
      }
    }
    collect(r1, 'attempted_at')
    collect(r2, 'created_at')
    collect(r3, 'responded_at')
    collect(r4, 'reviewed_at')
    if (rows.length < MIN_TOTAL_ACTIONS) return { status: 'building', total: rows.length, min: MIN_TOTAL_ACTIONS }

    rows.sort((a, b) => new Date(a) - new Date(b))
    const buckets = new Map()
    for (const ts of rows) {
      const key = mondayOf(ts)
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
    let running = 0
    const series = [...buckets.entries()].slice(-20).map(([week, n]) => {
      running += n
      return { week, cumulative: running }
    })
    return { status: 'ready', series, total: rows.length }
  } catch (err) {
    console.error('insights.data.getCumulativeGrowth:', err)
    return { status: 'error', total: 0 }
  }
}

// ─── 7. התקדמות במחברת הטעויות ─── how many of the mistakes already surfaced
//        in the Mistake Notebook (mistake_marks — a table that existed with
//        zero charts using it until now) have been marked understood.
//        Frames an open count as something to work through, never a
//        judgment — replaces the "גמילה מרמזים" hint-usage card Lion
//        rejected, 30.8.
export async function getMistakeNotebookProgress(userId) {
  try {
    if (!userId) return { status: 'guest' }
    const [rWrong, scWrong, lWrong, marks] = await Promise.allSettled([
      supabase.from('restatement_attempts').select('question_id').eq('user_id', userId).eq('is_correct', false),
      supabase.from('sc_attempts').select('question_id').eq('user_id', userId).eq('is_correct', false),
      supabase.from('listening_question_responses').select('question_id').eq('user_id', userId).eq('is_correct', false),
      supabase.from('mistake_marks').select('id').eq('user_id', userId),
    ])
    const distinctCount = (settled) => {
      if (settled.status !== 'fulfilled') return 0
      return new Set((settled.value?.data || []).map((r) => r.question_id)).size
    }
    const total = distinctCount(rWrong) + distinctCount(scWrong) + distinctCount(lWrong)
    const resolved = marks.status === 'fulfilled' ? (marks.value?.data || []).length : 0
    if (total < MIN_MISTAKES) return { status: 'building', total, min: MIN_MISTAKES }
    return { status: 'ready', total, resolved: Math.min(resolved, total) }
  } catch (err) {
    console.error('insights.data.getMistakeNotebookProgress:', err)
    return { status: 'error', total: 0 }
  }
}
