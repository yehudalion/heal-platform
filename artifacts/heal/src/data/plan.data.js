/**
 * plan.data.js — the daily-menu composer + weekly-pace reader.
 * Implements the contract in SITEMAP §6 ("חוזה המנה היומית", approved 2026-08-17).
 *
 * Design decisions locked with Lion (2026-08-17):
 *  - The plan is computed DETERMINISTICALLY from (date, user) and never stored.
 *    "Resume" = recompute and subtract what was already answered today.
 *    No daily_plan table, no sync, works from any device.
 *  - Adaptive allocation:
 *      1. SRS due cards go first, capped at ~40% of the plan's minutes.
 *         (Spaced repetition is time-critical — it does not compete.)
 *      2. Remaining minutes split between listening & rephrase INVERSELY to
 *         accuracy over each module's last-20-answers window.
 *      3. Floor of 25% per module — a strong module never disappears.
 *      4. Cold start (<10 answers in a module): even split.
 *  - Wellbeing rule: nothing here labels the student. The plan just composes
 *    itself; any surfaced reason is descriptive ("today has more rephrase"),
 *    never diagnostic.
 *
 * Weekly pace ("למדת X מתוך 5 ימים השבוע") is derived from activity timestamps
 * in the three existing response tables — no new column, no streak, resets
 * weekly by construction.
 */
import { supabase } from '../supabase.js'

// ─── Tunables (MVP constants — revisit with real usage data) ─────────────────
// Per-item minute estimates live in each module's own getDailyPlan.
const SRS_TIME_CAP          = 0.4   // SRS gets at most 40% of the plan
const MODULE_FLOOR          = 0.25  // listening/rephrase each get ≥25% of the remainder
const ACCURACY_WINDOW       = 20    // last-N answers per module
const COLD_START_MIN        = 10    // below this many answers → even split
const WEEKLY_TARGET_DAYS    = 5     // "X מתוך 5 ימים השבוע"

// ─── Weekly pace ─────────────────────────────────────────────────────────────

/** Start of the current week (Sunday 00:00 local), as ISO string. */
function weekStartIso() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  return start.toISOString()
}

