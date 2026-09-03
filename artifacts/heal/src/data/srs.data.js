import { supabase } from '../supabase.js'

const MAX_NEW_PER_SESSION = 10

// Columns every "word" row in this file selects. One constant so the core and
// extension queries can never drift apart.
const WORD_FIELDS =
  'id, headword, definition_he, surface_1, mnemonic, mnemonic_2, mnemonic_3, audio_word_url, audio_sentence_url, impact_score, impact_percentile'

// ─── Vocabulary pool model (Lion, 2026-08-31) ────────────────────────────────
// "ה-550 מילים הראשונות אמורות להגיע אוטומטית. לעומת זאת שאר המילים בלי
//  אימפקט סקור מגיעות רק לבקשת התלמיד או לחלופין אחרי שהוא סיים את ה-550."
//
//   core      — the 550 words that have an impact_score. Served automatically.
//   extended  — the 2,116 unscored words. Served ONLY once the learner asked
//               (user_profiles.vocab_pool = 'extended') or once core ran out,
//               at which point this file promotes them automatically.
//
// The guard that unscored words are never served *by accident* is unchanged —
// it just became conditional instead of absolute.
//
// ─── The free ceiling (Lion's decision, 2026-08-31) ──────────────────────────
// A free learner gets the 198 highest-impact words; a paying one gets all 550.
// Lion: "טוב לי שתלמיד לא פרימיום יראה אוצר לא שלם — זה מה שיגרום לו בסוף לשלם."
//
// This gate already existed and was doing exactly this — but INVISIBLY. Nothing
// in the UI said it was there, so a free learner simply ran dry against a
// coverage bar whose denominator was 550 and could therefore never pass 36%.
// A paywall nobody can see does not convert; it just makes the product feel
// empty. So the gate stays and the UI now shows it: the bar keeps the full 550
// denominator and renders the unreachable part as a locked segment
// (see data/coverage.data.js → reachable, and lib/coverageBar.js).
//
// Percentile, not a row count, because that is the mechanism that was already
// here and the one Lion approved ("198 — כמו שהיה"). Note the consequence: if
// impact_percentile is ever recomputed over a larger scored set, the free tier
// changes size with it. That moves the lock marker; it never moves the bar.
const FREE_PERCENTILE_FLOOR = 64

// ⚠️ INTERIM, NOT A DECISION. Whether a free learner ever receives the 2,116
// unranked extension words is exactly the question Lion deferred to a dedicated
// "מה נעול ומה לא לחינם" conversation (claude/MONETIZATION_decisions.md §2).
// Until that conversation, the extension is paid-only — because the alternative
// (198 free words, then 2,116 free ones) would cancel the ceiling decided above
// the moment it is reached. Flip this one constant when the call is made.
const EXTENSION_REQUIRES_PREMIUM = true

/**
 * Pool + tier in one read. Never throws; anything unexpected reads as the
 * safest state (core pool, free tier).
 *
 * `isPremium` was previously a caller-supplied parameter that NO caller ever
 * passed, so every learner silently defaulted to free. It is derived from the
 * profile here so the tier is a real fact about the account rather than an
 * argument nobody remembers to send.
 */
async function getLearnerState(userId) {
  const fallback = { pool: 'core', isPremium: false }
  if (!userId) return fallback
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('vocab_pool, paid_track, paid_expires_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return fallback
    const notExpired = !data.paid_expires_at || new Date(data.paid_expires_at) > new Date()
    return {
      pool: data.vocab_pool === 'extended' ? 'extended' : 'core',
      isPremium: Boolean(data.paid_track) && notExpired,
    }
  } catch (error) {
    console.error('srs.data.getLearnerState:', error)
    return fallback
  }
}

/**
 * Set the learner's pool. Exported so the Dictionary screen can offer the
 * explicit "add these to my practice" request. Guest (no userId) = no-op.
 */
export async function setVocabPool(userId, pool) {
  if (!userId || (pool !== 'core' && pool !== 'extended')) return { error: null }
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, vocab_pool: pool }, { onConflict: 'user_id' })
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('srs.data.setVocabPool:', error)
    return { error }
  }
}

/** One page of unseen words from a single pool. Returns [] on any failure. */
async function fetchNewWords({ scored, seenWordIds, limit, isPremium }) {
  if (limit <= 0) return []
  try {
    let q = supabase.from('words').select(WORD_FIELDS).limit(limit)
    q = scored
      ? q.not('impact_score', 'is', null).order('impact_score', { ascending: false })
      : q.is('impact_score', null).order('headword', { ascending: true })
    if (scored && !isPremium && FREE_PERCENTILE_FLOOR !== null) {
      q = q.gte('impact_percentile', FREE_PERCENTILE_FLOOR)
    }
    if (seenWordIds.length > 0) q = q.not('id', 'in', `(${seenWordIds.join(',')})`)
    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('srs.data.fetchNewWords:', error)
    return []
  }
}