/** Local YYYY-MM-DD for a timestamp. */
function localDay(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Days with any study activity this week (Sunday-based), from the three
 * response tables. Returns { activeDays: string[], target: number }.
 */
export async function getWeeklyActivity(userId) {
  try {
    const since = weekStartIso()
    const [srs, listening, rephrase] = await Promise.all([
      supabase.from('srs_review_log').select('reviewed_at')
        .eq('user_id', userId).gte('reviewed_at', since),
      supabase.from('listening_question_responses').select('responded_at')
        .eq('user_id', userId).gte('responded_at', since),
      supabase.from('restatement_attempts').select('attempted_at')
        .eq('user_id', userId).gte('attempted_at', since),
    ])
    const days = new Set()
    for (const r of srs.data || [])       days.add(localDay(r.reviewed_at))
    for (const r of listening.data || []) days.add(localDay(r.responded_at))
    for (const r of rephrase.data || [])  days.add(localDay(r.attempted_at))
    return { data: { activeDays: [...days].sort(), target: WEEKLY_TARGET_DAYS }, error: null }
  } catch (error) {
    console.error('plan.data.getWeeklyActivity:', error)
    return { data: { activeDays: [], target: WEEKLY_TARGET_DAYS }, error }
  }
}

// ─── Accuracy windows ────────────────────────────────────────────────────────

async function recentAccuracy(table, timeCol, userId) {
  const { data, error } = await supabase
    .from(table)
    .select(`is_correct, ${timeCol}`)
    .eq('user_id', userId)
    .order(timeCol, { ascending: false })
    .limit(ACCURACY_WINDOW)
  if (error) throw error
  const n = (data || []).length
  const correct = (data || []).filter(r => r.is_correct).length
  return { n, accuracy: n > 0 ? correct / n : null }
}

// ─── Today's progress (the "resume" half of the contract) ────────────────────

/** Items answered since local midnight, per module. */
export async function getTodayProgress(userId) {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const since = midnight.toISOString()
  try {
    const [srs, listening, rephrase] = await Promise.all([
      supabase.from('srs_review_log').select('id')
        .eq('user_id', userId).gte('reviewed_at', since),
      supabase.from('listening_question_responses').select('id')
        .eq('user_id', userId).gte('responded_at', since),
      supabase.from('restatement_attempts').select('id')
        .eq('user_id', userId).gte('attempted_at', since),
    ])
    return {
      data: {
        vocab:     (srs.data || []).length,
        listening: (listening.data || []).length,
        rephrase:  (rephrase.data || []).length,
      },
      error: null,
    }
  } catch (error) {
    console.error('plan.data.getTodayProgress:', error)
    return { data: { vocab: 0, listening: 0, rephrase: 0 }, error }
  }
}

// ─── The composer ────────────────────────────────────────────────────────────

/**
 * Compose today's plan for a user.
 * @param {string} userId
 * @param {number} minutes - user_profiles.daily_time_minutes
 * @returns {{ data: {
 *   legs: [{ moduleId, label, route, targetItems, doneItems, estimatedMinutes, done }],
 *   totalMinutes, remainingMinutes, started, finished
 * }|null, error }}
 *
 * NOTE on the §6 contract: itemIds are returned for vocab (SRS due ids are
 * cheap and meaningful). For listening/rephrase the module's own session
 * picker already implements selection policy (recency exclusion, warmup,
 * calibration) — duplicating it here would drift. targetItems is the plan's
 * contract with those modules for now; itemIds can be added when a session
 * accepts an injected list (schema-ready, v2).
 */
export async function getDailyPlan(userId, minutes) {
  try {
    // Per-module planners — each module owns its getDailyPlan (SITEMAP §6).
    const [srsData, listeningData, rephraseData] = await Promise.all([
      import('./srs.data.js'), import('./listening.data.js'), import('./rephrase.data.js'),
    ])

    // 1. SRS first — due cards, capped at 40% of time.
    const { data: vocabPlan } = await srsData.getDailyPlan(userId, minutes * SRS_TIME_CAP)
    const vocabMinutes = vocabPlan?.estimatedMinutes ?? 0

    // 2. Remaining time → listening vs rephrase, inverse to accuracy.
    const remaining = Math.max(0, minutes - vocabMinutes)
    const [lis, rep] = await Promise.all([
      recentAccuracy('listening_question_responses', 'responded_at', userId),
      recentAccuracy('restatement_attempts', 'attempted_at', userId),
    ])

    let lisShare
    if (lis.n < COLD_START_MIN || rep.n < COLD_START_MIN) {
      lisShare = 0.5 // cold start — not enough signal
    } else {
      const lisNeed = 1 - lis.accuracy
      const repNeed = 1 - rep.accuracy
      lisShare = (lisNeed + repNeed) > 0 ? lisNeed / (lisNeed + repNeed) : 0.5
      lisShare = Math.min(Math.max(lisShare, MODULE_FLOOR), 1 - MODULE_FLOOR)
    }

    const [{ data: lisPlan }, { data: repPlan }] = await Promise.all([
      listeningData.getDailyPlan(userId, remaining * lisShare),
      rephraseData.getDailyPlan(userId, remaining * (1 - lisShare)),
    ])

    // 3. Subtract what was already done today → resume state.
    const { data: today } = await getTodayProgress(userId)

    const legs = [
      {
        ...vocabPlan, label: 'אוצר מילים', route: '/card',
        doneItems: Math.min(today.vocab, vocabPlan?.targetItems ?? 0),
      },
      {
        // Route to the module dashboard, not straight into a session — the
        // dashboard owns the first-visit-goes-to-Learn rule (SITEMAP §3).
        ...lisPlan, label: 'האזנה', route: '/listening',
        doneItems: Math.min(today.listening, lisPlan?.targetItems ?? 0),
      },
      {
        ...repPlan, label: 'ניסוח מחדש', route: '/rephrase-practice',
        doneItems: Math.min(today.rephrase, repPlan?.targetItems ?? 0),
      },
    ]
      // A leg with nothing to do (e.g. no due cards) drops out of the plan.
      .filter(l => l.targetItems > 0)
      .map(l => ({ ...l, done: l.doneItems >= l.targetItems }))

    const totalMinutes = legs.reduce((s, l) => s + l.estimatedMinutes, 0)
    const remainingMinutes = legs.reduce((s, l) =>
      s + (l.done ? 0 : Math.round(l.estimatedMinutes * (1 - l.doneItems / l.targetItems))), 0)
    const started  = legs.some(l => l.doneItems > 0)
    const finished = legs.length > 0 && legs.every(l => l.done)

    return { data: { legs, totalMinutes, remainingMinutes, started, finished }, error: null }
  } catch (error) {
    console.error('plan.data.getDailyPlan:', error)
    return { data: null, error }
  }
}

/** The next leg the student should enter (first unfinished, in plan order). */
export function nextLeg(plan) {
  return plan?.legs?.find(l => !l.done) ?? null
}