/**
 * Get words due for review today, plus new words to fill the session.
 * Priority: overdue reviews first, then new words by impact_score.
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns tier and pool state in `meta` — no caller has to pass either in
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function getDueWords(userId, { limit = 20, guestSeenIds = [] } = {}) {
  try {
    const now = new Date().toISOString()

    // 3.9.2026 — אורח (userId ריק). נמצא בבדיקה מקצה לקצה: `.eq('user_id', null)`
    // נשלח ל-PostgREST כ-`eq.null`, ופוסטגרס מנסה להמיר את המחרוזת "null"
    // ל-uuid ונכשל (22P02). השאילתה זרקה, המסך הציג "אין מילים לתרגול כרגע.
    // חזור מחר!" — וזה היה היעד של "המנה של היום" לכל אורח חדש. לאורח אין
    // srs_progress בכלל, אז מדלגים על שתי השאילתות: אין חזרות, ומה שכבר
    // ראה בדפדפן הזה מגיע מ-lib/learner.js דרך guestSeenIds (card.js).
    let dueReviews = []
    let seenWordIds = Array.isArray(guestSeenIds) ? guestSeenIds : []

    if (userId) {
      // 1. Get due reviews (state = review or relearning, due_at <= now)
      const { data: reviews, error: reviewError } = await supabase
        .from('srs_progress')
        .select('word_id, state, interval_days, ease, due_at, reps, lapses')
        .eq('user_id', userId)
        .in('state', ['review', 'relearning'])
        .lte('due_at', now)
        .order('due_at', { ascending: true })

      if (reviewError) throw reviewError
      dueReviews = reviews || []

      // 2. Get IDs already in progress (to exclude from new words)
      const { data: allProgress, error: progressError } = await supabase
        .from('srs_progress')
        .select('word_id')
        .eq('user_id', userId)

      if (progressError) throw progressError

      seenWordIds = (allProgress || []).map(p => p.word_id)
    }

    // 3. Get new words (not yet seen). Core pool first, always — the extension
    //    pool only fills what core could not (see the pool model up top).
    const newSlotsAvailable = Math.max(0, MAX_NEW_PER_SESSION - dueReviews.length)
    let newWordsData = []
    let coreExhausted = false
    // Additive third field. Existing callers destructure { data, error } only,
    // so this cannot break them.
    let meta = { pool: 'core', isPremium: false, coreExhausted: false }

    if (newSlotsAvailable > 0) {
      const { pool, isPremium } = await getLearnerState(userId)
      let picked = await fetchNewWords({ scored: true, seenWordIds, limit: newSlotsAvailable, isPremium })

      if (picked.length < newSlotsAvailable) {
        // The learner has exhausted every word their tier can reach.
        coreExhausted = true

        if (!EXTENSION_REQUIRES_PREMIUM || isPremium) {
          // Lion's "או לחלופין אחרי שהוא סיים את ה-550" — nobody hits a wall.
          if (pool === 'core') setVocabPool(userId, 'extended')  // fire-and-forget
          const extra = await fetchNewWords({
            scored: false,
            seenWordIds,
            limit: newSlotsAvailable - picked.length,
            isPremium,
          })
          picked = [...picked, ...extra]
        }
        // A free learner gets no filler here on purpose: running out IS the
        // conversion moment, and it is the screen's job to explain it and point
        // at the waitlist — never to leave a silent dead end.
      }

      meta = { pool, isPremium, coreExhausted }
      newWordsData = picked.map(w => ({ ...w, word_id: w.id, state: 'new' }))
    }

    // 4. Fetch full word data for due reviews
    const reviewWordIds = dueReviews.map(r => r.word_id)
    let reviewWordsData = []

    if (reviewWordIds.length > 0) {
      const { data: reviewWords, error: rwError } = await supabase
        .from('words')
        .select(WORD_FIELDS)
        .in('id', reviewWordIds)

      if (rwError) throw rwError

      reviewWordsData = reviewWords.map(w => {
        const progress = dueReviews.find(r => r.word_id === w.id)
        return { ...w, word_id: w.id, ...progress }
      })
    }

    const data = [...reviewWordsData, ...newWordsData].slice(0, limit)
    return { data, error: null, meta }
  } catch (error) {
    console.error('srs.data.getDueWords:', error)
    return { data: null, error }
  }
}

/**
 * Calculate new SRS state based on current state and rating.
 * Implements SM-2 simplified (per METHODOLOGY.md).
 * @param {{ state, interval_days, ease, reps, lapses }} current
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @returns {{ state, interval_days, ease, due_at, reps, lapses }}
 */
function calculateNextState(current, rating) {
  let { state, interval_days, ease, reps, lapses } = current
  ease = ease || 2.5
  interval_days = interval_days || 0

  const now = new Date()
  let newState = state
  let newInterval = interval_days
  let newEase = ease
  let newReps = reps + 1
  let newLapses = lapses

  if (state === 'new' || state === 'learning') {
    if (rating === 'again') { newState = 'learning'; newInterval = 1 / 1440 }       // 1 min in days
    else if (rating === 'hard') { newState = 'learning'; newInterval = 10 / 1440 }  // 10 min
    else if (rating === 'good') { newState = 'review'; newInterval = 1 }
    else if (rating === 'easy') { newState = 'review'; newInterval = 4 }
  } else if (state === 'review') {
    if (rating === 'again') {
      newState = 'relearning'; newInterval = 10 / 1440; newLapses++
      newEase = Math.max(1.3, ease - 0.2)
    } else if (rating === 'hard') {
      newState = 'review'; newInterval = interval_days * 1.2
      newEase = Math.max(1.3, ease - 0.15)
    } else if (rating === 'good') {
      newState = 'review'; newInterval = interval_days * ease
    } else if (rating === 'easy') {
      newState = 'review'; newInterval = interval_days * ease * 1.3
      newEase = ease + 0.15
    }
  } else if (state === 'relearning') {
    if (rating === 'again') { newState = 'relearning'; newInterval = 10 / 1440 }
    else if (rating === 'good') { newState = 'review'; newInterval = 1 }
    else if (rating === 'easy') { newState = 'review'; newInterval = Math.max(1, interval_days * 0.5) }
  }

  newInterval = Math.max(newInterval, 1 / 1440)
  const dueAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000)

  return {
    state: newState,
    interval_days: newInterval,
    ease: newEase,
    due_at: dueAt.toISOString(),
    reps: newReps,
    lapses: newLapses,
    last_reviewed_at: now.toISOString(),
    last_rating: rating,
  }
}

/**
 * Upsert SRS progress for a word after a rating.
 * @param {string} userId
 * @param {string} wordId
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @param {{ currentState?: object, responseTimeMs?: number }} options
 * @returns {{ data: object|null, error: object|null }}
 */
export async function rateWord(userId, wordId, rating, { currentState = {}, responseTimeMs = null } = {}) {
  try {
    const defaultState = { state: 'new', interval_days: 0, ease: 2.5, reps: 0, lapses: 0 }
    // Guard against callers passing partial state (e.g. a brand-new word
    // has no prior reps/lapses/interval_days/ease) — an explicit `undefined`
    // key would otherwise override the default via spread and corrupt the
    // upsert (reps becomes NaN -> null, violating the NOT NULL constraint).
    const cleanCurrentState = Object.fromEntries(
      Object.entries(currentState).filter(([, v]) => v !== undefined)
    )
    const current = { ...defaultState, ...cleanCurrentState }
    const next = calculateNextState(current, rating)

    // Upsert srs_progress
    const { data, error } = await supabase
      .from('srs_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        ...next,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,word_id' })
      .select()
      .single()

    if (error) throw error

    // Append to srs_review_log (fire and forget — don't block on failure)
    supabase.from('srs_review_log').insert({
      user_id: userId,
      word_id: wordId,
      rating,
      response_time_ms: responseTimeMs,
      previous_interval_days: current.interval_days,
      new_interval_days: next.interval_days,
      previous_ease: current.ease,
      new_ease: next.ease,
      previous_state: current.state,
      new_state: next.state,
      reviewed_at: new Date().toISOString(),
    }).then(({ error: logError }) => {
      if (logError) console.warn('srs_review_log insert failed (non-blocking):', logError)
    })

    return { data, error: null }
  } catch (error) {
    console.error('srs.data.rateWord:', error)
    return { data: null, error }
  }
}

/**
 * Count of words currently due for review (state = review/relearning, due_at <= now).
 * Lightweight — no word data fetched. Used by screens that only need the count
 * (e.g. the flashcards landing page), not a full getDueWords() call.
 * @param {string} userId
 * @returns {{ data: number, error: object|null }}
 */
export async function getDueCount(userId) {
  try {
    const now = new Date().toISOString()
    const { count, error } = await supabase
      .from('srs_progress')
      .select('word_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('state', ['review', 'relearning'])
      .lte('due_at', now)

    if (error) throw error
    return { data: count || 0, error: null }
  } catch (error) {
    console.error('srs.data.getDueCount:', error)
    return { data: 0, error }
  }
}

/**
 * Get session stats for the analyze screen.
 * @param {string} userId
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getSessionStats(userId) {
  try {
    const { data, error } = await supabase
      .from('srs_progress')
      .select('state, lapses, last_rating, last_reviewed_at')
      .eq('user_id', userId)

    if (error) throw error

    const stats = {
      total_seen: data.length,
      in_review: data.filter(r => r.state === 'review').length,
      learning: data.filter(r => r.state === 'learning').length,
      struggling: data.filter(r => r.lapses > 2).length,
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('srs.data.getSessionStats:', error)
    return { data: null, error }
  }
}

/**
 * Daily-menu contract (SITEMAP §6). SRS is time-critical: due cards first,
 * the composer caps our share of the plan. ~0.5 min per card.
 * @returns {{ data: { moduleId, itemIds, targetItems, estimatedMinutes }|null, error }}
 */
export async function getDailyPlan(userId, minutes) {
  const maxCards = Math.floor(minutes / 0.5)
  const { data: due, error } = await getDueWords(userId, { limit: maxCards })
  if (error) return { data: null, error }
  const items = due || []
  return {
    data: {
      moduleId: 'vocab',
      itemIds: items.map(w => w.word_id),
      targetItems: items.length,
      estimatedMinutes: Math.round(items.length * 0.5),
    },
    error: null,
  }
}
